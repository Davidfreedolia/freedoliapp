import { supabase, getCurrentUserId } from '../supabase'

/**
 * Track that the current user has viewed a decision (for notifications/read model).
 *
 * - Inserts a `decision_viewed` event into `decision_events`.
 * - Does not mutate the decision lifecycle or status.
 *
 * @param {{ decisionId: string }} params
 * @returns {Promise<void>}
 */
export async function trackDecisionViewed(params) {
  const { decisionId } = params || {}
  if (!decisionId) return

  let actorId = null
  try {
    actorId = await getCurrentUserId()
  } catch {
    actorId = null
  }

  try {
    const eventData = {
      actor_type: actorId ? 'user' : 'system',
      actor_id: actorId,
      source: 'topbar_decision_dropdown',
    }

    const { error } = await supabase
      .from('decision_events')
      .insert({
        decision_id: decisionId,
        event_type: 'decision_viewed',
        event_data: eventData,
      })

    if (error) {
      console.error('trackDecisionViewed: error inserting event', error)
    }
  } catch (err) {
    console.error('trackDecisionViewed: unexpected error', err)
  }
}

