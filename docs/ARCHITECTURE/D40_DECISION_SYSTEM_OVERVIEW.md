# D40 — Decision System Overview

Status: Draft

---

## 1. Vision

FREEDOLIAPP’s Decision System is designed to transform **raw operational data** into **clear, actionable recommendations** for Amazon sellers and multichannel commerce.

The system:

- Consolidates signals from multiple engines (profit, cashflow, inventory, supply network).
- Normalizes them into **canonical decisions**.
- Surfaces them through a **Decision Inbox** and related UI.
- Prepares the ground for **notifications**, **automation**, and **analytics**.

The key goals are:

- **Determinism** — same inputs, same decisions.
- **Traceability** — every recommendation and action can be explained and audited.
- **Tenant safety** — all behavior is org-scoped and respects multi-tenant isolation.

---

## 2. Main Components

The Decision System is composed of the following architectural layers:

1. **Decision Engine (D32)**  
   - Canonical data model for decisions and lifecycle events.

2. **Decision Bridge (D33)**  
   - Glue layer between engines and the Decision Engine schema.

3. **Decision Scheduler (D34)**  
   - Periodic orchestrator that keeps decisions up to date.

4. **Decision Inbox (D35–D36)**  
   - Seller-facing UI to view and manage decisions.

5. **Decision Notifications (D37)**  
   - Architecture for in-app awareness and future digests.

6. **Decision Automation (D38)**  
   - Architecture for assisted and automated actions based on decisions.

7. **Decision Analytics (D39)**  
   - Architecture for measuring decision system effectiveness.

Each layer has clearly defined responsibilities and contracts, and they all share the same canonical underlying tables.

---

## 3. Canonical Data Model

The Decision System relies on four core tables:

- `decisions`
- `decision_context`
- `decision_sources`
- `decision_events`

### 3.1 `decisions`

Canonical record of each decision:

- Keys:
  - `id`
  - `org_id`
- Core fields:
  - `decision_type` (e.g. `reorder`, `cash_warning`, `profit_risk`).
  - `priority_score`.
  - `status` (`open`, `acknowledged`, `acted`, `dismissed`, `expired`).
  - `created_at`, `resolved_at`.

Represents the current **state** of each recommendation.

### 3.2 `decision_context`

Context key/value pairs per decision:

- Fields:
  - `decision_id`
  - `key`
  - `value` (jsonb)

Examples:

- `asin`, `product_name`, `reorder_units`, `days_until_stockout`, `confidence`.

Used to:

- Render rich UI (Decision Inbox).
- Enable analytics groupings (per product, per engine).

### 3.3 `decision_sources`

Indicates where each decision came from:

- Fields:
  - `decision_id`
  - `source_engine` (e.g. `reorder_engine`, `cashflow_engine`).
  - `source_reference` (engine-specific id/batch).

Provides traceability from decisions back to the engines.

### 3.4 `decision_events`

Event log of lifecycle and related actions:

- Fields:
  - `decision_id`
  - `event_type` (`created`, `acknowledged`, `acted`, `dismissed`, `expired`, etc.).
  - `event_data` (jsonb: `actor_type`, `actor_id`, `from_status`, `to_status`, `reason`, rule ids, etc.).
  - `created_at`.

Used for:

- Reconstructing history.
- Analytics (time-to-action, rates).
- Future notifications and automation traces.

---

## 4. Lifecycle of a Decision (End-to-End Flow)

High-level path from **engine signal** to **seller action or expiry**:

1. **Engine output** (e.g. Reorder Engine, Profit Engine, Cashflow engine) produces a recommendation.
2. **Decision Bridge (D33)**:
   - Reads engine output.
   - Maps it into canonical decision fields + context.
   - Calls the Decision Engine schema:
     - Inserts into `decisions` (`status = 'open'`).
     - Inserts initial `decision_context`, `decision_sources`.
     - Inserts a `decision_events` row with `event_type = 'created'`.
3. **Decision Scheduler (D34)**:
   - Periodically invokes integrations (e.g. `syncReorderDecisions`) for each active org.
   - Uses advisory lock to avoid overlaps.
   - Ensures decisions stay up to date over time.
4. **Decision Inbox (D35–D36)**:
   - `/app/decisions` shows a list (left pane) and detail (right pane).
   - Normalized fields from service layer:
     - `id`, `decisionType`, `status`, `title`, `explanation`, `recommendedAction`, `severity`, `confidence`, `priorityScore`, `createdAt`, `resolvedAt`, `sourceEngine`, `contextSummary`.
   - Seller can:
     - **Acknowledge** → status `acknowledged`.
     - **Mark as done** → status `acted`.
     - **Dismiss** → status `dismissed`.
   - Each action:
     - Updates `decisions.status` (and `resolved_at` when closing).
     - Inserts a `decision_events` row (`event_type` = `acknowledged`/`acted`/`dismissed` with structured `event_data`).
5. **Notifications (D37)**:
   - Architecture defines which decisions are notification-eligible (e.g. `status` in `open`/`acknowledged`, `severity` high/medium).
   - In-app badge/topbar and digest concepts rely on:
     - `decisions` for current state.
     - `decision_events` for changes and unread/read semantics.
6. **Automation (D38)**:
   - Architecture describes how certain decision types might drive assisted or automated actions.
   - When implemented, automation will:
     - Evaluate rules against `decisions` and `decision_context`.
     - Record outcomes into future execution tables and `decision_events` (e.g. `automation_executed`, `automation_failed`).
7. **Analytics (D39)**:
   - Use `decisions` and `decision_events` to compute:
     - Creation rate, acknowledgement rate, acted/dismiss rates, time-to-action.
   - Aggregations per org, product/project, decision_type, severity.

At any point, the full lifecycle from **generation** to **closure/expiry** is reconstructible from canonical tables.

---

## 5. Responsibilities by Layer

### 5.1 Engines

- Compute domain-specific outputs (profit, cashflow, inventory, supply network).
- Do **not** know about the decisions schema or UI.

### 5.2 Decision Engine (D32)

- Owns the **canonical decision model**:
  - Tables: `decisions`, `decision_context`, `decision_sources`, `decision_events`.
- Enforces lifecycle semantics and relationships.

### 5.3 Decision Bridge (D33)

- Translates engine output into canonical decisions:
  - Calls engines (e.g. `getReorderAlerts`).
  - Applies mapping rules per decision type.
  - Deduplicates based on org + context (e.g. per ASIN).
- Does **not** embed engine logic; uses engines as-is.

### 5.4 Decision Scheduler (D34)

- Orchestrates periodic execution of integrations:
  - Edge Function `decision-scheduler`.
  - Advisory lock for anti-overlap.
  - Org-scoped loops (only active/trialing orgs).
- Does not alter schema or engine logic; only triggers them safely.

### 5.5 Decision Inbox (D35–D36)

- Provides seller-facing UI:
  - `/app/decisions` page.
  - Two-panel layout (list + detail).
  - Lifecycle actions (acknowledge, mark as done, dismiss).
- Uses a **service layer**:
  - `getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`.
- Does **not** generate decisions; it only **reads and mutates** existing records.

### 5.6 Decision Notifications (D37)

- Defines:
  - Notification channels (in-app badge, future digest).
  - Trigger rules based on `decisions` + `decision_events`.
  - Deduplication and throttling models.
  - Org/user preference concepts.
- Does not yet send notifications; prepares the contracts for future implementation.

### 5.7 Decision Automation (D38)

- Defines:
  - Recommendation vs assisted vs automated modes.
  - Eligible vs non-eligible decision types.
  - Preconditions and approval gates.
  - Audit trail and future execution table shape.
- No automation code or tables are created in this phase.

### 5.8 Decision Analytics (D39)

- Defines analytics over the decision system:
  - Metrics: creation rate, acknowledgement rate, acted/dismiss rate, time-to-action.
  - Aggregations per org, product/project, decision_type.
  - Use of `decisions` and `decision_events` as source of truth.
- Does not implement dashboards yet.

---

## 6. Key Contracts

Below are the main contracts that tie layers together.

### 6.1 Engine → Decision Bridge

- Engine provides:
  - Domain-specific output (e.g. reorder alerts).
- Bridge contract:
  - Input: engine output, `orgId`.
  - Output: canonical decision(s) created/updated in:
    - `decisions`
    - `decision_context`
    - `decision_sources`
    - `decision_events` (`created`).

### 6.2 Bridge & Scheduler → Decision Engine

- Bridge logic must be **idempotent-friendly**:
  - Scheduler can re-run integrations without duplicating decisions.
- Scheduler contract:
  - Input: none (triggered per org).
  - Behavior: calls `syncReorderDecisions` or other sync functions.
  - Side effects: decisions updated via Decision Bridge, never directly.

### 6.3 Inbox → Decision Engine

- Inbox uses service layer functions:
  - `getDecisionInboxPage({ orgId, page, filters })`:
    - Reads `decisions` + `decision_context` + `decision_sources`.
  - `getDecisionById({ orgId, decisionId })`:
    - Reads and normalizes single decision.
  - `updateDecisionStatus({ orgId, decisionId, nextStatus, reason? })`:
    - Validates allowed transition.
    - Updates `decisions.status` (+ `resolved_at`).
    - Inserts lifecycle `decision_events` entry.

### 6.4 Notifications / Automation / Analytics → Canonical Tables

- Notifications:
  - Use `decisions` for current state.
  - Use `decision_events` to detect transitions and track unread/read semantics.
- Automation:
  - Evaluate rules and record activity against `decisions` and `decision_events`.
  - Future execution tables always reference `decision_id` and `org_id`.
- Analytics:
  - Derive metrics from:
    - `decisions.created_at`, `status`, `priority_score`.
    - `decision_events.created_at`, `event_type`, `event_data`.

---

## 7. Document Map (D32–D39)

- **D32 — Decision Engine Architecture**  
  - Core data model and schema for decisions.

- **D33 — Decision Engine Integration**  
  - Bridge responsibilities, engine mappings, deduplication, and integration plan.

- **D34 — Decision Scheduler**  
  - Scheduler architecture, locking, triggers, and Edge Function design.

- **D35 — Decision Inbox (Model)**  
  - Conceptual UI model, lifecycle states, and interaction patterns.

- **D36 — Decision Inbox Implementation**  
  - Concrete page, service layer, components, routing, sidebar, dashboard widget.

- **D37 — Decision Notifications**  
  - Notification channels, triggers, preferences, unread semantics.

- **D38 — Decision Automation**  
  - Safety principles, eligibility, approval gates, audit trail, execution model.

- **D39 — Decision Analytics**  
  - Metrics, aggregations, dashboards, performance considerations.

Together, these documents define a **coherent, layered Decision System** that:

- Starts from canonical data and engines.
- Surfaces actionable recommendations to sellers.
- Prepares for safe automation and observability.

---

## 8. Definition of Done (D40)

D40 is considered complete when:

- [x] The overall Decision System architecture is summarized in a single document.
- [x] All major components (Engine, Bridge, Scheduler, Inbox, Notifications, Automation, Analytics) and their roles are described.
- [x] The full lifecycle of a decision (from generation to closure/expiry) is explained.
- [x] Relationships between `decisions`, `decision_context`, `decision_sources`, `decision_events` are clearly documented.
- [x] Key contracts between layers are listed.
- [x] A clear map of D32–D39 documents is provided.

No code or schema changes are part of D40; it is an overview and consolidation document only.

---

