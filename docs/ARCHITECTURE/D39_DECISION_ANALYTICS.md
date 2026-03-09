# D39 — Decision Analytics

Status: Draft

---

## 1. Objective

Define the **analytics architecture** for the Decision System in FREEDOLIAPP.

Goals:

- Provide a conceptual model for measuring how decisions are **created, processed and resolved**.
- Define key metrics and aggregations at **org**, **product** and **decision_type** levels.
- Use existing canonical tables (`decisions`, `decision_events`) as the **single source of truth**.
- Prepare for future dashboards and reporting without implementing them in this phase.

This is an **architecture-only** phase: no new schema, no code, no dashboards are implemented.

---

## 2. Current State After D38

By the end of D38, the system has:

- A complete **decision lifecycle**:
  - `decisions` with lifecycle status (`open`, `acknowledged`, `acted`, `dismissed`, `expired`).
  - `decision_events` capturing lifecycle transitions and automation/notification-related events.
- A **Decision Inbox** (D35–D36):
  - `/app/decisions` page (list + detail).
  - Service layer for reading and updating decisions.
- **Notifications architecture** (D37):
  - Channel, trigger and unread concepts.
- **Automation architecture** (D38):
  - Concepts for recommendation, assisted action, and full automation.

What is missing:

- A structured way to **observe and improve** the decision system itself:
  - Are decisions helpful?
  - Are sellers acting on them?
  - Where are bottlenecks?

D39 addresses this by defining **Decision Analytics**, without building the dashboards yet.

---

## 3. Key Metrics

Analytics must be grounded in a small, coherent set of core metrics.

### 3.1 Decision Creation Rate

Definition:

- Number of **new decisions** created per time window.

Examples:

- Decisions created per day/week/month.
- Breakdown by:
  - `org_id`
  - `decision_type`
  - `source_engine`

Source:

- `decisions.created_at`
- `decision_events` with `event_type = 'created'` (for precise event-based counts).

### 3.2 Acknowledgement Rate

Definition:

- Share of decisions that move from `open` → `acknowledged` at least once.

Formula (per slice, e.g. per org/decision_type/time):

- `acknowledged_count / created_count`

Where:

- `acknowledged_count` = number of unique `decision_id` with at least one `decision_events.event_type = 'acknowledged'`.
- `created_count` = number of unique decisions created in the same slice.

### 3.3 Acted Rate

Definition:

- Share of decisions that reach `acted` state (i.e. seller indicates the recommendation has been handled).

Formula:

- `acted_count / created_count`

Where:

- `acted_count` = number of unique `decision_id` with final or any `status = 'acted'` (or event `event_type = 'acted'`).

### 3.4 Dismiss Rate

Definition:

- Share of decisions explicitly dismissed by the seller.

Formula:

- `dismissed_count / created_count`

Where:

- `dismissed_count` = number of unique `decision_id` with final or any `status = 'dismissed'` (or event `event_type = 'dismissed'`).

Interpretation:

- High dismiss rate may signal:
  - Low-quality recommendations.
  - Misaligned thresholds.

### 3.5 Time-to-Action

Definition:

- Time between **decision creation** and:
  - First **acknowledgement**.
  - First **acted** or **dismissed** event.

Formally:

- `t_ack = acknowledged_at - created_at`
- `t_close = min(acted_at, dismissed_at, expired_at) - created_at`

Aggregated as:

- Median / p90 / p99 per:
  - org
  - decision_type
  - severity

Source:

- `decisions.created_at`
- `decision_events` timestamps for `acknowledged`, `acted`, `dismissed`, `expired`.

---

## 4. Aggregations

Decision analytics should support views at different levels.

### 4.1 Per org

Metrics per `org_id` (tenant):

- Volume:
  - Decisions created per period.
- Quality/engagement:
  - Acknowledgement rate.
  - Acted rate.
  - Dismiss rate.
- Responsiveness:
  - Time-to-acknowledge.
  - Time-to-close.

Use cases:

- Understand which orgs are effectively using the decision system.
- Identify orgs that are overwhelmed or ignoring recommendations.

### 4.2 Per product / project

Where product-level association is available (via context or identifiers), per-product aggregates:

- How many decisions are generated for a given product/project.
- How quickly those decisions are acted on.
- Whether certain products systematically generate:
  - Many reorder warnings.
  - High dismiss rates (potentially noisy or misconfigured rules).

Source:

- `decision_context` keys such as:
  - `product_id`, `project_id`, `asin`, `sku`.

### 4.3 Per decision type

Per `decision_type` (e.g. `reorder`, `cash_warning`, `profit_risk`, …):

- Creation rate.
- Acknowledgement / acted / dismiss rates.
- Time-to-action.

Use cases:

- Compare effectiveness of different engines.
- Prioritize improvement of specific decision types.

---

## 5. Source of Truth: `decisions` & `decision_events`

Decision analytics must treat:

- `decisions` as the **canonical state store**.
- `decision_events` as the **canonical event log**.

Guidelines:

1. **No parallel analytics-only tables** that duplicate semantics.  
   - Materialized views or aggregates can exist, but their source must be these canonical tables.

2. **Event-sourced metrics**:
   - Where possible, metrics are computed from **events** (`decision_events`) because:
     - They capture transitions (e.g. multiple acknowledgements).
     - They preserve history even if current state changes.

3. **State-based snapshots**:
   - For some metrics (e.g. current open decisions), using the `decisions` table directly is sufficient.

4. **Context enrichment**:
   - `decision_context` and `decision_sources` should be used to:
     - Group by product/project.
     - Break down by engine (`source_engine`).

---

## 6. Future Dashboards (Conceptual)

D39 defines the model for future dashboards; it does not implement them.

### 6.1 Org Decision Health Dashboard

For each org:

- Cards:
  - Total decisions created (last 30 days).
  - Acted rate (%).
  - Dismiss rate (%).
  - Median time-to-action (hours/days).
- Charts:
  - Decisions created over time by type.
  - Funnel: created → acknowledged → acted/dismissed.

### 6.2 Product/Project Decision View

Per product or project:

- Count of decisions by type over time.
- Time-to-action distribution.
- Correlation between decisions and:
  - Stockouts.
  - Profit changes.

### 6.3 Engine Performance View

Per decision type / source engine:

- How many decisions are created per org.
- How often sellers act vs dismiss.
- Which engines produce the most **useful** or **ignored** recommendations.

---

## 7. Performance Considerations

Decision analytics can become heavy if not designed carefully.

### 7.1 Data volume

- `decisions` and `decision_events` are append-only (or mostly).
- Over time, they may accumulate large volumes of rows.

Strategies (for future implementation phases):

- Indexed queries:
  - Index on `org_id`, `decision_type`, `created_at`, `status`.
  - Index on `decision_events.decision_id`, `event_type`, `created_at`.
- Time-bounded queries:
  - Default analytics windows (e.g. last 90 days) with ability to expand.
- Aggregation tables or materialized views:
  - Periodic aggregates per org/decision_type to avoid scanning raw events for every dashboard.

### 7.2 Multi-tenant isolation

- All analytics must be **org-scoped**:
  - Tenants can only see their own decision metrics.
- Any cross-tenant or global aggregate (for internal use) must be computed in a **separate, internal-only** context.

### 7.3 Real-time vs batch

- D39 does not require real-time analytics.
- Future phases can choose:
  - **Batch aggregation** (e.g. nightly jobs).
  - **Near-real-time** updates only where justified.

---

## 8. Non-goals (D39)

D39 does **not**:

- Implement any analytics queries, views, or dashboards.
- Add new tables or modify existing database schema.
- Introduce real-time streaming or complex event processing.
- Change decision lifecycle or notification/automation semantics.
- Provide cross-tenant benchmarking in the product UI.

The focus is on **what** metrics and aggregations should exist, and **which canonical tables** they must come from.

---

## 9. Definition of Done (D39)

D39 is considered complete when:

- [x] Key decision metrics are clearly defined:
  - Creation rate, acknowledgement rate, acted rate, dismiss rate, time-to-action.
- [x] Aggregation dimensions are described:
  - Per org, per product/project, per decision type.
- [x] `decisions` and `decision_events` are specified as the single source of truth for analytics.
- [x] Conceptual dashboards and their metric requirements are outlined.
- [x] Performance and multi-tenant considerations are documented.
- [x] Non-goals are explicitly frozen to keep D39 as **architecture-only**, with no code or schema changes.

---

