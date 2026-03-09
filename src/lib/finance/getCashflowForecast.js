/**
 * D17 Slice 1 + Slice 2 — Motor de forecast de cashflow.
 * Slice 1: v_product_econ_day, averageDailyNetRevenue.
 * Slice 2: purchase_orders → dailyInventoryOutflow per dia. Fallback de data de pagament: order_date → created_at.
 * Sense UI.
 */
const DEFAULT_FORECAST_DAYS = 30
const LOOKBACK_DAYS = 30
const STARTING_CASH_PLACEHOLDER = 0

/**
 * MVP fallback per data de sortida de caixa d’una PO:
 * 1) payment_date (si existeix a la taula)
 * 2) expected_payment_date (si existeix)
 * 3) order_date
 * 4) created_at
 * purchase_orders actual té order_date i created_at; no té payment_date ni expected_payment_date.
 */
function getPaymentDateKey(row) {
  const d = row?.payment_date ?? row?.expected_payment_date ?? row?.order_date ?? row?.created_at
  if (!d) return null
  return new Date(d).toISOString().slice(0, 10)
}

/**
 * Llegir v_product_econ_day per org i rang de dates; agregar per dia: dailyNetRevenue = gross_sales - refunds - amazon_fees - ads.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} dateFrom YYYY-MM-DD
 * @param {string} dateTo YYYY-MM-DD
 * @returns {Promise<Map<string, number>>} dia -> net revenue (pot ser negatiu)
 */
async function getDailyNetRevenueByDay(supabase, orgId, dateFrom, dateTo) {
  const { data: rows, error } = await supabase
    .from('v_product_econ_day')
    .select('d, gross_sales, refunds, amazon_fees, ads')
    .eq('org_id', orgId)
    .gte('d', dateFrom)
    .lte('d', dateTo)

  if (error) return new Map()

  const byDay = new Map()
  for (const r of rows || []) {
    const d = r?.d ? String(r.d).slice(0, 10) : null
    if (!d) continue
    const gs = Number(r.gross_sales) || 0
    const ref = Math.abs(Number(r.refunds) || 0)
    const fees = Math.abs(Number(r.amazon_fees) || 0)
    const adsVal = Math.abs(Number(r.ads) || 0)
    const net = gs - ref - fees - adsVal
    byDay.set(d, (byDay.get(d) || 0) + net)
  }
  return byDay
}

/**
 * Calcular mitjana diària de net revenue dels últims lookbackDays dies.
 * @param {Map<string, number>} dailyNetRevenueByDay
 * @param {number} lookbackDays
 * @returns {number}
 */
function averageDailyNetRevenue(dailyNetRevenueByDay, lookbackDays) {
  if (lookbackDays <= 0 || !dailyNetRevenueByDay.size) return 0
  const total = [...dailyNetRevenueByDay.values()].reduce((s, v) => s + v, 0)
  return total / lookbackDays
}

/**
 * Generar array de dates [from, from+1, ..., to] (YYYY-MM-DD).
 * @param {string} dateFrom
 * @param {string} dateTo
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
 * D17 Slice 2 — Sortida de caixa per compres d’inventari (purchase_orders).
 * Agregat per dia d’“outflow”: payment_date → expected_payment_date → order_date → created_at.
 * Camp de cost: total_amount (purchase_orders). Tot filtrat per org_id.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} dateFrom YYYY-MM-DD (inclusiu)
 * @param {string} dateTo YYYY-MM-DD (inclusiu)
 * @returns {Promise<Map<string, number>>} dia -> suma total_amount
 */
async function getDailyInventoryOutflowByDay(supabase, orgId, dateFrom, dateTo) {
  const { data: rows, error } = await supabase
    .from('purchase_orders')
    .select('total_amount, order_date, created_at')
    .eq('org_id', orgId)
    .not('total_amount', 'is', null)

  if (error) return new Map()

  const byDay = new Map()
  for (const r of rows || []) {
    const amount = Number(r?.total_amount) ?? 0
    if (amount <= 0) continue
    const d = getPaymentDateKey(r)
    if (!d) continue
    if (d < dateFrom || d > dateTo) continue
    byDay.set(d, (byDay.get(d) || 0) + amount)
  }
  return byDay
}

/**
 * Forecast de cashflow: sèrie temporal cashBalance per dia.
 * Cash inicial = 0 (placeholder); cada dia cash(t) = cash(t-1) + averageDailyNetRevenue.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ forecastDays?: number }} [options]
 * @returns {Promise<Array<{ date: string, cashBalance: number }>>}
 */
export async function getCashflowForecast(supabase, orgId, options = {}) {
  const forecastDays = Math.max(1, Math.min(365, Number(options?.forecastDays) || DEFAULT_FORECAST_DAYS))

  const today = new Date()
  const lookbackFrom = new Date(today)
  lookbackFrom.setDate(lookbackFrom.getDate() - (LOOKBACK_DAYS - 1))
  const dateFrom = lookbackFrom.toISOString().slice(0, 10)
  const dateTo = today.toISOString().slice(0, 10)

  const dailyNetByDay = await getDailyNetRevenueByDay(supabase, orgId, dateFrom, dateTo)
  const numDays = dailyNetByDay.size || LOOKBACK_DAYS
  const avgDaily = averageDailyNetRevenue(dailyNetByDay, numDays)

  const forecastFrom = today.toISOString().slice(0, 10)
  const forecastTo = new Date(today)
  forecastTo.setDate(forecastTo.getDate() + forecastDays)
  const forecastToStr = forecastTo.toISOString().slice(0, 10)
  const forecastDates = dateRange(forecastFrom, forecastToStr)

  const dailyInventoryOutflowByDay = await getDailyInventoryOutflowByDay(supabase, orgId, forecastFrom, forecastToStr)

  let cash = STARTING_CASH_PLACEHOLDER
  const result = []
  for (const date of forecastDates) {
    cash += avgDaily
    const inventoryOutflow = dailyInventoryOutflowByDay.get(date) ?? 0
    cash -= inventoryOutflow
    result.push({ date, cashBalance: Math.round(cash * 100) / 100 })
  }
  return result
}
