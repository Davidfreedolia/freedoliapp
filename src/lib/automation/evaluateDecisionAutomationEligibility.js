/**
 * D57.2 — Evaluate whether a decision is eligible for automation (proposal generation).
 */

import { DECISION_TYPE_TO_ACTION_TYPE, SUPPORTED_ACTION_TYPES } from './constants.js'
import { getAutomationRuleForAction } from './getAutomationRuleForAction.js'

const ACTIVE_PROPOSAL_STATUSES = [
  'drafted',
  'pending_approval',
  'approved',
  'queued_for_execution',
]

/**
 * Evaluate if a decision is eligible for creating an automation proposal.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, decisionId: string, actionType?: string }} params
 * @returns {Promise<{ eligible: boolean, reason?: 'eligible'|'not_eligible'|'blocked', detail?: string, actionType?: string, rule?: object }>}
 */
export async function evaluateDecisionAutomationEligibility(supabase, params) {
  const { orgId, decisionId, actionType: givenActionType } = params || {}
  if (!orgId || !decisionId) {
    return { eligible: false, reason: 'not_eligible', detail: 'orgId and decisionId are required' }
  }

  const { data: decision, error: decError } = await supabase
    .from('decisions')
    .select('id, org_id, decision_type, status')
    .eq('id', decisionId)
    .eq('org_id', orgId)
    .limit(1)
    .maybeSingle()

  if (decError || !decision) {
    return { eligible: false, reason: 'not_eligible', detail: 'Decision not found or org mismatch' }
  }

  if (decision.status !== 'open' && decision.status !== 'acknowledged') {
    return { eligible: false, reason: 'not_eligible', detail: 'Decision is not open or acknowledged' }
  }

  const actionType = givenActionType ?? DECISION_TYPE_TO_ACTION_TYPE[decision.decision_type]
  if (!actionType || !SUPPORTED_ACTION_TYPES.includes(actionType)) {
    return { eligible: false, reason: 'not_eligible', detail: 'Action type not supported for this decision' }
  }

  const rule = await getAutomationRuleForAction(supabase, { orgId, actionType })
  if (!rule) {
    return { eligible: false, reason: 'not_eligible', detail: 'No active automation rule for this action type', actionType }
  }

  if (rule.automation_level < 1) {
    return { eligible: false, reason: 'not_eligible', detail: 'Rule automation level is recommendation-only', actionType, rule }
  }

  const { data: contextRows } = await supabase
    .from('decision_context')
    .select('key, value')
    .eq('decision_id', decisionId)

  const context = {}
  for (const row of contextRows || []) {
    context[row.key] = row.value
  }

  const hasMinContext = (context.asin != null && String(context.asin).trim() !== '') ||
    (context.project_id != null && String(context.project_id).trim() !== '')
  if (!hasMinContext) {
    return { eligible: false, reason: 'not_eligible', detail: 'missing_context', actionType }
  }

  const { data: existing } = await supabase
    .from('automation_proposals')
    .select('id')
    .eq('org_id', orgId)
    .eq('decision_id', decisionId)
    .eq('action_type', actionType)
    .in('proposal_status', ACTIVE_PROPOSAL_STATUSES)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { eligible: false, reason: 'blocked', detail: 'An active proposal already exists for this decision and action', actionType }
  }

  return { eligible: true, reason: 'eligible', actionType, rule }
}
