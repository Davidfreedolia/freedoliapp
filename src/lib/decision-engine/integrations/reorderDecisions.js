/**
 * D33.2 — Reorder Engine → Decision Bridge integration.
 * Syncs reorder alerts to persistent decisions. Uses existing getReorderAlerts; no engine changes.
 */
import { getReorderAlerts } from '../../inventory/getReorderAlerts.js'
import { createDecision } from '../decisionBridge.js'

const SOURCE_ENGINE = 'reorder_engine'
const SEVERITY_TO_PRIORITY = { high: 100, medium: 50, low: 10 }

/**
 * Fetch ASINs that already have an open or acknowledged reorder decision for this org.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<Set<string>>}
 */
async function getExistingReorderAsins(supabase, orgId) {
  const { data: decisions, error: decError } = await supabase
    .from('decisions')
    .select('id')
    .eq('org_id', orgId)
    .eq('decision_type', 'reorder')
    .in('status', ['open', 'acknowledged'])

  if (decError || !decisions?.length) return new Set()

  const ids = decisions.map((d) => d.id)

  const { data: sources, error: srcError } = await supabase
    .from('decision_sources')
    .select('decision_id')
    .in('decision_id', ids)
    .eq('source_engine', SOURCE_ENGINE)

  if (srcError || !sources?.length) return new Set()
  const sourceDecisionIds = new Set(sources.map((s) => s.decision_id))

  const { data: contextRows, error: ctxError } = await supabase
    .from('decision_context')
    .select('decision_id, value')
    .in('decision_id', ids)
    .eq('key', 'asin')

  if (ctxError || !contextRows?.length) return new Set()

  const asins = new Set()
  for (const row of contextRows) {
    if (!sourceDecisionIds.has(row.decision_id)) continue
    const v = row.value
    const asin = typeof v === 'string' ? v : v?.value ?? (v != null ? String(v) : null)
    if (asin && typeof asin === 'string') asins.add(asin.trim())
  }
  return asins
}

/**
 * Sync reorder alerts from the Reorder Engine into the Decision Engine.
 * Deduplication: one open/acknowledged reorder decision per org + ASIN.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} orgId
 * @returns {Promise<{ ok: boolean, scanned: number, created: number, skipped: number, errors: string[] }>}
 */
export async function syncReorderDecisions(supabase, orgId) {
  const result = { ok: true, scanned: 0, created: 0, skipped: 0, errors: [] }

  if (!orgId || typeof orgId !== 'string') {
    result.ok = false
    result.errors.push('orgId is required')
    return result
  }

  let alerts = []
  try {
    alerts = await getReorderAlerts(supabase, orgId, { limit: 100 })
  } catch (e) {
    result.ok = false
    result.errors.push(e instanceof Error ? e.message : 'getReorderAlerts failed')
    return result
  }

  result.scanned = alerts.length

  const existingAsins = await getExistingReorderAsins(supabase, orgId)
  const createdAsinsInRun = new Set()

  for (const alert of alerts) {
    const asin = (alert.asin || '').trim()
    if (!asin) {
      result.skipped += 1
      continue
    }

    if (existingAsins.has(asin) || createdAsinsInRun.has(asin)) {
      result.skipped += 1
      continue
    }

    const productName = alert.productName?.trim() || asin
    const title = `Reorder required for ${productName}`
    const description =
      'Stockout risk detected. Reorder recommended based on current coverage and lead time.'
    const priorityScore = SEVERITY_TO_PRIORITY[alert.severity] ?? 10

    const contextData = {
      asin,
      product_name: alert.productName ?? null,
      reorder_units: alert.reorderUnits ?? 0,
      days_until_stockout: alert.daysUntilStockout ?? 0,
      confidence: alert.confidence ?? 'low',
    }

    const decisionId = await createDecision(supabase, {
      orgId,
      decisionType: 'reorder',
      priorityScore,
      title,
      description,
      sourceEngine: SOURCE_ENGINE,
      contextData,
    })

    if (decisionId) {
      result.created += 1
      createdAsinsInRun.add(asin)
    } else {
      result.errors.push(`Failed to create decision for ASIN ${asin}`)
    }
  }

  if (result.errors.length > 0) result.ok = false
  return result
}
