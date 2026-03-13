/**
 * D19.1 / D19.3 — Reorder Intelligence Engine.
 * Calcula candidats a recompra amb dades reals. Read-only; no modifica inventory/profit/cashflow engines.
 * D19.3: quality fields (coverageDays, demandDuringLeadTime, leadTimeSource, confidence, issues); sanitization; confidence rules.
 */
const DEFAULT_LOOKBACK_DAYS = 30
const DEFAULT_LEAD_TIME_DAYS = 30
const DEFAULT_LIMIT = 10
const MIN_DAILY_SALES_RELIABLE = 0.5
const COVERAGE_DAYS_CAP = 999

/** @typedef {'high'|'medium'|'low'} Confidence */
/** @typedef {'configured'|'fallback'|'derived'|'unknown'} LeadTimeSource */

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
 * Confidence + issues from data. Rules (D19.3):
 * - high: dailySales reliable (> MIN), stockOnHand finite, leadTime known/fallback, no critical issues.
 * - medium: some fallback or weak data but recommendation still usable.
 * - low: missing real lead time, no reliable incoming, or dailySales very weak.
 * @param {number} dailySales
 * @param {number} stockOnHand
 * @param {number} incomingUnits
 * @param {LeadTimeSource} leadTimeSource
 * @returns {{ confidence: Confidence, issues: string[] }}
 */
function getConfidenceAndIssues(dailySales, stockOnHand, incomingUnits, leadTimeSource) {
  const issues = []
  if (leadTimeSource === 'fallback' || leadTimeSource === 'unknown') {
    issues.push('missing_lead_time')
  }
  if (!Number.isFinite(incomingUnits) || incomingUnits === 0) {
    issues.push('no_incoming_po_data')
  }
  if (Number.isFinite(dailySales) && dailySales < MIN_DAILY_SALES_RELIABLE && dailySales > 0) {
    issues.push('weak_daily_sales')
  }
  const stockOk = Number.isFinite(stockOnHand) && stockOnHand >= 0
  const salesReliable = Number.isFinite(dailySales) && dailySales >= MIN_DAILY_SALES_RELIABLE

  let confidence = 'low'
  if (salesReliable && stockOk && leadTimeSource !== 'unknown') {
    confidence = issues.length === 0 ? 'high' : 'medium'
  } else if (Number.isFinite(dailySales) && dailySales > 0 && stockOk) {
    confidence = 'medium'
  }
  return { confidence, issues }
}

/**
 * Candidats a recompra. Ordenació: 1) risc més imminent (daysUntilStockout asc), 2) confiança més alta (high > medium > low), 3) reorderUnits desc.
 * Sanitization: reorderUnits ≥ 0; coverageDays cap (no Infinity); dailySales = 0 no genera candidat.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @param {{ limit?: number, lookbackDays?: number, leadTimeDays?: number }} [options]
 * @returns {Promise<Array<{ asin: string, productName: string | null, dailySales: number, stockOnHand: number, incomingUnits: number, leadTimeDays: number, reorderUnits: number, daysUntilStockout: number, coverageDays: number, demandDuringLeadTime: number, leadTimeSource: LeadTimeSource, confidence: Confidence, issues: string[] }>>}
 */
export async function getReorderCandidates(supabase, orgId, options = {}) {
  if (!orgId || typeof orgId !== 'string') return []

  const limit = Math.max(1, Math.min(100, Number(options?.limit) ?? DEFAULT_LIMIT))
  const lookbackDays = Math.max(1, Math.min(365, Number(options?.lookbackDays) ?? DEFAULT_LOOKBACK_DAYS))
  const leadTimeFallback = Math.max(0, Number(options?.leadTimeDays) ?? DEFAULT_LEAD_TIME_DAYS)
  const leadTimeSource = 'fallback'

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

      const [dailySalesRaw, stockOnHandRaw, incomingUnitsRaw] = await Promise.all([
        getAverageDailyUnitsSold(supabase, orgId, projectId, lookbackDays),
        getCurrentStock(supabase, orgId, projectId),
        getIncomingUnits(supabase, orgId, projectId),
      ])

      const dailySales = Number.isFinite(dailySalesRaw) ? Math.max(0, dailySalesRaw) : 0
      const stockOnHand = Number.isFinite(stockOnHandRaw) ? Math.max(0, stockOnHandRaw) : 0
      const incomingUnits = Number.isFinite(incomingUnitsRaw) ? Math.max(0, incomingUnitsRaw) : 0

      if (dailySales <= 0) continue

      const leadTimeDays = leadTimeFallback
      const demandDuringLeadTime = dailySales * leadTimeDays
      const available = stockOnHand + incomingUnits
      const reorderNeeded = demandDuringLeadTime - available

      if (reorderNeeded <= 0) continue

      const reorderUnits = Math.max(0, Math.round(reorderNeeded))
      const daysUntilStockout = Math.max(0, stockOnHand / dailySales)
      let coverageDays = available / dailySales
      if (!Number.isFinite(coverageDays) || coverageDays < 0) coverageDays = 0
      if (coverageDays > COVERAGE_DAYS_CAP) coverageDays = COVERAGE_DAYS_CAP

      const { confidence, issues } = getConfidenceAndIssues(dailySales, stockOnHand, incomingUnits, leadTimeSource)

      candidates.push({
        asin: (asin || '').trim(),
        projectId,
        productName: productName ?? null,
        dailySales,
        stockOnHand,
        incomingUnits,
        leadTimeDays,
        reorderUnits,
        daysUntilStockout,
        coverageDays,
        demandDuringLeadTime,
        leadTimeSource,
        confidence,
        issues: Array.isArray(issues) ? issues : [],
      })
    } catch {
      continue
    }
  }

  const confidenceOrder = { high: 0, medium: 1, low: 2 }
  candidates.sort((a, b) => {
    const dA = a.daysUntilStockout ?? 0
    const dB = b.daysUntilStockout ?? 0
    if (dA !== dB) return dA - dB
    const cA = confidenceOrder[a.confidence] ?? 2
    const cB = confidenceOrder[b.confidence] ?? 2
    if (cA !== cB) return cA - cB
    return (b.reorderUnits ?? 0) - (a.reorderUnits ?? 0)
  })

  return candidates.slice(0, limit)
}
