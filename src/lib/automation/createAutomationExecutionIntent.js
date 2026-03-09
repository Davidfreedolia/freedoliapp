/**
 * D57.5 — Create an execution intent (automation_executions row, status queued) from an approved proposal.
 * No real execution. Writes to automation_executions, automation_proposals, automation_events.
 */

import { SUPPORTED_ACTION_TYPES } from './constants.js'
import { evaluateAutomationProposalReadiness } from './evaluateAutomationProposalReadiness.js'

/** Execution statuses considered "active" for dedupe (no second intent per proposal). */
const ACTIVE_EXECUTION_STATUSES = ['queued', 'running']

/**
 * Check if an active execution intent already exists for this proposal.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string }} params
 * @returns {Promise<boolean>}
 */
async function hasActiveExecutionForProposal(supabase, params) {
  const { proposalId, orgId } = params
  const { data, error } = await supabase
    .from('automation_executions')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('org_id', orgId)
    .in('execution_status', ACTIVE_EXECUTION_STATUSES)
    .limit(1)
    .maybeSingle()

  // On error, treat as "exists" to avoid creating when we cannot verify (contract: no duplicate intents).
  if (error) return true
  return data != null
}

/**
 * Create an execution intent from an approved, readiness-validated proposal.
 * Inserts one row into automation_executions (status queued), optionally updates proposal to queued_for_execution, emits execution_requested.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string }} params
 * @returns {Promise<{ status: 'created'|'duplicate'|'blocked'|'invalidated', executionId?: string, reason?: string, detail?: string }>}
 */
export async function createAutomationExecutionIntent(supabase, params) {
  const { proposalId, orgId } = params || {}
  if (!proposalId || !orgId) {
    return { status: 'blocked', reason: 'missing_params', detail: 'proposalId and orgId required' }
  }

  try {
    const { data: proposal, error: propError } = await supabase
      .from('automation_proposals')
      .select('id, org_id, decision_id, action_type, proposal_status, invalidated_at, payload_json')
      .eq('id', proposalId)
      .eq('org_id', orgId)
      .single()

    if (propError || !proposal) {
      return { status: 'blocked', reason: 'proposal_not_found', detail: 'Proposal not found or org mismatch' }
    }

    if (proposal.proposal_status !== 'approved') {
      return { status: 'blocked', reason: 'proposal_not_approved', detail: 'Proposal is not in approved status' }
    }

    if (proposal.invalidated_at != null) {
      return { status: 'invalidated', reason: 'already_invalidated', detail: 'Proposal has been invalidated' }
    }

    const readiness = await evaluateAutomationProposalReadiness(supabase, { proposalId, orgId })
    if (readiness.status !== 'ready') {
      return {
        status: readiness.status === 'invalidated' ? 'invalidated' : 'blocked',
        reason: readiness.reason ?? 'readiness_check_failed',
        detail: readiness.detail ?? 'Proposal is not ready for execution',
      }
    }

    const exists = await hasActiveExecutionForProposal(supabase, { proposalId, orgId })
    if (exists) {
      return { status: 'duplicate', reason: 'active_execution_exists', detail: 'An active execution intent already exists for this proposal' }
    }

    if (!SUPPORTED_ACTION_TYPES.includes(proposal.action_type)) {
      return { status: 'blocked', reason: 'action_type_unsupported', detail: 'Action type is not supported' }
    }

    if (proposal.payload_json == null) {
      return { status: 'blocked', reason: 'payload_missing', detail: 'Proposal has no payload_json' }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('automation_executions')
      .insert({
        org_id: orgId,
        proposal_id: proposalId,
        decision_id: proposal.decision_id,
        action_type: proposal.action_type,
        execution_status: 'queued',
        execution_mode: 'approved_trigger',
        payload_json: proposal.payload_json,
        executed_by_system: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.warn('createAutomationExecutionIntent: execution insert failed', { proposalId, orgId, error: insertError.message })
      return { status: 'blocked', reason: 'execution_insert_failed', detail: insertError.message }
    }

    const executionId = inserted?.id
    if (!executionId) {
      return { status: 'blocked', reason: 'execution_insert_failed', detail: 'Insert did not return execution id' }
    }

    const { error: updatePropError } = await supabase
      .from('automation_proposals')
      .update({ proposal_status: 'queued_for_execution' })
      .eq('id', proposalId)
      .eq('org_id', orgId)

    if (updatePropError) {
      console.warn('createAutomationExecutionIntent: proposal status update failed', { proposalId, error: updatePropError.message })
    }

    try {
      const { error: eventError } = await supabase.from('automation_events').insert({
        org_id: orgId,
        proposal_id: proposalId,
        execution_id: executionId,
        decision_id: proposal.decision_id,
        event_type: 'execution_requested',
        event_payload_json: { execution_id: executionId, execution_status: 'queued', execution_mode: 'approved_trigger' },
        actor_type: 'system',
        actor_id: null,
      })
      if (eventError) {
        console.warn('createAutomationExecutionIntent: execution_requested event failed', { proposalId, executionId, error: eventError.message })
      }
    } catch (err) {
      console.warn('createAutomationExecutionIntent: execution_requested event failed', { proposalId, executionId, error: err })
    }

    return { status: 'created', executionId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('createAutomationExecutionIntent: unexpected error', { proposalId, orgId, error: message })
    return { status: 'blocked', reason: 'intent_creation_failed', detail: message }
  }
}
