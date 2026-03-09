# D37 — Decision Notifications

Status: Draft

---

## 1. Objective

Define the architecture of the **Decision Notifications** layer for FREEDOLIAPP.

This phase focuses purely on **architecture and contracts**, not on implementation.

Goals:

- Surface relevant decision activity to sellers in a **gentle, non-noisy** way.
- Provide **in-app awareness** of new/urgent decisions (Decision Inbox integration).
- Prepare a future **digest** mechanism (email or in-app summary) without implementing it yet.
- Keep the notification system **org-scoped, deterministic and auditable**, aligned with the existing decision engine and multi-tenant model.

No code, engines, or delivery mechanisms are implemented in D37; this is documentation and design only.

---

## 2. Current State After D36

By the end of D36, the system has:

- **D29** — Global Supply Network (concept + schema).
- **D30** — Product Identity (product / variant / bundle).
- **D31** — Inventory Ledger (architecture + base schema).
- **D32** — Decision Engine Architecture & schema:
  - Tables: `decisions`, `decision_context`, `decision_sources`, `decision_events`.
- **D33** — Decision Bridge:
  - Engines → Decisions mapping (Reorder integrated; others future).
- **D34** — Decision Scheduler:
  - Edge function `decision-scheduler`, cron-based `syncReorderDecisions` executions, org-scoped, RLS-safe.
- **D35** — Decision Inbox (conceptually defined).
- **D36** — Decision Inbox Implementation:
  - `/app/decisions` page.
  - Service layer: `getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`.
  - Dashboard widget: **Top Decisions** teaser.
  - Multi-tenant, org-scoped, lifecycle-aware UI.

Current behavior:

- Decisions are generated, stored, and visible in the Decision Inbox and via the Top Decisions widget.
- Sellers can manage lifecycle (`open`, `acknowledged`, `acted`, `dismissed`, `expired`) through the inbox.

Current limitation:

- There is **no notification system**:
  - No in-app unread indicator tied to decisions.
  - No digest or summary of new/urgent decisions.
  - No per-user/per-org notification preferences.

---

## 3. Scope of D37

In scope (architecture only):

- Define **notification channels** and their contracts.
- Define **trigger rules** based on decision severity, status, and events.
- Specify **deduplication** and **throttling** requirements.
- Design **preference model** for orgs and users.
- Define a **read/unread model** and how it relates to `decisions` and `decision_events`.

Out of scope (for D37):

- Actual implementation of notification senders (email, push, websockets).
- UI changes for notification center (beyond describing high-level placement).
- Any new engine or decision type.

---

## 4. Notification Channels (Permitted in D37)

### 4.1 In-app badge / topbar indicator

Primary near-term channel:

- A small, focused indicator (e.g. in topbar) showing:
  - **Count of open + acknowledged decisions** that meet notification criteria (e.g. high severity).
  - Optionally, a **badge** on the Decisions sidebar item.

Behavior:

- Clicking the indicator navigates to `/app/decisions`.
- No dropdown feed in D37; only count + link.

### 4.2 Digest (future-compatible)

Design space for future D38+ (not implemented in D37):

- **Email digest** or **in-app digest view** summarizing:
  - High-severity decisions created/updated in a given time window (e.g. daily).
- D37 only defines the data contract and triggers; no actual delivery pipeline.

---

## 5. Trigger Rules (Severity & Status)

D37 defines when a decision is **eligible** to generate a notification.

### 5.1 Base eligibility

A decision is notification-eligible if:

- `status` is one of:
  - `open`
  - `acknowledged`
- AND `severity` is:
  - `high` (always eligible)
  - `medium` (eligible depending on org preferences)

Low-severity decisions are **not** notification-eligible by default.

### 5.2 Event-based triggers

Triggers are evaluated primarily on `decision_events`:

- **New decision created** (`event_type = 'created'`):
  - If eligible (status `open`, severity high/medium), may increment unread counters.
- **Lifecycle changes**:
  - `acknowledged`:
    - Remains eligible but may be treated as “seen” in unread model (see below).
  - `acted`, `dismissed`, `expired`:
    - Decision is no longer notification-eligible; should be removed from unread counters.

System-driven expiry:

- When a decision is marked `expired` (e.g. due to staleness), any associated notification should be cleared.

---

## 6. Deduplication Strategy

Goal: Avoid spamming the user with repeated notifications for the same logical decision.

High-level rules:

- **One notification per decision instance**:
  - A single `decision_id` can contribute at most one active notification in a given channel.
- **Lifecycle-aware**:
  - If a decision is already in `open` state and has been surfaced once, subsequent non-material changes should not re-trigger notifications.
- **Refresh on material change (future-compatible)**:
  - D37 allows future phases to treat **significant context changes** (e.g. severity low → high) as reasons to re-notify; this is not implemented yet.

Implementation guidance for future phases:

- Use `decision_id` and `org_id` as natural keys for dedupe.
- Optionally derive a **hash of key context fields** (e.g. severity, recommended amount) to detect material changes.

---

## 7. Throttling Rules

Throttling exists to prevent bursts of notifications in:

- Massive scheduler runs.
- Backfill or data repair operations.

D37 defines the contract; implementation is deferred:

- **Per-org throttle**:
  - Maximum notifications emitted per org per time window (e.g. 50 per hour).
- **Per-user view throttle**:
  - Topbar badge should not “blink” or be updated more often than a small interval (e.g. once every few seconds in UI).

Throttling is always subordinate to **correctness**:

- If throttling is exceeded, decisions still exist in the inbox; only notification emission is limited.

---

## 8. Preferences Model (Org & User)

Notification preferences must be configurable at:

- **Org level** (default for workspace).
- **User level** (override per user).

Conceptual fields (no schema yet):

### Org-level preferences

- `org_notifications_enabled` (boolean).
- `org_decision_notifications`:
  - `channels`:
    - `in_app_badge` (boolean).
    - `digest_email` (boolean).
  - `severity_threshold`:
    - `high_only` | `high_and_medium` | `all`.

### User-level preferences

- `user_notifications_enabled` (boolean).
- `user_decision_notifications`:
  - `channels`:
    - `in_app_badge` (boolean).
    - `digest_email` (boolean).
  - `severity_threshold` override (same options as org-level).

Resolution rule:

- If org-level notifications are disabled → no decision notifications for that org.
- If org-level enabled:
  - User-level can further restrict, but not elevate beyond org-level (e.g. cannot enable digest if org has it disabled).

---

## 9. Read / Unread Model

Notifications must not conflate **decision state** with **notification read status**.

Conceptual model:

### 9.1 Unread semantics

For in-app badge:

- **Unread** means:
  - There exists at least one decision that:
    - is notification-eligible (status `open` or `acknowledged`, severity high/medium per prefs),
    - has not been “seen” in the inbox since its last material change.

### 9.2 Seen markers

Option A (recommended starting point):

- Treat **navigation to `/app/decisions` + visible in list** as “seen”.
- No separate `decision_unreads` table in D37; conceptual only.

Option B (future work):

- Introduce `decision_unreads` or `decision_notification_state` with:
  - `org_id`, `user_id`, `decision_id`, `last_seen_at`, `last_notified_at`.

For D37, we only define:

- The **badge count** should conceptually represent number of **eligible, not-yet-seen decisions**.
- “Seen” can later be formalized via events or a small state table.

---

## 10. Relationship to `decisions` and `decision_events`

### 10.1 `decisions` as source of truth

- `decisions` remains the **canonical state**:
  - `status`, `decision_type`, `priority_score`, `created_at`, `resolved_at`.
- Notifications **must not** mutate business semantics:
  - No changes to status or lifecycle purely due to notification logic.

### 10.2 `decision_events` as trigger log

- `decision_events` provides:
  - `event_type` (`created`, `acknowledged`, `acted`, `dismissed`, `expired`, …).
  - `event_data` with actor, from/to status, reason.

Notification system contracts:

- Should consume `decision_events` (and possibly snapshots of `decisions`) to:
  - Detect when new decisions are created.
  - Track lifecycle changes relevant to notifications.
  - Attach traceable cause for each notification emission.

Traceability:

- For any notification, it should be possible to reconstruct:
  - Which `decision_id` and which `decision_event` (or state transition) triggered it.
  - Which `org_id` and `user_id` (for user-specific notifications).

---

## 11. Non-goals (D37)

D37 explicitly does **not**:

- Implement email, push, or websocket delivery.
- Add a notification dropdown, timeline, or full **Notification Center** UI.
- Change decision lifecycle semantics or allowed transitions.
- Introduce new decision types or engines.
- Implement cross-org or cross-workspace notification aggregation.
- Introduce assignment, comments, or multi-user routing tied to notifications.

The focus is on **architecture, contracts, and constraints** only.

---

## 12. Definition of Done (D37)

D37 is considered complete when:

- [x] Notification channels are defined:
  - In-app badge/topbar.
  - Digest concept for future phase.
- [x] Trigger rules based on severity and status are documented.
- [x] Deduplication and throttling strategies are specified.
- [x] Preference model (org-level and user-level) is defined conceptually.
- [x] Read/unread semantics are described, decoupled from decision lifecycle.
- [x] Relationship to `decisions` and `decision_events` is clearly articulated.
- [x] Non-goals are frozen to keep D37 scoped to architecture only.
- [x] No code, migrations, or schema changes have been made as part of D37.

---


