/**
 * D14 Slice 2 — Alertes de compressió de marge a nivell workspace.
 * Per cada ASIN del workspace crida detectMarginCompression(); retorna llista ordenada per severitat.
 * No duplica fórmules; tot filtrat per org_id.
 */
import { detectMarginCompression } from './detectMarginCompression.js'

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
 * Alertes de compressió de marge per tots els ASIN del workspace.
 * Ordenat per marginDrop DESC (major severitat primer).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ lookbackDays?: number, recentDays?: number, marketplace?: string }} [options]
 * @returns {Promise<Array<{ asin: string, averageMarginLookback: number, averageMarginRecent: number, marginDrop: number }>>}
 */
export async function getMarginCompressionAlerts(supabase, orgId, options = {}) {
  const asins = await getWorkspaceAsins(supabase, orgId)
  const lookbackDays = options?.lookbackDays
  const recentDays = options?.recentDays
  const marketplace = options?.marketplace

  const results = await Promise.all(
    asins.map(async (asin) => {
      const opts = { asin, lookbackDays, recentDays }
      if (marketplace) opts.marketplace = marketplace
      return detectMarginCompression(supabase, orgId, opts)
    })
  )

  const alerts = results.filter((r) => r != null)
  alerts.sort((a, b) => (b.marginDrop ?? 0) - (a.marginDrop ?? 0))
  return alerts
}
