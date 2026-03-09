import { supabase, getCurrentUserId } from '../supabase'

const ALLOWED_TRANSITIONS = new Set([
  'open:acknowledged',
  'open:acted',
  'open:dismissed',
  'acknowledged:acted',
  'acknowledged:dismissed',
])

function isAllowedTransition(from, to) {
  return ALLOWED_TRANSITIONS.has(`${from}:${to}`)
}

/**
 * Update decision status for the active org and insert lifecycle event.
 *
 * @param {{ orgId: string, decisionId: string, nextStatus: 'acknowledged'|'acted'|'dismissed', reason?: string|null }} params
 * @returns {Promise<{ ok: boolean, code?: string, message?: string }>}
 */
export async function updateDecisionStatus(params) {
  const { orgId, decisionId, nextStatus, reason = null } = params || {}
  if (!orgId || !decisionId || !nextStatus) {
    return { ok: false, code: 'invalid_args', message: 'Missing orgId, decisionId or nextStatus' }
  }

  const { data: decisions, error: loadError } = await supabase
    .from('decisions')
    .select('id, org_id, status, resolved_at')
    .eq('org_id', orgId)
    .eq('id', decisionId)
    .limit(1)

  if (loadError) {
    console.error('updateDecisionStatus: error loading decision', loadError)
    return { ok: false, code: 'load_error', message: loadError.message }
  }
  if (!decisions || decisions.length === 0) {
    return { ok: false, code: 'not_found', message: 'Decision not found' }
  }

  const decision = decisions[0]
  const fromStatus = decision.status

  if (!isAllowedTransition(fromStatus, nextStatus)) {
    return { ok: false, code: 'invalid_transition', message: `Transition ${fromStatus} → ${nextStatus} not allowed` }
  }

  const nowIso = new Date().toISOString()
  const update = { status: nextStatus }
  if (nextStatus === 'acted' || nextStatus === 'dismissed') {
    update.resolved_at = nowIso
  }

  const { error: updateError } = await supabase
    .from('decisions')
    .update(update)
    .eq('id', decisionId)
    .eq('org_id', orgId)

  if (updateError) {
    console.error('updateDecisionStatus: error updating decision', updateError)
    return { ok: false, code: 'update_error', message: updateError.message }
  }

  let actorId = null
  try {
    actorId = await getCurrentUserId()
  } catch {
    actorId = null
  }

  const eventData = {
    actor_type: actorId ? 'user' : 'system',
    actor_id: actorId,
    from_status: fromStatus,
    to_status: nextStatus,
    reason: reason || null,
  }

  const { error: eventError } = await supabase
    .from('decision_events')
    .insert({
      decision_id: decisionId,
      event_type: nextStatus,
      event_data: eventData,
    })

  if (eventError) {
    console.error('updateDecisionStatus: error inserting event', eventError)
    // status already changed; consider this a soft failure
    return { ok: false, code: 'event_error', message: eventError.message }
  }

  return { ok: true }
}

