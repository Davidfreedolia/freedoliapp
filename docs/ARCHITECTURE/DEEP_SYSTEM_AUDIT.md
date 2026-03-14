# Freedoliapp Deep System Audit

**Phase:** Post–S1 Multi-Tenant Hardening  
**Purpose:** Map what exists in the system so the next roadmap phase does not duplicate work. Identify real gaps, consolidation needs, and architectural inconsistencies.  
**Rule:** This audit does not propose new features; it identifies reality vs. intent.

---

## Executive summary

FREEDOLIAPP has a **mixed architecture**: the database and many modules are **org-scoped** (multi-tenant), but **global data loading and several key API functions still use `user_id`** and do not receive or use `activeOrgId`. The result is:

- **Two sources of “project list”**: AppContext (legacy, user-scoped via `getProjects()`/`getDashboardStats()` with no org) and org-scoped hooks/pages (e.g. `useProjectsListState`, Dashboard `useHomeDashboardData`).
- **Initial load runs before workspace is ready**: `AppContext.loadInitialData()` runs in `useEffect([])` and never depends on `activeOrgId`; it populates `projects` and `stats` with user-scoped data. When the user switches workspace, this global state is **not** reloaded.
- **Explicit org filtering is inconsistent**: Some callers pass `activeOrgId` (Projects list, Dashboard home data, Analytics, Billing, Decisions, Automations); many others call `getProjects()`, `getSuppliers()`, `getPurchaseOrders()`, `getDashboardStats()` with **no** org argument, so those APIs use `user_id` and RLS only.
- **Documentation and code are largely aligned** for Decision/Automation/Lifecycle; the main mismatch is the product assumption of “one active org” vs. the legacy global state that ignores org after switch.

**Single most important gap:** Global app state (projects, stats) and several core data-loading paths do **not** respect the active workspace; they remain user-scoped and are not refreshed when the user changes organization.

---

## Systems fully implemented

The following are present in code and used in the app; behavior is coherent within their scope.

| System | Evidence |
|--------|----------|
| **Projects (list UI)** | `Projects.jsx` uses `useProjectsListState()` which queries `projects` with `.eq('org_id', activeOrgId)`; no org → no query. Create/edit/delete flow exists; project detail is full-featured. |
| **Suppliers (CRUD + UI)** | `Suppliers.jsx`, `getSuppliers` / `createSupplier` in `supabase.js`; table has `org_id`; API still filters by `user_id` (see Query architecture). |
| **Purchase orders** | Create, list, detail, shipments; `createPurchaseOrder` resolves `org_id` from project; `getPurchaseOrders` uses `user_id` only. |
| **Logistics / Shipments** | `po_shipments`, `setShipmentStatus`, `upsertPoShipment`; lifecycle events recorded on status change; UI in Project Detail and Orders. |
| **Inventory (UI + tables)** | `Inventory.jsx` loads inventory and movements; tables have `org_id`; page uses `user_id` for queries. Reorder logic (`getReorderCandidates`, `getReorderAlerts`) and stockout detection exist. |
| **Decisions (engine + inbox)** | Tables: `decisions`, `decision_context`, `decision_sources`, `decision_events`. `createDecision`, `getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`; `/app/decisions` page; dashboard “Top Decisions” widget; org-scoped where callers pass `orgId`. |
| **Lifecycle events** | Table `lifecycle_events`; recorders: phase change, PO created, shipment status; reader `getRecentLifecycleEvents`; UI block in Project Detail right panel; Decision Bridge maps events → decisions. |
| **Low-stock lifecycle** | `emitLowStockLifecycleEventsFromAlerts` in `useHomeDashboardData`; dedupe 24h; `recordInventoryLowStock` + Decision Bridge. |
| **Decision Bridge (lifecycle → decisions)** | `createDecisionFromLifecycleEventIfEligible`; used from lifecycle recorders; dedupe by `source_engine`/`source_reference`. |
| **Automation (schema + proposal + approval + execution intent)** | D57.1 tables; proposal engine; approval gate; execution readiness; execution intent creation; manual execution trigger for allowed action types. No full cron-driven execution worker. |
| **Financial analytics (UI)** | Cashflow, Profit, Finances pages; profit engine, cashflow forecast; org-scoped where `activeOrgId` is passed. |
| **Billing / workspace usage** | `useBillingUsage`, `useOrgBilling`, org entitlements; workspace switcher in TopNavbar; `WorkspaceContext` + `AppContext` mirror of `activeOrgId`. |
| **Alerts (ops)** | `alerts` table usage (e.g. ShipmentDetailDrawer); ops health checks referenced in docs; no full notification delivery (D37 doc-only). |
| **Data states (UI)** | `DataLoading`, `DataEmpty`, `DataError`, `DataState`; applied on Dashboard, Inventory, Decisions, Projects, Orders, Suppliers, Cashflow, Profit, Analytics. |
| **i18n** | Locales (en, ca, es); nav, data states, workspace labels. |
| **Branding** | Canonical paths under `/brand/freedoliapp/`; root static assets (favicon, apple-touch-icon, manifest) generated at build. |

---

## Systems partially implemented

| System | What exists | What is missing or inconsistent |
|--------|-------------|-----------------------------------|
| **Global app data (projects + stats)** | `AppContext` holds `projects` and `stats`; `loadInitialData()` and `refreshProjects()` call `getProjects()` and `getDashboardStats()` with **no** `activeOrgId`. | Load is user-scoped; not re-run when `activeOrgId` changes; consumers (e.g. CalendarPage, Dashboard stats summary) see stale/wrong-org data after workspace switch. |
| **Dashboard stats** | `getDashboardStats()` returns totals; Dashboard and Diagnostics use `stats` from AppContext. | `getDashboardStats()` uses `.eq('user_id', userId)` on `projects` and does not filter `payments` by org; stats are user-scoped, not org-scoped. |
| **Projects “list” duality** | Projects page uses `useProjectsListState` (org-scoped). AppContext still loads and stores `projects` via `getProjects()` (no org). | Two representations: context projects (legacy) used by CalendarPage, NewPOModal (for list), and fallbacks; list page uses hook. Refreshes call both `refreshProjects()` and `refetch()`. |
| **Suppliers / PO / Inventory APIs** | Tables have `org_id`; RLS is org-aware. | `getSuppliers()`, `getPurchaseOrders()`, `getWarehouses(activeOrgId = null)` (and similar) use `user_id` when `activeOrgId` is not passed; many callers (Orders, Finances, Calendar, Inventory, RecurringExpensesSection, LogisticsTrackingWidget) do not pass org. |
| **Workspace propagation** | `WorkspaceContext` sets `activeOrgId` from memberships and storage; syncs to `AppContext`; TopNavbar switcher calls `setActiveOrgId(orgId)` and navigates to `/app`. | Initial load in AppContext does not wait for workspace readiness; no single place that “reloads all org-scoped data” on workspace switch. |
| **Decision notifications** | Decision Inbox and badge exist; decision data is queryable. | D37 (channels, throttling, read/unread, digest) is documented only; no implemented notification delivery layer. |
| **Automation execution** | Execution intent created; manual trigger for allowed actions. | No scheduled worker that runs executions; “full” auto-execution (e.g. prepare_reorder) not implemented. |

---

## Systems only documented

| System | Doc reference | Implementation |
|--------|----------------|-----------------|
| **Decision Notifications (D37)** | Channels, in-app badge/digest, throttling, preferences | Architecture only; no dedicated notification service or delivery. |
| **Decision Analytics (D39)** | Metrics, time-to-action, aggregations per org/decision_type | Documented; no dedicated analytics pipeline or UI. |
| **Digest / email** | Mentioned in D37 | Not implemented. |

(Other docs such as D35 Inbox model, D38 automation concept, D40 overview describe implemented or partially implemented systems and are largely aligned.)

---

## Multi-tenant architecture integrity

- **Schema:** `org_id` is present on tenant tables as per `TENANT_DATA_INVENTORY.md`; migrations (S1) backfilled and enforced it where applicable. Exceptions: `custom_cities` is SAFE HYBRID (org_id + legacy user_id); `trial_registrations` and any other “migration candidates” still without `org_id` per that doc.
- **RLS:** Org-based policies are in place for tenant tables; `is_org_member(org_id)` is used in policies. Legacy user-based policies were removed where migrations (e.g. custom_cities S1.3) switched to org.
- **Tenant isolation in practice:** Isolation is **consistent at the row level** when RLS is enabled and queries do not bypass it. The inconsistency is in the **application layer**: many API functions and call sites still filter by `user_id` only when `activeOrgId` is not passed, so the *intended* tenant scope (active org) is not applied there.
- **user_id usage:** Still present in: `getProjects(includeDiscarded, null)`, `getDashboardStats()`, `getSuppliers()`, `getPurchaseOrders()`, `Inventory.jsx` (inventory + movements), and in various libs that fall back to user when org is null. So: “user’s data” (often one org in practice) is shown instead of “active org’s data” in those paths.

**Verdict:** Multi-tenant **schema and RLS** are in place; **application-level consistency** is partial—many flows still rely on user_id and do not use the active workspace.

---

## Workspace system analysis

- **Source of truth for active org:** `WorkspaceContext` is the canonical source: it loads `org_memberships` by `session.user.id`, chooses `activeOrgId` (storage → owner → first), persists to `localStorage` (`freedoli_active_org_id`), and syncs into `AppContext` via `setAppActiveOrgId(orgId)`.
- **Two contexts exposing org:** `useWorkspace()` exposes `activeOrgId`, `memberships`, `setActiveOrgId`, etc.; `useApp()` exposes `activeOrgId` and `setActiveOrgId` (mirror). So there are **two places** that hold the same value; the mirror is intentional so components that only use `useApp()` still see the active org.
- **Switching workspace:** `setActiveOrgId(orgId)` updates both contexts, persists, and navigates to `/app` (replace). It does **not** trigger a global data reload (e.g. `loadInitialData` or a dedicated “reload for org” function). Pages that load their own data with `activeOrgId` in the dependency array (e.g. Dashboard’s `useEffect(..., [activeOrgId])`) will refetch; those that read from AppContext’s `projects`/`stats` will not.
- **Provider order:** `AppProvider` wraps `WorkspaceProvider` in `App.jsx`; `WorkspaceProvider` uses `useApp()` to get `setActiveOrgId` and passes it down. So workspace state is set in WorkspaceContext and mirrored into AppContext.
- **Risk:** Multiple sources of truth only in the sense of “same value in two contexts”; the real risk is that **global state (projects, stats) and several API call sites ignore that value**.

---

## Query architecture analysis

Three patterns exist; the codebase uses all of them.

| Pattern | Description | Where it appears |
|--------|-------------|-------------------|
| **A) RLS-only** | Query has no explicit `org_id` or `user_id`; RLS restricts rows. | Some single-row lookups (e.g. by id); payments in `getDashboardStats()` (no org filter). |
| **B) Explicit org_id** | Caller passes `activeOrgId`; query uses `.eq('org_id', activeOrgId)`. | `getProjects(includeDiscarded, activeOrgId)`, `getPayments(projectId, activeOrgId)`, `getGtinPool`, `getWarehouses(activeOrgId)`, `getPosNotReady(limit, activeOrgId)`, Decisions/Decision Dashboard, Automations, Billing, `useProjectsListState` (direct supabase), `useHomeDashboardData`, Analytics (projects), etc. |
| **C) Legacy user_id** | Query uses `.eq('user_id', userId)`; no org parameter or org not passed. | `getProjects()` when second arg is null (used by AppContext, CalendarPage, Inventory, Orders, Finances, etc.); `getDashboardStats()` (projects + payments); `getSuppliers()`; `getPurchaseOrders()`; Inventory page (inventory, movements); `getWarehouses(null)`; and any lib that falls back to user when `activeOrgId` is null. |

**Summary:** The same table (e.g. `projects`) is accessed in both org-scoped and user-scoped ways depending on caller. Consolidation would mean: either always pass `activeOrgId` and make APIs require it for tenant data, or document and enforce a single strategy (e.g. “tenant data always via org_id from context”).

---

## Domain module maturity map

| Module | Classification | Notes |
|--------|----------------|-------|
| **Projects** | Implemented | Full CRUD, detail, phases, timeline; list is org-scoped via hook; global context still user-scoped. |
| **Suppliers** | Implemented | CRUD, UI; API uses user_id; table has org_id. |
| **Purchase orders** | Implemented | Create, list, detail, shipments, readiness; API user_id; org resolved on insert. |
| **Logistics / Shipments** | Implemented | po_shipments, status updates, lifecycle events, UI. |
| **Inventory** | Implemented | Tables, UI, movements, reorder alerts, low-stock lifecycle; page uses user_id. |
| **Decisions** | Implemented | Engine, bridge, inbox, dashboard widget; org used where caller passes it. |
| **Lifecycle events** | Implemented | Table, recorders, reader, UI block, Decision Bridge, low-stock emitter. |
| **Automation** | Implemented (partial) | Schema, proposal, approval, execution intent, manual trigger; no cron execution worker. |
| **Financial analytics** | Implemented | Cashflow, Profit, Finances pages; org-scoped where activeOrgId passed. |
| **Alerts** | Partially implemented | Table and some usage (e.g. ShipmentDetailDrawer); no full notification system (D37 doc-only). |

**Counts (domain modules only):** Fully implemented 8 (Projects, Suppliers, PO, Logistics, Inventory, Decisions, Lifecycle events, Financial analytics). Partially implemented 2 (Automation, Alerts). Documented only 2 (Decision Notifications D37, Decision Analytics D39).

---

## Architectural inconsistencies

1. **Global load vs. workspace:** `loadInitialData()` runs once on mount, does not depend on `activeOrgId`, and never re-runs when workspace changes. So `projects` and `stats` in AppContext are user-scoped and stale after switch.
2. **Dual project list:** AppContext `projects` (from `getProjects()`) and `useProjectsListState()` (from `.eq('org_id', activeOrgId)`). CalendarPage and some modals use context or `getProjects()` without org; Projects page uses the hook.
3. **Stats user-scoped:** `getDashboardStats()` uses `user_id` for projects and does not filter payments by org; Dashboard and Diagnostics display these as global stats.
4. **API signatures:** Some functions accept `activeOrgId` and filter by `org_id` when provided; others (e.g. `getSuppliers`, `getPurchaseOrders`) have no org parameter and always use `user_id`. So “tenant” is sometimes org, sometimes user.
5. **No “reload for org” contract:** Switching workspace does not trigger a single, explicit “reload all org-scoped data” flow; each page or hook that cares must depend on `activeOrgId` and refetch itself.

---

## Duplication risks

1. **Projects:** Two ways to get the list (AppContext + hook); two refresh paths (`refreshProjects()` vs. `refetch()`). Risk: features that use “projects” may use the wrong source (org vs. user).
2. **activeOrgId:** Available from both `useWorkspace()` and `useApp()`. Intentional mirror; risk is only if one is updated without the other (currently they are kept in sync by WorkspaceContext).
3. **Data loading on Dashboard:** Multiple useEffects and hooks (e.g. orders, PO not ready, financial, exec dashboard, home data); several correctly depend on `activeOrgId`; the header stats still come from AppContext and are user-scoped.

---

## Recommended next consolidation phase

Focus on **making the active workspace the single scope for global and list data**, without adding new features:

1. **Unify project list and stats on org:**  
   - Have `loadInitialData` and `refreshProjects` accept and use `activeOrgId` (e.g. from context).  
   - Call `getProjects(includeDiscarded, activeOrgId)` and an org-scoped stats function (or extend `getDashboardStats(activeOrgId)` to filter by `org_id`).  
   - Run initial load after workspace is ready, or re-run when `activeOrgId` changes.

2. **Consistent API usage:**  
   - Where tenant data is needed, pass `activeOrgId` from context into `getSuppliers`, `getPurchaseOrders`, `getWarehouses`, and similar.  
   - Optionally add `activeOrgId` parameter to those APIs and use `.eq('org_id', activeOrgId)` when provided, with a clear deprecation path for the user_id path.

3. **Single source for “projects” in UI:**  
   - Prefer the org-scoped hook or an org-scoped load from context everywhere (CalendarPage, NewPOModal, LogisticsTrackingWidget, etc.), and phase out reliance on AppContext’s user-scoped `projects` for list views.

4. **Document and enforce:**  
   - Document “tenant data = org_id from WorkspaceContext/AppContext” and that callers must pass `activeOrgId` for tenant queries; treat user_id-only paths as legacy and plan removal once all callers are migrated.

This consolidation does not introduce new capabilities; it aligns existing behavior with the intended multi-tenant model and removes the main architectural gap (global state and core APIs ignoring the active workspace).
