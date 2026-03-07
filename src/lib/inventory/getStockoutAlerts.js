/**
 * D16 Slice 2 — Alertes de stockout a nivell workspace.
 * Per cada ASIN del workspace crida detectStockoutRisk(); retorna llista ordenada per urgència (daysOfStock ASC).
 * No duplica lògica; tot filtrat per org_id.
 */
import { detectStockoutRisk } from './detectStockoutRisk.js'

/**
 * Obtenir tots els ASIN únics del workspace (product_identifiers, org_id, asin no null).
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
  return [...new Set((data || []).map((r) => (r.asin || '').trim()).filter(Boolean))]
}

/**
 * Alertes de stockout per tots els ASIN del workspace.
 * Ordenat per daysOfStock ASC (el més urgent primer).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ lookbackDays?: number }} [options]
 * @returns {Promise<Array<{ asin: string, currentStock: number, dailySales: number, daysOfStock: number }>>}
 */
export async function getStockoutAlerts(supabase, orgId, options = {}) {
  const asins = await getWorkspaceAsins(supabase, orgId)
  const lookbackDays = options?.lookbackDays ?? 30

  const results = await Promise.all(
    asins.map((asin) => detectStockoutRisk(supabase, orgId, { asin, lookbackDays }))
  )

  const alerts = results.filter((r) => r != null)
  alerts.sort((a, b) => (a.daysOfStock ?? Infinity) - (b.daysOfStock ?? Infinity))
  return alerts
}
