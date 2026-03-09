/**
 * D57.3 — Approve one step (or the proposal when gate is satisfied). No execution.
 */

import { validateApprovalActor } from './validateApprovalActor.js'
import { isProposalGateSatisfied, getNextPendingStep } from './proposalGateState.js'

/**
 * Record an automation event (best-effort, no throw).
 */
async function appendEvent(supabase, payload) {
  try {
    const { error } = await supabase.from('automation_events').insert(payload)
    if (error) console.warn('approveAutomationProposal: event insert failed', { error: error.message })
  } catch (err) {
    console.warn('approveAutomationProposal: event insert failed', err)
  }
}

/**
 * Approve a proposal (one step). If gate becomes satisfied, proposal status → approved.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string, comment?: string }} params
 * @returns {Promise<{ ok: boolean, proposalStatus?: string, reason?: string }>}
 */
export async function approveAutomationProposal(supabase, params) {
  const { proposalId, orgId, comment } = params || {}
  if (!proposalId || !orgId) {
    return { ok: false, reason: 'proposalId and orgId required' }
  }

  const { data: proposal, error: propError } = await supabase
    .from('automation_proposals')
    .select('id, org_id, proposal_status, approval_mode')
    .eq('id', proposalId)
    .eq('org_id', orgId)
    .single()

  if (propError || !proposal) {
    return { ok: false, reason: 'proposal_not_found' }
  }

  if (proposal.proposal_status !== 'pending_approval') {
    return { ok: false, reason: 'proposal_not_pending' }
  }

  const { data: steps, error: stepsError } = await supabase
    .from('automation_approvals')
    .select('id, approval_step, approval_status, required_role')
    .eq('proposal_id', proposalId)
    .order('approval_step', { ascending: true })

  if (stepsError || !steps?.length) {
    return { ok: false, reason: 'approval_steps_not_found' }
  }

  const next = getNextPendingStep(proposal, steps)
  if (!next) {
    return { ok: false, reason: 'no_pending_step' }
  }

  const stepRow = steps.find((s) => s.id === next.id)
  const requiredRole = stepRow?.required_role ?? null

  const actor = await validateApprovalActor(supabase, { orgId, requiredRole })
  if (!actor.ok) {
    return { ok: false, reason: actor.reason ?? 'actor_invalid' }
  }

  const now = new Date().toISOString()

  const { error: updateStepError } = await supabase
    .from('automation_approvals')
    .update({
      approval_status: 'approved',
      acted_at: now,
      acted_by: actor.userId,
      comment: comment ?? null,
    })
    .eq('id', next.id)
    .eq('org_id', orgId)

  if (updateStepError) {
    console.error('approveAutomationProposal: step update failed', updateStepError)
    return { ok: false, reason: updateStepError.message }
  }

  await appendEvent(supabase, {
    org_id: orgId,
    proposal_id: proposalId,
    decision_id: null,
    event_type: 'approval_granted',
    event_payload_json: { step_id: next.id, approval_step: next.approval_step, acted_by: actor.userId },
    actor_type: 'user',
    actor_id: actor.userId,
  })

  const updatedSteps = steps.map((s) =>
    s.id === next.id ? { ...s, approval_status: 'approved', acted_at: now, acted_by: actor.userId } : s
  )

  if (isProposalGateSatisfied(proposal, updatedSteps)) {
    const { error: updatePropError } = await supabase
      .from('automation_proposals')
      .update({
        proposal_status: 'approved',
        approved_at: now,
        approved_by: actor.userId,
      })
      .eq('id', proposalId)
      .eq('org_id', orgId)

    if (updatePropError) {
      console.error('approveAutomationProposal: proposal update failed', updatePropError)
      return { ok: true, proposalStatus: 'pending_approval', reason: 'step_approved_gate_update_failed' }
    }

    await appendEvent(supabase, {
      org_id: orgId,
      proposal_id: proposalId,
      decision_id: null,
      event_type: 'proposal_approved',
      event_payload_json: { approved_by: actor.userId },
      actor_type: 'user',
      actor_id: actor.userId,
    })

    return { ok: true, proposalStatus: 'approved' }
  }

  return { ok: true, proposalStatus: 'pending_approval' }
}
