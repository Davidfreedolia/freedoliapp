# D46 — Decision UX Navigation Model

Status: Draft

---

## 1. Objective

Define the **UX navigation model** for all Decision-related surfaces in FREEDOLIAPP.

Goals:

- Clarify how users move between:
  - **Decision Dashboard** (analytics view).
  - **Decision Inbox** (operational inbox).
  - **Topbar / Notifications** (awareness layer).
  - **Helper / Assistant** (conversational/help layer).
- Establish **entry points** and **user journeys** so that:
  - Important decisions are easy to discover.
  - Actions are taken in the correct surface.
  - The experience remains coherent and non-fragmented.

This is an **architecture-only** navigation contract; no UI or routing changes are implemented in D46.

---

## 2. Surfaces: Differences and Relationships

### 2.1 Decision Dashboard (D45)

- Purpose: **Monitor and analyze** the performance of the decision system.
- Scope:
  - Metrics (open decisions, high severity, time-to-action, ignored decisions, etc.).
  - Trends and aggregates per org/product/decision_type.
- Relationship:
  - Links **down** to Decision Inbox for detailed follow-up on specific slices (e.g. “view these 12 high-severity reorder decisions”).

### 2.2 Decision Inbox (D35–D36)

- Purpose: **Work list** of actionable decisions for the seller.
- Scope:
  - Individual decisions, lifecycle actions (acknowledge, mark as done, dismiss).
  - Context and recommendations.
- Relationship:
  - Acts as the **canonical operational surface** for handling decisions.
  - May be reached from:
    - Dashboard widgets (e.g. “Top Decisions”).
    - Decision Dashboard drill-downs.
    - Topbar/Notifications entries.
    - Helper/Assistant deep-links.

### 2.3 Topbar / Notifications (D37)

- Purpose: **Awareness layer**.
- Scope:
  - Badge/count of relevant open/high-severity decisions.
  - Optional quick link to Decision Inbox and/or Dashboard.
- Relationship:
  - Does **not** display full decision details.
  - Primary navigation function:
    - “You have N important decisions” → navigate to Decision Inbox or a filtered view.

### 2.4 Helper / Assistant (D41–D42)

- Purpose: **Guided assistance and intent capture**.
- Scope:
  - Answer questions (“What is this metric?”, “How do I see reorder decisions?”).
  - Navigate users to the appropriate surface (Inbox/Dashboard/etc.).
  - In future, propose actions or link user intent to decisions/tasks.
- Relationship:
  - Sits **beside** the Decision System:
    - Can **deep-link into** Inbox or Dashboard.
    - Can **reference** decisions, but does not own their lifecycle.

---

## 3. Main Entry Points

### 3.1 App-level entry points

- **Sidebar**:
  - `Decisions` → `/app/decisions` (Decision Inbox).
  - (Future) `Decision Dashboard` → dedicated analytics route (e.g. `/app/decisions/dashboard`).
- **Topbar / Notifications**:
  - Badge or icon showing count of eligible decisions.
  - Click → go to:
    - Decision Inbox, optionally with a “high priority” filter.

### 3.2 Dashboard entry points

- **Top Decisions widget** (D36):
  - Shows a small list of highest-priority open decisions.
  - CTA: `View all decisions` → `/app/decisions`.
- **Decision Dashboard widgets** (D45, future):
  - Analytics tiles or charts with links like:
    - “View ignored decisions” → Inbox filtered to old/open items.
    - “View high severity reorder decisions” → Inbox filtered by type/severity.

### 3.3 Helper / Assistant entry points

- **Global assistant trigger** (future):
  - E.g. icon in topbar or keyboard shortcut.
- **Contextual helper triggers**:
  - Links like “What does this mean?” near metrics/widgets.
  - Where appropriate, the assistant may respond with:
    - Explanation.
    - Links to relevant Decision Dashboard or Inbox views.

---

## 4. Primary User Journeys

### Journey 1: From High-level Awareness to Action

1. User sees **notification badge** (e.g. 5 high-priority decisions).
2. User clicks badge → navigates to Decision Inbox with relevant filters (e.g. high-severity, open).
3. User reviews list, selects a decision → sees detail.
4. User performs lifecycle actions (acknowledge, mark as done, dismiss).

Surface transitions:

- Topbar → `/app/decisions` (Inbox) → detail within Inbox.

### Journey 2: From Analytics to Specific Work

1. User opens **Decision Dashboard**.
2. Sees KPI card: “Ignored decisions (last 30 days): 12”.
3. Clicks card → navigates to Inbox filtered by:
   - status: open
   - age: > X days
4. Works through specific decisions in Inbox.

Surface transitions:

- Decision Dashboard → Inbox (filtered) → detail.

### Journey 3: From Helper / Assistant Question to Decision View

1. User asks assistant: “Show me stock risk decisions for Product X.”
2. Assistant:
   - Classifies intent as `query_decision_state` with topic `inventory`.
   - Runs a decision query (future implementation) or routes user.
3. Assistant responds with:
   - Summary:
     - “There are 3 open decisions for Product X.”
   - Link: “Open in Decision Inbox” → `/app/decisions?product=...&type=stock_risk`.
4. User clicks link and lands in Inbox, already filtered.

Surface transitions:

- Helper/Assistant → Inbox (deep-linked filter) → detail.

---

## 5. Navigation Rules Between Surfaces

High-level rules to keep UX coherent:

1. **Inbox is the source of truth for item-level interaction**  
   - Any surface that needs full decision details or lifecycle actions must navigate to Decision Inbox (or an embedded Inbox-like view), not reimplement decision UI.

2. **Dashboard does not mutate decisions**  
   - Decision Dashboard remains read-only for analytics.
   - Drill-down actions always route to Inbox for changes.

3. **Topbar/Notifications never show full detail**  
   - They provide counts and short summaries only.
   - Any deeper interaction routes to Inbox or Dashboard.

4. **Helper/Assistant primarily navigates and explains**  
   - Assistant responses should favour:
     - “Here’s what this means.”
     - “Click here to see the relevant decisions.”
   - It should not become a competing surface for full decision management.

5. **Consistent filters and URLs**  
   - All surfaces that link into Inbox or Dashboard should use clear, shareable URL parameters for filters (e.g. `?type=reorder&severity=high&status=open_ack`).

---

## 6. Criteria for Where Information/Actions Live

### 6.1 Decision Inbox

Belongs in Inbox when:

- It concerns **individual decisions** and their **lifecycle**:
  - Viewing context, recommended action.
  - Acknowledging, marking as done, dismissing.
  - Seeing per-item history.

### 6.2 Decision Dashboard

Belongs in Dashboard when:

- It is an **aggregate or metric**:
  - Counts, rates, distributions, trends.
  - Comparisons across types/org segments/products.

Actions from Dashboard:

- Should be **navigational**, leading to Inbox or other feature areas (e.g. Finances, Inventory).

### 6.3 Topbar / Notifications

Belongs in Topbar when:

- It is about **awareness**:
  - “You have N important decisions”.

Actions:

- One primary CTA:
  - `View decisions` → Inbox (possibly filtered).

### 6.4 Helper / Assistant

Belongs in Helper/Assistant when:

- User asks for:
  - Explanations (“what/why/how”).
  - Guidance or shortcuts (“where do I see X?”).
  - Multi-step assistance across surfaces.

Actions:

- Should propose navigation or high-level summaries, and only in later phases, propose actions that are **confirmed** and then handled by Decision/System layers.

---

## 7. Non-goals (D46)

D46 **does not**:

- Implement routes, components, or UI.
- Change decision lifecycle or data schemas.
- Define detailed visual design for any surface.
- Implement notification logic, assistant logic, or dashboard queries.

It only defines **navigation principles and surface responsibilities**.

---

## 8. Definition of Done (D46)

D46 is considered complete when:

- [x] The roles and differences between Decision Dashboard, Decision Inbox, Topbar/Notifications, and Helper/Assistant are documented.
- [x] Main entry points into the Decision System are identified.
- [x] Primary user journeys between surfaces are described.
- [x] Navigation rules and criteria for where information/actions live are defined.
- [x] Non-goals are explicitly frozen to keep D46 as an architecture-only navigation model.

---

