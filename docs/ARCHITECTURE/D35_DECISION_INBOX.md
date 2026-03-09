# D35 — Decision Inbox

Status: Draft

---

## 1. Objective

Expose operational decisions to the seller through a clear inbox-style interface.

The Decision Inbox is the first seller-facing layer of the existing decision system.

Its purpose is simple:

- surface the most important operational recommendations
- make each recommendation understandable
- let the seller explicitly manage its lifecycle
- preserve traceability and auditability

This phase does **not** introduce new engines, notifications, automation, or AI explanation layers.

---

## 2. Current State After D34

The current system state is:

- D29 — Supply Network documented and available as architectural foundation
- D30 — Product Identity documented
- D31 — Inventory Ledger documented and partially implemented
- D32 — Decision Engine schema implemented
- D33 — Decision Bridge implemented
- D34 — Decision Scheduler implemented

Current persistent decision tables:

- `decisions`
- `decision_context`
- `decision_sources`
- `decision_events`

Current production behaviour:

- the reorder engine produces operational recommendations
- the decision bridge maps them into canonical decisions
- the scheduler periodically runs decision sync
- decisions are created automatically in the database

Current limitation:

- sellers cannot yet see or manage these decisions in the UI

So the system already generates intelligence, but that intelligence is still effectively blind to the user.

---

## 3. Design Principles

The Decision Inbox must follow these rules:

### 3.1 Decision system remains backend-first

The UI does not generate decisions.

The UI only reads persisted decisions and performs lifecycle actions on them.

### 3.2 Inbox is an operational workspace, not a notification feed

This is not a bell full of noise.

The inbox is a structured work queue for meaningful recommendations.

### 3.3 Lifecycle must be explicit and auditable

Every seller action that changes a decision state must produce an event in `decision_events`.

### 3.4 Decision content must be explainable

Every inbox item must present:

- what happened
- why it matters
- what the seller should do next

### 3.5 First-class org isolation

All inbox reads and writes remain org-scoped under the existing tenant model. This is aligned with the canonical org-boundary architecture and production-readiness rules already defined for FREEDOLIAPP.

---

## 4. Decision Lifecycle

## 4.1 Canonical states

D35 defines these seller-facing states:

- `open`
- `acknowledged`
- `acted`
- `dismissed`
- `expired`

### Meaning of each state

#### `open`
The decision is active and requires seller attention.

This is the default state when the system creates a decision.

#### `acknowledged`
The seller has seen the decision and intentionally marked it as understood, but has not yet completed the underlying action.

This removes ambiguity between “not seen” and “seen but still pending”.

#### `acted`
The seller confirms the recommendation has been executed or handled.

This is the success/closure state from the seller workflow perspective.

#### `dismissed`
The seller intentionally rejects or ignores the recommendation.

This is a user-driven closure state, not a system success state.

#### `expired`
The decision is no longer operationally relevant because time or newer system conditions made it stale.

This is primarily system-driven, not user-driven.

---

## 4.2 Allowed state transitions

Allowed transitions:

- `open` → `acknowledged`
- `open` → `acted`
- `open` → `dismissed`
- `open` → `expired`

- `acknowledged` → `acted`
- `acknowledged` → `dismissed`
- `acknowledged` → `expired`

No other transitions are allowed in D35.

### Explicitly not allowed

- `dismissed` → `open`
- `acted` → `open`
- `expired` → `open`
- `acted` → `dismissed`
- `dismissed` → `acted`

Reason:

D35 keeps lifecycle simple and auditable. Closed states stay closed.

If a new recommendation is needed later, the system creates a **new decision**, not a zombie resurrection of the old one.

---

## 4.3 Transition ownership

### System-triggered

The system may trigger:

- `open` on creation
- `expired` when a decision becomes stale

Examples:

- reorder decision no longer relevant because fresh inventory arrived
- older decision replaced by a newer equivalent recommendation
- time-based freshness window exceeded

### Seller-triggered

The seller may trigger:

- `acknowledged`
- `acted`
- `dismissed`

This keeps ownership clean:

- system owns recommendation generation and staleness
- seller owns operational handling

---

## 4.4 What gets stored on transition

Every lifecycle change must:

1. update `decisions.status`
2. optionally update closure timestamps on `decisions`
3. insert a row in `decision_events`

### `decisions` updates

Recommended D35 write rules:

- on creation:
  - `status = 'open'`
- on `acknowledged`:
  - `status = 'acknowledged'`
- on `acted`:
  - `status = 'acted'`
  - set `resolved_at = now()` if the column exists
- on `dismissed`:
  - `status = 'dismissed'`
  - set `resolved_at = now()` if the column exists
- on `expired`:
  - `status = 'expired'`
  - set `resolved_at = now()` if the column exists

### `decision_events` rows

Each transition inserts an event such as:

- `created`
- `acknowledged`
- `acted`
- `dismissed`
- `expired`

Recommended `event_data` payload:

- actor type: `system` or `user`
- actor id if available
- optional note / reason
- previous status
- new status

Example:

```json
{
  "actor_type": "user",
  "actor_id": "uuid",
  "from_status": "open",
  "to_status": "acknowledged",
  "reason": null
}
```

---

## 5. Inbox Model

The Decision Inbox is a normalized seller-facing projection of canonical decision data.

It is not a separate persistence model.

It is a UI/read model built from:

- `decisions`
- `decision_context`
- `decision_sources`

---

## 5.1 Inbox item structure

Each inbox item should expose:

- id
- decision_type
- status
- title
- explanation
- recommended_action
- severity
- confidence
- priority_score
- source_engine
- created_at
- resolved_at
- entity_links
- context_summary

---

## 5.2 Required seller-facing fields

### title

Short operational label.

Examples:

- Reorder required
- Incoming shipment delayed
- Profit risk detected

Rule:

The title must be readable without opening the detail panel.

### explanation

Plain-language statement of what the system found.

Examples:

- Stockout risk detected based on current stock coverage and expected lead time.
- Shipment ETA slipped and may affect available stock.
- Margin is falling below acceptable threshold.

Rule:

Explain the problem, not the database.

### recommended_action

The clearest next step the seller should take.

Examples:

- Review supplier lead time and create a replenishment PO.
- Open shipment and confirm revised ETA.
- Review product economics and recent fees.

Rule:

One crisp action. No philosophy, no TED Talk.

### confidence

System confidence in the recommendation.

Canonical values for D35:

- high
- medium
- low

This should come from context data when available.

### severity

Operational urgency.

Canonical values for D35:

- high
- medium
- low

For reorder decisions in D35, severity can be derived from current engine output or mapped from priority.

### entity_links

Deep links to related records.

Possible links:

- product / project
- shipment
- purchase order
- finances / profit detail

Rule:

No dead decorative links. If the entity is unknown, omit it.

---

## 5.3 Canonical decision-type presentation contract

### reorder

Fields shown:

- title: Reorder required
- explanation: stockout risk + coverage/lead-time rationale
- recommended action: open product/project and prepare replenishment
- links: project, product, future PO flow
- context: ASIN, product name, reorder units, days until stockout

### shipment_delay (future-compatible, not required to exist yet)

Fields shown:

- title: Incoming shipment delayed
- explanation: incoming inventory timing slipped
- recommended action: open shipment and assess stock impact
- links: shipment, project

### profit_risk (future-compatible)

Fields shown:

- title: Profit risk detected
- explanation: margin dropped below threshold or trend worsened
- recommended action: open economics detail
- links: product/project/profit page

D35 only requires the inbox model to support these types. It does not require all engines to already emit them.

---

## 6. UI Architecture

### 6.1 Placement

D35 defines three inbox surfaces:

**Primary surface**

Dedicated page:

`/app/decisions`

This is the canonical home of the Decision Inbox.

**Secondary surface**

Dashboard widget:

compact preview of highest-priority open items

Purpose:

- surface urgency on the home screen
- drive navigation into the full inbox

**Tertiary surface**

Topbar indicator:

unread/open count only

optional quick access entry point to `/app/decisions`

Important:

D35 does not turn the topbar into the primary inbox UI. That would be a clown car.

The dedicated page is the real operational workspace.

---

### 6.2 Default view

Default inbox page view:

- show open first
- then acknowledged
- hide closed states by default (acted, dismissed, expired) behind filters

Default sort:

- priority_score descending
- created_at descending

Reason:

Most urgent decisions first, newest within urgency group.

---

### 6.3 Layout model

Recommended page layout:

**Left / main list**

Decision list with compact cards or rows.

Each row shows:

- severity indicator
- title
- explanation preview
- confidence
- created time
- primary linked entity
- current status

**Right / detail panel**

When an item is selected:

- full explanation
- structured context
- recommended action
- related entity links
- lifecycle actions

This supports fast scanning and fast action without page hopping.

---

### 6.4 Filtering

Required D35 filters:

- status
- decision type
- severity
- confidence

Recommended presets:

- Open
- Acknowledged
- Closed
- High priority

---

### 6.5 Sorting

Supported sorts:

- priority score
- newest first
- oldest first

Default remains:

- priority descending
- created_at descending

---

### 6.6 Grouping

D35 grouping options:

- none by default
- optional group by decision type
- optional group by severity

Do not overbuild fancy grouping logic now.

This is an inbox, not a spaceship cockpit.

---

## 7. Data Access Model

### 7.1 Recommended access pattern

D35 should use a dedicated decision service layer in frontend code.

Recommended shape:

- `src/lib/decisions/getDecisionInboxPage.js`
- `src/lib/decisions/updateDecisionStatus.js`

Reason:

This keeps UI components thin and prevents decision-query logic from leaking across the app.

**Explicit choice**

- Do not query raw tables directly from many components.
- Do not put lifecycle mutation logic inside page components.
- Use a decision service layer.

---

### 7.2 Read model source

The inbox read model should be built from canonical tables:

- `decisions`
- `decision_context`
- `decision_sources`

The service layer is responsible for:

- loading decision rows
- attaching source engine
- resolving key context entries into UI fields
- returning a normalized inbox item object

---

### 7.3 Query strategy

**Option chosen for D35**

Direct Supabase reads through a frontend decision service layer.

Reason:

- existing tables already exist
- D35 is read-heavy but not analytically complex
- no need to prematurely add an RPC if page volume is still manageable

**When RPC becomes justified later**

Introduce RPC only if one or more of these becomes true:

- context aggregation becomes too heavy
- pagination queries become inefficient
- additional joins create unstable client mapping logic
- decision counts become large enough to require server-shaped projections

D35 does not require RPC yet.

---

### 7.4 Pagination

Required:

- offset/limit or range-based pagination on the decisions list.

Recommended first implementation:

- page size: 25 or 50
- infinite scroll optional later

Standard page or “load more” is enough for D35.

Rule:

- Only paginate the list view.
- The detail panel always loads from the selected item already in memory or by id fetch.

---

### 7.5 Filtering strategy

Filter at query level for primary fields stored on `decisions`:

- status
- decision_type
- priority_score
- created_at

Context-derived filters like confidence may require either:

- secondary client-side shaping after context load
- or a dedicated projection later

For D35, acceptable approach:

- query the decision rows first
- fetch related context rows for the current page
- shape them into inbox items
- apply confidence filter in the service layer if needed

---

### 7.6 Performance considerations

D35 must assume the current decision volume is moderate.

Performance rules:

- only fetch one page of decisions at a time
- only fetch context rows for visible decision ids
- only fetch source rows for visible decision ids
- avoid full-table `decision_context` reads
- avoid rendering entire history by default

Future optimization path if needed:

- add materialized read model or RPC
- add compound indexes aligned with inbox filters
- add server-side projection for resolved UI fields

---

## 8. Interaction Model

### 8.1 Seller actions in D35

The seller can perform these actions:

- Acknowledge
- Mark as done
- Dismiss
- Open related entity

These map to lifecycle changes as follows:

- Acknowledge → acknowledged
- Mark as done → acted
- Dismiss → dismissed
- Open related entity → no lifecycle change

---

### 8.2 Action semantics

**Acknowledge**

Meaning:

“I have seen this and I accept it is a valid pending item.”

Effects:

- update `decisions.status = 'acknowledged'`
- insert `decision_events` row with `event_type = 'acknowledged'`

**Mark as done**

Meaning:

“I completed or handled the recommended action.”

Effects:

- update `decisions.status = 'acted'`
- set `resolved_at` if supported
- insert `decision_events` row with `event_type = 'acted'`

**Dismiss**

Meaning:

“I do not want to act on this recommendation.”

Effects:

- update `decisions.status = 'dismissed'`
- set `resolved_at` if supported
- insert `decision_events` row with `event_type = 'dismissed'`

Recommended D35 UX:

- optionally require a short reason later
- not required in D35 baseline

**Open related entity**

Meaning:

Navigate to the relevant operational object without changing lifecycle.

Examples:

- open product / project
- open shipment
- open financial detail

Effects:

- no status change
- no mandatory event in D35

Optional later:

- record a non-state event like `opened_entity`

Not required now.

---

### 8.3 Event model for D35

D35 requires lifecycle event insertion for all status-changing seller actions.

Minimum event set:

- `created`
- `acknowledged`
- `acted`
- `dismissed`
- `expired`

Event row requirements:

- decision_id
- event_type
- event_data
- created_at

Recommended `event_data` keys:

- actor_type
- actor_id
- from_status
- to_status
- reason

---

### 8.4 Concurrency rule

A decision can only be transitioned from its current valid state.

Mutation helpers must verify current status before writing.

This prevents garbage transitions such as:

- marking an already dismissed item as acknowledged
- dismissing an already acted item
- acting on an expired item

If state is stale, mutation returns a recoverable conflict and UI refreshes the item.

---

## 9. Recommended UI Copy Contract

To avoid raw-engine ugliness in the UI, D35 should standardize decision presentation copy.

Each inbox item should have these derived seller-facing strings:

- display_title
- display_explanation
- display_recommended_action

These should be shaped in the decision service layer, not stored as a second permanent truth unless later required.

Reason:

- Backend remains canonical.
- Frontend remains readable.
- Nobody has to stare at cryptic context keys like it is a ransom note.

---

## 10. Non-goals

D35 does not implement:

- email alerts
- push alerts
- notification delivery systems
- AI explanation layers
- auto-remediation
- cross-channel workflow automation
- advanced analytics over decision history
- complex decision assignment / multi-user workflow routing
- reversible lifecycle reopen flows
- new engines beyond existing emitted decisions

This phase is only the seller-facing inbox layer over already persisted decisions.

---

## 11. Definition of Done

D35 is done when all of the following are true:

- Decision Inbox architecture is documented.
- Canonical seller-facing lifecycle is defined:
  - open
  - acknowledged
  - acted
  - dismissed
  - expired
- Allowed state transitions are explicitly defined.
- Ownership of transitions is defined:
  - seller-triggered vs system-triggered
- Inbox item presentation model is documented.
- UI placement is defined:
  - dedicated page
  - dashboard widget
  - topbar entry point
- Data access model is defined:
  - decision service layer
  - canonical table reads
  - pagination/filtering/performance rules
- Interaction model is defined:
  - acknowledge
  - mark as done
  - dismiss
  - open related entity
- Event recording requirements are defined for all lifecycle mutations.
- Non-goals are explicitly frozen for this phase.
- No UI implementation is included in D35.

---

## 12. Implementation Boundary for Next Phase

D35 only defines the contract.

The next implementation phase may create:

- page route `/app/decisions`
- decision service helpers
- inbox list UI
- detail panel UI
- lifecycle action handlers

But that belongs to the next approved phase, not this one.

---

