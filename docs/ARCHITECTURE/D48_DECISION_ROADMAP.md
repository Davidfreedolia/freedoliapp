# D48 — Decision System Implementation Roadmap

Status: Draft

---

## 1. Current State After D36

The Decision System has reached the following concrete state:

- **Decision Engine (D32)** — documented & implemented  
  - Canonical tables: `decisions`, `decision_context`, `decision_sources`, `decision_events`.

- **Decision Bridge (D33)** — implemented  
  - Reorder Engine integrated; decisions created via `syncReorderDecisions`.

- **Decision Scheduler (D34)** — validated  
  - Edge Function `decision-scheduler` deployed.
  - Advisory lock + cron every 10 minutes.
  - Runtime smoke tests (positive & negative) completed.

- **Decision Inbox (D35–D36)** — implemented & validated  
  - `/app/decisions` page with list + detail layout.
  - Service layer (`getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`).
  - Dashboard widget **Top Decisions**.
  - Multi-tenant, org-scoped behavior verified.

What exists today:

- A working pipeline:
  - Engines → Bridge → Scheduler → Decisions (DB) → Inbox UI.

What is **not** implemented yet:

- Notifications UX and delivery logic (topbar/badge/digests).
- Decision Dashboard (analytics view).
- Explicit feedback capture (useful/not useful/wrong).
- Full analytics dashboards.
- Any form of automation (assisted or full).

---

## 2. Summary of D37–D47 Architecture Docs

### D37 — Decision Notifications

- Defines notification architecture:
  - Channels: in-app badge/topbar, future digest.
  - Triggers based on decision `status`, `severity`, and `decision_events`.
  - Deduplication & throttling.
  - Org/user preferences and read/unread semantics.
- **Status**: documented (no implementation).

### D38 — Decision Automation

- Defines automation model:
  - Recommendation → Assisted Action → Full Automation.
  - Eligible vs non-eligible decision types.
  - Preconditions, approval gates, audit trail, and future execution tables.
- **Status**: documented (no implementation).

### D39 — Decision Analytics

- Defines analytics concepts:
  - Metrics: creation rate, acknowledgement rate, acted/dismiss rates, time-to-action.
  - Aggregations per org/product/decision_type.
  - Use of `decisions` + `decision_events` as single source of truth.
- **Status**: documented (no implementation).

### D40 — Decision System Overview

- Consolidates the Decision System:
  - Components: Engine, Bridge, Scheduler, Inbox, Notifications, Automation, Analytics.
  - End-to-end lifecycle from engine signal to seller action/expiry.
- **Status**: documented (overview, no new code).

### D41 — Helper + Virtual Assistant Intake Layer

- Defines the **user-intent intake** architecture:
  - Distinction between helper (inline) and assistant (conversational).
  - Intake flow from user messages to normalized intents.
  - Logging and traceability.
- **Status**: documented (no implementation).

### D42 — Helper / Assistant Intake Data Model

- Defines conceptual entities:
  - `assistant_sessions`, `assistant_messages`, `assistant_intents`,
    `assistant_queries`, `assistant_resolutions`.
  - Multi-tenant keys, indexing, and RLS considerations.
- **Status**: documented (no implementation).

### D43 — FREEDOLIAPP Architecture Map

- Global architecture map:
  - Core Platform, Decision System, Helper/Assistant, Finance/Profit, Inventory, Amazon Integration.
  - Dependencies and domain boundaries.
- **Status**: documented.

### D45 — Decision Dashboard

- Defines Decision Dashboard architecture:
  - Key metrics and widgets for monitoring decision health.
  - Data sources: `decisions`, `decision_events` (+ context/sources).
  - Aggregations per org/product/decision_type; performance considerations.
- **Status**: documented (no implementation).

### D46 — Decision UX Navigation Model

- Describes navigation between:
  - Decision Dashboard, Decision Inbox, Topbar/Notifications, Helper/Assistant.
  - Entry points and user journeys.
  - Rules for where information/actions should live.
- **Status**: documented.

### D47 — Decision Feedback Loop

- Defines architecture for capturing seller feedback on decisions:
  - Explicit signals: `useful`, `not_useful`, `wrong`.
  - Interaction points in Inbox and Dashboard.
  - Recording feedback via `decision_events`.
  - Feeding analytics and engine improvements.
- **Status**: documented (no implementation).

---

## 3. Phases: Documented vs Pending Implementation

### Already Implemented / Validated

- **D32**: Decision Engine schema.
- **D33**: Reorder integration via bridge.
- **D34**: Scheduler (Edge Function + cron) — validated.
- **D35–D36**: Decision Inbox + Top Decisions widget — validated.

### Documented, Pending Implementation

- **D37**: Decision Notifications.
- **D38**: Decision Automation.
- **D39**: Decision Analytics.
- **D40**: System overview (conceptual, already a consolidation doc).
- **D41–D42**: Helper/Assistant intake architecture and data model.
- **D45**: Decision Dashboard.
- **D46**: UX navigation model (conceptual).
- **D47**: Decision Feedback Loop.

---

## 4. Recommended Implementation Order

Given the current state (Inbox in production), the recommended **implementation sequence** is:

1. **Decision Notifications (D37)**  
2. **Decision Dashboard (D45)**  
3. **Decision Feedback Loop (D47)**  
4. **Decision Analytics (D39)**  
5. **Decision Automation (D38)**  
6. *(In parallel or next waves)* Helper/Assistant intake (D41–D42) where strategically relevant.

### 4.1 Step 1 — Notifications (D37)

Rationale:

- Provides immediate **awareness** of decisions without requiring users to proactively open the Inbox.
- Low-risk first step:
  - In-app badge/topbar.
  - Simple linking to `/app/decisions` with filters.
- Leverages existing data model and Inbox.

Key criteria:

- Minimal UI: badge + link.
- No email digests or external channels in the first slice.

### 4.2 Step 2 — Decision Dashboard (D45)

Rationale:

- Enables **org owners** and internal teams to see:
  - Volume of decisions.
  - Risk levels.
  - Time-to-action and ignored decisions.
- Helps identify whether decision logic is effective before adding automation.

Key criteria:

- Read-only analytics over `decisions` + `decision_events`.
- Drill-down paths to Inbox views, as per D46.

### 4.3 Step 3 — Feedback Loop (D47)

Rationale:

- Once Dashboard exists, we can:
  - Close the loop with seller feedback.
  - Quantify decision quality from the user’s perspective.
- Feedback is a **prerequisite** for safely improving engines and later automation.

Key criteria:

- Start with explicit per-decision feedback in Inbox.
- Record feedback via `decision_events`.

### 4.4 Step 4 — Decision Analytics (D39)

Rationale:

- With:
  - Decisions + events.
  - Feedback signals.
  - Dashboard scaffolding.
- We can evolve towards more robust analytics:
  - Funnels, rates, time-to-action, engine effectiveness.

Key criteria:

- Ensure analytics are org-scoped and performant.
- Possibly use materialized views/aggregates for heavy orgs.

### 4.5 Step 5 — Decision Automation (D38)

Rationale:

- Only after:
  - Engines are integrated (D33).
  - Scheduler is stable (D34).
  - Inbox is in use (D36).
  - Notifications + Dashboard + Feedback + Analytics are running.
- We have enough evidence and guardrails to introduce:
  - Assisted actions (e.g. drafts).
  - Limited, opt-in automation with clear approval gates.

Key criteria:

- Start with **assisted actions** for safe decision types (e.g. lightweight reorder suggestions).
- Require explicit org-level opt-in and clear limits.

---

## 5. Product Prioritization Criteria

When choosing which phases to implement next, consider:

1. **Time-to-value for sellers**
   - Notifications and Dashboard provide immediate clarity without heavy risk.
   - Feedback + Analytics improve the system iteratively.

2. **Risk profile**
   - Inbox and Dashboard are low-risk (read/write to decisions only).
   - Automation has higher risk, should come later with strong evidence.

3. **Operational readiness**
   - Before automation, ensure:
     - Engines are trusted.
     - Data is stable (ledger, inventory, supply).
     - Billing and multi-tenant controls are solid.

4. **Implementation complexity**
   - Notifications and basic dashboard widgets are relatively contained.
   - Analytics and automation require more cross-cutting work.

5. **User adoption**
   - Use early phases (Inbox, Notifications, Dashboard, Feedback) to:
     - Measure engagement.
     - Focus implementation where users derive real value.

---

## 6. Definition of “Decision System Complete”

The Decision System can be considered **functionally complete** when:

1. **Core engine and lifecycle**  
   - [x] Decision Engine schema (D32) is stable and well-tested.
   - [x] Bridge integration exists for key engines (D33).
   - [x] Scheduler runs and keeps decisions up to date (D34).
   - [x] Decision Inbox is used by sellers (D35–D36).

2. **Awareness and visibility**  
   - [ ] Notifications (D37) implemented:
     - In-app badge.
     - Basic preferences.
   - [ ] Decision Dashboard (D45) implemented:
     - Core metrics and drill-downs.

3. **Quality and learning loop**  
   - [ ] Feedback Loop (D47) implemented:
     - Explicit per-decision feedback.
   - [ ] Decision Analytics (D39) implemented:
     - Key metrics dashboards.
   - [ ] Product/engine teams actively review these metrics.

4. **Safe automation (optional but strategic)**  
   - [ ] At least one **assisted automation** path (D38) implemented for a low-risk decision type.
   - [ ] Clear approval gates and audit trail in place.

5. **Documentation and governance**  
   - [x] Architecture docs D32–D40 are maintained and consistent.
   - [x] Roadmap (this doc) is used as the single source for sequencing.

Only when **core**, **awareness**, and **feedback/analytics** layers are in place should the Decision System be considered mature enough for meaningful automation and higher-level features.

---

## 7. Definition of Done (D48)

D48 is considered complete when:

- [x] The current post-D36 state of the Decision System is clearly summarized.
- [x] D37–D47 documents are briefly described and categorized (documented vs pending implementation).
- [x] A recommended **implementation order** is specified (Notifications → Dashboard → Feedback → Analytics → Automation).
- [x] Product prioritization criteria are listed.
- [x] A concrete checklist for when the Decision System can be considered “complete enough” is defined.

---

