# Decision Bridge (Lifecycle Events) — V1

**Status:** V1 bridge in place  
**Scope:** Turn selected lifecycle events into operational decisions using the existing decisions table and Decision Engine. No new routes, no UI redesign.

---

## What the Decision Bridge is

The Decision Bridge is a **thin layer** that turns certain **lifecycle events** into **decisions** that appear in the existing Decision Dashboard / Inbox. When a lifecycle event is recorded (e.g. phase changed, shipment delivered), the bridge can create a corresponding decision so that operators see a clear follow-up (e.g. “Review launch readiness”, “Verify next step”).

Flow: **Lifecycle event recorded → bridge runs → if event type is supported and not already bridged → one decision created** (same `createDecision` API as reorder engine).

---

## Which lifecycle events generate decisions in V1

| Lifecycle event type         | Decision type               | Title / intent                          |
|-----------------------------|-----------------------------|-----------------------------------------|
| `project_phase_changed`     | `lifecycle_phase`           | Verify next step: {stage} / Verify next operational step |
| `shipment_delivered`        | `review_launch_readiness`   | Review launch readiness                 |
| `inventory_low_stock`       | `review_reorder`            | Review reorder need                     |

- **project_phase_changed:** Decision created when the project phase is updated (e.g. to production, listing). Title includes the lifecycle stage when available.
- **shipment_delivered:** Decision created when a shipment is marked delivered; prompts review of launch readiness.
- **inventory_low_stock:** Supported only when such events exist in the stream; no forced emission in V1.

Each decision stores in context: `project_id`, `lifecycle_event_id`, `lifecycle_event_type`, optional `phase_id` and `lifecycle_metadata`. Source is `source_engine: 'lifecycle_events'`, `source_reference: lifecycle_event.id` for deduplication.

---

## What was intentionally deferred

- **UI:** No new screens or routes; decisions appear in the existing Decision Dashboard / Inbox.
- **Automation proposals:** Bridge does not call `maybeCreateAutomationProposalForDecision`; can be added later if desired.
- **Background worker / cron:** No job that polls lifecycle events; the bridge runs only when a lifecycle event is recorded (inside the recorders).
- **Other event types:** `purchase_order_created`, `shipment_in_transit` do not create decisions in V1.
- **Broad schema or engine changes:** No changes to the decisions table or to the core decision engine; only a small bridge module and recorder hooks.

---

## Implementation summary

- **Module:** `src/lib/decisionBridge/lifecycleEvents.js` — `createDecisionFromLifecycleEventIfEligible(supabase, event)`.
- **Deduplication:** One decision per lifecycle event via `decision_sources.source_engine = 'lifecycle_events'` and `source_reference = event.id`.
- **Integration:** Lifecycle event recorders (`recordPhaseChanged`, `recordShipmentStatusChanged` for `delivered`) call the bridge after a successful insert; call is fire-and-forget so recording is not blocked by decision creation failures.
