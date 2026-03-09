import { supabase } from '../supabase'

const DEFAULT_PAGE_SIZE = 25

function deriveSeverity(priorityScore) {
  if (priorityScore == null) return 'low'
  const score = Number(priorityScore) || 0
  if (score >= 100) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function normalizeReorderDecision(decision, context, source) {
  const asin = context.asin ?? null
  const productName = context.product_name ?? null
  const reorderUnits = context.reorder_units ?? null
  const daysUntilStockout = context.days_until_stockout ?? null
  const coverageDays = context.coverage_days ?? null
  const leadTimeDays = context.lead_time_days ?? null
  const confidence = context.confidence ?? null

  const baseTitle = 'Reorder required'
  const title = productName
    ? `${baseTitle} — ${productName}`
    : asin
      ? `${baseTitle} — ${asin}`
      : baseTitle

  let explanation = 'Stockout risk detected based on current coverage and expected lead time.'
  if (Number.isFinite(daysUntilStockout)) {
    explanation = `Stockout risk in ~${Math.round(daysUntilStockout)} days based on current coverage and lead time.`
  }

  const recommendedAction = 'Review stock and create a replenishment purchase order.'

  const contextSummary = []
  if (productName) contextSummary.push({ label: 'Product', value: productName })
  if (asin) contextSummary.push({ label: 'ASIN', value: asin })
  if (Number.isFinite(reorderUnits)) contextSummary.push({ label: 'Reorder units', value: reorderUnits })
  if (Number.isFinite(daysUntilStockout)) contextSummary.push({ label: 'Days until stockout', value: Math.round(daysUntilStockout) })
  if (Number.isFinite(coverageDays)) contextSummary.push({ label: 'Coverage days', value: Math.round(coverageDays) })
  if (Number.isFinite(leadTimeDays)) contextSummary.push({ label: 'Lead time (days)', value: leadTimeDays })
  if (confidence) contextSummary.push({ label: 'Confidence', value: confidence })

  return {
    id: decision.id,
    decisionType: decision.decision_type,
    status: decision.status,
    title,
    explanation,
    recommendedAction,
    severity: deriveSeverity(decision.priority_score),
    confidence: confidence || 'low',
    priorityScore: decision.priority_score ?? 0,
    createdAt: decision.created_at,
    resolvedAt: decision.resolved_at,
    sourceEngine: source?.source_engine ?? null,
    entityLinks: [],
    contextSummary,
  }
}

function normalizeGenericDecision(decision, context, source) {
  const title = decision.title || 'Decision'
  const explanation = decision.description || ''
  const contextSummary = Object.entries(context).map(([key, value]) => ({
    label: key,
    value,
  }))

  return {
    id: decision.id,
    decisionType: decision.decision_type,
    status: decision.status,
    title,
    explanation,
    recommendedAction: '',
    severity: deriveSeverity(decision.priority_score),
    confidence: context.confidence || null,
    priorityScore: decision.priority_score ?? 0,
    createdAt: decision.created_at,
    resolvedAt: decision.resolved_at,
    sourceEngine: source?.source_engine ?? null,
    entityLinks: [],
    contextSummary,
  }
}

function normalizeDecision(decision, contextMap, sourceMap) {
  const ctx = contextMap[decision.id] || {}
  const src = sourceMap[decision.id] || null

  if (decision.decision_type === 'reorder' && (src?.source_engine === 'reorder_engine' || !src)) {
    return normalizeReorderDecision(decision, ctx, src)
  }

  return normalizeGenericDecision(decision, ctx, src)
}

// Expose normalizer so detail view can stay consistent with list items
export function __internalNormalizeDecision(decision, contextMap, sourceMap) {
  return normalizeDecision(decision, contextMap, sourceMap)
}

/**
 * Load one page of decisions for an org and normalize into inbox items.
 *
 * @param {{ orgId: string, page?: number, pageSize?: number, filters?: { status?: string, decisionType?: string } }} params
 * @returns {Promise<{ items: any[], total: number, page: number, pageSize: number }>}
 */
export async function getDecisionInboxPage(params) {
  const { orgId, page = 1, pageSize = DEFAULT_PAGE_SIZE, filters = {} } = params || {}
  if (!orgId) {
    return { items: [], total: 0, page, pageSize }
  }

  let query = supabase
    .from('decisions')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'open_only') {
      query = query.in('status', ['open'])
    } else if (filters.status === 'open_ack') {
      query = query.in('status', ['open', 'acknowledged'])
    } else {
      query = query.eq('status', filters.status)
    }
  } else {
    query = query.in('status', ['open', 'acknowledged'])
  }

  if (filters.decisionType && filters.decisionType !== 'all') {
    query = query.eq('decision_type', filters.decisionType)
  }

  query = query
    .order('priority_score', { ascending: false, nullsLast: true })
    .order('created_at', { ascending: false })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: decisions, error, count } = await query.range(from, to)
  if (error || !decisions || decisions.length === 0) {
    if (error && error.code !== 'PGRST116') {
      console.error('getDecisionInboxPage: error loading decisions', error)
    }
    return { items: [], total: count ?? 0, page, pageSize }
  }

  const ids = decisions.map((d) => d.id).filter(Boolean)

  const [ctxRes, srcRes] = await Promise.all([
    supabase
      .from('decision_context')
      .select('decision_id,key,value')
      .in('decision_id', ids),
    supabase
      .from('decision_sources')
      .select('decision_id,source_engine,source_reference')
      .in('decision_id', ids),
  ])

  const contextRows = ctxRes.data || []
  const sourceRows = srcRes.data || []

  const contextMap = {}
  for (const row of contextRows) {
    const id = row.decision_id
    if (!id) continue
    if (!contextMap[id]) contextMap[id] = {}
    contextMap[id][row.key] = row.value
  }

  const sourceMap = {}
  for (const row of sourceRows) {
    if (!row.decision_id) continue
    sourceMap[row.decision_id] = row
  }

  const items = decisions.map((d) => normalizeDecision(d, contextMap, sourceMap))

  return {
    items,
    total: count ?? items.length,
    page,
    pageSize,
  }
}

// Keep backward-compat hook for any code that introspects this helper
getDecisionInboxPage.__internalNormalizeDecision = __internalNormalizeDecision


