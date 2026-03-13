import { supabase } from '../supabase'

const OPEN_STATUSES = ['open', 'acknowledged']
const CANDIDATES_LIMIT = 50

/**
 * Get the single most relevant open decision for a project.
 * Decisions are linked to projects via decision_context (key = 'project_id').
 * Returns the top by priority_score DESC, then created_at DESC.
 *
 * @param {{ orgId: string, projectId: string }} params
 * @returns {Promise<{ decision_id: string, decision_type: string, title: string, description: string, priorityScore: number } | null>}
 */
export async function getProjectNextDecision(params) {
  const { orgId, projectId } = params || {}
  if (!orgId || !projectId) return null

  const { data: decisions, error: decError } = await supabase
    .from('decisions')
    .select('id, decision_type, title, description, priority_score, created_at')
    .eq('org_id', orgId)
    .in('status', OPEN_STATUSES)
    .order('priority_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(CANDIDATES_LIMIT)

  if (decError || !decisions?.length) return null

  const ids = decisions.map((d) => d.id).filter(Boolean)
  const { data: ctxRows, error: ctxError } = await supabase
    .from('decision_context')
    .select('decision_id, key, value')
    .in('decision_id', ids)
    .eq('key', 'project_id')

  if (ctxError || !ctxRows?.length) return null

  const projectIdStr = String(projectId).trim()
  const decisionIdsForProject = new Set()
  for (const row of ctxRows) {
    const v = row.value
    const ctxProjectId = v === null || v === undefined ? null : (typeof v === 'string' ? v : String(v)).trim()
    if (ctxProjectId === projectIdStr) decisionIdsForProject.add(row.decision_id)
  }

  if (decisionIdsForProject.size === 0) return null

  const top = decisions.find((d) => decisionIdsForProject.has(d.id))
  if (!top) return null

  return {
    decision_id: top.id,
    decision_type: top.decision_type || '',
    title: top.title || '',
    description: top.description || '',
    priorityScore: top.priority_score != null ? Number(top.priority_score) : 0
  }
}
