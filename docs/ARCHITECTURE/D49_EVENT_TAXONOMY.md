# D49 — System Event Taxonomy

Status: Draft

---

## 1. Objective

Define a **common event taxonomy** for FREEDOLIAPP so that:

- Different subsystems (Decisions, Helper/Assistant, Core Platform, etc.) emit events using **consistent categories, names, and fields**.
- Events can be **reasoned about, logged, and analyzed** across the product.
- Future logging and analytics features have a **stable conceptual foundation**.

This is an **architecture-only** document; D49 does not add code or schema.

---

## 2. Why a Common Event Taxonomy

Without a shared taxonomy:

- Each subsystem might invent its own event naming and payload shape.
- Cross-cutting concerns like analytics, audit, and observability become harder:
  - Inconsistent naming (`created` vs `create` vs `new_item`).
  - Incompatible payloads (`user`, `user_id`, `actor`).

With a common taxonomy:

- We can:
  - Correlate events across subsystems more easily.
  - Build shared tooling (dashboards, log search, anomaly detection).
  - Keep event consumers (analytics, monitoring, assistants) decoupled from specific implementation details.

`decision_events` (D32) already acts as a **local event log** for decisions. D49 generalizes this thinking to the whole system while keeping `decision_events` as the canonical decision-specific event store.

---

## 3. Main Event Categories

At the highest level, FREEDOLIAPP events fall into four broad categories:

1. **Decision Events**
2. **Assistant Events**
3. **User Interaction Events**
4. **System Events**

### 3.1 Decision Events

Scope:

- Events tied directly to the **lifecycle and handling of decisions**.

Examples (from `decision_events`):

- `created`
- `acknowledged`
- `acted`
- `dismissed`
- `expired`
- (future) `feedback_useful`, `feedback_not_useful`, `feedback_wrong`
- (future) `automation_rule_matched`, `automation_executed`, `automation_failed`

Source of truth:

- `decision_events` table (D32), with `event_type` and `event_data`.

### 3.2 Assistant Events

Scope:

- Events arising from **helper/assistant intake** and processing (D41–D42).

Examples (conceptual):

- `assistant_session_started`
- `assistant_message_received`
- `assistant_intent_classified`
- `assistant_query_executed`
- `assistant_resolution_recorded`

Source of truth (future):

- Assistant-related tables (`assistant_sessions`, `assistant_messages`, `assistant_intents`, `assistant_queries`, `assistant_resolutions`).
- Potentially mirrored or summarized in a system-wide event/log sink.

### 3.3 User Interaction Events

Scope:

- Generic **UI-level interactions**, not tied to decision state or assistant conversations.

Examples (conceptual):

- `ui_page_view` (e.g. `/app/decisions`, `/app/dashboard`).
- `ui_widget_interacted` (e.g. toggling filters, expanding panels).
- `ui_feature_used` (e.g. “created new PO”, “opened cashflow forecast”).

Use cases:

- Product analytics, usage tracking, UX improvements.

Source of truth (future):

- A general `ui_events` or analytics pipeline; D49 only defines naming and fields for consistency.

### 3.4 System Events

Scope:

- Backend or infrastructure events:
  - Jobs, schedulers, integrations, errors, performance signals.

Examples (conceptual):

- `job_started` / `job_completed` / `job_failed` (e.g. scheduler runs, imports).
- `integration_call` (e.g. call to Amazon SP-API).
- `system_warning` / `system_error` (e.g. RLS errors, quota breaches).

Use cases:

- Observability, incident investigation, SRE-style monitoring.

Source of truth (future):

- Logs / monitoring stack; D49 defines the baseline vocabulary for event names and payloads.

---

## 4. Naming Conventions

To keep events consistent and searchable:

1. **Lowercase snake_case for event types**  
   - Examples:
     - `decision_created`, `decision_acknowledged` (if used in generic logs)
     - `assistant_message_received`
     - `ui_page_view`
     - `job_completed`

2. **Category prefixes (when needed)**  
   - Decision events stored in `decision_events` may use **shorter** names (`created`, `acknowledged`).  
   - When surfaced to a global log/monitoring context, consider fully-qualified names:
     - `decision.created`, `decision.acknowledged`, etc.

3. **Verb tense**  
   - Use **past tense** for discrete events:
     - `created`, `acknowledged`, `executed`, `failed`.
   - For longer-running processes, use:
     - `job_started`, `job_progress`, `job_completed`.

4. **No overloaded generic terms**  
   - Avoid ambiguous names like `update`, `change`, `event` alone.
   - Prefer descriptive types:
     - `decision_status_changed` (if needed), with `from_status` and `to_status` in payload.

---

## 5. Minimal Event Fields

Across all categories, events should share a **common core** of fields, extended with category-specific data.

### 5.1 Core fields (conceptual)

Every event should have:

- `event_id` (uuid or log id)
- `event_type` (string, per taxonomy)
- `occurred_at` (timestamptz)
- `org_id` (uuid, when applicable)
- `user_id` (uuid, nullable, when actor is a user)
- `actor_type` (string):
  - `user` | `system` | `assistant` | `external` (e.g. integration)

### 5.2 Category-specific fields

#### Decision events

- `decision_id`
- `from_status`, `to_status` (for lifecycle events)
- `reason` (optional)
- `feedback_value` (for feedback events)
- `source_engine` / `rule_id` (for automation/notifications, if applicable)

_Note_: In `decision_events`, these usually live inside `event_data` rather than as top-level columns.

#### Assistant events

- `session_id`
- `message_id` (for message-related events)
- `intent_id`, `intent_type` (for intent-related events)
- `query_id`, `query_type`
- `resolution_id`, `resolution_type`

#### User interaction events

- `page_path` (e.g. `/app/decisions`)
- `feature_id` / `widget_id`
- `metadata` (jsonb for additional context)

#### System events

- `job_name`, `job_id`
- `integration_name`
- `status` (`started`, `completed`, `failed`)
- `error_code` / `error_message` (if failed)

---

## 6. Relation to `decision_events` and Future Logs

### 6.1 `decision_events` as specialized event store

`decision_events` is the **canonical event store for decision lifecycle**:

- It already conforms to a subset of this taxonomy:
  - `event_type` (e.g. `created`, `acknowledged`, `acted`, `dismissed`, `expired`).
  - `event_data` (jsonb) including:
    - `actor_type`, `actor_id`, `from_status`, `to_status`, `reason`, etc.

In a broader logging context:

- These events can be:
  - Mirrored or streamed to a system-wide log with enriched metadata and namespacing (`decision.created`, etc.).

### 6.2 Future system-wide logs

For Assistant, UI, and System events:

- D49 suggests a **shared shape** for any future logging sinks (DB tables, log streams, observability tools).
- Instead of many siloed ad-hoc logs, we aim for:
  - One or a few **structured event streams** with different `event_type` values according to this taxonomy.

Analytics and monitoring (e.g. D39, future SRE dashboards) can then:

- Query by `event_type` prefix, category, or fields:
  - `WHERE event_type LIKE 'decision.%'`
  - `WHERE event_type LIKE 'assistant.%'` etc.

---

## 7. Definition of Done (D49)

D49 is considered complete when:

- [x] The rationale for a common event taxonomy across FREEDOLIAPP is documented.
- [x] Main event categories are clearly defined:
  - Decision events, Assistant events, User interaction events, System events.
- [x] Naming conventions for `event_type` values are specified.
- [x] Minimal core fields for events and category-specific fields are outlined.
- [x] The relationship between `decision_events` and future system logs is described.
- [x] No code or schema changes are introduced; this remains an architecture-only reference.

---

