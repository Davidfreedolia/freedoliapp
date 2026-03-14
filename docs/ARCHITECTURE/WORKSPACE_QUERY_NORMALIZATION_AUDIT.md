# Workspace Query Normalization Audit

**Phase:** S2.3 — Workspace Query Normalization Audit  
**Scope:** Identify all data access paths that do not fully respect the workspace (org_id) model.  
**Rules:** Audit only; no code changes, no migrations, no refactors.

---

## Summary

The codebase uses three distinct query patterns for tenant data:

| Type | Description | Approx. count |
|------|-------------|----------------|
| **Canonical (A)** | Query uses `.eq('org_id', activeOrgId)` or receives `orgId` explicitly. | ~95 (query sites) |
| **RLS-only (B)** | Query uses `.from('table')` without explicit `org_id` (relies on RLS). | ~18 (distinct) |
| **Legacy (C)** | Query uses `.eq('user_id', ...)` for tenant data or service does not accept `activeOrgId`. | ~75 (functions/sites; excludes org_memberships identity + dev/demo) |

**Findings:**

- **supabase.js** is the main source of legacy and mixed patterns: many exported functions accept no `activeOrgId` and filter by `user_id` (e.g. `getSuppliers()`, `getPurchaseOrders()`, `getCompanySettings()`, `getDashboardPreferences()`, `getStaleTracking()`, `getResearchNoDecision()`, `getCalendarEvents()` internals, `getSupplierQuotes()`, `getDecisionLog()`, `getProjectProfitability()`, etc.).
- **Pages and components** that call these functions without passing org (e.g. Orders, Finances, Calendar, CalendarPage, Inventory, Dashboard widgets, Settings, RecurringExpensesSection) therefore receive user-scoped data instead of workspace-scoped data.
- **Decisions, automation, profit, and finance (cashflow) modules** are largely canonical: they accept `orgId` and use `.eq('org_id', orgId)`.
- **Identity resolution** (e.g. `org_memberships` filtered by `user_id` to obtain `org_id`) is intentional and not classified as legacy tenant data access.

---

## Canonical queries

Queries that explicitly use `org_id` (or receive `orgId`/`activeOrgId` and pass it to the API).

### src/lib/supabase.js

- `getProjects(includeDiscarded, activeOrgId)` — when `activeOrgId` provided, uses `.eq('org_id', activeOrgId)`.
- `getPayments(projectId, activeOrgId)` — when `activeOrgId` provided, uses `.eq('org_id', activeOrgId)`.
- `getDashboardStats(activeOrgId)` — when `activeOrgId` provided, projects and payments filtered by `org_id`.
- `getGtinPool(statusFilter, activeOrgId)`, `getAvailableGtinCodes(activeOrgId)`, `getProjectsMissingGtin(activeOrgId)`, `getProgrammaticallyAssignedGTIN(activeOrgId)`, `getUnassignedGtinCodes(activeOrgId)` — all use `activeOrgId` when provided.
- `getPosNotReady(limit, activeOrgId)` — when `activeOrgId` provided, uses `.eq('org_id', activeOrgId)` (and product_identifiers branch).
- `getWarehouses(activeOrgId)` — when `activeOrgId` provided, uses `.eq('org_id', activeOrgId)`.
- `getOpenTasks(limit, activeOrgId)` — when `activeOrgId` provided, uses `.eq('org_id', activeOrgId)`.
- `upsertProductIdentifiers(projectId, identifiers, activeOrgId)` — requires `activeOrgId`.

### src/lib/decisions/*

- `getDecisionInboxPage`, `getDecisionById`, `getDecisionDashboardData`, `getDecisionNotifications`, `getProjectNextDecision`, `updateDecisionStatus`, `submitDecisionFeedback` — all take `orgId` and use `.eq('org_id', orgId)`.

### src/lib/automation/*, src/lib/automations/queries/*

- `getAutomationRuleForAction`, `evaluateDecisionAutomationEligibility`, `createAutomationProposal`, `approveAutomationProposal`, `rejectAutomationProposal`, `getPendingAutomationApprovals`, `evaluateAutomationProposalReadiness`, `createAutomationExecutionIntent`, `runAutomationExecutionManually`, `validateApprovalActor`, `maybeCreateAutomationProposalForDecision` — all use `orgId` and `.eq('org_id', orgId)`.
- `getAutomationInbox`, `getAutomationProposalDetail`, `getAutomationActivity`, `getAutomationExecutionStats`, `getAutomationMetricsSummary`, `getAutomationFunnelStats`, `getAutomationVelocityStats`, `getAutomationRiskStats` — org-scoped.

### src/lib/inventory/*

- `getReorderCandidates(orgId)`, `getStockoutAlerts(orgId)`, `detectStockoutRisk(orgId)` — use `.eq('org_id', orgId)`.

### src/lib/profit/*, src/lib/finance/*

- `getWorkspaceProfit(orgId)`, `getAsinProfitData`, `getProfitTimeseries`, `getMarginCompressionAlerts` — org-scoped.
- `getCashflowForecast(orgId)` — uses `.eq('org_id', orgId)`.

### src/lib/workspace/*, src/lib/billing/*

- `usage.js` — projects and org_memberships counts by `org_id`.
- `entitlements.js` — `getOrgEntitlements(orgId)`.
- `useBillingUsage`, `useOrgBilling` — pass `orgId`.

### src/hooks/*

- `useProjectsListState` — queries `projects` with `.eq('org_id', activeOrgId)`.
- `useBlockedProjects`, `useOrgDashboardMode`, `useOnboardingStatus` — org-scoped.

### src/pages, src/components (when they pass activeOrgId)

- Dashboard (projects, PO not ready when activeOrgId passed), Analytics (getProjects(true, activeOrgId)), Warehouses (getWarehouses(activeOrgId)), Projects (useProjectsListState + inline org_id for some flows), ActivationWizard, AmazonSnapshot, Settings (org for some queries), IdentifiersSection, ShipmentDetailDrawer (alerts by shipment.org_id), BillingOverSeat, App.jsx (org_memberships count by activeOrgId).

---

## RLS-only queries

Queries that do not add an explicit `org_id` (or `user_id`) filter; tenant isolation depends entirely on RLS.

| File | Function / location | Table(s) | Notes |
|------|---------------------|----------|--------|
| src/lib/supabase.js | getPurchaseOrder(id) | purchase_orders | Single-row by id; RLS applies. |
| src/lib/supabase.js | getSupplier(id) | suppliers | Single-row by id. |
| src/lib/supabase.js | getPoShipment(poId) | po_shipments | By purchase_order_id. |
| src/lib/supabase.js | getShipmentsInTransit(limit) | po_shipments | No org or user filter. |
| src/lib/supabase.js | getAlerts(thresholds) | po_amazon_readiness, po_shipments | No explicit org/user. |
| src/lib/supabase.js | getTasks(filters) | tasks | When `filters.org_id` not passed, no explicit filter. |
| src/lib/supabase.js | getAuditLogs(limit, statusFilter) | audit_log | No org filter. |
| src/lib/supabase.js | getRecurringExpensesKPIs() | expenses | No org_id parameter; RLS only. |
| src/lib/lifecycleEvents/record.js | record* | lifecycle_events | Insert with org_id from caller; read path RLS. |
| src/lib/lifecycleEvents/reader.js | getRecentLifecycleEvents | lifecycle_events | By project_id; RLS. |
| src/lib/lifecycleEvents/emitLowStock.js | emitLowStockLifecycleEventsFromAlerts | lifecycle_events | RLS. |
| src/lib/decisions/trackDecisionViewed.js | trackDecisionViewed | decision_events | Insert; RLS. |
| src/lib/workspace/createWorkspace.js | createWorkspace | trial_registrations, orgs, org_memberships | Creation flow; not tenant list. |
| src/lib/trials/markTrialConverted.js | markTrialConverted | trial_registrations | RLS. |
| src/components/Logistics/ShipmentDetailDrawer.jsx | alerts query | alerts | Uses shipment.org_id (canonical); other reads may be RLS-only. |

---

## Legacy user-scoped queries

Queries or services that use `.eq('user_id', ...)` for tenant data or do not accept `activeOrgId` and therefore fall back to user-scoped behavior.

### src/lib/supabase.js

| Function | Issue | Module |
|----------|--------|--------|
| getProjects(includeDiscarded, null) | When second arg is null, uses `.eq('user_id', userId)`. | Projects |
| getSuppliers() | No org parameter; uses `.eq('user_id', userId)`. | Suppliers |
| getSuppliersByType(type) | No org parameter; uses `.eq('user_id', userId)`. | Suppliers |
| createSupplier(supplier) | Inserts with user_id only (no org_id). | Suppliers |
| updateSupplier(id, updates) | Uses `.eq('user_id', userId)`. | Suppliers |
| deleteSupplier(id) | Uses `.eq('user_id', userId)`. | Suppliers |
| getPurchaseOrders(projectId) | No org parameter; uses `.eq('user_id', userId)`. | Purchase orders |
| getDocuments(projectId) | Resolves org from project or org_memberships; insert path uses user_id. | Documents |
| getPayments(projectId, null) | When activeOrgId null, no explicit org filter on list. | Payments |
| getDashboardStats(null) | Legacy path uses `.eq('user_id', userId)` on projects and no org on payments. | Dashboard |
| getCompanySettings() | Uses `.eq('user_id', userId)`; table has org_id (S1.2). | Settings |
| updateCompanySettings(settings) | Uses user_id for select/update/insert. | Settings |
| getDashboardPreferences() | Uses `.eq('user_id', userId)`; table may be user or org scoped. | Dashboard |
| generateProjectCode() | Uses `.eq('user_id', userId)` on projects. | Projects |
| generatePONumber(projectSku) | Uses user_id on projects. | Purchase orders |
| getSupplierPriceEstimates(projectId) | Resolves org from project; list/upsert may use user_id. | Estimates |
| getPosWaitingManufacturer(limit) | No activeOrgId; uses user_id or RLS. | Daily ops |
| getResearchNoDecision(limit) | Uses `.eq('user_id', userId)` on projects. | Daily ops |
| getStaleTracking(limit, staleDays) | Uses `.eq('user_id', userId)` on purchase_orders. | Logistics |
| getWarehouses(null) | When activeOrgId null, uses `.eq('user_id', userId)`. | Warehouses |
| createWarehouse(warehouse) | Resolves org from membership; update/delete use user_id. | Warehouses |
| updateWarehouse(id, updates) | Uses `.eq('user_id', userId)`. | Warehouses |
| deleteWarehouse(id) | Uses `.eq('user_id', userId)`. | Warehouses |
| getProjectProfitability(projectId) | Uses `.eq('user_id', userId)` on project_profitability_basic. | Profitability |
| upsertProjectProfitability(projectId, data) | Upsert key includes user_id. | Profitability |
| getTasks(filters) | When filters.org_id not passed, no explicit org filter (RLS only); callers often do not pass org. | Tasks |
| updateTask(id, updates) | Uses `.eq('user_id', userId)`. | Tasks |
| deleteTask(id) | Uses `.eq('user_id', userId)`. | Tasks |
| getCalendarEvents(filters) | Internal queries to purchase_orders, supplier_quotes use `.eq('user_id', userId)`; no orgId parameter. | Calendar |
| getSupplierQuotes(projectId) | Uses `.eq('user_id', userId)`. | Supplier quotes |
| getSupplierQuote(quoteId) | Uses user_id. | Supplier quotes |
| createSupplierQuote(quote) | user_id. | Supplier quotes |
| updateSupplierQuote(quoteId, updates) | user_id. | Supplier quotes |
| deleteSupplierQuote(quoteId) | user_id. | Supplier quotes |
| getDecisionLog(entityType, entityId) | Uses `.eq('user_id', userId)` on decision_log. | Decision log |
| createDecisionLog(decision) | Inserts user_id. | Decision log |
| updateDecisionLog(id, updates) | Uses `.eq('user_id', userId)`. | Decision log |
| getPoForQuote(quoteId) | Uses user_id on supplier_quotes and purchase_orders. | Planned vs actual |
| getQuoteForPo(poId) | Uses user_id on purchase_orders and supplier_quotes. | Planned vs actual |
| getRecurringExpenses(null) | When activeOrgId not passed, fallback uses user_id (if implemented) or RLS. | Finances |
| getExpenses / getIncomes (if any) | Any list that uses user_id. | Finances |
| updateDashboardPreferences(preferences) | user_id. | Dashboard |

### src/lib/queryHelpers.js

| Function | Issue | Module |
|----------|--------|--------|
| getBaseQuery(table, supabase, demoMode) | Builds query with `.eq('user_id', userId)`; no org_id. | Generic helper |

### src/lib/supplierMemory.js

| Function | Issue | Module |
|----------|--------|--------|
| getSupplierMetrics(supplierId, ...) | supplier_quotes, purchase_orders, decision_log use `.eq('user_id', userId)`. | Supplier analytics |

### src/pages/Inventory.jsx

| Location | Issue | Module |
|----------|--------|--------|
| loadData() | getProjects(true) with no second argument; inventory and inventory_movements use `.eq('user_id', userId)`. | Inventory |

### src/pages/Analytics.jsx

| Location | Issue | Module |
|----------|--------|--------|
| Inline queries | Two queries use `.eq('user_id', userId)` (inventory or similar). | Analytics |

### src/pages/Projects.jsx

| Location | Issue | Module |
|----------|--------|--------|
| Inline queries (e.g. businessSnapshot, stockSignal) | Some supabase.from('projects').select(...).eq('user_id', userId). | Projects |

### src/pages/Dashboard.jsx

| Location | Issue | Module |
|----------|--------|--------|
| loadOrdersInProgress / loadPosNotReady / etc. | getPurchaseOrders(), getDashboardPreferences() called without org; one inline purchase_orders query uses `.eq('user_id', userId)`. | Dashboard |

### src/pages/Calendar.jsx, src/pages/CalendarPage.jsx

| Location | Issue | Module |
|----------|--------|--------|
| loadProjects(), getDashboardPreferences() | getProjects() and getDashboardPreferences() called with no org. | Calendar |

### src/pages/Finances.jsx

| Location | Issue | Module |
|----------|--------|--------|
| loadData() | getProjects(), getSuppliers() without org; finance_categories query uses `.eq('user_id', userId)`. | Finances |

### src/pages/Orders.jsx

| Location | Issue | Module |
|----------|--------|--------|
| loadData() | getPurchaseOrders(), getProjects(), getSuppliers() with no arguments. | Orders |

### src/pages/Settings.jsx

| Location | Issue | Module |
|----------|--------|--------|
| company_settings, signatures | getCompanySettings(); signatures query uses `.eq('user_id', userId)`. | Settings |

### src/pages/Forwarders.jsx

| Location | Issue | Module |
|----------|--------|--------|
| getWarehouses() | Called with no argument. | Forwarders |

### src/pages/Suppliers.jsx

| Location | Issue | Module |
|----------|--------|--------|
| getSuppliers() | Called with no argument. | Suppliers |

### src/pages/ProjectDetailImpl.jsx

| Location | Issue | Module |
|----------|--------|--------|
| Inline queries | Several supabase.from(...).eq('user_id', userId) for tasks, documents, or related data. | Project detail |

### src/pages/Diagnostics.jsx

| Location | Issue | Module |
|----------|--------|--------|
| getProjects(), getTasks() | Called without org. | Diagnostics |

### src/components/RecurringExpensesSection.jsx

| Location | Issue | Module |
|----------|--------|--------|
| getRecurringExpensesKPIs() | No org parameter; KPI query on expenses has no explicit org_id. | Finances |
| One inline query | `.eq('user_id', userId)` on a table. | Finances |

### src/features/calendar/useProjectCalendarEvents.js

| Location | Issue | Module |
|----------|--------|--------|
| project_events or related | Query uses `.eq('user_id', userId)`. | Calendar |

### src/contexts/WorkspaceContext.jsx

| Location | Issue | Module |
|----------|--------|--------|
| org_memberships | `.eq('user_id', session.user.id)` — **identity resolution**, not tenant data; acceptable. | Auth/workspace |

### Dev/demo only (listed for completeness; lower priority)

- **src/lib/demoSeed.js** — All tenant-table operations use `user_id` for demo data creation/deletion.
- **src/pages/DevSeed.jsx** — Same; dev-only seed/delete flows.

---

## Modules affected

| Module | Canonical | RLS-only | Legacy | Risk |
|--------|-----------|----------|--------|------|
| **Projects** | getProjects(org), useProjectsListState, some inline | — | getProjects(null), generateProjectCode, inline user_id in Projects.jsx | HIGH (mixed) |
| **Suppliers** | — | — | getSuppliers, getSuppliersByType, CRUD all user_id | HIGH |
| **Purchase orders** | getPosNotReady(org), create/upsert resolve org | getPurchaseOrder(id), getShipmentsInTransit | getPurchaseOrders, getStaleTracking, getCalendarEvents (PO), getPoForQuote, getQuoteForPo | HIGH |
| **Logistics / shipments** | getPosNotReady(org), upsertPoShipment (org from PO) | getPoShipment, getShipmentsInTransit, getAlerts | getStaleTracking (user_id on PO) | MEDIUM |
| **Inventory** | getReorderCandidates, getStockoutAlerts, detectStockoutRisk | — | Inventory.jsx (inventory, movements, getProjects no org) | HIGH |
| **Decisions** | Full decision engine + inbox + dashboard | trackDecisionViewed | decision_log (getDecisionLog, create, update) | MEDIUM (decision_log legacy) |
| **Financial** | getCashflowForecast(org), getRecurringExpenses(org) | getRecurringExpensesKPIs | getCompanySettings, getDashboardPreferences, RecurringExpensesSection KPIs, Finances.jsx categories | HIGH |
| **Settings** | Some Settings.jsx org-based | — | getCompanySettings, updateCompanySettings, getDashboardPreferences, updateDashboardPreferences, signatures | HIGH |
| **Tasks** | getOpenTasks(org), createTask (resolves org) | getTasks (no org in filters) | getTasks (callers don’t pass org), updateTask, deleteTask, getCalendarEvents (tasks via getTasks) | MEDIUM |
| **Calendar** | — | getCalendarEvents (po_shipments leg) | getCalendarEvents (purchase_orders, supplier_quotes, getProjects, getDashboardPreferences all user/no org) | HIGH |
| **Dashboard** | getDashboardStats(org), getPosNotReady(org), etc. | getAlerts, getRecurringExpensesKPIs | getDashboardPreferences, getPurchaseOrders(), inline PO user_id | HIGH |
| **Warehouses** | getWarehouses(org) | — | getWarehouses(null), create/update/delete by user_id, Forwarders getWarehouses() | MEDIUM |
| **Supplier quotes / decision log** | — | — | getSupplierQuotes, getSupplierQuote, CRUD, getDecisionLog, getPoForQuote, getQuoteForPo, supplierMemory | HIGH |
| **Profitability** | Profit lib (getWorkspaceProfit, etc.) | — | getProjectProfitability, upsertProjectProfitability (user_id) | MEDIUM |

---

## Risk level

- **HIGH — Query mixes user_id and org_id logic or entire module is user-scoped**  
  **supabase.js** (getSuppliers, getPurchaseOrders, getCompanySettings, getDashboardPreferences, getStaleTracking, getResearchNoDecision, getCalendarEvents internals, getSupplierQuotes, getDecisionLog, getProjectProfitability, getWarehouses fallback, tasks update/delete, and all CRUD that use only user_id). **Inventory.jsx** (inventory + movements + getProjects without org). **Orders.jsx**, **Finances.jsx**, **Calendar.jsx**, **CalendarPage.jsx**, **Dashboard.jsx** (widgets calling getPurchaseOrders/getDashboardPreferences without org). **Suppliers.jsx**, **Settings.jsx**, **RecurringExpensesSection** (getRecurringExpensesKPIs), **supplierMemory.js**, **queryHelpers.getBaseQuery**.

- **MEDIUM — Query relies only on RLS or has optional org**  
  **getTasks** (no org in filters from most callers), **getOpenTasks** (when caller doesn’t pass org), **getShipmentsInTransit**, **getAlerts**, **getRecurringExpensesKPIs**, **getWarehouses(null)**, **decision_log** (legacy table), **getProjectProfitability** / **upsertProjectProfitability**.

- **LOW — Query already canonical**  
  Decisions engine, automation module, profit/cashflow libs, useProjectsListState, getProjects(activeOrgId), getDashboardStats(activeOrgId), billing/workspace usage.

**Highest-risk module:** **supabase.js** — central API used by almost every page; many functions have no `activeOrgId` parameter and use `user_id` for tenant data, so callers that do not pass org get user-scoped results and switching workspace does not change those results.

---

## Recommended normalization plan

(Identification only; no refactor in this phase.)

1. **supabase.js**
   - Add an optional `activeOrgId` (or `orgId`) parameter to every tenant-data function that currently uses only `user_id` (e.g. getSuppliers, getPurchaseOrders, getCompanySettings, getDashboardPreferences, getStaleTracking, getResearchNoDecision, getWarehouses fallback, getCalendarEvents, getSupplierQuotes, getDecisionLog, getProjectProfitability, getTasks, updateTask, deleteTask, getPoForQuote, getQuoteForPo, and all supplier/supplier-quote CRUD). When `activeOrgId` is provided, use `.eq('org_id', activeOrgId)` (and stop using `user_id` for that call).
   - Normalize company_settings and dashboard_preferences to be org-scoped (table and API) and have callers pass `activeOrgId`.

2. **Call sites (pages/hooks)**
   - Pass `activeOrgId` from `useWorkspace()` or `useApp()` into every call to getProjects, getSuppliers, getPurchaseOrders, getWarehouses, getCompanySettings, getDashboardPreferences, getTasks, getCalendarEvents, getSupplierQuotes, getDecisionLog, getRecurringExpenses, getRecurringExpensesKPIs, and into any inline supabase.from(...) that targets tenant tables (Inventory, Orders, Finances, Calendar, CalendarPage, Dashboard, Settings, RecurringExpensesSection, ProjectDetailImpl, Analytics, Projects where still using user_id).

3. **queryHelpers.js**
   - Extend getBaseQuery (or replace with org-scoped helper) to accept `orgId` and use `.eq('org_id', orgId)` for tenant tables instead of `user_id`.

4. **supplierMemory.js**
   - Have getSupplierMetrics accept `orgId` and use `.eq('org_id', orgId)` for supplier_quotes, purchase_orders, and decision_log (or equivalent org-scoped APIs).

5. **decision_log**
   - If decision_log is to remain a tenant table, add org_id to the API and queries; otherwise document it as user-scoped by design.

6. **Demo/dev**
   - demoSeed.js and DevSeed.js can remain user_id-based for dev/demo only; document as non-production tenant model.

This plan only states **where** normalization is needed; implementation details and order of work are left for a later phase.

---

## S2.4 Central Read Normalization

**Implemented (S2.4):** The following central tenant **READ** functions in `src/lib/supabase.js` now accept an optional `orgId` (or `orgId` as last parameter). When `orgId` is provided, the query uses `.eq('org_id', orgId)`; when not provided, the legacy `user_id` path is used for backward compatibility.

### Functions normalized

| Function | New signature | Legacy fallback |
|----------|----------------|-----------------|
| `getSuppliers` | `getSuppliers(orgId = null)` | `user_id` when `orgId` null |
| `getSuppliersByType` | `getSuppliersByType(type, orgId = null)` | `user_id` when `orgId` null |
| `getPurchaseOrders` | `getPurchaseOrders(projectId = null, orgId = null)` | `user_id` when `orgId` null |
| `getCompanySettings` | `getCompanySettings(orgId = null)` | `user_id` when `orgId` null (used by updateCompanySettings with no arg) |
| `getDashboardPreferences` | `getDashboardPreferences(orgId = null)` | `user_id` when `orgId` null |
| `getResearchNoDecision` | `getResearchNoDecision(limit = 10, orgId = null)` | `user_id` when `orgId` null |
| `getStaleTracking` | `getStaleTracking(limit = 10, staleDays = 7, orgId = null)` | `user_id` when `orgId` null |
| `getCalendarEvents` | `getCalendarEvents(filters = {}, orgId = null)` | Internal queries use `user_id` when `orgId` null (tasks via getTasks with filters.org_id, PO/quotes/shipments with user_id) |
| `getSupplierQuotes` | `getSupplierQuotes(projectId, orgId = null)` | `user_id` when `orgId` null |
| `getSupplierQuote` | `getSupplierQuote(quoteId, orgId = null)` | `user_id` when `orgId` null |
| `getDecisionLog` | `getDecisionLog(entityType, entityId, orgId = null)` | `user_id` when `orgId` null |
| `getProjectProfitability` | `getProjectProfitability(projectId, orgId = null)` | `user_id` when `orgId` null |

`getWarehouses(activeOrgId)` was already canonical (uses `.eq('org_id', activeOrgId)` when provided); no change.

### Callers updated

- **Orders.jsx** — `loadData`: passes `activeOrgId` to `getPurchaseOrders(null, activeOrgId)`, `getProjects(false, activeOrgId)`, `getSuppliers(activeOrgId)`.
- **Dashboard.jsx** — `loadOrdersInProgress`: passes `activeOrgId` to `getPurchaseOrders(null, activeOrgId)`; `loadDashboardPreferences`: passes `activeOrgId` to `getDashboardPreferences(activeOrgId)`.
- **Finances.jsx** — passes `activeOrgId` to `getProjects(false, activeOrgId)` and `getSuppliers(activeOrgId)`.
- **Suppliers.jsx** — `loadData`: passes `activeOrgId` to `getSuppliers(activeOrgId)`.
- **Calendar.jsx** — `loadProjects`, `loadFilters`, `loadEvents`: pass `activeOrgId` to `getProjects(false, activeOrgId)`, `getDashboardPreferences(activeOrgId)`, `getCalendarEvents(filters, activeOrgId)`.

### Legacy read paths still remaining

- All other callers that do not pass `orgId` (e.g. Inventory.jsx, CalendarPage.jsx, Diagnostics.jsx, Settings.jsx, RecurringExpensesSection, ProjectDetailImpl, NewPOModal, etc.) continue to use the legacy `user_id` path when they call these functions without the new parameter.
- Write flows were **not** changed: `createSupplier`, `updateSupplier`, `deleteSupplier`, `updateTask`, `deleteTask`, `createDecisionLog`, `updateDecisionLog`, quote creation, PO creation, etc., are unchanged.
- Other READ functions in `supabase.js` that were not in scope for S2.4 (e.g. `getPosWaitingManufacturer`, `getGenerateProjectCode`, `getTasks` without `filters.org_id`, `getAlerts`, various single-row get-by-id helpers) remain as before.

### Intentionally deferred

- **Writes:** create/update/delete for suppliers, tasks, decision_log, quotes, POs, company_settings, dashboard_preferences — deferred to a later normalization phase.
- **Repo-wide caller pass:** Only high-impact callers that already had `activeOrgId` in scope were updated; no full sweep of every component.
- **Schema:** No migration; if a table (e.g. `decision_log`, `dashboard_preferences`, `project_profitability_basic`) does not yet have `org_id`, callers that pass `orgId` may require a future schema change for the org path to work.

---

## S2.5 Secondary Read Normalization

**Implemented (S2.5):** Remaining **secondary** READ call sites and one helper were normalized so that when `activeOrgId` is available they pass it into the existing org-capable APIs. No new APIs were added except `getSuppliersByType(type, orgId)` in supabase.js.

### Pages normalized

| Page | Change |
|------|--------|
| **Inventory.jsx** | `useApp()` → `activeOrgId`; `getProjects(true, activeOrgId ?? undefined)` in loadData. |
| **CalendarPage.jsx** | `useApp()` → `activeOrgId`; `getProjects(false, activeOrgId ?? undefined)` in projects load. |
| **Settings.jsx** | `useApp()` → `activeOrgId`; `getCompanySettings(activeOrgId ?? undefined)` in language init and company/signatures load. |
| **Orders.jsx** | `getSuppliers(activeOrgId ?? undefined)` and `getCompanySettings(activeOrgId ?? undefined)` in export-PDF handler and `handleDownloadPdf`. |
| **Calendar.jsx** | `getDashboardPreferences(activeOrgId ?? undefined)` in loadFilters. |
| **Briefing.jsx** | `useApp()` → `activeOrgId`; `getCompanySettings(activeOrgId ?? undefined)` in loadData. |
| **Forwarders.jsx** | `useApp()` → `activeOrgId`; `getSuppliersByType('freight', activeOrgId ?? undefined)` and `getWarehouses(activeOrgId ?? undefined)` in loadData. |
| **Diagnostics.jsx** | `useApp()` → `activeOrgId`; `getProjects(false, activeOrgId ?? undefined)`, `getTasks({ org_id: activeOrgId })` (and variants), `getCalendarEvents(..., activeOrgId ?? undefined)` in diagnostic checks. |

### Components normalized

| Component | Change |
|-----------|--------|
| **RecurringExpensesSection.jsx** | Already had `activeOrgId` prop; now passes it to `getProjects(false, activeOrgId ?? undefined)` and `getSuppliers(activeOrgId ?? undefined)` in loadData. |
| **NewPOModal.jsx** | `useApp()` → `activeOrgId`; `getWarehouses(activeOrgId ?? undefined)` and `getCompanySettings(activeOrgId ?? undefined)` in load. |
| **QuotesSection.jsx** | `useApp()` → `activeOrgId`; `getSupplierQuotes(projectId, activeOrgId ?? undefined)`, `getSuppliers(activeOrgId ?? undefined)`, `getProjectProfitability(projectId, activeOrgId ?? undefined)` in loadData; added `activeOrgId` to useCallback deps. |
| **DecisionLog.jsx** | `useApp()` → `activeOrgId`; `getDecisionLog(entityType, entityId, activeOrgId ?? undefined)` in loadDecision; added `activeOrgId` to useCallback deps. |
| **DailyOpsWidgets.jsx** | **ResearchNoDecisionWidget:** `useApp()` → `activeOrgId`; `getResearchNoDecision(limit, activeOrgId ?? undefined)`. **StaleTrackingWidget:** `useApp()` → `activeOrgId`; `getStaleTracking(limit, staleDays, activeOrgId ?? undefined)`; added `activeOrgId` to useEffect deps. |
| **LogisticsTrackingWidget.jsx** | `useApp()` → `activeOrgId`; `getProjects(false, activeOrgId ?? undefined)` and `getPurchaseOrders(null, activeOrgId ?? undefined)` in loadData; useEffect deps include `activeOrgId`. |
| **CustomizeDashboardModal.jsx** | `useApp()` → `activeOrgId`; `getDashboardPreferences(activeOrgId ?? undefined)` in loadPreferences. |
| **AlertsBadge.jsx** | `useApp()` → `activeOrgId`; `getDashboardPreferences(activeOrgId ?? undefined)` in loadAlerts; useCallback deps include `activeOrgId`. |
| **ManufacturerPackModal.jsx** | `useApp()` → `activeOrgId`; `getCompanySettings(activeOrgId ?? undefined)` in loadCompanySettings. |
| **AmazonReadinessBadge.jsx** | `useApp()` → `activeOrgId`; `getPurchaseOrders(projectId, activeOrgId ?? undefined)` in loadReadiness. |
| **TasksSection.jsx** | `useApp()` → `activeOrgId`; `getTasks({ entityType, entityId, status: 'open', ...(activeOrgId ? { org_id: activeOrgId } : {}) })` in loadTasks; useEffect deps include `activeOrgId`. |

### Helper READ function normalized

| Function | File | Change |
|----------|------|--------|
| **getSuppliersByType** | src/lib/supabase.js | Added optional `orgId = null`; when provided uses `.eq('org_id', orgId)`; otherwise legacy `.eq('user_id', userId)`. |

### Context normalized

| Location | Change |
|----------|--------|
| **AppContext.jsx** | `getCompanySettings(activeOrgId ?? undefined)` in autoSeedDemoData; `getCompanySettings(orgId ?? undefined)` in loadInitialData. |

### Legacy read paths intentionally deferred

- **phaseGates.js** — Calls `getProjectProfitability(projectId, supabaseClient)`, `getSupplierQuotes(projectId, supabaseClient)`, `getTasks({ ... }, supabaseClient)`, `getPurchaseOrders(projectId, supabaseClient)` with a client as second argument; API signatures in supabase.js expect `orgId` as second param for these. Normalizing would require passing `orgId` from the caller (e.g. ProjectDetailImpl) and possibly changing phaseGates function signatures; deferred to avoid scope creep.
- **ResearchNoDecisionWidget** — No `useEffect` that calls `loadData`; data loading may not run. Left as-is (behavioral fix would be a separate change).
- **Inline inventory / inventory_movements** in Inventory.jsx — Still use `.eq('user_id', userId)`; table/API normalization deferred.
- **getAlerts(thresholds)** — No `orgId` parameter; used by AlertsBadge (which now passes org only to getDashboardPreferences for thresholds). Alerts aggregation by org deferred.
- **demoModeFilter.js** — `getCompanySettings()` without org; dev/demo only, deferred.
- **Internal supabase.js** — All `getCompanySettings()` / `getDashboardPreferences()` / `getDecisionLog()` used inside write flows (e.g. createPurchaseOrder, updateCompanySettings, createDecisionLog) were **not** changed; they remain no-arg for backward compatibility with existing row resolution.

### Remaining read-only legacy hotspots

- **ProjectDetailImpl.jsx** — Inline queries for tasks, documents, etc. may still use `user_id`; not in S2.5 scope.
- **supplierMemory.js** — getSupplierMetrics and related; user_id–based; deferred.
- **queryHelpers.getBaseQuery** — user_id–based; deferred.
- **getPosWaitingManufacturer(limit)** — No orgId parameter; deferred.
- **getShipmentsInTransit(limit)** — No org filter; deferred.
- **getRecurringExpensesKPIs()** — No orgId parameter; deferred.
