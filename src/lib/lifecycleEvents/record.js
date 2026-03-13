/**
 * V1 lifecycle event recorders. Write to lifecycle_events table.
 * Call after the corresponding state change (phase, PO, shipment); no triggers.
 * Optionally creates a decision via Decision Bridge for eligible event types.
 */

import { EVENT_TYPES, EVENT_SOURCE } from './eventTypes.js'

async function getSupabase() {
  const { supabase } = await import('../supabase.js')
  return supabase
}

function maybeCreateDecisionFromEvent(supabase, event) {
  import('../decisionBridge/lifecycleEvents.js')
    .then((m) => m.createDecisionFromLifecycleEventIfEligible(supabase, event))
    .catch(() => {})
}

/**
 * Record project phase changed. Call after updateProject(..., { current_phase, phase }).
 * @param {{ projectId: string, orgId: string, phaseId: number, previousPhaseId?: number }} params
 */
export async function recordPhaseChanged({ projectId, orgId, phaseId, previousPhaseId }) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .insert({
      org_id: orgId,
      project_id: projectId,
      event_type: EVENT_TYPES.PROJECT_PHASE_CHANGED,
      phase_id: phaseId,
      event_source: EVENT_SOURCE.APP,
      metadata: previousPhaseId != null ? { previous_phase_id: previousPhaseId } : {}
    })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[lifecycleEvents] recordPhaseChanged:', error)
    return null
  }
  const eventId = data?.id
  if (eventId) {
    maybeCreateDecisionFromEvent(supabase, {
      id: eventId,
      org_id: orgId,
      project_id: projectId,
      event_type: EVENT_TYPES.PROJECT_PHASE_CHANGED,
      phase_id: phaseId,
      metadata: previousPhaseId != null ? { previous_phase_id: previousPhaseId } : {}
    })
  }
  return eventId
}

/**
 * Record inventory low-stock lifecycle event. Used by the low-stock emitter when reorder alerts indicate risk.
 * @param {{ projectId: string, orgId: string, metadata?: object }} params
 * @returns {Promise<string|null>} lifecycle event id or null
 */
export async function recordInventoryLowStock({ projectId, orgId, metadata = {} }) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .insert({
      org_id: orgId,
      project_id: projectId,
      event_type: EVENT_TYPES.INVENTORY_LOW_STOCK,
      phase_id: null,
      event_source: EVENT_SOURCE.APP,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[lifecycleEvents] recordInventoryLowStock:', error)
    return null
  }
  const eventId = data?.id
  if (eventId) {
    maybeCreateDecisionFromEvent(supabase, {
      id: eventId,
      org_id: orgId,
      project_id: projectId,
      event_type: EVENT_TYPES.INVENTORY_LOW_STOCK,
      phase_id: null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    })
  }
  return eventId
}

/**
 * Record purchase order created. Call after createPurchaseOrder / insert into purchase_orders.
 * @param {{ projectId: string, orgId: string, poId: string, poNumber?: string }} params
 */
export async function recordPoCreated({ projectId, orgId, poId, poNumber }) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .insert({
      org_id: orgId,
      project_id: projectId,
      event_type: EVENT_TYPES.PURCHASE_ORDER_CREATED,
      phase_id: null,
      event_source: EVENT_SOURCE.APP,
      metadata: { purchase_order_id: poId, po_number: poNumber || null }
    })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[lifecycleEvents] recordPoCreated:', error)
    return null
  }
  return data?.id
}

/**
 * Record shipment status change (in_transit or delivered). Call after setShipmentStatus / upsertPoShipment.
 * @param {{ projectId: string, orgId: string, poId: string, status: string, shipmentId?: string }} params
 */
export async function recordShipmentStatusChanged({ projectId, orgId, poId, status, shipmentId }) {
  const eventType = status === 'delivered' ? EVENT_TYPES.SHIPMENT_DELIVERED : EVENT_TYPES.SHIPMENT_IN_TRANSIT
  if (eventType !== EVENT_TYPES.SHIPMENT_DELIVERED && eventType !== EVENT_TYPES.SHIPMENT_IN_TRANSIT) {
    return null
  }
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('lifecycle_events')
    .insert({
      org_id: orgId,
      project_id: projectId,
      event_type: eventType,
      phase_id: null,
      event_source: EVENT_SOURCE.APP,
      metadata: { purchase_order_id: poId, shipment_id: shipmentId || null, status }
    })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[lifecycleEvents] recordShipmentStatusChanged:', error)
    return null
  }
  const eventId = data?.id
  if (eventId && status === 'delivered') {
    maybeCreateDecisionFromEvent(supabase, {
      id: eventId,
      org_id: orgId,
      project_id: projectId,
      event_type: 'shipment_delivered',
      phase_id: null,
      metadata: { purchase_order_id: poId, shipment_id: shipmentId || null, status }
    })
  }
  return eventId
}
