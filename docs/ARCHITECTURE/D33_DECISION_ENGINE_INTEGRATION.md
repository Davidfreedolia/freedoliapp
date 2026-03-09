# D33 — Decision Engine Integration

Status: Draft

---

## 1 Purpose

Connect existing engines to the Decision Engine layer so that operational decisions are generated, stored, and surfaced consistently.

This document defines the **integration contract** and the **safe integration plan**. No engine logic is modified in this phase; documentation first.

---

## 2 System State Validation (Post D32)

The following is confirmed:

### Architecture foundation

- **D29 — Global Supply Network:** Model and data contract documented; schema (`supply_origins`, `supply_destinations`, `supply_routes`, `supplier_origin_links`) implemented. No engines use it yet.
- **D30 — Product Identity Model:** Conceptual model and data contract documented. No schema migration yet.
- **D31 — Inventory Ledger:** Architecture, contract, and schema proposal documented; `inventory_snapshots` created; `inventory_movements` preserved. No engine change yet.
- **D32 — Decision Engine:** Architecture, data contract, and schema proposal documented; migration implemented. Tables: `decisions`, `decision_context`, `decision_sources`, `decision_events`. No engine writes to them yet.

### Existing engines (current behaviour)

| Engine | Location / entry | Current output | Persistence |
|--------|------------------|----------------|-------------|
| Reorder Engine | `getReorderCandidates.js` | Candidates (asin, projectId, reorderUnits, daysUntilStockout, confidence, …) | None (computed on demand) |
| Reorder Alerts | `getReorderAlerts.js` | Alerts derived from candidates (severity, message, reorderUnits, …) | None |
| Cashflow Forecast | `getCashflowForecast.js` | Daily forecast (dates, net revenue, PO outflow, running cash) | None |
| Profit Engine | Views / RPCs (e.g. `v_product_econ_day`, profit truth) | Product economics, margins | Canonical tables (financial_ledger, etc.) |

All engines are **read-only** from a decision perspective: they compute or read data but do not yet create rows in `decisions`.

### Decision layer readiness

- Persistent schema exists and is RLS-protected by `org_id`.
- No engine integration yet; no frontend reads from `decisions` yet.
- System is ready for a **controlled integration** that keeps engine logic intact and adds a **decision emission** step.

---

## 3 Integration Contract

The contract defines how engine output becomes one or more decision records.

### 3.1 Responsibility split

- **Engines:** Unchanged. They continue to compute reorder candidates, alerts, cashflow, profit, etc. They do **not** know about the `decisions` table.
- **Decision Bridge (new):** A thin layer that:
  - Calls existing engine APIs (e.g. `getReorderAlerts(supabase, orgId)`).
  - Maps engine output to the canonical decision model.
  - Writes to `decisions`, `decision_context`, `decision_sources`, `decision_events`.

Engines remain **pure**: same inputs, same outputs. The bridge is the only place that knows about the decision schema.

### 3.2 Mapping: Engine output → Decision

| Engine | Suggested decision_type | Source engine | Context keys (examples) |
|--------|-------------------------|---------------|--------------------------|
| Reorder Alerts | `reorder` | `reorder_engine` | asin, project_id, product_name, recommended_quantity, days_until_stockout, expected_stockout_date, confidence |
| Cashflow (risk) | `cash_warning` | `cashflow_engine` | forecast_date, projected_balance, threshold, severity |
| Profit / margin | `margin_risk` or existing type | `profit_engine` | product_id, asin, margin_pct, trend |
| Inventory intelligence | `stock_risk` | `inventory_engine` | variant_id / asin, days_of_cover, warehouse_id |

Rules:

- One engine run may produce **zero or more** decisions.
- Each decision row has exactly one **decision_type** and one **source_engine** (via `decision_sources`).
- **priority_score** is derived from engine signals (e.g. severity, days until stockout, cash shortfall) so that higher-priority decisions sort first.
- **context_data** is stored in `decision_context` as key/value (value as jsonb) to keep the schema stable and flexible.

### 3.3 Idempotency and freshness

- Decisions are **point-in-time** recommendations. Re-running an engine may create **new** decisions for the same logical “situation” (e.g. same ASIN reorder suggestion).
- To avoid unbounded growth, the integration plan will define:
  - **Deduplication:** e.g. one open decision per (org_id, decision_type, context key set) or time window.
  - **Lifecycle:** when to resolve/dismiss old decisions as newer runs replace them.
- These rules will be implemented in the **Decision Bridge**, not inside the engines.

### 3.4 Traceability

- `decision_sources.source_engine` + `source_reference` (e.g. run id, batch id, or engine-specific reference) must allow tracing back to the engine run.
- `decision_events` record created / acknowledged / resolved / dismissed so the lifecycle is auditable.

---

## 4 D33 Scope

### In scope

- Document the integration contract (this document).
- Define the Decision Bridge’s responsibilities and mapping rules.
- Plan safe integration steps (see below).
- Later phases (separate): implement the bridge, wire one engine at a time, then UI.

### Out of scope in this phase

- Changing engine logic or signatures.
- Adding new engines.
- Changing the decision schema (D32.4 is final for this phase).
- Frontend changes to read decisions (planned after bridge exists).

---

## 5 Safe Integration Plan

### Phase A — Decision Bridge (no engine changes)

1. Introduce a **Decision Bridge** module (e.g. `src/lib/decisions/` or `src/lib/decisionBridge.js`).
2. Implement **write-only** helpers: create decision, append context, record source, emit lifecycle event.
3. No engine is called from the bridge yet; optional: unit tests that create sample decisions and context.

### Phase B — Reorder Engine integration (first engine)

1. From a single entry point (e.g. “refresh decisions for org”), call `getReorderAlerts(supabase, orgId)`.
2. Map each alert to one decision row: `decision_type = 'reorder'`, `source_engine = 'reorder_engine'`, priority from severity, context from alert fields.
3. Apply deduplication rule (e.g. resolve previous open reorder decisions for the same ASIN/project before inserting new ones, or one-open-per-context).
4. Record `decision_sources` and initial `decision_events.created`.
5. Engines remain unchanged; only the bridge and the caller change.

### Phase C — Cashflow and others

1. Add cashflow risk detection (e.g. forecast below threshold) and map to `decision_type = 'cash_warning'`, `source_engine = 'cashflow_engine'`.
2. Repeat pattern for profit/margin and inventory intelligence when ready.
3. Keep one engine per step to avoid regressions.

### Phase D — UI and lifecycle

1. Expose decisions to Home dashboard / Operations Planning (read from `decisions` + context).
2. Implement acknowledge / resolve / dismiss and write `decision_events` accordingly.
3. Optional: scheduled job to refresh decisions periodically.

---

## 6 Architecture Rules (Reinforced)

- Engines **do not** depend on the Decision Engine schema; the bridge depends on engines.
- Decisions are **deterministic** and **explainable** via context and source_engine.
- All writes to `decisions` go through the same bridge so that deduplication, lifecycle, and RLS stay consistent.
- No hacks: no bypassing the bridge, no direct SQL from engines to decisions.

---

## 7 Definition of Done (D33 Documentation)

- [x] System state after D32 validated.
- [x] Integration contract defined (engine → decision mapping, responsibility split, idempotency, traceability).
- [x] D33 scope and safe integration plan documented.
- [x] Bridge implementation (D33.1).
- [x] First engine (Reorder) integrated (D33.2).
- [ ] UI and lifecycle (later phase).

---

## 8 Future Phases

- D33.1 — Decision Bridge implementation (write-only, no engine calls).
- D33.2 — Reorder Engine → Decision Bridge integration.
- D33.3 — Cashflow / Profit / Inventory integration (as needed).
- D33.4 — UI and decision lifecycle.

---

## Current implementation status

- D33 architecture and integration contract documented
- Decision Bridge module implemented
- first engine integration implemented for Reorder
- Reorder Engine remains unchanged
- decisions are now persisted from reorder output
- no UI integration yet
- no scheduler yet
- no automatic resolution yet

---

## Implemented integration scope

### Decision Bridge

**File:** `src/lib/decision-engine/decisionBridge.js`

**Purpose:**

- create decisions
- acknowledge decisions
- resolve decisions
- dismiss decisions
- write to:
  - `decisions`
  - `decision_context`
  - `decision_sources`
  - `decision_events`

### Reorder integration

**File:** `src/lib/decision-engine/integrations/reorderDecisions.js`

**Purpose:**

- read existing reorder output
- map reorder alerts/candidates into persistent decisions
- create decisions with:
  - `decision_type = reorder`
  - `source_engine = reorder_engine`

### Context written

The integration stores context such as:

- asin
- product_name
- reorder_units
- days_until_stockout
- coverage_days
- lead_time_days
- confidence

### Deduplication

First-version dedupe rule:

- skip creation if an `open` or `acknowledged` reorder decision already exists for the same org and same product reference from `reorder_engine`

---

## Architecture rule now enforced

The Decision Layer is now connected to a real engine through an external bridge.

Engine logic remains inside the Reorder Engine.

Decision persistence and lifecycle remain outside the engine.

This preserves:

- engine determinism
- separation of concerns
- safe future integrations for cashflow, inventory, and profit

---

## Definition of done

- decision bridge implemented
- reorder integration implemented
- dedupe baseline implemented
- documentation updated

---
