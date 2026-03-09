import { supabase, getCurrentUserId } from '../supabase'

const FEEDBACK_TYPE_TO_EVENT = {
  useful: 'decision_feedback_useful',
  not_useful: 'decision_feedback_not_useful',
  wrong: 'decision_feedback_wrong',
}

/**
 * Submit explicit feedback for a decision.
 *
 * - Validates org/decision relationship.
 * - Prevents duplicate feedback per user/decision/feedback_type.
 * - Records an event in decision_events.
 *
 * @param {{ orgId: string, decisionId: string, feedbackType: 'useful'|'not_useful'|'wrong' }} params
 * @returns {Promise<{ ok: boolean, code?: string, message?: string }>}
 */
export async function submitDecisionFeedback(params) {
  const { orgId, decisionId, feedbackType } = params || {}
  if (!orgId || !decisionId || !feedbackType) {
    return { ok: false, code: 'invalid_args', message: 'Missing orgId, decisionId or feedbackType' }
  }

  const eventType = FEEDBACK_TYPE_TO_EVENT[feedbackType]
  if (!eventType) {
    return { ok: false, code: 'invalid_feedback_type', message: 'Unsupported feedback type' }
  }

  // Validate decision belongs to org
  const { data: decisions, error: loadError } = await supabase
    .from('decisions')
    .select('id, org_id')
    .eq('org_id', orgId)
    .eq('id', decisionId)
    .limit(1)

  if (loadError) {
    console.error('submitDecisionFeedback: error loading decision', loadError)
    return { ok: false, code: 'load_error', message: loadError.message }
  }
  if (!decisions || decisions.length === 0) {
    return { ok: false, code: 'not_found', message: 'Decision not found for org' }
  }

  let userId = null
  try {
    userId = await getCurrentUserId()
  } catch {
    userId = null
  }

  // Prevent duplicate feedback from same user for same decision/type
  if (userId) {
    const { data: existing, error: existingError } = await supabase
      .from('decision_events')
      .select('id, event_data')
      .eq('decision_id', decisionId)
      .eq('event_type', eventType)

    if (existingError) {
      console.error('submitDecisionFeedback: error checking existing feedback', existingError)
    } else if (Array.isArray(existing)) {
      const already = existing.some((row) => row?.event_data?.actor_id === userId)
      if (already) {
        return { ok: false, code: 'duplicate', message: 'Feedback already submitted by this user' }
      }
    }
  }

  const eventData = {
    actor_type: userId ? 'user' : 'system',
    actor_id: userId,
    org_id: orgId,
    feedback_type: feedbackType,
  }

  const { error: insertError } = await supabase.from('decision_events').insert({
    decision_id: decisionId,
    event_type: eventType,
    event_data: eventData,
  })

  if (insertError) {
    console.error('submitDecisionFeedback: error inserting feedback event', insertError)
    return { ok: false, code: 'insert_error', message: insertError.message }
  }

  return { ok: true }
}

