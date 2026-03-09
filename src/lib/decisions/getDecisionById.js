import { supabase } from '../supabase'
import { getDecisionInboxPage } from './getDecisionInboxPage'

/**
 * Load a single decision by id for an org and normalize it using the same logic
 * as the inbox page. This keeps detail view consistent with list items.
 *
 * @param {{ orgId: string, decisionId: string }} params
 * @returns {Promise<any|null>}
 */
export async function getDecisionById(params) {
  const { orgId, decisionId } = params || {}
  if (!orgId || !decisionId) return null

  const { data: decisions, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', decisionId)
    .limit(1)

  if (error || !decisions || decisions.length === 0) {
    if (error && error.code !== 'PGRST116') {
      console.error('getDecisionById: error loading decision', error)
    }
    return null
  }

  // Reuse the page normalizer by building a one-item page
  const page = await getDecisionInboxPage({
    orgId,
    page: 1,
    pageSize: 1,
    filters: { status: 'all' },
  })

  // Above call will load first page; we want specific id, so instead load its context directly
  // to avoid inconsistencies, we re-query context and sources just for this id.
  const [ctxRes, srcRes] = await Promise.all([
    supabase
      .from('decision_context')
      .select('decision_id,key,value')
      .eq('decision_id', decisionId),
    supabase
      .from('decision_sources')
      .select('decision_id,source_engine,source_reference')
      .eq('decision_id', decisionId),
  ])

  const decision = decisions[0]
  const ctxRows = ctxRes.data || []
  const srcRows = srcRes.data || []

  const contextMap = {}
  for (const row of ctxRows) {
    if (!contextMap[decisionId]) contextMap[decisionId] = {}
    contextMap[decisionId][row.key] = row.value
  }

  const sourceMap = {}
  if (srcRows.length) {
    sourceMap[decisionId] = srcRows[0]
  }

  // Use internal normalizer from getDecisionInboxPage
  const normalize = (getDecisionInboxPage.__internalNormalizeDecision ||
    ((d, c, s) => {
      // Fallback: call a minimal generic mapping if internal helper is not exposed
      const ctx = c[d.id] || {}
      const src = s[d.id] || null
      return {
        id: d.id,
        decisionType: d.decision_type,
        status: d.status,
        title: d.title || 'Decision',
        explanation: d.description || '',
        recommendedAction: '',
        severity: 'low',
        confidence: ctx.confidence || null,
        priorityScore: d.priority_score ?? 0,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at,
        sourceEngine: src?.source_engine ?? null,
        entityLinks: [],
        contextSummary: Object.entries(ctx).map(([key, value]) => ({ label: key, value })),
      }
    }))

  return normalize(decision, contextMap, sourceMap)
}

