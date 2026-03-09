/**
 * D57.2 — Persist automation proposal and emit proposal_created event.
 * D57.3 — When approval_mode !== 'none', create approval steps (best-effort).
 */

import { ACTIVE_PROPOSAL_STATUSES } from './constants.js'
import { createAutomationApprovalSteps } from './createAutomationApprovalSteps.js'

/**
 * Check for existing active proposal (dedupe by org, decision, action_type, or idempotency_key).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, decisionId: string, actionType: string, idempotencyKey?: string }} params
 * @returns {Promise<boolean>} true if duplicate exists
 */
async function hasExistingActiveProposal(supabase, params) {
  const { orgId, decisionId, actionType, idempotencyKey } = params || {}
  if (!orgId || !decisionId || !actionType) return false

  const q = supabase
    .from('automation_proposals')
    .select('id')
    .eq('org_id', orgId)
    .eq('decision_id', decisionId)
    .eq('action_type', actionType)
    .in('proposal_status', ACTIVE_PROPOSAL_STATUSES)
    .limit(1)

  const { data: byKeys } = await q.maybeSingle()
  if (byKeys) return true

  if (idempotencyKey) {
    const { data: byIdem } = await supabase
      .from('automation_proposals')
      .select('id')
      .eq('org_id', orgId)
      .eq('idempotency_key', idempotencyKey)
      .limit(1)
      .maybeSingle()
    if (byIdem) return true
  }

  return false
}

/**
 * Insert automation_proposals row and automation_events proposal_created.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} proposalRow — snake_case row for automation_proposals (from buildAutomationProposalFromDecision, mapped to DB shape)
 * @returns {Promise<{ ok: boolean, proposalId?: string, reason?: string }>}
 */
export async function createAutomationProposal(supabase, proposalRow) {
  if (!proposalRow?.org_id || !proposalRow?.decision_id || !proposalRow?.action_type) {
    return { ok: false, reason: 'Missing org_id, decision_id or action_type' }
  }

  const exists = await hasExistingActiveProposal(supabase, {
    orgId: proposalRow.org_id,
    decisionId: proposalRow.decision_id,
    actionType: proposalRow.action_type,
    idempotencyKey: proposalRow.idempotency_key,
  })
  if (exists) {
    return { ok: false, reason: 'duplicate' }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('automation_proposals')
    .insert(proposalRow)
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') return { ok: false, reason: 'duplicate' }
    console.error('createAutomationProposal:', insertError)
    return { ok: false, reason: insertError.message }
  }

  const proposalId = inserted?.id
  if (!proposalId) return { ok: false, reason: 'Insert did not return id' }

  try {
    const { error: eventError } = await supabase.from('automation_events').insert({
      org_id: proposalRow.org_id,
      proposal_id: proposalId,
      decision_id: proposalRow.decision_id,
      event_type: 'proposal_created',
      event_payload_json: { action_type: proposalRow.action_type, proposal_status: proposalRow.proposal_status },
      actor_type: 'system',
      actor_id: null,
    })
    if (eventError) {
      console.warn('createAutomationProposal: automation_events insert failed (proposal already created)', { proposalId, error: eventError })
    }
  } catch (err) {
    console.warn('createAutomationProposal: automation_events insert failed (proposal already created)', { proposalId, error: err })
  }

  let invalidatedSetup = false
  if (proposalRow.approval_mode && proposalRow.approval_mode !== 'none') {
    let stepsOk = false
    try {
      const stepsResult = await createAutomationApprovalSteps(supabase, {
        proposalId,
        orgId: proposalRow.org_id,
        approvalMode: proposalRow.approval_mode,
        decisionId: proposalRow.decision_id ?? null,
      })
      stepsOk = stepsResult.ok === true
      if (!stepsOk) {
        console.warn('createAutomationProposal: approval steps creation failed; invalidating proposal', { proposalId, reason: stepsResult.reason })
      }
    } catch (err) {
      console.warn('createAutomationProposal: approval steps creation failed; invalidating proposal', { proposalId, error: err })
    }
    if (!stepsOk) {
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('automation_proposals')
        .update({
          proposal_status: 'invalidated',
          invalidated_at: now,
          invalidation_reason: 'approval_setup_failed',
        })
        .eq('id', proposalId)
        .eq('org_id', proposalRow.org_id)
      if (updateError) {
        console.error('createAutomationProposal: failed to mark proposal invalidated', { proposalId, error: updateError })
      }
      try {
        const { error: eventError } = await supabase.from('automation_events').insert({
          org_id: proposalRow.org_id,
          proposal_id: proposalId,
          decision_id: proposalRow.decision_id ?? null,
          event_type: 'proposal_invalidated',
          event_payload_json: { reason: 'approval_setup_failed' },
          actor_type: 'system',
          actor_id: null,
        })
        if (eventError) {
          console.warn('createAutomationProposal: proposal_invalidated event insert failed', { proposalId, error: eventError })
        }
      } catch (err) {
        console.warn('createAutomationProposal: proposal_invalidated event insert failed', { proposalId, error: err })
      }
      invalidatedSetup = true
    }
  }

  return { ok: true, proposalId, invalidatedSetup }
}
