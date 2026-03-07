/**
 * D13 Slice 3 — Workspace profit: profit per tots els ASIN del workspace.
 * Reutilitza getAsinProfitData(); no duplica càlculs ni fórmules.
 * Tot filtrat per org_id.
 */
import { getAsinProfitData } from './getAsinProfitData.js'

/**
 * Obtenir tots els ASIN del workspace (product_identifiers per org_id).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<string[]>}
 */
async function getWorkspaceAsins(supabase, orgId) {
  const { data, error } = await supabase
    .from('product_identifiers')
    .select('asin')
    .eq('org_id', orgId)
    .not('asin', 'is', null)
  if (error) return []
  const asins = [...new Set((data || []).map((r) => (r.asin || '').trim()).filter(Boolean))]
  return asins
}

/**
 * Profit per tots els ASIN del workspace. Ordenat per netProfit DESC.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ dateFrom?: string, dateTo?: string, marketplace?: string }} [options]
 * @returns {Promise<Array<{ asin: string, revenue: number, netProfit: number, margin: number, roi: number }>>}
 */
export async function getWorkspaceProfit(supabase, orgId, options = {}) {
  const asins = await getWorkspaceAsins(supabase, orgId)
  const results = await Promise.all(
    asins.map(async (asin) => {
      const row = await getAsinProfitData(supabase, orgId, asin, options)
      return {
        asin: row.asin,
        revenue: row.revenue,
        netProfit: row.netProfit,
        margin: row.margin,
        roi: row.roi,
      }
    })
  )
  results.sort((a, b) => b.netProfit - a.netProfit)
  return results
}
