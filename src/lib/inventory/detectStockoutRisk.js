/**
 * D16 Slice 1 — Detectar risc de stockout per ASIN.
 * Vendes mitjanes des de v_product_units_sold_day; stock des de inventory. Tot filtrat per org_id.
 */
const DEFAULT_LOOKBACK_DAYS = 30
const DAYS_OF_STOCK_THRESHOLD = 30

/**
 * Resolve project_id from org + ASIN.
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
 * Average units sold per day from v_product_units_sold_day (orders_count as proxy for units).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} productId
 * @param {number} lookbackDays
 * @returns {Promise<number>}
 */
async function getAverageDailyUnitsSold(supabase, orgId, productId, lookbackDays) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - lookbackDays)
  const dateFrom = from.toISOString().slice(0, 10)
  const dateTo = to.toISOString().slice(0, 10)

  const { data: rows, error } = await supabase
    .from('v_product_units_sold_day')
    .select('d, orders_count')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .gte('d', dateFrom)
    .lte('d', dateTo)

  if (error || !rows?.length) return 0
  const total = rows.reduce((s, r) => s + (Number(r.orders_count) || 0), 0)
  return total / lookbackDays
}

/**
 * Current stock for product (sum total_units from inventory for org + project_id).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} productId
 * @returns {Promise<number>}
 */
async function getCurrentStock(supabase, orgId, productId) {
  const { data: rows, error } = await supabase
    .from('inventory')
    .select('total_units')
    .eq('org_id', orgId)
    .eq('project_id', productId)
  if (error) return 0
  if (!rows?.length) return 0
  return rows.reduce((s, r) => s + (Number(r?.total_units) || 0), 0)
}

/**
 * Detectar risc de stockout per ASIN: dies de stock < 30.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ asin?: string, lookbackDays?: number }} [options]
 * @returns {Promise<{ asin: string, currentStock: number, dailySales: number, daysOfStock: number } | null>}
 */
export async function detectStockoutRisk(supabase, orgId, options = {}) {
  const asin = options?.asin ?? null
  if (!asin) return null

  const lookbackDays = Math.max(1, Number(options?.lookbackDays) || DEFAULT_LOOKBACK_DAYS)
  const productId = await resolveProductId(supabase, orgId, asin)
  if (!productId) return null

  const [dailySales, currentStock] = await Promise.all([
    getAverageDailyUnitsSold(supabase, orgId, productId, lookbackDays),
    getCurrentStock(supabase, orgId, productId),
  ])

  if (dailySales <= 0) return null
  const daysOfStock = currentStock / dailySales
  if (daysOfStock >= DAYS_OF_STOCK_THRESHOLD) return null

  return {
    asin: (asin || '').trim(),
    currentStock,
    dailySales,
    daysOfStock,
  }
}
