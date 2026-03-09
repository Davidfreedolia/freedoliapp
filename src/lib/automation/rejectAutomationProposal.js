/**
 * D57.3 — Reject a proposal (terminal). No execution.
 */

import { validateApprovalActor } from './validateApprovalActor.js'

async function appendEvent(supabase, payload) {
  try {
    const { error } = await supabase.from('automation_events').insert(payload)
    if (error) console.warn('rejectAutomationProposal: event insert failed', { error: error.message })
  } catch (err) {
    console.warn('rejectAutomationProposal: event insert failed', err)
  }
}

/**
 * Reject a proposal. Terminal: proposal_status → rejected.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string, comment?: string }} params
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function rejectAutomationProposal(supabase, params) {
  const { proposalId, orgId, comment } = params || {}
  if (!proposalId || !orgId) {
    return { ok: false, reason: 'proposalId and orgId required' }
  }

  const { data: proposal, error: propError } = await supabase
    .from('automation_proposals')
    .select('id, org_id, proposal_status, decision_id')
    .eq('id', proposalId)
    .eq('org_id', orgId)
    .single()

  if (propError || !proposal) {
    return { ok: false, reason: 'proposal_not_found' }
  }

  if (proposal.proposal_status !== 'pending_approval') {
    return { ok: false, reason: 'proposal_not_pending' }
  }

  const actor = await validateApprovalActor(supabase, { orgId })
  if (!actor.ok) {
    return { ok: false, reason: actor.reason ?? 'actor_invalid' }
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('automation_proposals')
    .update({
      proposal_status: 'rejected',
      rejected_at: now,
      rejected_by: actor.userId,
    })
    .eq('id', proposalId)
    .eq('org_id', orgId)

  if (updateError) {
    console.error('rejectAutomationProposal: update failed', updateError)
    return { ok: false, reason: updateError.message }
  }

  const decisionId = proposal.decision_id ?? null

  await appendEvent(supabase, {
    org_id: orgId,
    proposal_id: proposalId,
    decision_id: decisionId,
    event_type: 'approval_rejected',
    event_payload_json: { acted_by: actor.userId, comment: comment ?? null },
    actor_type: 'user',
    actor_id: actor.userId,
  })

  await appendEvent(supabase, {
    org_id: orgId,
    proposal_id: proposalId,
    decision_id: decisionId,
    event_type: 'proposal_rejected',
    event_payload_json: { rejected_by: actor.userId, comment: comment ?? null },
    actor_type: 'user',
    actor_id: actor.userId,
  })

  return { ok: true }
}
