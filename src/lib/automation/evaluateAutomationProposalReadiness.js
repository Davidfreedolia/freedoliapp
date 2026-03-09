/**
 * D57.4 — Evaluate whether an approved automation_proposal is ready for (future) execution.
 * No execution. Writes only to automation_proposals and automation_events when invalidating.
 */

import { SUPPORTED_ACTION_TYPES } from './constants.js'
import { getAutomationRuleForAction } from './getAutomationRuleForAction.js'

/**
 * Same deterministic hash as buildAutomationProposalFromDecision for context comparison.
 * @param {object} obj
 * @returns {string}
 */
function simpleHash(obj) {
  try {
    const keys = Object.keys(obj).sort()
    const str = JSON.stringify(obj, keys)
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i)
      h = h & h
    }
    return String(Math.abs(h))
  } catch {
    return ''
  }
}

/**
 * Invalidate proposal and emit proposal_invalidated event (best-effort).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string, decisionId?: string | null, reason: string }} params
 */
async function invalidateProposal(supabase, params) {
  const { proposalId, orgId, decisionId, reason } = params
  const now = new Date().toISOString()

  await supabase
    .from('automation_proposals')
    .update({
      proposal_status: 'invalidated',
      invalidated_at: now,
      invalidation_reason: reason,
    })
    .eq('id', proposalId)
    .eq('org_id', orgId)

  try {
    const { error } = await supabase.from('automation_events').insert({
      org_id: orgId,
      proposal_id: proposalId,
      decision_id: decisionId ?? null,
      event_type: 'proposal_invalidated',
      event_payload_json: { reason },
      actor_type: 'system',
      actor_id: null,
    })
    if (error) console.warn('evaluateAutomationProposalReadiness: proposal_invalidated event failed', { proposalId, error: error.message })
  } catch (err) {
    console.warn('evaluateAutomationProposalReadiness: proposal_invalidated event failed', { proposalId, error: err })
  }
}

/**
 * Emit proposal_readiness_checked event (best-effort).
 */
function emitReadinessChecked(supabase, params) {
  const { orgId, proposalId, decisionId, result, reason } = params
  try {
    supabase.from('automation_events').insert({
      org_id: orgId,
      proposal_id: proposalId,
      decision_id: decisionId ?? null,
      event_type: 'proposal_readiness_checked',
      event_payload_json: { result, reason: reason ?? null },
      actor_type: 'system',
      actor_id: null,
    }).then(({ error }) => {
      if (error) console.warn('evaluateAutomationProposalReadiness: proposal_readiness_checked event failed', { proposalId, error: error.message })
    })
  } catch (err) {
    console.warn('evaluateAutomationProposalReadiness: proposal_readiness_checked event failed', { proposalId, error: err })
  }
}

/**
 * Evaluate if an approved automation_proposal is ready for (future) execution.
 * May invalidate the proposal if it fails revalidation (expired, decision closed, context mismatch, rule disabled, etc.).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ proposalId: string, orgId: string }} params
 * @returns {Promise<{ status: 'ready'|'blocked'|'invalidated', reason?: string, detail?: string }>}
 */
export async function evaluateAutomationProposalReadiness(supabase, params) {
  const { proposalId, orgId } = params || {}
  if (!proposalId || !orgId) {
    return { status: 'blocked', reason: 'missing_params', detail: 'proposalId and orgId required' }
  }

  try {
    const { data: proposal, error: propError } = await supabase
    .from('automation_proposals')
    .select('id, org_id, decision_id, action_type, proposal_status, context_hash, expires_at, invalidated_at, invalidation_reason, created_at')
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
    return { status: 'invalidated', reason: 'already_invalidated', detail: proposal.invalidation_reason ?? 'already_invalidated' }
  }

  const now = new Date()
  const nowIso = now.toISOString()

  if (proposal.expires_at && new Date(proposal.expires_at) < now) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'expired',
    })
    return { status: 'invalidated', reason: 'expired', detail: 'Proposal has expired' }
  }

  const { data: decision, error: decError } = await supabase
    .from('decisions')
    .select('id, org_id, status')
    .eq('id', proposal.decision_id)
    .eq('org_id', orgId)
    .single()

  if (decError || !decision) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'decision_not_found',
    })
    return { status: 'invalidated', reason: 'decision_not_found', detail: 'Source decision no longer exists' }
  }

  if (decision.status !== 'open' && decision.status !== 'acknowledged') {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'decision_closed',
    })
    return { status: 'invalidated', reason: 'decision_closed', detail: 'Source decision is closed or resolved' }
  }

  const { data: contextRows } = await supabase
    .from('decision_context')
    .select('key, value')
    .eq('decision_id', proposal.decision_id)

  const context = {}
  for (const row of contextRows || []) {
    context[row.key] = row.value
  }

  const hasMinContext = (context.asin != null && String(context.asin).trim() !== '') ||
    (context.project_id != null && String(context.project_id).trim() !== '')
  if (!hasMinContext) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'context_unavailable',
    })
    return { status: 'invalidated', reason: 'context_unavailable', detail: 'Minimum context (asin or project_id) no longer available' }
  }

  const currentHash = simpleHash(context)
  if (proposal.context_hash != null && currentHash !== proposal.context_hash) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'context_mismatch',
    })
    return { status: 'invalidated', reason: 'context_mismatch', detail: 'Context has changed since proposal was created' }
  }

  const { data: conflicting } = await supabase
    .from('automation_proposals')
    .select('id')
    .eq('org_id', orgId)
    .eq('decision_id', proposal.decision_id)
    .eq('action_type', proposal.action_type)
    .in('proposal_status', ['approved', 'queued_for_execution', 'drafted', 'pending_approval'])
    .gt('created_at', proposal.created_at)
    .limit(1)
    .maybeSingle()

  if (conflicting) {
    return { status: 'blocked', reason: 'conflicting_newer_proposal', detail: 'A more recent active proposal exists for the same decision/action' }
  }

  if (!SUPPORTED_ACTION_TYPES.includes(proposal.action_type)) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'action_type_unsupported',
    })
    return { status: 'invalidated', reason: 'action_type_unsupported', detail: 'Action type is no longer supported' }
  }

  const rule = await getAutomationRuleForAction(supabase, { orgId, actionType: proposal.action_type })
  if (!rule) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'rule_not_found',
    })
    return { status: 'invalidated', reason: 'rule_not_found', detail: 'No active automation rule for this action type' }
  }

  if (rule.is_enabled === false) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'rule_disabled',
    })
    return { status: 'invalidated', reason: 'rule_disabled', detail: 'Automation rule has been disabled' }
  }

  const level = Number(rule.automation_level)
  if (!Number.isFinite(level) || level < 1) {
    await invalidateProposal(supabase, {
      proposalId,
      orgId,
      decisionId: proposal.decision_id,
      reason: 'rule_level_not_allowed',
    })
    return { status: 'invalidated', reason: 'rule_level_not_allowed', detail: 'Rule automation level no longer allows execution' }
  }

  emitReadinessChecked(supabase, {
    orgId,
    proposalId,
    decisionId: proposal.decision_id,
    result: 'ready',
    reason: null,
  })

    return { status: 'ready' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('evaluateAutomationProposalReadiness: unexpected error', { proposalId, orgId, error: message })
    return { status: 'blocked', reason: 'readiness_check_failed', detail: message }
  }
}
