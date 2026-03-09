# FREEDOLIAPP — Architecture Index (D32–D43)

Status: Draft (living index)

This file is the **official index** for the architecture documents under `docs/ARCHITECTURE/` related to the Decision System and Helper/Assistant subsystems.

---

## Legend (Status)

- **documented**: Architecture defined, no code guaranteed.
- **implemented**: Architecture implemented in code (may still evolve).
- **validated**: Implemented and runtime-validated according to its doc.

---

## Decision System (D32–D40)

### D32 — Decision Engine Architecture

- **File**: `D32_DECISION_ENGINE_ARCHITECTURE.md`  
- **Status**: documented  
- **Objective**: Define the canonical decision model:
  - `decisions`, `decision_context`, `decision_sources`, `decision_events`.
  - Lifecycle states and responsibilities of the Decision Engine.
- **Relations**:
  - Foundation for D33–D40.
  - Consumed by service layer (D36), notifications (D37), automation (D38), analytics (D39).

### D33 — Decision Engine Integration

- **File**: `D33_DECISION_ENGINE_INTEGRATION.md`  
- **Status**: implemented  
- **Objective**: Specify the **Decision Bridge**:
  - How existing engines (e.g. Reorder Engine) are mapped into canonical decisions.
  - Deduplication rules and integration scope.
- **Relations**:
  - Builds on D32 (schema).
  - Used by scheduler (D34) to sync decisions.

### D34 — Decision Scheduler

- **File**: `D34_DECISION_SCHEDULER.md`  
- **Status**: validated (D34.3 positive runtime test confirmed)  
- **Objective**: Define and implement:
  - Edge Function `decision-scheduler`.
  - Advisory locking (global).
  - Per-org execution of `syncReorderDecisions`.
  - Cron-based triggering (every 10 minutes).
- **Relations**:
  - Calls integration logic from D33.
  - Feeds Decision Engine (D32) via the bridge.

### D35 — Decision Inbox (Model)

- **File**: `D35_DECISION_INBOX.md`  
- **Status**: documented  
- **Objective**: Describe the **conceptual model** for the Decision Inbox:
  - Seller-facing lifecycle (`open`, `acknowledged`, `acted`, `dismissed`, `expired`).
  - Allowed transitions and ownership (system vs seller).
  - Inbox item structure and UX principles.
- **Relations**:
  - Guides D36 implementation.
  - Aligns with Decision Engine states (D32).

### D36 — Decision Inbox Implementation

- **File**: `D36_DECISION_INBOX_IMPLEMENTATION.md`  
- **Status**: validated (`/app/decisions` implemented and build passing)  
- **Objective**: Implement the Decision Inbox:
  - Service layer:
    - `getDecisionInboxPage`
    - `getDecisionById`
    - `updateDecisionStatus`
  - Page: `/app/decisions` (two-panel list + detail).
  - Components under `src/components/decisions/`.
  - Dashboard widget: **Top Decisions**.
- **Relations**:
  - Uses canonical tables from D32.
  - Respects lifecycle rules from D35.
  - Provides inputs for analytics (D39) and notifications (D37).

### D37 — Decision Notifications

- **File**: `D37_DECISION_NOTIFICATIONS.md`  
- **Status**: documented  
- **Objective**: Define notification architecture:
  - Channels: in-app badge/topbar, future digests.
  - Trigger rules based on `status`, `severity`, and `decision_events`.
  - Deduplication, throttling, and preference model (org/user).
  - Read/unread semantics.
- **Relations**:
  - Reads from decisions/events (D32).
  - Surfaces Decision Inbox state (D35–D36).

### D38 — Decision Automation

- **File**: `D38_DECISION_AUTOMATION.md`  
- **Status**: documented  
- **Objective**: Describe architecture for:
  - Recommendation vs assisted action vs full automation.
  - Eligible/non-eligible decision types.
  - Preconditions, approval gates, and audit trail.
  - Future execution tables (e.g. `decision_automation_executions`).
- **Relations**:
  - Uses decisions/events (D32) as the basis for automation.
  - Will eventually drive engines or other systems under strict safety rules.

### D39 — Decision Analytics

- **File**: `D39_DECISION_ANALYTICS.md`  
- **Status**: documented  
- **Objective**: Define metrics and aggregation model:
  - Creation, acknowledgement, acted and dismiss rates.
  - Time-to-action.
  - Aggregations per org/product/decision_type.
  - Performance considerations and multi-tenant isolation.
- **Relations**:
  - Uses `decisions` and `decision_events` (D32) as source of truth.
  - Instrumentation for improving engines and UX.

### D40 — Decision System Overview

- **File**: `D40_DECISION_SYSTEM_OVERVIEW.md`  
- **Status**: documented  
- **Objective**: Consolidated view of the whole Decision System:
  - Components: Engine, Bridge, Scheduler, Inbox, Notifications, Automation, Analytics.
  - End-to-end lifecycle from engine signal to seller action/expiry.
  - Responsibilities and contracts between layers.
- **Relations**:
  - Summarizes and cross-links D32–D39.

---

## Helper / Assistant System (D41–D42)

### D41 — Helper + Virtual Assistant Intake Layer

- **File**: `D41_HELPER_VIRTUAL_ASSISTANT_INTAKE.md`  
- **Status**: documented  
- **Objective**: Define the architecture for helper/assistant intake:
  - Distinguish **helper** (inline guidance) vs **assistant** (conversational).
  - Intake flow from user message to normalized request (intent, topic, priority).
  - Logging and traceability of interactions.
  - Future routing to decisions, alerts, or tasks.
- **Relations**:
  - Sits parallel to Decision System; can link to decisions but is user-initiated.
  - Basis for data model (D42).

### D42 — Helper / Assistant Intake Data Model

- **File**: `D42_HELPER_ASSISTANT_DATA_MODEL.md`  
- **Status**: documented  
- **Objective**: Define conceptual entities for intake:
  - `assistant_sessions`
  - `assistant_messages`
  - `assistant_intents`
  - `assistant_queries`
  - `assistant_resolutions`
  - Multi-tenant keys (`org_id`, `user_id`), indexing, RLS guidance.
  - Traceability with decisions/events when an interaction leads to an action.
- **Relations**:
  - Implements the intake architecture from D41 in data model form.
  - Future integration point to Decision System (via references).

---

## Inventory & Supply System (Selected refs)

*(Included here for cross-context; full index lives in main `docs/INDEX.md`.)*

- **D29 — Global Supply Network Model & Data Model**  
  - File: `D29_GLOBAL_SUPPLY_NETWORK_MODEL.md`, `D29_GLOBAL_SUPPLY_NETWORK_DATA_MODEL.md`  
  - Objective: Model multi-origin, multi-destination supply network for global commerce.  
  - Relations: Feeds inventory/lead-time data to decisions (e.g. reorder).

- **D31 — Inventory Ledger Architecture**  
  - File: `D31_INVENTORY_LEDGER_ARCHITECTURE.md`  
  - Objective: Define ledger-based inventory movements and snapshots.  
  - Relations: Provides canonical stock signals for Decision System.

---

## Using This Index

- Start at **D40** for a narrative of the Decision System end-to-end.
- Dive into:
  - **D32–D39** for individual layers and concerns.
  - **D41–D42** for Helper/Assistant intake architecture and data model.
- Use this index alongside the global product index (`docs/INDEX.md`) and `D43_ARCHITECTURE_MAP.md` for a full-system view.

---

