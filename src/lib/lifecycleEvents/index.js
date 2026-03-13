/**
 * V1 Lifecycle Events — minimal bridge from project lifecycle to decisions/automations.
 * See docs/PRODUCT/LIFECYCLE_EVENTS_V1.md.
 */

export { EVENT_TYPES, EVENT_SOURCE } from './eventTypes.js'
export { recordPhaseChanged, recordPoCreated, recordShipmentStatusChanged, recordInventoryLowStock } from './record.js'
export { getRecentLifecycleEvents } from './reader.js'
export { emitLowStockLifecycleEventsFromAlerts } from './emitLowStock.js'
