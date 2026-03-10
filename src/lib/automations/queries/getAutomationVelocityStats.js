import { supabase } from '../../supabase'

/**
 * Velocity stats for automation: proposals created per day (last 14 days).
 *
 * @param {{ orgId: string }} params
 * @returns {Promise<Array<{ date: string, proposals: number }>>}
 */
export async function getAutomationVelocityStats(params) {
  const { orgId } = params || {}
  if (!orgId) return []

  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - 13) // 14 dies incloent avui
  const fromIso = from.toISOString()

  const { data, error } = await supabase
    .from('automation_proposals')
    .select('created_at', { count: 'exact' })
    .eq('org_id', orgId)
    .gte('created_at', fromIso)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('getAutomationVelocityStats: query failed', { orgId, error: error.message })
    return []
  }

  const buckets = new Map()
  const rows = Array.isArray(data) ? data : []
  rows.forEach((row) => {
    const d = row.created_at ? new Date(row.created_at) : null
    if (!d) return
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  })

  const result = []
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, proposals: buckets.get(key) ?? 0 })
  }

  return result
}

