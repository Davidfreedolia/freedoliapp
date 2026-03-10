import { supabase } from '../../supabase'

/**
 * Risk distribution for automation proposals by risk_band.
 *
 * @param {{ orgId: string }} params
 * @returns {Promise<Array<{ band: string, count: number }>>}
 */
export async function getAutomationRiskStats(params) {
  const { orgId } = params || {}
  if (!orgId) return []

  const bands = ['low', 'medium', 'high', 'critical']

  const results = await Promise.all(
    bands.map(async (band) => {
      const { count, error } = await supabase
        .from('automation_proposals')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('risk_band', band)
      if (error) {
        console.warn('getAutomationRiskStats: count failed', { orgId, band, error: error.message })
        return { band, count: 0 }
      }
      return { band, count: count ?? 0 }
    })
  )

  return results
}

