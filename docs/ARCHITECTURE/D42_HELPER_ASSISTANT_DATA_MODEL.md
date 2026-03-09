# D42 — Helper / Assistant Intake Data Model

Status: Draft

---

## 1. Objective

Define the **conceptual data model** for the Helper / Virtual Assistant Intake Layer introduced in D41.

Goals:

- Describe the core entities and relationships needed to capture:
  - Helper/assistant sessions.
  - User messages and system responses.
  - Classified intents and queries.
  - Resolutions when a conversation results in a concrete outcome (e.g. decision, task, navigation).
- Keep the model **multi-tenant safe**, **traceable**, and aligned with the existing decision/event architecture.

This is an **architecture-only** document: no database migrations or code are implemented in D42.

---

## 2. Current State After D41

From D41 — Helper + Virtual Assistant Intake Layer:

- We have:
  - Conceptual distinction between **helper** (inline, contextual help) and **virtual assistant** (conversational).
  - High-level intake flow:
    - User → Intake → Normalized Request → Classification/Prioritization → Potential routing to decisions/alerts/tasks (future).
  - Requirements for:
    - Intent classification.
    - Priority estimation.
    - Logging and traceability.

What is **not** yet defined:

- Concrete **entities and fields** that will store:
  - Sessions and messages.
  - Intents and queries.
  - Links between intake and downstream actions (e.g. decisions).

D42 provides that conceptual data model.

---

## 3. Main Entities

D42 defines the following high-level entities:

1. `assistant_sessions`
2. `assistant_messages`
3. `assistant_intents`
4. `assistant_queries`
5. `assistant_resolutions`

All entities are **org-scoped** (`org_id`) and, when applicable, **user-scoped** (`user_id`).

### 3.1 `assistant_sessions`

Represents a logical interaction thread between a user (or anonymous visitor) and the helper/assistant.

Key fields (conceptual):

- `id` (uuid, primary key)
- `org_id` (uuid, nullable if unauthenticated but generally required)
- `user_id` (uuid, nullable for anonymous sessions)
- `channel` (text):
  - e.g. `helper_inline`, `assistant_chat`, `onboarding_helper`.
- `context_type` (text, optional):
  - e.g. `page`, `entity`, `global`.
- `context_ref` (text/jsonb, optional):
  - e.g. `{"page":"/app/decisions","entity_type":"product","entity_id":"..."}`.
- `created_at` (timestamptz)
- `closed_at` (timestamptz, nullable)

Usage:

- Group messages into coherent conversations.
- Provide high-level context for analytics and debugging.

### 3.2 `assistant_messages`

Stores individual messages in a session.

Key fields:

- `id` (uuid, primary)
- `session_id` (uuid, references `assistant_sessions.id`)
- `org_id` (uuid)
- `user_id` (uuid, nullable for system-only messages)
- `role` (text):
  - `user` | `assistant` | `system`.
- `content` (text/jsonb):
  - Original message text or structured content.
- `created_at` (timestamptz)

Usage:

- Full conversational history.
- Basis for intent detection, replay, and auditing.

### 3.3 `assistant_intents`

Represents a **classified intent** derived from one or more messages.

Key fields:

- `id` (uuid, primary)
- `session_id` (uuid, references `assistant_sessions.id`)
- `org_id` (uuid)
- `user_id` (uuid, nullable)
- `source_message_id` (uuid, references `assistant_messages.id`):
  - The message from which this intent was derived.
- `intent_type` (text):
  - e.g. `info_explain_metric`, `navigate_to_feature`, `query_decision_state`, `request_action`, etc.
- `topic` (text, optional):
  - e.g. `inventory`, `cashflow`, `decisions`, `billing`.
- `priority` (text):
  - `low` | `medium` | `high`.
- `confidence` (numeric, optional):
  - Confidence score of the intent classification.
- `created_at` (timestamptz)

Usage:

- Single source of truth for “what user was trying to do/ask”.
- Input for future routing to decisions/tasks or direct responses.

### 3.4 `assistant_queries`

Represents **normalized queries** triggered by an intent:

- E.g. “show me all open reorder decisions”, “where is my cashflow forecast?”

Key fields:

- `id` (uuid, primary)
- `intent_id` (uuid, references `assistant_intents.id`)
- `org_id` (uuid)
- `user_id` (uuid, nullable)
- `query_type` (text):
  - e.g. `decision_list`, `metric_lookup`, `navigation`, `doc_search`.
- `payload` (jsonb):
  - Normalized parameters:
    - e.g. `{ "decision_type": "reorder", "status": ["open","acknowledged"], "time_window_days": 30 }`.
- `created_at` (timestamptz)

Usage:

- Bridge between natural-language intent and concrete product queries.
- Useful for debugging “what we actually ran” for a given assistant question.

### 3.5 `assistant_resolutions`

Represents **outcomes** of assistant interactions, especially when they lead to external artifacts or actions.

Key fields:

- `id` (uuid, primary)
- `intent_id` (uuid, references `assistant_intents.id`)
- `org_id` (uuid)
- `user_id` (uuid, nullable)
- `resolution_type` (text):
  - e.g. `answered_explanation`, `navigation_triggered`, `decision_linked`, `task_created`, `no_action`.
- `resolution_ref` (text/jsonb, optional):
  - Pointers to external artifacts:
    - e.g. `{"decision_id":"...", "decision_type":"reorder"}`.
- `status` (text):
  - `completed` | `failed` | `pending_manual`.
- `created_at` (timestamptz)

Usage:

- Track what happened as a result of a user’s question.
- Provide linkage to decisions, tasks, or other future entities.

---

## 4. Relationships Between Entities

Conceptual relationships:

- `assistant_sessions` 1 — N `assistant_messages`
- `assistant_sessions` 1 — N `assistant_intents`
- `assistant_intents` 1 — N `assistant_queries`
- `assistant_intents` 1 — N `assistant_resolutions`
- `assistant_messages` 1 — 0..1 `assistant_intents` (via `source_message_id`)

High-level diagram (conceptual):

- Session
  - Messages (user/assistant)
  - Intents (classified per key message)
    - Queries (normalized actions)
    - Resolutions (outcomes)

All entities are tied back to:

- `org_id` for tenant isolation.
- `user_id` when available for per-user attribution.

---

## 5. Multi-tenant Keys (`org_id`, `user_id`)

Multi-tenancy rules:

- Every row in:
  - `assistant_sessions`
  - `assistant_messages`
  - `assistant_intents`
  - `assistant_queries`
  - `assistant_resolutions`

must include:

- `org_id`:
  - The workspace the interaction belongs to.
- `user_id` (nullable):
  - When the user is authenticated.
  - May be null for:
    - Anonymous pre-login helpers (if ever allowed).
    - System-only events.

All queries must enforce:

- Access only to rows where:
  - The current user is a **member of the org** (`is_org_member(org_id)`).

---

## 6. Indexing Strategy (Conceptual)

To support efficient querying in future phases, D42 proposes:

### 6.1 Session-centric indexes

- On `assistant_sessions`:
  - `org_id, created_at`
  - `user_id, created_at`

Use cases:

- List recent sessions per org/user.
- Filter sessions for troubleshooting or analytics.

### 6.2 Message-centric indexes

- On `assistant_messages`:
  - `session_id, created_at`
  - `org_id, created_at`

Use cases:

- Retrieve conversation transcript quickly.

### 6.3 Intent/Query/Resolution indexes

- On `assistant_intents`:
  - `org_id, created_at`
  - `intent_type, created_at`
- On `assistant_queries`:
  - `org_id, query_type, created_at`
- On `assistant_resolutions`:
  - `org_id, resolution_type, created_at`
  - `intent_id`

Use cases:

- Analyze what users ask for and how often.
- Trace from outcomes back to intents/queries.

---

## 7. Traceability with `decision_events`

When an assistant interaction leads to a **decision** or **decision-related action**, traceability must be maintained:

### 7.1 Linking from assistant to decisions

- `assistant_resolutions.resolution_ref` may include:
  - `decision_id`
  - `decision_type`

Example:

```json
{
  "resolution_type": "decision_linked",
  "resolution_ref": {
    "decision_id": "dec_123",
    "decision_type": "reorder"
  }
}
```

### 7.2 Linking from decisions to assistant

Future integration options:

- `decision_sources.source_reference` could store:
  - An `assistant_intent_id` or `assistant_resolution_id` that originated the decision.
- `decision_events.event_data` may include:
  - `assistant_intent_id` when a lifecycle change occurs due to assistant-driven action (e.g. user clicks “Mark as done” from assistant UI).

This ensures a full chain:

User question → assistant intent → decision creation/interaction → `decision_events` → analytics.

---

## 8. High-level RLS Policies

RLS must be aligned with the existing **org-scoped tenant model**:

### 8.1 Access Control

For all assistant tables:

- Enable Row Level Security.
- Policies:
  - **SELECT**:
    - Allowed if `is_org_member(org_id)` is true.
  - **INSERT / UPDATE / DELETE**:
    - Typically allowed for:
      - System/service-role contexts.
      - Authenticated users where:
        - `is_org_member(org_id)` is true AND
        - (for mutations) `user_id` matches the session user, when applicable.

No cross-org access:

- Users belonging to multiple orgs only see sessions and interactions for the **active org** context being queried.

### 8.2 Separation from public/unauthenticated access

- Helper/assistant endpoints must **not** expose raw assistant tables publicly.
- Any eventual public helpers (pre-login) must:
  - Use separate scoping rules and **not** leak tenant-specific data.

---

## 9. Non-goals (D42)

D42 does **not**:

- Create actual database tables or run migrations.
- Implement any helper/assistant logic or UI.
- Define the schema of tasks or decisions beyond references needed for traceability.
- Implement analytics or reporting over assistant interactions.
- Introduce AI/LLM models or external services.

The purpose is solely to define the **conceptual entities, fields, and relationships** for future implementation.

---

## 10. Definition of Done (D42)

D42 is considered complete when:

- [x] Core entities for helper/assistant intake (`assistant_sessions`, `assistant_messages`, `assistant_intents`, `assistant_queries`, `assistant_resolutions`) are defined.
- [x] Key fields per entity and relationships between them are documented.
- [x] Multi-tenant keys (`org_id`, `user_id`) and RLS principles are described.
- [x] Basic indexing strategy is outlined to support future performance.
- [x] Traceability hooks between assistant data and `decision_events`/decisions are specified.
- [x] Non-goals are explicitly frozen to keep D42 as architecture-only with no code or schema changes.

---

