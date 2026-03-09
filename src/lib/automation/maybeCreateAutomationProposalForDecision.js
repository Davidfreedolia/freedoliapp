/**
 * D57.2 — Single entry point: evaluate eligibility and create proposal if eligible.
 */

import { evaluateDecisionAutomationEligibility } from './evaluateDecisionAutomationEligibility.js'
import { buildAutomationProposalFromDecision } from './buildAutomationProposalFromDecision.js'
import { createAutomationProposal } from './createAutomationProposal.js'

/**
 * For a given decision, evaluate automation eligibility and create an automation_proposal if eligible.
 * Does not execute any action. Does not create proposal if not eligible or duplicate.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ orgId: string, decisionId: string }} params
 * @returns {Promise<{ created: boolean, proposalId?: string, reason?: string }>}
 */
export async function maybeCreateAutomationProposalForDecision(supabase, params) {
  const { orgId, decisionId } = params || {}
  if (!orgId || !decisionId) {
    return { created: false, reason: 'orgId and decisionId required' }
  }

  const eligibility = await evaluateDecisionAutomationEligibility(supabase, { orgId, decisionId })
  if (!eligibility.eligible) {
    return { created: false, reason: eligibility.reason ?? 'not_eligible', detail: eligibility.detail }
  }

  const { data: decision } = await supabase
    .from('decisions')
    .select('*')
    .eq('id', decisionId)
    .eq('org_id', orgId)
    .single()

  const { data: contextRows } = await supabase
    .from('decision_context')
    .select('key, value')
    .eq('decision_id', decisionId)

  const context = {}
  for (const row of contextRows || []) {
    context[row.key] = row.value
  }

  const proposalRow = buildAutomationProposalFromDecision({
    decision,
    rule: eligibility.rule,
    context,
  })

  const result = await createAutomationProposal(supabase, proposalRow)
  if (!result.ok) {
    return { created: false, reason: result.reason ?? 'create_failed' }
  }
  return { created: true, proposalId: result.proposalId }
}
