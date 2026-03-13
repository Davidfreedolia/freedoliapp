/**
 * V1 lifecycle events reader. Returns recent events for a project in normalized shape.
 * For use by decisions/automations; no UI in V1.
 */

async function getSupabase() {
  const { supabase } = await import('../supabase.js')
  return supabase
}

const PHASE_ID_TO_STAGE = {
  1: 'research',
  2: 'viability',
  3: 'suppliers',
  4: 'samples',
  5: 'production',
  6: 'listing',
  7: 'live'
}

/**
 * Fetch recent lifecycle events for a project, newest first.
 * @param {string} projectId - Project UUID
 * @param {{ limit?: number }} [options] - Optional limit (default 50)
 * @returns {Promise<LifecycleEvent[]>} Normalized events
 */
export async function getRecentLifecycleEvents(projectId, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50))
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .select('id, org_id, project_id, event_type, phase_id, event_source, created_at, metadata')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[lifecycleEvents] getRecentLifecycleEvents:', error)
    return []
  }
  return (data || []).map((row) => ({
    id: row.id,
    org_id: row.org_id,
    project_id: row.project_id,
    event_type: row.event_type,
    phase_id: row.phase_id ?? null,
    lifecycle_stage: row.phase_id != null ? PHASE_ID_TO_STAGE[row.phase_id] ?? null : null,
    event_source: row.event_source || 'app',
    created_at: row.created_at,
    metadata: row.metadata || {}
  }))
}
