/**
 * D57.6 — Manual execution trigger for a queued automation_execution.
 * Only action types create_internal_task and schedule_review. Soft execution when no internal task/review model exists.
 * Writes: automation_executions, automation_proposals, automation_events. No business tables, no PO/price/messages.
 */

import { MANUAL_EXECUTION_ACTION_TYPES } from './constants.js'
import { evaluateAutomationProposalReadiness } from './evaluateAutomationProposalReadiness.js'

/**
 * Emit an automation event (best-effort; console.warn on failure).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} params
 */
async function emitEvent(supabase, params) {
  const { orgId, proposalId, executionId, decisionId, eventType, payload, actorUserId } = params
  try {
    const { error } = await supabase.from('automation_events').insert({
      org_id: orgId,
      proposal_id: proposalId,
      execution_id: executionId ?? null,
      decision_id: decisionId ?? null,
      event_type: eventType,
      event_payload_json: payload ?? {},
      actor_type: actorUserId ? 'user' : 'system',
      actor_id: actorUserId ?? null,
    })
    if (error) console.warn('runAutomationExecutionManually: event failed', { eventType, executionId, error: error.message })
  } catch (err) {
    console.warn('runAutomationExecutionManually: event failed', { eventType, executionId, error: err })
  }
}

/**
 * Perform soft execution for D57.6-allowed action types (no external side effects when no task/review model exists).
 * @param {{ action_type: string, payload_json: object | null }} execution
 * @returns {{ ok: true, result_json: object } | { ok: false, error_code: string, error_message: string }}
 */
function performSoftExecution(execution) {
  const now = new Date().toISOString()
  const actionType = execution.action_type
  if (!MANUAL_EXECUTION_ACTION_TYPES.includes(actionType)) {
    return { ok: false, error_code: 'action_not_allowed', error_message: 'Action type not allowed for manual execution' }
  }
  return {
    ok: true,
    result_json: {
      soft_execution: true,
      action_type: actionType,
      resolved_at: now,
      note: 'No internal task/review model; intent resolved without external side effect.',
    },
  }
}

/**
 * Run a queued automation execution manually. Only create_internal_task and schedule_review are allowed.
 * Updates execution to running → succeeded/failed, proposal to executed/execution_failed, emits execution_started and execution_succeeded/execution_failed.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ executionId: string, orgId: string, actorUserId?: string | null }} params
 * @returns {Promise<{ status: 'succeeded'|'failed'|'blocked'|'not_found', reason?: string, detail?: string }>}
 */
export async function runAutomationExecutionManually(supabase, params) {
  const { executionId, orgId, actorUserId } = params || {}
  if (!executionId || !orgId) {
    return { status: 'blocked', reason: 'missing_params', detail: 'executionId and orgId required' }
  }
  if (actorUserId === undefined || actorUserId === null) {
    return { status: 'blocked', reason: 'missing_params', detail: 'actorUserId required' }
  }

  try {
    const { data: execution, error: execError } = await supabase
      .from('automation_executions')
      .select('id, org_id, proposal_id, decision_id, action_type, execution_status, payload_json')
      .eq('id', executionId)
      .eq('org_id', orgId)
      .single()

    if (execError || !execution) {
      return { status: 'not_found', reason: 'execution_not_found', detail: 'Execution not found or org mismatch' }
    }

    if (execution.execution_status !== 'queued') {
      return { status: 'blocked', reason: 'execution_not_queued', detail: 'Execution is not in queued status' }
    }

    const { data: proposal, error: propError } = await supabase
      .from('automation_proposals')
      .select('id, org_id, proposal_status')
      .eq('id', execution.proposal_id)
      .eq('org_id', orgId)
      .single()

    if (propError || !proposal) {
      return { status: 'blocked', reason: 'proposal_not_found', detail: 'Proposal not found or org mismatch' }
    }

    if (proposal.proposal_status !== 'queued_for_execution') {
      return { status: 'blocked', reason: 'proposal_not_queued', detail: 'Proposal is not in queued_for_execution status' }
    }

    const readiness = await evaluateAutomationProposalReadiness(supabase, {
      proposalId: execution.proposal_id,
      orgId,
    })
    if (readiness.status !== 'ready') {
      return {
        status: 'blocked',
        reason: readiness.reason ?? 'readiness_not_ready',
        detail: readiness.detail ?? 'Proposal is not ready for execution',
      }
    }

    if (!MANUAL_EXECUTION_ACTION_TYPES.includes(execution.action_type)) {
      return {
        status: 'blocked',
        reason: 'action_type_not_allowed',
        detail: 'This action type is not allowed for manual execution in D57.6',
      }
    }

    const now = new Date().toISOString()

    await emitEvent(supabase, {
      orgId,
      proposalId: execution.proposal_id,
      executionId: execution.id,
      decisionId: execution.decision_id,
      eventType: 'execution_started',
      payload: { execution_id: execution.id, execution_status: 'running', actor_id: actorUserId },
      actorUserId,
    })

    const { error: runningError } = await supabase
      .from('automation_executions')
      .update({
        execution_status: 'running',
        started_at: now,
        executed_by: actorUserId,
      })
      .eq('id', executionId)
      .eq('org_id', orgId)

    if (runningError) {
      console.warn('runAutomationExecutionManually: update to running failed', { executionId, error: runningError.message })
      return { status: 'blocked', reason: 'status_update_failed', detail: runningError.message }
    }

    const runResult = performSoftExecution(execution)
    if (!runResult.ok) {
      const errCode = runResult.error_code
      const errMsg = runResult.error_message
      await supabase
        .from('automation_executions')
        .update({
          execution_status: 'failed',
          finished_at: new Date().toISOString(),
          error_code: errCode,
          error_message: errMsg,
        })
        .eq('id', executionId)
        .eq('org_id', orgId)
      await supabase
        .from('automation_proposals')
        .update({ proposal_status: 'execution_failed' })
        .eq('id', execution.proposal_id)
        .eq('org_id', orgId)
      await emitEvent(supabase, {
        orgId,
        proposalId: execution.proposal_id,
        executionId: execution.id,
        decisionId: execution.decision_id,
        eventType: 'execution_failed',
        payload: { execution_id: execution.id, error_code: errCode, error_message: errMsg },
        actorUserId,
      })
      return { status: 'failed', reason: errCode, detail: errMsg }
    }

    const { error: succeedError } = await supabase
      .from('automation_executions')
      .update({
        execution_status: 'succeeded',
        finished_at: new Date().toISOString(),
        result_json: runResult.result_json,
      })
      .eq('id', executionId)
      .eq('org_id', orgId)

    if (succeedError) {
      console.warn('runAutomationExecutionManually: update to succeeded failed', { executionId, error: succeedError.message })
      await supabase
        .from('automation_executions')
        .update({
          execution_status: 'failed',
          error_code: 'status_update_failed',
          error_message: succeedError.message,
        })
        .eq('id', executionId)
        .eq('org_id', orgId)
      await supabase
        .from('automation_proposals')
        .update({ proposal_status: 'execution_failed' })
        .eq('id', execution.proposal_id)
        .eq('org_id', orgId)
      await emitEvent(supabase, {
        orgId,
        proposalId: execution.proposal_id,
        executionId: execution.id,
        decisionId: execution.decision_id,
        eventType: 'execution_failed',
        payload: { execution_id: execution.id, error_code: 'status_update_failed', error_message: succeedError.message },
        actorUserId,
      })
      return { status: 'failed', reason: 'status_update_failed', detail: succeedError.message }
    }

    // Soft execution: no real business action → do not mark proposal as executed; it stays queued_for_execution.
    if (!runResult.result_json?.soft_execution) {
      const { error: propUpdateError } = await supabase
        .from('automation_proposals')
        .update({ proposal_status: 'executed' })
        .eq('id', execution.proposal_id)
        .eq('org_id', orgId)

      if (propUpdateError) {
        console.warn('runAutomationExecutionManually: proposal status update failed', { proposalId: execution.proposal_id, error: propUpdateError.message })
      }
    }

    await emitEvent(supabase, {
      orgId,
      proposalId: execution.proposal_id,
      executionId: execution.id,
      decisionId: execution.decision_id,
      eventType: 'execution_succeeded',
      payload: { execution_id: execution.id, execution_status: 'succeeded', result: runResult.result_json },
      actorUserId,
    })

    return { status: 'succeeded' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('runAutomationExecutionManually: unexpected error', { executionId, orgId, error: message })
    return { status: 'blocked', reason: 'intent_creation_failed', detail: message }
  }
}
