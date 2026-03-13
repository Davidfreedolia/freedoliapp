# Inventory low-stock lifecycle event — V1 emitter

**Status:** V1 in place  
**Scope:** Emit `inventory_low_stock` lifecycle events from existing reorder-risk signals so the Decision Bridge can create "Review reorder need" decisions. No new UI, no cron, no worker.

---

## Where the low-stock signal comes from

The **single source of truth** is the existing **reorder intelligence** pipeline:

- **getReorderCandidates** (org + ASINs from product_identifiers) → stock, sales, incoming units, lead time → reorder units, days until stockout, confidence.
- **getReorderAlerts** turns candidates into prioritised alerts (severity, message, etc.) and is the layer used for reorder decisions and for this emitter.

Candidates (and thus alerts) now include **project_id** so each low-stock condition is tied to a project. No second or competing logic; we only reuse this pipeline.

---

## When the event is emitted

- **Trigger:** When the **Home dashboard** loads its data (`useHomeDashboardData`). After the dashboard async load completes, a fire-and-forget call runs **emitLowStockLifecycleEventsFromAlerts(supabase, orgId)**.
- **Flow:** The emitter fetches up to 30 reorder alerts for the org. For each alert that has a `project_id`, it checks dedupe; if the project has not had an `inventory_low_stock` event in the last 24 hours, it calls **recordInventoryLowStock** (one lifecycle event per project, with metadata). The existing Decision Bridge then creates a "Review reorder need" decision when appropriate.

So events are emitted **on dashboard load**, not on a schedule or in a background worker.

---

## How dedupe is handled

- **Rule:** At most one `inventory_low_stock` lifecycle event per **project** per **24 hours**.
- **Implementation:** Before emitting, the emitter queries `lifecycle_events` for `event_type = 'inventory_low_stock'` and `created_at` within the last 24 hours, restricted to the set of project IDs from the current alerts. Any project that already has such an event is skipped for this run.
- **Result:** Repeated dashboard loads do not create duplicate events for the same project within the window; after 24 hours the same project can emit again if still in reorder-risk.

---

## What was intentionally deferred

- **Cron / worker:** No scheduled job; emission only when the app loads home dashboard data.
- **Other entry points:** Operations Planning and other pages that use reorder data do not run the emitter; only the home dashboard does.
- **UI:** No new dashboard block, route, or controls; the events are consumed by the existing Decision Bridge and Decision Dashboard.
- **Changing reorder engine:** No changes to reorder rules, thresholds, or confidence; only `projectId` was added to candidate/alerts and the emitter was added on top.
