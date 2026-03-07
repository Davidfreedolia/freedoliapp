/**
 * D13 Slice 2 — Aggregate real data per ASIN and return profit result.
 * Uses existing views (product_identifiers, v_product_econ_day, v_product_profit_day).
 * Single calculation layer: calculateAsinProfit().
 * Multi-tenant: all queries scoped by org_id.
 */
import { calculateAsinProfit } from './profitEngine.js'

/**
 * Resolve project_id (product) for org + ASIN. Returns null if not found.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} asin
 * @returns {Promise<string|null>}
 */
async function resolveProductId(supabase, orgId, asin) {
  const normalized = (asin || '').trim().toUpperCase()
  if (!normalized) return null
  const { data, error } = await supabase
    .from('product_identifiers')
    .select('project_id')
    .eq('org_id', orgId)
    .ilike('asin', normalized)
    .not('project_id', 'is', null)
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.project_id ?? null
}

/**
 * Aggregate revenue and cost components from v_product_econ_day for a product in a date range.
 * v_product_econ_day: gross_sales (positive), refunds/amazon_fees/ads/freight/duties/other_costs (typically negative).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} productId
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<{ revenue: number, amazonFees: number, adsCost: number, refunds: number, cogs: number, shipping: number }>}
 */
async function aggregateEcon(supabase, orgId, productId, dateFrom, dateTo) {
  const { data: rows, error } = await supabase
    .from('v_product_econ_day')
    .select('gross_sales, refunds, amazon_fees, ads, freight, duties, other_costs')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .gte('d', dateFrom)
    .lte('d', dateTo)

  if (error) {
    return { revenue: 0, amazonFees: 0, adsCost: 0, refunds: 0, cogs: 0, shipping: 0 }
  }

  let revenue = 0
  let refundsSum = 0
  let amazonFees = 0
  let adsCost = 0
  let freight = 0
  let duties = 0
  let otherCosts = 0

  for (const r of rows || []) {
    revenue += Number(r.gross_sales) || 0
    refundsSum += Number(r.refunds) || 0
    amazonFees += Number(r.amazon_fees) || 0
    adsCost += Number(r.ads) || 0
    freight += Number(r.freight) || 0
    duties += Number(r.duties) || 0
    otherCosts += Number(r.other_costs) || 0
  }

  return {
    revenue,
    amazonFees: Math.abs(amazonFees),
    adsCost: Math.abs(adsCost),
    refunds: Math.abs(refundsSum),
    cogs: 0,
    shipping: Math.abs(freight) + Math.abs(duties) + Math.abs(otherCosts),
  }
}

/**
 * Sum COGS from v_product_profit_day for product in date range. Currently view returns 0/NULL; future cost pool will fill.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} productId
 * @param {string} dateFrom
 * @param {string} dateTo
 * @returns {Promise<number>}
 */
async function aggregateCogs(supabase, orgId, productId, dateFrom, dateTo) {
  const { data: rows, error } = await supabase
    .from('v_product_profit_day')
    .select('cogs')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .gte('d', dateFrom)
    .lte('d', dateTo)

  if (error) return 0
  let sum = 0
  for (const r of rows || []) {
    const v = Number(r?.cogs)
    if (Number.isFinite(v) && v > 0) sum += v
  }
  return sum
}

/**
 * Get aggregated profit data for an ASIN in an org, then run pure profit calculation.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} asin
 * @param {{ dateFrom?: string, dateTo?: string, marketplace?: string }} [options]
 * @returns {Promise<{
 *   asin: string,
 *   marketplace: string | null,
 *   dateFrom: string | null,
 *   dateTo: string | null,
 *   revenue: number,
 *   amazonFees: number,
 *   adsCost: number,
 *   refunds: number,
 *   cogs: number,
 *   shipping: number,
 *   netProfit: number,
 *   margin: number,
 *   roi: number
 * }>}
 */
export async function getAsinProfitData(supabase, orgId, asin, options = {}) {
  const dateFrom = options?.dateFrom ?? null
  const dateTo = options?.dateTo ?? null
  const marketplace = options?.marketplace ?? null

  const fromStr = dateFrom && dateTo ? dateFrom : null
  const toStr = dateFrom && dateTo ? dateTo : null

  const productId = await resolveProductId(supabase, orgId, asin)
  if (!productId) {
    const zero = calculateAsinProfit({})
    return {
      asin: (asin || '').trim(),
      marketplace: marketplace ?? null,
      dateFrom: fromStr,
      dateTo: toStr,
      ...zero,
    }
  }

  const econ = fromStr && toStr
    ? await aggregateEcon(supabase, orgId, productId, fromStr, toStr)
    : { revenue: 0, amazonFees: 0, adsCost: 0, refunds: 0, cogs: 0, shipping: 0 }

  const cogs = fromStr && toStr
    ? await aggregateCogs(supabase, orgId, productId, fromStr, toStr)
    : 0

  const result = calculateAsinProfit({
    revenue: econ.revenue,
    amazonFees: econ.amazonFees,
    adsCost: econ.adsCost,
    refunds: econ.refunds,
    cogs,
    shipping: econ.shipping,
  })

  return {
    asin: (asin || '').trim(),
    marketplace: marketplace ?? null,
    dateFrom: fromStr,
    dateTo: toStr,
    ...result,
  }
}
