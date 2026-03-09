/**
 * D33.1 — Decision Bridge.
 * Minimal API for writing and managing decisions (decisions, decision_context, decision_sources, decision_events).
 * No engine logic. No deduplication. No scheduler. Infrastructure only.
 */

/**
 * Create a decision and related context, source, and initial event.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} params
 * @param {string} params.orgId
 * @param {string} params.decisionType
 * @param {number|null} [params.priorityScore]
 * @param {string|null} [params.title]
 * @param {string|null} [params.description]
 * @param {string} params.sourceEngine
 * @param {Record<string, unknown>} [params.contextData] — key/value; values stored as jsonb
 * @param {string|null} [params.sourceReference]
 * @returns {Promise<string|null>} decision id or null on failure
 */
export async function createDecision(supabase, params) {
  const {
    orgId,
    decisionType,
    priorityScore = null,
    title = null,
    description = null,
    sourceEngine,
    contextData = {},
    sourceReference = null,
  } = params

  if (!orgId || !decisionType || !sourceEngine) return null

  const { data: decision, error: decError } = await supabase
    .from('decisions')
    .insert({
      org_id: orgId,
      decision_type: decisionType,
      priority_score: priorityScore,
      title: title,
      description: description,
      status: 'open',
    })
    .select('id')
    .single()

  if (decError || !decision?.id) return null

  const decisionId = decision.id

  const contextEntries = Object.entries(contextData).filter(([, v]) => v !== undefined)
  if (contextEntries.length > 0) {
    const contextRows = contextEntries.map(([key, value]) => ({
      decision_id: decisionId,
      key,
      value: value !== null && typeof value === 'object' && !Array.isArray(value) ? value : value,
    }))
    await supabase.from('decision_context').insert(contextRows)
  }

  await supabase.from('decision_sources').insert({
    decision_id: decisionId,
    source_engine: sourceEngine,
    source_reference: sourceReference,
  })

  await supabase.from('decision_events').insert({
    decision_id: decisionId,
    event_type: 'created',
    event_data: null,
  })

  return decisionId
}

/**
 * Acknowledge a decision: set status to acknowledged and record event.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} decisionId
 * @returns {Promise<boolean>}
 */
export async function acknowledgeDecision(supabase, decisionId) {
  if (!decisionId) return false

  const { error: updateError } = await supabase
    .from('decisions')
    .update({ status: 'acknowledged' })
    .eq('id', decisionId)

  if (updateError) return false

  await supabase.from('decision_events').insert({
    decision_id: decisionId,
    event_type: 'acknowledged',
    event_data: null,
  })

  return true
}

/**
 * Resolve a decision: set status to resolved, set resolved_at, record event.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} decisionId
 * @returns {Promise<boolean>}
 */
export async function resolveDecision(supabase, decisionId) {
  if (!decisionId) return false

  const resolvedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('decisions')
    .update({ status: 'resolved', resolved_at: resolvedAt })
    .eq('id', decisionId)

  if (updateError) return false

  await supabase.from('decision_events').insert({
    decision_id: decisionId,
    event_type: 'resolved',
    event_data: { resolved_at: resolvedAt },
  })

  return true
}

/**
 * Dismiss a decision: set status to dismissed, record event.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} decisionId
 * @returns {Promise<boolean>}
 */
export async function dismissDecision(supabase, decisionId) {
  if (!decisionId) return false

  const { error: updateError } = await supabase
    .from('decisions')
    .update({ status: 'dismissed' })
    .eq('id', decisionId)

  if (updateError) return false

  await supabase.from('decision_events').insert({
    decision_id: decisionId,
    event_type: 'dismissed',
    event_data: null,
  })

  return true
}
