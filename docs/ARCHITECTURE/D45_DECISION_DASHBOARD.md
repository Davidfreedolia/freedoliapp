# D45 — Decision Dashboard

Status: Draft

---

## 1. Objective

Define the **architecture** of the Decision Dashboard for FREEDOLIAPP.

Goals:

- Provide a **high-level, analytical view** of the Decision System’s health for each workspace (org).
- Complement the **Decision Inbox** (D35–D36) with:
  - Aggregated metrics.
  - Trends.
  - Risk visualization.
- Use existing canonical tables (`decisions`, `decision_events`) as the source of truth.

This is an **architecture-only** phase: no implementation or schema changes are made in D45.

---

## 2. Difference Between Decision Dashboard and Decision Inbox

### Decision Inbox (D35–D36)

- Focus:
  - **Operational work queue** for individual decisions.
- Characteristics:
  - Per-decision, item-level detail.
  - Lifecycle management (`open`, `acknowledged`, `acted`, `dismissed`, `expired`).
  - Day-to-day workflow for sellers and operators.

### Decision Dashboard (D45)

- Focus:
  - **Analytics and monitoring** of the decision system across time.
- Characteristics:
  - Aggregated metrics:
    - How many decisions are being created?
    - How fast are they being acted upon?
    - Which areas are most at risk or ignored?
  - Oriented towards:
    - Org owners.
    - Product/ops leads.
    - Internal teams monitoring product effectiveness.

In short:

- Inbox = “What do I need to do **now**?”  
- Dashboard = “How well are decisions working **overall**?”

---

## 3. Key Metrics

The Decision Dashboard should surface at least the following metrics for the active org, over a configurable time window (e.g. last 7/30/90 days).

### 3.1 Open Decisions

- Definition:
  - Number of decisions currently in `status IN ('open', 'acknowledged')`.
- Variants:
  - Open decisions by `decision_type`.
  - Open decisions by `severity` (derived from `priority_score` or context).

### 3.2 High Severity Decisions

- Definition:
  - Count of decisions with `severity = 'high'` (see Decision Engine normalization) and `status IN ('open', 'acknowledged')`.
- Use:
  - Quick view of **current operational risk** level for the org.

### 3.3 Time-to-Action

- Definition:
  - Time between `created_at` and:
    - First `acknowledged` event.
    - First close event (`acted`, `dismissed`, `expired`).
- Aggregated as:
  - Median / p90 / p99 for:
    - All decisions.
    - Per `decision_type`.
    - Per severity.

### 3.4 Ignored Decisions

- Definition (conceptual):
  - Decisions that **remain open too long** or **never transition** out of `open`/`acknowledged` within a window.
- Examples:
  - “Ignored” = decisions older than X days with no `acknowledged`/`acted`/`dismissed` events.
- Purpose:
  - Identify:
    - Signal quality problems.
    - Overload or misconfigured decision thresholds.

Other derived metrics (optional, future):

- Acknowledgement rate.
- Acted rate.
- Dismiss rate.
- Decisions per product/project, etc. (as per D39).

---

## 4. Main Widgets (Conceptual)

The Decision Dashboard may include the following top-level widgets.

### 4.1 Overview KPI Strip

Cards such as:

- **Open decisions** (count).
- **High severity open**.
- **Median time-to-action** (last 30 days).
- **Ignored decisions** (count or %).

### 4.2 Decisions Over Time

- Line or bar chart:
  - Decisions **created per day** by `decision_type`.
- Optionally:
  - Lines for **acted** and **dismissed** decisions.

### 4.3 Decision Funnel

- Visualization of:
  - `created` → `acknowledged` → `acted/dismissed`.
- Per `decision_type` or overall.

### 4.4 High-Risk Areas

- Table or heatmap:
  - Top products/projects with:
    - Most high severity open decisions.
    - Longest time-to-action.

### 4.5 Engine Effectiveness (Optional, future)

- Breakdown per `source_engine`:
  - How many decisions lead to action vs dismiss vs ignored.

---

## 5. Data Sources

The Decision Dashboard must use canonical decision tables:

- `decisions`
- `decision_events`

And, where needed:

- `decision_context` (for product/project grouping).
- `decision_sources` (for per-engine breakdown).

### 5.1 `decisions`

- Base for:
  - Counts of open, high severity, ignored.
  - Current state snapshot.

### 5.2 `decision_events`

- Base for:
  - Time-to-action metrics.
  - Funnel steps.
  - Historical evolution of statuses.

### 5.3 `decision_context`

- Used to:
  - Group metrics per:
    - Product/project (`product_id`, `project_id`, `asin`, etc.).
    - Other key context attributes where available.

### 5.4 `decision_sources`

- Used to:
  - Attribute metrics to `source_engine` (e.g. Reorder vs others).

---

## 6. Aggregations (Org / Product / Decision Type)

### 6.1 Org-level

All metrics are computed **per org** (`org_id`):

- Open/high severity counts.
- Time-to-action distributions.
- Ignored decision counts.

This is the **primary slice** for the Decision Dashboard.

### 6.2 Product / Project-level

When `decision_context` includes product/project references:

- Compute:
  - Decisions per product/project.
  - High severity rate per product.
  - Time-to-action per product.

Use:

- Identify products/projects that:
  - Are systematically risky.
  - Are not getting enough attention from the seller.

### 6.3 Decision Type-level

Per `decision_type`:

- Compare:
  - Volume.
  - Acted vs dismissed vs ignored.
  - Time-to-action.

Use:

- Evaluate quality and usefulness of different engines and decision rules.

---

## 7. Performance Considerations

Decision Dashboard queries may be **expensive** if naïvely implemented.

Architecture guidance:

1. **Org-scoped queries only**  
   - Always filter by `org_id` first to enforce tenant isolation and limit dataset size.

2. **Time windows**  
   - Use explicit time ranges (e.g. last 30/90 days) for analytics.
   - Avoid unbounded queries over all history.

3. **Indexes** (assuming implemented in earlier phases):
   - On `decisions`:
     - `(org_id, status, created_at)`
     - `(org_id, decision_type, created_at)`
   - On `decision_events`:
     - `(org_id, decision_id, event_type, created_at)`

4. **Aggregation strategy**  
   - Start with direct queries where feasible.
   - For heavy orgs/time ranges, plan for:
     - Materialized views or summary tables (as discussed in D39).

5. **UI behavior**  
   - Avoid overly interactive or high-frequency refresh patterns.
   - Consider background pre-aggregation for slow queries.

---

## 8. Non-goals (D45)

D45 does **not**:

- Implement the Decision Dashboard page or widgets.
- Add or modify database schema.
- Implement real-time streaming of metrics.
- Change existing decision lifecycle or Decision Inbox behavior.
- Introduce cross-tenant benchmarking in the product UI.

It only defines **what** the Decision Dashboard should show and **which canonical data** it must use.

---

## 9. Definition of Done (D45)

D45 is considered complete when:

- [x] The purpose of the Decision Dashboard and its distinction from the Decision Inbox are documented.
- [x] Key metrics (open decisions, high severity, time-to-action, ignored decisions, etc.) are clearly defined.
- [x] Main widgets and their data needs are described.
- [x] Canonical data sources (`decisions`, `decision_events`, with optional `decision_context` and `decision_sources`) are specified.
- [x] Aggregation levels (org/product/decision_type) and performance considerations are documented.
- [x] Non-goals are explicitly frozen to keep D45 as architecture-only.

---

