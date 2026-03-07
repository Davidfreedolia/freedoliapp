/**
 * D13 Slice 5 — Profit per dia (timeseries) per tendència temporal.
 * Llegeix v_product_econ_day i v_product_profit_day, agrega per dia, crida calculateAsinProfit().
 * No duplica fórmules; tot filtrat per org_id.
 */
import { calculateAsinProfit } from './profitEngine.js'

/**
 * Resolve project_id from org + ASIN. Returns null if not found.
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
 * Fetch v_product_econ_day rows and aggregate by day (d).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} dateFrom
 * @param {string} dateTo
 * @param {string|null} productId
 * @returns {Promise<Map<string, { revenue: number, amazonFees: number, adsCost: number, refunds: number, shipping: number }>>}
 */
async function fetchEconByDay(supabase, orgId, dateFrom, dateTo, productId) {
  let q = supabase
    .from('v_product_econ_day')
    .select('d, gross_sales, refunds, amazon_fees, ads, freight, duties, other_costs')
    .eq('org_id', orgId)
    .gte('d', dateFrom)
    .lte('d', dateTo)
  if (productId) q = q.eq('product_id', productId)
  const { data: rows, error } = await q
  if (error) return new Map()

  const byDay = new Map()
  for (const r of rows || []) {
    const d = r?.d ? String(r.d).slice(0, 10) : null
    if (!d) continue
    const cur = byDay.get(d) || { revenue: 0, refundsSum: 0, amazonFees: 0, adsCost: 0, freight: 0, duties: 0, otherCosts: 0 }
    cur.revenue += Number(r.gross_sales) || 0
    cur.refundsSum += Number(r.refunds) || 0
    cur.amazonFees += Number(r.amazon_fees) || 0
    cur.adsCost += Number(r.ads) || 0
    cur.freight += Number(r.freight) || 0
    cur.duties += Number(r.duties) || 0
    cur.otherCosts += Number(r.other_costs) || 0
    byDay.set(d, cur)
  }
  const out = new Map()
  for (const [d, cur] of byDay) {
    out.set(d, {
      revenue: cur.revenue,
      amazonFees: Math.abs(cur.amazonFees),
      adsCost: Math.abs(cur.adsCost),
      refunds: Math.abs(cur.refundsSum),
      shipping: Math.abs(cur.freight) + Math.abs(cur.duties) + Math.abs(cur.otherCosts),
    })
  }
  return out
}

/**
 * Fetch v_product_profit_day and sum cogs by day.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} dateFrom
 * @param {string} dateTo
 * @param {string|null} productId
 * @returns {Promise<Map<string, number>>}
 */
async function fetchCogsByDay(supabase, orgId, dateFrom, dateTo, productId) {
  let q = supabase
    .from('v_product_profit_day')
    .select('d, cogs')
    .eq('org_id', orgId)
    .gte('d', dateFrom)
    .lte('d', dateTo)
  if (productId) q = q.eq('product_id', productId)
  const { data: rows, error } = await q
  if (error) return new Map()

  const byDay = new Map()
  for (const r of rows || []) {
    const d = r?.d ? String(r.d).slice(0, 10) : null
    if (!d) continue
    const v = Number(r?.cogs)
    const add = Number.isFinite(v) && v > 0 ? v : 0
    byDay.set(d, (byDay.get(d) || 0) + add)
  }
  return byDay
}

/**
 * List all dates in [dateFrom, dateTo] inclusive.
 * @param {string} dateFrom YYYY-MM-DD
 * @param {string} dateTo YYYY-MM-DD
 * @returns {string[]}
 */
function dateRange(dateFrom, dateTo) {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  if (from > to) return []
  const out = []
  const d = new Date(from)
  while (d <= to) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/**
 * Profit per dia (timeseries). Agregat per d des de v_product_econ_day i v_product_profit_day;
 * per cada dia es crida calculateAsinProfit(). Ordenat per date ASC.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ asin?: string, dateFrom?: string, dateTo?: string, marketplace?: string }} [options]
 * @returns {Promise<Array<{ date: string, revenue: number, netProfit: number, margin: number, roi: number }>>}
 */
export async function getProfitTimeseries(supabase, orgId, options = {}) {
  const dateFrom = options?.dateFrom ?? null
  const dateTo = options?.dateTo ?? null
  if (!dateFrom || !dateTo) return []

  let productId = null
  if (options?.asin) {
    productId = await resolveProductId(supabase, orgId, options.asin)
    if (!productId) return []
  }

  const [econByDay, cogsByDay] = await Promise.all([
    fetchEconByDay(supabase, orgId, dateFrom, dateTo, productId),
    fetchCogsByDay(supabase, orgId, dateFrom, dateTo, productId),
  ])

  const dates = dateRange(dateFrom, dateTo)
  const result = []
  for (const date of dates) {
    const econ = econByDay.get(date) || { revenue: 0, amazonFees: 0, adsCost: 0, refunds: 0, shipping: 0 }
    const cogs = cogsByDay.get(date) ?? 0
    const calc = calculateAsinProfit({
      revenue: econ.revenue,
      amazonFees: econ.amazonFees,
      adsCost: econ.adsCost,
      refunds: econ.refunds,
      cogs,
      shipping: econ.shipping,
    })
    result.push({
      date,
      revenue: calc.revenue,
      netProfit: calc.netProfit,
      margin: calc.margin,
      roi: calc.roi,
    })
  }
  return result
}
