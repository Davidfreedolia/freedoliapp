import { supabase } from '../../supabase'

/**
 * Reliability stats for automation executions.
 *
 * @param {{ orgId: string }} params
 * @returns {Promise<{ total: number, succeeded: number, failed: number, running: number, queued: number }>}
 */
export async function getAutomationExecutionStats(params) {
  const { orgId } = params || {}
  if (!orgId) {
    return { total: 0, succeeded: 0, failed: 0, running: 0, queued: 0 }
  }

  async function count(status) {
    const { count, error } = await supabase
      .from('automation_executions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('execution_status', status)
    if (error) {
      console.warn('getAutomationExecutionStats: count failed', { orgId, status, error: error.message })
      return 0
    }
    return count ?? 0
  }

  const [totalRes, succeeded, failed, running, queued] = await Promise.all([
    supabase
      .from('automation_executions')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
    count('succeeded'),
    count('failed'),
    count('running'),
    count('queued'),
  ])

  return {
    total: totalRes.error ? 0 : totalRes.count ?? 0,
    succeeded,
    failed,
    running,
    queued,
  }
}

