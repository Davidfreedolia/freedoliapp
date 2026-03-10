import { supabase } from '../../supabase'

/**
 * Summary metrics for automation: proposals and executions by status.
 *
 * Read-only, org-scoped.
 *
 * @param {{ orgId: string }} params
 * @returns {Promise<{
 *   proposalsTotal: number,
 *   proposalsPendingApproval: number,
 *   proposalsApproved: number,
 *   proposalsQueued: number,
 *   proposalsExecuted: number,
 *   proposalsExecutionFailed: number,
 *   executionsTotal: number,
 *   executionsSucceeded: number,
 *   executionsFailed: number,
 *   executionSuccessRate: number | null
 * }>}
 */
export async function getAutomationMetricsSummary(params) {
  const { orgId } = params || {}
  if (!orgId) {
    return {
      proposalsTotal: 0,
      proposalsPendingApproval: 0,
      proposalsApproved: 0,
      proposalsQueued: 0,
      proposalsExecuted: 0,
      proposalsExecutionFailed: 0,
      executionsTotal: 0,
      executionsSucceeded: 0,
      executionsFailed: 0,
      executionSuccessRate: null,
    }
  }

  async function countProposals(status) {
    const { count, error } = await supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('proposal_status', status)
    if (error) {
      console.warn('getAutomationMetricsSummary: proposal count failed', { orgId, status, error: error.message })
      return 0
    }
    return count ?? 0
  }

  async function countExecutions(status) {
    const { count, error } = await supabase
      .from('automation_executions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('execution_status', status)
    if (error) {
      console.warn('getAutomationMetricsSummary: execution count failed', { orgId, status, error: error.message })
      return 0
    }
    return count ?? 0
  }

  const [
    totalProposalsRes,
    pendingApproval,
    approved,
    queued,
    executed,
    executionFailed,
    totalExecRes,
    execSucceeded,
    execFailed,
  ] = await Promise.all([
    supabase
      .from('automation_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    countProposals('pending_approval'),
    countProposals('approved'),
    countProposals('queued_for_execution'),
    countProposals('executed'),
    countProposals('execution_failed'),
    supabase
      .from('automation_executions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    countExecutions('succeeded'),
    countExecutions('failed'),
  ])

  const buckets = [pendingApproval, approved, queued, executed, executionFailed].map((v) =>
    Number.isFinite(v) ? Math.max(0, v) : 0,
  )
  const proposalsTotal = buckets.reduce((acc, v) => acc + v, 0)

  const executionsTotal = totalExecRes.error ? 0 : totalExecRes.count ?? 0

  const denom = execSucceeded + execFailed
  const executionSuccessRate =
    denom > 0 ? Math.max(0, Math.min(1, execSucceeded / denom)) : null

  return {
    proposalsTotal,
    proposalsPendingApproval: pendingApproval,
    proposalsApproved: approved,
    proposalsQueued: queued,
    proposalsExecuted: executed,
    proposalsExecutionFailed: executionFailed,
    executionsTotal,
    executionsSucceeded: execSucceeded,
    executionsFailed: execFailed,
    executionSuccessRate,
  }
}

