/**
 * D19.1 — Reorder Intelligence Engine.
 * Calcula candidats a recompra amb dades reals. Read-only; no modifica inventory/profit/cashflow engines.
 * Fonts: v_product_units_sold_day (sales velocity), inventory (stock), purchase_orders (incoming), lead time fallback.
 */
const DEFAULT_LOOKBACK_DAYS = 30
const DEFAULT_LEAD_TIME_DAYS = 30
const DEFAULT_LIMIT = 10

/**
 * Obtenir ASINs únics del workspace (product_identifiers, org_id).
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
 * Resolve project_id and project name from org + ASIN.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} asin
 * @returns {Promise<{ projectId: string | null, productName: string | null }>}
 */
async function resolveProduct(supabase, orgId, asin) {
  const normalized = (asin || '').trim().toUpperCase()
  if (!normalized) return { projectId: null, productName: null }
  const { data: pi, error: piError } = await supabase
    .from('product_identifiers')
    .select('project_id')
    .eq('org_id', orgId)
    .ilike('asin', normalized)
    .not('project_id', 'is', null)
    .limit(1)
    .maybeSingle()
  if (piError || !pi?.project_id) return { projectId: null, productName: null }
  const { data: proj } = await supabase
    .from('projects')
    .select('name')
    .eq('id', pi.project_id)
    .maybeSingle()
  return {
    projectId: pi.project_id,
    productName: proj?.name ?? null,
  }
}

/**
 * Mitjana d'unitats venudes per dia (v_product_units_sold_day, orders_count com a proxy d'unitats).
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
  return lookbackDays > 0 ? total / lookbackDays : 0
}

/**
 * Stock actual per producte (inventory, org_id + project_id, sum total_units).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} projectId
 * @returns {Promise<number>}
 */
async function getCurrentStock(supabase, orgId, projectId) {
  const { data: rows, error } = await supabase
    .from('inventory')
    .select('total_units')
    .eq('org_id', orgId)
    .eq('project_id', projectId)
  if (error) return 0
  if (!rows?.length) return 0
  return rows.reduce((s, r) => s + (Number(r?.total_units) || 0), 0)
}

/**
 * Unitats en camí (POs obertes) per project_id. Suma de quantities d'items si existeix; sinó 0.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {string} projectId
 * @returns {Promise<number>}
 */
async function getIncomingUnits(supabase, orgId, projectId) {
  const { data: rows, error } = await supabase
    .from('purchase_orders')
    .select('items')
    .eq('org_id', orgId)
    .eq('project_id', projectId)
  if (error) return 0
  let sum = 0
  for (const r of rows || []) {
    const items = r?.items
    if (Array.isArray(items)) {
      for (const it of items) {
        const q = it?.quantity ?? it?.qty ?? it?.units
        if (Number.isFinite(q)) sum += Number(q)
      }
    }
  }
  return sum
}

/**
 * Candidats a recompra. Ordenats per daysUntilStockout asc, després reorderUnits desc.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ limit?: number, lookbackDays?: number, leadTimeDays?: number }} [options]
 * @returns {Promise<Array<{ asin: string, productName: string | null, dailySales: number, stockOnHand: number, incomingUnits: number, leadTimeDays: number, reorderUnits: number, daysUntilStockout: number }>>}
 */
export async function getReorderCandidates(supabase, orgId, options = {}) {
  if (!orgId || typeof orgId !== 'string') return []

  const limit = Math.max(1, Math.min(100, Number(options?.limit) ?? DEFAULT_LIMIT))
  const lookbackDays = Math.max(1, Math.min(365, Number(options?.lookbackDays) ?? DEFAULT_LOOKBACK_DAYS))
  const leadTimeFallback = Math.max(0, Number(options?.leadTimeDays) ?? DEFAULT_LEAD_TIME_DAYS)

  let asins = []
  try {
    asins = await getWorkspaceAsins(supabase, orgId)
  } catch {
    return []
  }
  if (!asins.length) return []

  const candidates = []

  for (const asin of asins) {
    try {
      const { projectId, productName } = await resolveProduct(supabase, orgId, asin)
      if (!projectId) continue

      const [dailySales, stockOnHand, incomingUnits] = await Promise.all([
        getAverageDailyUnitsSold(supabase, orgId, projectId, lookbackDays),
        getCurrentStock(supabase, orgId, projectId),
        getIncomingUnits(supabase, orgId, projectId),
      ])

      const leadTimeDays = leadTimeFallback
      const demandDuringLeadTime = dailySales * leadTimeDays
      const available = stockOnHand + incomingUnits
      const reorderNeeded = demandDuringLeadTime - available

      if (reorderNeeded <= 0) continue

      const reorderUnits = Math.max(0, Math.round(reorderNeeded))
      const daysUntilStockout =
        dailySales > 0 && Number.isFinite(dailySales)
          ? Math.max(0, stockOnHand / dailySales)
          : 0

      candidates.push({
        asin: (asin || '').trim(),
        productName: productName ?? null,
        dailySales,
        stockOnHand,
        incomingUnits,
        leadTimeDays,
        reorderUnits,
        daysUntilStockout,
      })
    } catch {
      continue
    }
  }

  candidates.sort((a, b) => {
    const dA = a.daysUntilStockout ?? Infinity
    const dB = b.daysUntilStockout ?? Infinity
    if (dA !== dB) return dA - dB
    return (b.reorderUnits ?? 0) - (a.reorderUnits ?? 0)
  })

  return candidates.slice(0, limit)
}
