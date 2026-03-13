/**
 * V1 lifecycle event type constants and normalized event shape.
 * Used by recorders and reader. Decisions/automations consume the normalized shape.
 */

export const EVENT_TYPES = {
  PROJECT_PHASE_CHANGED: 'project_phase_changed',
  PURCHASE_ORDER_CREATED: 'purchase_order_created',
  SHIPMENT_IN_TRANSIT: 'shipment_in_transit',
  SHIPMENT_DELIVERED: 'shipment_delivered',
  INVENTORY_LOW_STOCK: 'inventory_low_stock'
}

export const EVENT_SOURCE = {
  APP: 'app',
  SYSTEM: 'system'
}

/**
 * Normalized lifecycle event shape (what the reader returns and consumers use).
 * @typedef {{
 *   id: string,
 *   org_id: string,
 *   project_id: string,
 *   event_type: string,
 *   phase_id: number | null,
 *   lifecycle_stage: string | null,
 *   event_source: string,
 *   created_at: string,
 *   metadata: object
 * }} LifecycleEvent
 */
