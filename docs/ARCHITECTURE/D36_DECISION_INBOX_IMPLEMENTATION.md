# D36 — Decision Inbox Implementation

Status: Draft

---

## Objective

Implement the seller-facing Decision Inbox defined in D35:

- Dedicated `/app/decisions` page with list + detail layout.
- Service layer over existing decision tables.
- Lifecycle actions for seller-triggered transitions.
- Minimal dashboard widget to surface top decisions.

No new engines, notifications, automation or AI layers are introduced in D36.

---

## Scope

In scope:

- Frontend service layer to read and mutate decisions in a multi-tenant-safe way.
- React page and components to present decisions as an operational inbox.
- Routing and sidebar integration.
- Minimal “Top Decisions” widget on the dashboard.
- Documentation of the implementation and boundaries.

Out of scope:

- Any backend schema change.
- Any change to the Decision Bridge or scheduler.
- Notifications (email/push/in-app alerts).
- Multi-user assignment, comments, analytics or batch actions.

---

## Files created

### Service layer

- `src/lib/decisions/getDecisionInboxPage.js` (extended)
  - Loads one page of decisions for the active org using `decisions`.
  - Fetches `decision_context` and `decision_sources` only for visible decision ids.
  - Normalizes raw rows into seller-facing inbox items with fields:
    - `id`, `decisionType`, `status`, `title`, `explanation`, `recommendedAction`,
      `severity`, `confidence`, `priorityScore`, `createdAt`, `resolvedAt`,
      `sourceEngine`, `entityLinks`, `contextSummary`.
  - Supports filters for status and decision type.
  - Default sort: `priority_score` desc, then `created_at` desc.
  - Exposes internal normalizer via `__internalNormalizeDecision` for reuse.

- `src/lib/decisions/getDecisionById.js`
  - Loads a single decision by `id` and `org_id`.
  - Fetches its context and source rows.
  - Uses the same normalization shape as the inbox page (via internal normalizer).

- `src/lib/decisions/updateDecisionStatus.js`
  - Supports seller-triggered transitions:
    - `open` → `acknowledged`
    - `open` → `acted`
    - `open` → `dismissed`
    - `acknowledged` → `acted`
    - `acknowledged` → `dismissed`
  - Validates allowed transitions from current status; returns `INVALID_TRANSITION` for invalid/stale states.
  - Updates `decisions.status` and sets `resolved_at` when status becomes `acted` or `dismissed`.
  - Inserts a row in `decision_events` with payload:
    - `actor_type` (`user` or `system`), `actor_id` (if available),
      `from_status`, `to_status`, `reason`.

### Page

- `src/pages/Decisions.jsx`
  - Uses `useWorkspace()` to read `activeOrgId` (org-scoped, multi-tenant safe).
  - Fetches one page of inbox items via `getDecisionInboxPage`.
  - Applies default filters:
    - Status: `open` + `acknowledged`.
    - Decision type: all (with explicit option for `reorder`).
    - Severity: all.
    - Confidence: all.
  - Default sort: handled in the service layer (priority + created_at).
  - Maintains:
    - `items`, `selected`, `page`, `total`, `filters`, `loading`, `error`, `detailLoading`, `actionLoading`.
  - On lifecycle actions (`acknowledge`, `mark as done`, `dismiss`):
    - Calls `updateDecisionStatus` with `nextStatus`.
    - Reloads the page and updates the selected item (including detail via `getDecisionById`).
  - Layout:
    - Header (title + subtitle).
    - Filters bar.
    - Two-panel body (responsive):
      - Left: `DecisionList` (compact list + filters).
      - Right: `DecisionDetail` (full detail with actions).

---

## Routing

- `src/App.jsx`
  - New lazy route:
    - `const Decisions = lazyWithErrorBoundary(() => import('./pages/Decisions'), 'Decisions')`.
  - New entry in `/app` routes:
    - `<Route path="decisions" element={<AppPageWrap context="page:Decisions"><Decisions /></AppPageWrap>} />`.

---

## Sidebar integration

- `src/components/Sidebar.jsx`
  - `Inbox` icon imported from `lucide-react`.
  - `menuItems` extended with:
    - `{ path: '/app/decisions', icon: Inbox, labelKey: 'sidebar.decisions' }`.
  - `prefetchRoute` extended with:
    - case `'/decisions'` → dynamic import of `../pages/Decisions.jsx`.
  - i18n:
    - `sidebar.decisions` already exists in `en/ca/es` locales; reused as label.

---

## Service layer contract

### getDecisionInboxPage

Input:

- `orgId` (required).
- `page`, `pageSize` (pagination).
- `filters`:
  - `status`: `'open_only' | 'open_ack' | 'all' | 'acted' | 'dismissed' | 'expired'`.
  - `decisionType`: `'all' | 'reorder' | ...`.

Behavior:

- Queries `decisions` for the org with appropriate status/type filters.
- Sorts by `priority_score` desc, then `created_at` desc.
- Pages results with `range`.
- Loads `decision_context` and `decision_sources` only for the visible `id`s.
- Maps raw rows to normalized inbox items (with special handling for `reorder` decisions; generic mapping for other types).

### getDecisionById

- Ensures detail view and list view stay consistent.
- Loads the decision, its context and source rows.
- Returns the same normalized structure as list items.

### updateDecisionStatus

- Enforces allowed transitions as defined in D35/D36.
- Writes to `decisions` and `decision_events`.
- Returns simple result:
  - `{ ok: true }` on success.
  - `{ ok: false, error: 'INVALID_TRANSITION' | 'NOT_FOUND' | 'UPDATE_FAILED' | 'MISSING_PARAMS' }` for recoverable errors.

---

## UI component structure

Directory: `src/components/decisions/`

- `DecisionList.jsx`
  - Renders:
    - Loading / error / empty states.
    - List of `DecisionRow` components.
  - Props:
    - `items`, `selectedId`, `onSelect`, `loading`, `error`.

- `DecisionRow.jsx`
  - Compact, scan-friendly row with:
    - Severity dot.
    - Title.
    - Explanation preview.
    - Confidence and created time.
    - Status label.
  - Click selects the item.

- `DecisionDetail.jsx`
  - Right-hand panel showing:
    - Title.
    - Status, severity, confidence, source engine.
    - Full explanation.
    - Recommended action.
    - Structured context summary (from `contextSummary`).
    - `DecisionActions` for lifecycle changes.

- `DecisionActions.jsx`
  - Buttons:
    - Acknowledge → `acknowledged`.
    - Mark as done → `acted`.
    - Dismiss → `dismissed`.
  - Disables buttons when transitions are not allowed (e.g. already closed).

- `DecisionFilters.jsx`
  - Filter bar with:
    - Status selector.
    - Decision type selector.
    - Severity selector.
    - Confidence selector.

---

## Lifecycle mutation behavior

- Page calls `updateDecisionStatus` with:
  - `orgId`, `decisionId`, `nextStatus`.
- `updateDecisionStatus`:
  - Validates current state.
  - Applies allowed transition only.
  - Writes `resolved_at` for `acted` / `dismissed`.
  - Inserts `decision_events` row with structured `event_data` (actor, from/to status, reason).
- On error (e.g. invalid transition/stale data):
  - Page simply reloads current page data and lets UI update to current state.

---

## Dashboard widget

- `src/components/home/HomeTopDecisions.jsx`
  - Title: **Top Decisions**.
  - Reads top 3 highest-priority open/acknowledged decisions via `getDecisionInboxPage` for active org.
  - Renders:
    - Title.
    - Each item with:
      - Title.
      - Severity.
      - One-line explanation.
    - CTA link: **View all decisions** → `/app/decisions`.

- `src/pages/Dashboard.jsx`
  - Imports and renders `<HomeTopDecisions />` above the existing Reorder candidates widget.

---

## Out of scope

D36 explicitly does **not** implement:

- Notifications (email, push, in-app alert systems).
- AI explanation layers or auto-remediation.
- Assignment, comments, analytics, or workflow routing.
- Reopen flows for closed decisions.
- New decision types or engines beyond those already emitted.

The Decision Inbox is strictly a seller-facing UI over already-persisted decisions.

---

## Definition of done

D36 is considered implemented when:

- [x] `/app/decisions` route exists and renders a working Decision Inbox.
- [x] Service layer (`getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`) reads and mutates decisions using canonical tables.
- [x] List + detail layout exists with filters, selection and lifecycle actions.
- [x] Lifecycle mutations respect allowed transitions and record events.
- [x] Sidebar has a **Decisions** entry pointing to `/app/decisions`.
- [x] Dashboard shows **Top Decisions** widget with CTA to the inbox.
- [x] Multi-tenant behavior is preserved (all queries org-scoped).
- [x] No notifications, automation or out-of-scope features have been introduced.

---

# D36 — Decision Inbox Implementation

Status: In progress

---

## Objective

Implement the seller-facing Decision Inbox defined in D35:

- dedicated page `/app/decisions`
- decision service layer on top of canonical tables
- list + detail layout
- lifecycle actions for decisions
- minimal dashboard widget
- sidebar entry

No notifications, no email/push alerts, no automation or AI. Backend decision generation (D32–D34) remains unchanged.

---

## Scope

In scope for D36:

- Read-only inbox projection for decisions (plus seller lifecycle updates).
- One org-scoped page `/app/decisions`.
- Service layer:
  - `getDecisionInboxPage`
  - `getDecisionById`
  - `updateDecisionStatus`
- React components for:
  - decision list
  - decision detail
  - lifecycle actions
  - filters
- Dashboard widget “Top Decisions”.
- Sidebar integration to navigate to `/app/decisions`.

Out of scope:

- New engines or decision types.
- Notifications, email, push.
- Automation or auto-remediation.
- Assignment, comments, analytics, reopen flows.

---

## Files created

**Service layer**

- `src/lib/decisions/getDecisionInboxPage.js`
  - Loads one page of `decisions` for an `org_id`.
  - Applies default filters to show `open` and `acknowledged` by default.
  - Orders by `priority_score` (desc) then `created_at` (desc).
  - Fetches `decision_context` and `decision_sources` for the visible `decision_id`s.
  - Normalizes to seller-facing inbox items with fields:
    - `id`, `decisionType`, `status`, `title`, `explanation`,
      `recommendedAction`, `severity`, `confidence`, `priorityScore`,
      `createdAt`, `resolvedAt`, `sourceEngine`, `entityLinks`, `contextSummary`.
  - Specializes presentation for `decision_type = 'reorder'` with context keys:
    - `asin`, `product_name`, `reorder_units`, `days_until_stockout`,
      `coverage_days`, `lead_time_days`, `confidence`.
  - Exposes helper `__internalNormalizeDecision` for reuse by detail view.

- `src/lib/decisions/getDecisionById.js`
  - Loads a single decision by `org_id` + `id`.
  - Fetches context and source rows for that decision.
  - Reuses `__internalNormalizeDecision` from `getDecisionInboxPage` to keep list/detail consistent.

- `src/lib/decisions/updateDecisionStatus.js`
  - Supports seller-triggered lifecycle transitions:
    - `open → acknowledged`
    - `open → acted`
    - `open → dismissed`
    - `acknowledged → acted`
    - `acknowledged → dismissed`
  - Validates transitions; returns `{ ok: false, code: 'invalid_transition' }` on illegal transitions.
  - Updates `decisions.status` and sets `resolved_at` for `acted` and `dismissed`.
  - Inserts row into `decision_events` with:
    - `event_type = toStatus`
    - `event_data` containing:
      - `actor_type` (`user`/`system`)
      - `actor_id` (from `getCurrentUserId()` when available)
      - `from_status`
      - `to_status`
      - `reason` (nullable).

**Page**

- `src/pages/Decisions.jsx`
  - Uses `useWorkspace()` to read `activeOrgId`.
  - Uses `getDecisionInboxPage` to load a single page of decisions.
  - Applies client-side filters for `severity` and `confidence` on the normalized items.
  - Stores selected decision; fetches detail via `getDecisionById` on row selection.
  - Calls `updateDecisionStatus` on seller actions and reloads the page after success (or invalid transition).
  - Layout:
    - Desktop: two-panel layout (left list, right detail).
    - Mobile: stacked layout (list above, detail below).

**Components (`src/components/decisions/`)**

- `DecisionList.jsx`
  - Renders:
    - `DecisionFilters` (status, decision type, severity, confidence).
    - loading / error / empty states.
    - list of `DecisionRow` elements.

- `DecisionRow.jsx`
  - Compact, scan-friendly row.
  - Shows:
    - severity indicator (colored dot).
    - title.
    - explanation preview.
    - status.
    - created date.

- `DecisionDetail.jsx`
  - Right-side detail panel for the selected decision.
  - Shows:
    - title
    - full explanation
    - recommended action
    - status, severity, confidence, source engine
    - context summary (key/value pairs)
    - `DecisionActions` buttons.

- `DecisionActions.jsx`
  - Buttons:
    - Acknowledge → `acknowledged`
    - Mark as done → `acted`
    - Dismiss → `dismissed`
  - Enables/disables buttons based on current status and a loading flag.

- `DecisionFilters.jsx`
  - Simple `<select>`-based filters for:
    - `status` (`open_ack`, `open_only`, `all`)
    - `decisionType` (`all`, `reorder`)
    - `severity` (`all`, `high`, `medium`, `low`)
    - `confidence` (`all`, `high`, `medium`, `low`)

---

## Routing

**App route**

Updated `src/App.jsx`:

- Lazy import:
  - `const Decisions = lazyWithErrorBoundary(() => import('./pages/Decisions'), 'Decisions')`
- Route inside `/app` tree:
  - `<Route path="decisions" element={<AppPageWrap context="page:Decisions"><Decisions /></AppPageWrap>} />`

Path:

- `/app/decisions` → Decision Inbox page.

---

## Sidebar integration

Updated `src/components/Sidebar.jsx`:

- Icons:
  - Already imports `Inbox` from `lucide-react`.
- `menuItems` now includes:
  - `{ path: '/app/decisions', icon: Inbox, labelKey: 'sidebar.decisions' }`
- Prefetch:
  - `prefetchRoute` handles the `/decisions` base and dynamically imports `../pages/Decisions.jsx`.

I18n:

- The sidebar label uses `t('sidebar.decisions')` (keys added in locale files when necessary).

---

## Service layer contract

**`getDecisionInboxPage({ orgId, page, pageSize, filters })`**

- Reads decisions for `orgId` only (`org_id = orgId`).
- Applies status and decision type filters at query level.
- Orders by `priority_score DESC, created_at DESC`.
- Fetches context and sources for the visible decisions.
- Normalizes to seller-facing inbox items:
  - special handling for `reorder` type.
- Designed to be read-heavy and safe for current decision volumes.

**`getDecisionById({ orgId, decisionId })`**

- Loads a single decision row by `orgId` + `decisionId`.
- Fetches its context and source rows.
- Uses the same normalization logic as the list for consistency.

**`updateDecisionStatus({ orgId, decisionId, toStatus, reason })`**

- Validates allowed transitions (`open`/`acknowledged` → `acknowledged`/`acted`/`dismissed`).
- Refuses illegal transitions (`invalid_transition`).
- Updates `decisions` and inserts `decision_events`.
- Returns `{ ok: boolean, code?, message? }` for UI handling.

All helpers are org-scoped and only operate on rows with `org_id = orgId`.

---

## UI component structure

- `/app/decisions` page uses:
  - `DecisionList` for the left panel (list + filters).
  - `DecisionDetail` for the right panel (detail + actions).
- Interactions:
  - Selecting a row loads detail for that decision.
  - Actions in `DecisionActions` call `updateDecisionStatus` and refresh list + detail.
- States:
  - Loading, error and empty states handled in `DecisionList`.
  - Detail loading and action loading tracked separately to avoid blocking list interactions.

The page feels like an **operational inbox** for recommendations, not a kanban/task manager.

---

## Lifecycle mutation behavior

Seller-facing actions:

- **Acknowledge** → `acknowledged`
- **Mark as done** → `acted`
- **Dismiss** → `dismissed`

Behavior:

- Validate transition based on current status.
- Update `decisions.status` (and `resolved_at` when closing).
- Insert `decision_events` row with:
  - `event_type` = target status.
  - `event_data` describing actor and transition.
- On invalid transition (stale state):
  - Backend refuses.
  - Frontend reloads the list to show updated state.

No reopen flows are implemented in D36; closed states remain closed.

---

## Dashboard widget

A minimal “Top Decisions” widget is planned to be integrated into `Dashboard.jsx` (home).  
Scope for the widget:

- Title: `Top Decisions`.
- Shows top 3 highest-priority **open** decisions (from `getDecisionInboxPage`).
- Displays:
  - title
  - severity
  - one-line explanation or related entity
- CTA:
  - “View all decisions” → `/app/decisions`.

Implementation will reuse the same service layer and normalized decision shape to avoid duplication.

---

## Out of scope

D36 explicitly does **not** implement:

- Notifications (email, push, in-app alerts).
- AI explanation layers.
- Automation or auto-remediation.
- Task assignment or complex workflow routing.
- Comment threads on decisions.
- Analytics dashboards over decision history.
- Batch actions on decisions.
- Reopen flows.
- New engines or new decision types.

The inbox is a thin, seller-facing UI over the existing decision system, nothing more.

---

## Definition of done

- [x] Objective and scope documented for D36.
- [x] Service layer implemented:
  - `getDecisionInboxPage`
  - `getDecisionById`
  - `updateDecisionStatus`
- [x] Page `/app/decisions` implemented with list + detail layout.
- [x] Components under `src/components/decisions/` created and wired.
- [x] Routing and sidebar integration added.
- [ ] Dashboard widget “Top Decisions” fully integrated into dashboard.
- [ ] Final phase status updated (D36 closure) once widget and polish are complete.

---

