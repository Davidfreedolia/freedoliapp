import { supabase } from '../../supabase'

/**
 * Funnel stats from decision → proposal → approval → execution → result.
 * Note: first stage counts proposals linked to decisions (not total decisions).
 *
 * @param {{ orgId: string }} params
 * @returns {Promise<{ proposalLinkedDecisions: number, proposalsTotal: number, proposalsPendingApproval: number, proposalsApproved: number, proposalsQueued: number, proposalsExecuted: number }>}
 */
export async function getAutomationFunnelStats(params) {
  const { orgId } = params || {}
  if (!orgId) {
    return {
      proposalLinkedDecisions: 0,
      proposalsTotal: 0,
      proposalsPendingApproval: 0,
      proposalsApproved: 0,
      proposalsQueued: 0,
      proposalsExecuted: 0,
    }
  }

  const [decisionsRes, totalPropsRes, pendingRes, approvedRes, queuedRes, executedRes] = await Promise.all([
    supabase
      .from('automation_proposals')
      .select('decision_id', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('proposal_status', 'pending_approval'),
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('proposal_status', 'approved'),
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('proposal_status', 'queued_for_execution'),
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('proposal_status', 'executed'),
  ])

  return {
    proposalLinkedDecisions: decisionsRes.error ? 0 : decisionsRes.count ?? 0,
    proposalsTotal: totalPropsRes.error ? 0 : totalPropsRes.count ?? 0,
    proposalsPendingApproval: pendingRes.error ? 0 : pendingRes.count ?? 0,
    proposalsApproved: approvedRes.error ? 0 : approvedRes.count ?? 0,
    proposalsQueued: queuedRes.error ? 0 : queuedRes.count ?? 0,
    proposalsExecuted: executedRes.error ? 0 : executedRes.count ?? 0,
  }
}

