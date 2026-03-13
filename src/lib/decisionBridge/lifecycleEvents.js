/**
 * V1 Decision Bridge: lifecycle events → decisions.
 * Converts selected lifecycle events into lightweight operational decisions using the existing
 * decisions table and createDecision API. No UI changes, no new routes.
 */

import { createDecision } from '../decision-engine/decisionBridge.js'

const SOURCE_ENGINE = 'lifecycle_events'

const PHASE_ID_TO_STAGE = {
  1: 'research',
  2: 'viability',
  3: 'suppliers',
  4: 'samples',
  5: 'production',
  6: 'listing',
  7: 'live'
}

const ELIGIBLE_EVENT_TYPES = new Set([
  'project_phase_changed',
  'shipment_delivered',
  'inventory_low_stock'
])

/**
 * Check if a decision already exists for this lifecycle event (dedupe).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} lifecycleEventId
 * @returns {Promise<boolean>} true if a decision already exists
 */
async function hasDecisionForLifecycleEvent(supabase, lifecycleEventId) {
  const { data, error } = await supabase
    .from('decision_sources')
    .select('decision_id')
    .eq('source_engine', SOURCE_ENGINE)
    .eq('source_reference', lifecycleEventId)
    .limit(1)
  if (error || !data?.length) return false
  return true
}

/**
 * Map lifecycle event to decision payload (type, title, description, priority).
 * @param {{ event_type: string, phase_id?: number | null, metadata?: object }} event
 * @returns {{ decisionType: string, title: string, description: string, priorityScore: number } | null}
 */
function eventToDecisionPayload(event) {
  const stage = event.phase_id != null ? PHASE_ID_TO_STAGE[event.phase_id] : null
  const stageLabel = stage || (event.phase_id != null ? `Phase ${event.phase_id}` : '')

  switch (event.event_type) {
    case 'project_phase_changed':
      return {
        decisionType: 'lifecycle_phase',
        title: stageLabel ? `Verify next step: ${stageLabel}` : 'Verify next operational step',
        description: 'Project phase changed. Confirm next actions (e.g. PO, shipment, listing).',
        priorityScore: 50
      }
    case 'shipment_delivered':
      return {
        decisionType: 'review_launch_readiness',
        title: 'Review launch readiness',
        description: 'Shipment delivered. Check listing readiness and launch checklist.',
        priorityScore: 60
      }
    case 'inventory_low_stock':
      return {
        decisionType: 'review_reorder',
        title: 'Review reorder need',
        description: 'Low stock signal. Consider reorder or replenishment.',
        priorityScore: 70
      }
    default:
      return null
  }
}

/**
 * Create a decision from a lifecycle event if the event type is supported and no decision exists yet.
 * Safe to call after recording a lifecycle event; deduplication prevents duplicate decisions.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   id: string,
 *   org_id: string,
 *   project_id: string,
 *   event_type: string,
 *   phase_id?: number | null,
 *   metadata?: object
 * }} event — lifecycle event (id, org_id, project_id, event_type, phase_id, metadata)
 * @returns {Promise<string|null>} decision id or null
 */
export async function createDecisionFromLifecycleEventIfEligible(supabase, event) {
  if (!event?.id || !event?.org_id || !event?.project_id || !event?.event_type) return null
  if (!ELIGIBLE_EVENT_TYPES.has(event.event_type)) return null

  const already = await hasDecisionForLifecycleEvent(supabase, event.id)
  if (already) return null

  const payload = eventToDecisionPayload(event)
  if (!payload) return null

  const contextData = {
    project_id: event.project_id,
    lifecycle_event_id: event.id,
    lifecycle_event_type: event.event_type,
    ...(event.phase_id != null && { phase_id: event.phase_id }),
    ...(event.metadata && typeof event.metadata === 'object' && { lifecycle_metadata: event.metadata })
  }

  return createDecision(supabase, {
    orgId: event.org_id,
    decisionType: payload.decisionType,
    priorityScore: payload.priorityScore,
    title: payload.title,
    description: payload.description,
    sourceEngine: SOURCE_ENGINE,
    contextData,
    sourceReference: event.id
  })
}
