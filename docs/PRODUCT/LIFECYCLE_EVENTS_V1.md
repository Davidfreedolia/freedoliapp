# Lifecycle Events — V1 Foundation

**Status:** V1 foundation in place  
**Scope:** Minimal bridge from project lifecycle state to decisions/automations. No UI, no redesign.

---

## What lifecycle events are

Lifecycle events are **structured records** of things that happen in the product lifecycle:

- Project phase changed  
- Purchase order created  
- Shipment in transit / delivered  

They are written when those actions occur and can be **read by the decisions and automations layers** later to trigger or contextualize actions (e.g. “phase just moved to production” → suggest PO; “shipment delivered” → update inventory or notify).

Conceptually: **Project lifecycle change → lifecycle event → consumable by decisions/automations.**

---

## What was implemented (V1)

1. **Event shape**  
   Normalized fields: `id`, `org_id`, `project_id`, `event_type`, `phase_id`, `lifecycle_stage` (derived), `event_source`, `created_at`, `metadata`.

2. **Table**  
   `public.lifecycle_events` with: `org_id`, `project_id`, `event_type`, `phase_id`, `event_source`, `created_at`, `metadata` (jsonb). RLS: org members can SELECT and INSERT.

3. **Event types**  
   - `project_phase_changed`  
   - `purchase_order_created`  
   - `shipment_in_transit`  
   - `shipment_delivered`  
   - `inventory_low_stock` (reserved for future use).

4. **Recorders**  
   - `recordPhaseChanged` — called after project phase update (e.g. in ProjectDetailImpl).  
   - `recordPoCreated` — called after PO insert (in `createPurchaseOrder` in supabase.js).  
   - `recordShipmentStatusChanged` — called when shipment status becomes `in_transit` or `delivered` (in `setShipmentStatus` and `upsertPoShipment`).

5. **Reader**  
   - `getRecentLifecycleEvents(projectId, { limit })` — returns recent events for a project in normalized form (newest first). For use by decisions/automations; no UI in V1.

6. **Module**  
   - `src/lib/lifecycleEvents/`: `eventTypes.js`, `record.js`, `reader.js`, `index.js`.

7. **Integration points**  
   - Phase change: ProjectDetailImpl after `updateProject` + `project_events` insert.  
   - PO created: supabase.js `createPurchaseOrder` after insert.  
   - Shipment: supabase.js `setShipmentStatus` and `upsertPoShipment` when status is `in_transit` or `delivered`.

Recorders are called in a fire-and-forget way (dynamic import + `.catch(() => {})`) so failures in writing events do not break the main flow.

---

## What was explicitly deferred

- **UI** — No dashboard or list of lifecycle events; no new routes.  
- **Inventory low-stock events** — `inventory_low_stock` is in the schema and event types but **not** emitted by the app in V1. Low-stock can be derived from existing inventory/reorder logic when decisions/automations need it.  
- **Triggers / backend jobs** — All writes are from the app; no DB triggers or cron.  
- **Decisions/automations consumption** — The reader and event shape are ready; wiring into the decision engine or automation rules is out of scope for this foundation.  
- **Broad schema or product redesign** — No changes to existing routes, decision engine, or UX.

---

## Usage (for later consumers)

```js
import { getRecentLifecycleEvents, EVENT_TYPES } from '@/lib/lifecycleEvents'

const events = await getRecentLifecycleEvents(projectId, { limit: 20 })
const lastPhaseChange = events.find((e) => e.event_type === EVENT_TYPES.PROJECT_PHASE_CHANGED)
```

To **emit** (already integrated): use `recordPhaseChanged`, `recordPoCreated`, `recordShipmentStatusChanged` from `@/lib/lifecycleEvents` where the corresponding state changes (or keep current integration points as-is).
