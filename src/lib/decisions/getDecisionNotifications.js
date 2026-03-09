import { supabase, getCurrentUserId } from '../supabase'

function deriveSeverity(priorityScore) {
  if (priorityScore == null) return 'low'
  const score = Number(priorityScore) || 0
  if (score >= 100) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

/**
 * Load unread decision notifications for the current user in an org.
 *
 * Unread definition (D37-aligned, simplified):
 * - decisions with status = 'open'
 * - severity high/medium (derived from priority_score)
 * - that do NOT have a `decision_viewed` event for the current user
 *
 * @param {{ orgId: string, limit?: number }} params
 * @returns {Promise<{ items: Array<{ id: string, title: string, severity: string, createdAt: string }>, total: number }>}
 */
export async function getDecisionNotifications(params) {
  const { orgId, limit = 10 } = params || {}
  if (!orgId) {
    return { items: [], total: 0 }
  }

  let userId = null
  try {
    userId = await getCurrentUserId()
  } catch {
    userId = null
  }

  // Base set: recent open decisions for this org
  const baseLimit = Math.max(limit * 3, limit) // small safety margin for filtering

  const { data: decisions, error } = await supabase
    .from('decisions')
    .select('id, org_id, decision_type, priority_score, status, title, description, created_at')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(baseLimit)

  if (error || !Array.isArray(decisions) || decisions.length === 0) {
    if (error && error.code !== 'PGRST116') {
      console.error('getDecisionNotifications: error loading decisions', error)
    }
    return { items: [], total: 0 }
  }

  // Apply severity eligibility (D37): high always, medium optionally.
  // For D53 we include both high and medium; low severity is ignored.
  const eligible = decisions.filter((d) => {
    const severity = deriveSeverity(d.priority_score)
    return severity === 'high' || severity === 'medium'
  })

  if (eligible.length === 0) {
    return { items: [], total: 0 }
  }

  const decisionIds = eligible.map((d) => d.id).filter(Boolean)

  // If we do not have a user id (e.g. anonymous/demo edge case),
  // treat all eligible decisions as unread but still limit to `limit`.
  if (!userId) {
    const items = eligible.slice(0, limit).map((d) => ({
      id: d.id,
      title: d.title || d.description || 'Decision',
      severity: deriveSeverity(d.priority_score),
      createdAt: d.created_at,
    }))
    return { items, total: items.length }
  }

  // Fetch existing `decision_viewed` events for this user and these decisions
  const { data: events, error: eventsError } = await supabase
    .from('decision_events')
    .select('decision_id, event_type, event_data')
    .in('decision_id', decisionIds)
    .eq('event_type', 'decision_viewed')

  if (eventsError) {
    console.error('getDecisionNotifications: error loading events', eventsError)
    // Soft-fail: fall back to treating all eligible as unread (still org-scoped and limited)
    const items = eligible.slice(0, limit).map((d) => ({
      id: d.id,
      title: d.title || d.description || 'Decision',
      severity: deriveSeverity(d.priority_score),
      createdAt: d.created_at,
    }))
    return { items, total: items.length }
  }

  const viewedByUser = new Set(
    (events || [])
      .filter((e) => {
        const actorId = e?.event_data?.actor_id
        return actorId && actorId === userId
      })
      .map((e) => e.decision_id)
      .filter(Boolean),
  )

  const unread = eligible.filter((d) => !viewedByUser.has(d.id))

  const items = unread
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map((d) => ({
      id: d.id,
      title: d.title || d.description || 'Decision',
      severity: deriveSeverity(d.priority_score),
      createdAt: d.created_at,
    }))

  return { items, total: items.length }
}

