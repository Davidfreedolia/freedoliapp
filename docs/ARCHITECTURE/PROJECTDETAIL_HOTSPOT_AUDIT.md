# Project Detail Hotspot Audit

**Phase:** S2.6 — ProjectDetail Hotspot Audit  
**Scope:** Data access paths used by the Project Detail page (ProjectDetailImpl and related imports).  
**Rules:** Audit only; no code changes, no migrations, no refactors.

---

## Overview

Project Detail is the main drill-down page for a single project. It loads project and documents via shared services (`getProject`, `getDocuments`) and performs **multiple inline Supabase queries** for business snapshot, stock signal, marketplace tags, finance categories, and phase-gate validation. Several of these inline paths use **legacy `user_id`** filtering instead of `org_id`, and the shared services used for initial load (`getProject`, `getDocuments`) are themselves **legacy** (getProject) or **RLS-only** (getDocuments). Child components and hooks add further read paths: some are canonical (e.g. next decision, notes with org), others RLS-only (events, lifecycle events, project state).

This document maps every identified data access path, classifies it (A: canonical, B: RLS-only, C: legacy), and notes inline vs shared, duplicates, and lifecycle concerns.

---

## Data access paths

| Location | Query / API | Query type | Classification |
|----------|-------------|------------|----------------|
| **ProjectDetailImpl.jsx** | `loadProject()` → `getProject(id)` (from supabase.js) | Shared service | **C** — getProject in supabase.js uses `.eq('user_id', userId)` |
| **ProjectDetailImpl.jsx** | `loadProject()` → `getDocuments(id)` (from supabase.js) | Shared service | **B** — getDocuments filters only by `project_id`; RLS enforces tenant |
| **ProjectDetailImpl.jsx** | `useEffect` business snapshot → `supabase.from('purchase_orders').select(...).eq('project_id', id).eq('user_id', userId)` | Inline | **C** |
| **ProjectDetailImpl.jsx** | Same effect → `supabase.from('expenses').select(...).eq('project_id', id)` | Inline | **B** — no org/user filter; RLS only |
| **ProjectDetailImpl.jsx** | Same effect → `supabase.from('incomes').select(...).eq('project_id', id)` | Inline | **B** — no org/user filter; RLS only |
| **ProjectDetailImpl.jsx** | `useEffect` stock signal → `supabase.from('inventory').select(...).eq('user_id', userId).eq('project_id', id)` | Inline | **C** |
| **ProjectDetailImpl.jsx** | Same effect → `supabase.from('sales').select(...).eq('org_id', orgId).eq('project_id', id)` | Inline | **A** — uses project.org_id |
| **ProjectDetailImpl.jsx** | Same effect → `supabase.from('purchase_orders').select(...).eq('user_id', userId).eq('project_id', id)` | Inline | **C** |
| **ProjectDetailImpl.jsx** | `loadMarketplaceTags()` → `supabase.from('v_project_marketplace_tags').select(...).eq('project_id', id)` | Inline | **B** — view by project_id; RLS only |
| **ProjectDetailImpl.jsx** | `loadCategories()` → `supabase.from('finance_categories').select('*').order('name')` | Inline | **B** — no tenant filter; global/RLS |
| **ProjectDetailImpl.jsx** | `handlePhaseChange` gate check → `supabase.from('v_project_phase_gate').select(...).eq('project_id', id).eq('phase', ...)` | Inline | **B** — by project_id; RLS only |
| **ProjectDetailImpl.jsx** | `handleUploadComplete` → `getDocuments(id)` (reload after create) | Shared service | **B** — same as above |
| **ProjectDetailImpl.jsx** | `handlePhaseChange` → `supabase.from('project_events').insert({...})` | Inline write | N/A (write; includes org_id) |
| **ProjectDetailImpl.jsx** | `handleCreateSave` (expense) → `supabase.from('expenses').insert([{...user_id}])` | Inline write | N/A (write; user_id) |
| **ProjectDetailImpl.jsx** | `updateProject`, `refreshProjects` (from AppContext) | Shared / context | **A** — refreshProjects is org-aware; updateProject is write |
| **ProjectDetailHeader.jsx** | `useEffect` → `getProjectNextDecision({ orgId: project?.org_id, projectId })` | Shared (lib/decisions) | **A** |
| **ProjectDetailLifecycleEventsBlock.jsx** | `getRecentLifecycleEvents(projectId, { limit: 5 })` | Shared (lib/lifecycleEvents) | **B** — by project_id; RLS on lifecycle_events |
| **ProjectEventsTimeline.jsx** | `loadEvents()` → `supabase.from('project_events').select(...).eq('project_id', projectId)` | Inline | **B** — RLS only |
| **useProjectState.js** | `supabase.from('v_project_state_integrity').select('*').eq('project_id', projectId)` | Inline in hook | **B** — RLS only |
| **useNotes.js** | `getStickyNotes(activeOrgId ? { status: 'open', org_id: activeOrgId } : { status: 'open' })` | Shared (supabase) | **A** when activeOrgId present |
| **phaseGates.js** (via validatePhaseTransition) | `getProjectProfitability(projectId, supabaseClient)`, `getSupplierQuotes(projectId, supabaseClient)`, `getTasks(..., supabaseClient)`, `getPurchaseOrders(projectId, supabaseClient)` | Shared but wrong signature | **C** — second argument is client, not orgId; APIs expect orgId (S2.4) |

**Lazy-loaded components** (IdentifiersSection, ProfitabilityCalculator, QuotesSection, SamplesSection, DecisionLog, AmazonReadinessBadge, CompetitiveAsinSection, ViabilityCalculator) perform their own reads via shared services (e.g. getProjectProfitability, getSupplierQuotes, getDecisionLog, getPurchaseOrders). Those services accept `orgId` when called from components that pass it (e.g. QuotesSection, DecisionLog, AmazonReadinessBadge after S2.5). The **page** does not pass orgId into these children; the children obtain `activeOrgId` via `useApp()`. So from the page’s perspective the data access is in the child; from a “ProjectDetail hotspot” view the remaining risk is **phaseGates** (called from ProjectDetailImpl with supabaseClient, not orgId).

---

## Inline queries

| File | Function / effect | Table / view | Suggested centralization |
|------|-------------------|--------------|---------------------------|
| ProjectDetailImpl.jsx | Business snapshot effect | purchase_orders, expenses, incomes | Consider `getProjectBusinessSnapshot(projectId, orgId)` in supabase.js or a small lib that uses existing get* where possible |
| ProjectDetailImpl.jsx | Stock signal effect | inventory, sales, purchase_orders | Consider `getProjectStockSignal(projectId, orgId)` reusing org-scoped PO/inventory reads; inventory currently user_id |
| ProjectDetailImpl.jsx | loadMarketplaceTags | v_project_marketplace_tags | Optional: `getProjectMarketplaceTags(projectId)` in supabase.js (RLS-only is acceptable) |
| ProjectDetailImpl.jsx | loadCategories | finance_categories | Optional: `getFinanceCategories()` or reuse if exists; global/RLS |
| ProjectDetailImpl.jsx | handlePhaseChange gate | v_project_phase_gate | Optional: `getProjectPhaseGate(projectId, phase)` in supabase.js |
| ProjectEventsTimeline.jsx | loadEvents | project_events | Optional: `getProjectEvents(projectId)` in supabase.js (RLS-only) |
| useProjectState.js | fetchState | v_project_state_integrity | Already a dedicated hook; could move query to supabase.js as `getProjectState(projectId)` |

None of these are required for correctness; they would improve consistency and testability.

---

## Duplicate data loaders

- **getDocuments(projectId)** — Used in ProjectDetailImpl in `loadProject()` and again in `handleUploadComplete()` to reload after upload. Same API, no duplicate logic; appropriate.
- **Purchase orders by project** — Fetched in business snapshot (inline `.eq('user_id', userId).eq('project_id', id)`), again in stock signal (same inline), and available via `getPurchaseOrders(projectId, orgId)` in supabase.js. The inline PO queries **duplicate** the capability of `getPurchaseOrders(projectId, orgId)` but use legacy `user_id` instead of org.
- **Project** — Loaded once via `getProject(id)`; no duplicate. Child components that need project receive it as props or get project-scoped data by projectId.

---

## Workspace compliance status

| Area | Status | Notes |
|------|--------|--------|
| Initial load (project + documents) | **Partial** | getProject is user-scoped (C); getDocuments is RLS-only (B). No org_id passed from page. |
| Business snapshot (PO, expenses, incomes) | **Legacy** | purchase_orders uses user_id; expenses/incomes RLS-only. |
| Stock signal (inventory, sales, POs) | **Mixed** | sales uses org_id (A); inventory and POs use user_id (C). |
| Marketplace tags / phase gate / categories | **RLS-only** | No explicit org; rely on RLS. |
| Phase change (gate + project_events insert) | **Mixed** | Gate view by project_id (B); insert sets org_id. |
| Create modals (expense insert) | **Legacy** | expense insert uses user_id. |
| Header next action | **Canonical** | getProjectNextDecision(orgId, projectId). |
| Lifecycle events block | **RLS-only** | getRecentLifecycleEvents(projectId). |
| Events timeline | **RLS-only** | project_events by project_id. |
| useProjectState | **RLS-only** | v_project_state_integrity by project_id. |
| useNotes | **Canonical** | getStickyNotes with org_id when activeOrgId set. |
| phaseGates (validatePhaseTransition) | **Legacy** | Calls central READ APIs with supabaseClient as second argument instead of orgId; breaks org-scoped behavior. |

---

## Risk assessment

- **High**
  - **getProject(id)** used for initial load is **legacy** (user_id). If the project is org-scoped and the user has multiple orgs, the wrong project could be loaded or access denied when RLS and application logic disagree.
  - **Business snapshot and stock signal** inline queries use **user_id** on purchase_orders and inventory. In a multi-org workspace, data can be wrong or missing when the same user operates in different orgs.
  - **phaseGates.validatePhaseTransition** passes **supabaseClient** as the second argument to getProjectProfitability, getSupplierQuotes, getPurchaseOrders, and getTasks. Those functions were normalized to accept **orgId** (S2.4). Passing a client object as orgId is incorrect and can cause broken behavior or fallback to user_id path.
- **Medium**
  - **getDocuments(projectId)** has no org_id; isolation depends entirely on RLS. If RLS is correct, risk is lower; if not, documents could leak across tenants.
  - **finance_categories** and **v_project_marketplace_tags** / **v_project_phase_gate** have no explicit org filter; same RLS dependency.
- **Low**
  - ProjectDetailHeader, useNotes, and lazy-loaded sections that use `useApp().activeOrgId` and pass it to normalized APIs are aligned with workspace model.
  - project_events and lifecycle_events by project_id are typically safe if RLS restricts by project ownership/org.

---

## Recommended normalization strategy

1. **getProject**  
   Add optional `orgId` to `getProject(id, orgId)` in supabase.js. When `orgId` is provided, filter by `.eq('org_id', orgId)` (and keep `.eq('id', id)`); when not, keep current user_id behavior. ProjectDetailImpl (and any other caller) should pass `activeOrgId` when available.

2. **getDocuments**  
   Add optional `orgId` to `getDocuments(projectId, orgId)` and use it if the table has org_id or if documents are isolated via project → org. Callers pass activeOrgId where available.

3. **Business snapshot**  
   Replace inline PO/expenses/incomes queries with either:
   - A small helper that calls `getPurchaseOrders(projectId, orgId)` plus org-scoped or RLS-only reads for expenses/incomes, or
   - A dedicated `getProjectBusinessSnapshot(projectId, orgId)` that uses org_id for PO and any org-capable expense/income APIs.

4. **Stock signal**  
   Replace inline inventory and PO queries with org-scoped APIs: e.g. use `getPurchaseOrders(projectId, orgId)` and, when inventory has org_id, an org-scoped inventory read (or a shared helper). Keep sales as org-scoped (already correct).

5. **phaseGates**  
   Change `validatePhaseTransition` (and its callers) to accept `orgId` and pass it to getProjectProfitability, getSupplierQuotes, getTasks, getPurchaseOrders instead of supabaseClient. ProjectDetailImpl should pass `project?.org_id` (or activeOrgId) into validatePhaseTransition.

6. **Expense insert (handleCreateSave)**  
   When normalizing writes, ensure expense insert uses org_id from context (e.g. project.org_id or activeOrgId) in addition to or instead of user_id where the schema supports it.

7. **Optional centralization**  
   Move inline reads for v_project_marketplace_tags, finance_categories, v_project_phase_gate, and project_events into supabase.js (or existing libs) as small getters to reduce inline surface and simplify testing. Prefer passing orgId where the table is tenant-scoped.

Do **not** propose a full refactor of ProjectDetailImpl in one step; apply the above in small, targeted changes and re-run tests after each.

---

## S2.7 Critical Read Fix

**Implemented (S2.7):** The critical legacy read paths identified in this audit were fixed so that Project Detail uses `orgId` / `activeOrgId` where appropriate. No schema changes, no RLS changes, no write-flow changes.

### What was fixed

| Area | Change |
|------|--------|
| **getProject** | `src/lib/supabase.js`: signature is now `getProject(id, orgId = null)`. When `orgId` is provided, the query uses `.eq('org_id', orgId)` and `.eq('id', id)`. When not provided, legacy `.eq('user_id', userId)` is used. |
| **ProjectDetailImpl — project load** | `loadProject()` now passes `activeOrgId ?? undefined` into `getProject(id, activeOrgId ?? undefined)`. `ProjectDetailInner` destructures `activeOrgId` from `useApp()`. |
| **ProjectDetailImpl — business snapshot** | Inline `purchase_orders` query now uses `org_id` when `project?.org_id ?? activeOrgId` is set; otherwise falls back to `user_id`. Effect deps include `activeOrgId`. |
| **ProjectDetailImpl — stock signal** | Inline `inventory` and `purchase_orders` queries now use `org_id` when `project?.org_id ?? activeOrgId` is set; otherwise fall back to `user_id`. Effect deps include `activeOrgId`. |
| **phaseGates** | `validatePhaseTransition` now accepts an optional `orgId` argument. It passes `orgId` (not `supabaseClient`) to `getProjectProfitability(projectId, orgId)`, `getSupplierQuotes(projectId, orgId)`, `getPurchaseOrders(projectId, orgId)`, and `getTasks({ ...filters, org_id: orgId })` when `orgId` is set. All `getDocuments(projectId, supabaseClient)` and `getProductIdentifiers(projectId, supabaseClient)` calls were changed to single-argument form `getDocuments(projectId)` and `getProductIdentifiers(projectId)`. `getSupplierPriceEstimates(projectId, supabaseClient)` → `getSupplierPriceEstimates(projectId)`. |
| **ProjectDetailImpl — phase change** | When calling `validatePhaseTransition`, the page now passes `orgId: project?.org_id ?? activeOrgId ?? undefined`. |

### What remains deferred

- **getDocuments(projectId)** — Still no `orgId` parameter; RLS-only. Normalization deferred.
- **expenses / incomes** — Business snapshot still uses RLS-only selects (no explicit org filter); not changed in S2.7.
- **v_project_marketplace_tags, finance_categories, v_project_phase_gate** — RLS-only; unchanged.
- **Write flows** — Expense insert, project_events insert, document create, etc. unchanged.
- **Centralization** — Inline PO/inventory/snapshot logic was not moved to shared services; only the filter (org_id vs user_id) was fixed.

### ProjectDetail workspace-scoped reads

- **Initial load:** Project is now loaded with `getProject(id, activeOrgId)` when the user has an active org, so the correct workspace project is returned.
- **Business snapshot & stock signal:** When `activeOrgId` or `project.org_id` is set, purchase_orders and inventory reads use `.eq('org_id', …)` so data is workspace-scoped.
- **Phase gates:** Gate validation uses org-scoped getProjectProfitability, getSupplierQuotes, getPurchaseOrders, and getTasks when `orgId` is passed from the page.

Project Detail is **safe for workspace-scoped reads** for these critical paths when the user has an active org. Legacy fallback (user_id) remains when `orgId` is not available for compatibility.

---

## Summary counts

| Classification | Count | Examples |
|----------------|-------|----------|
| **A — Canonical** | 3 | sales .eq('org_id', orgId); getProjectNextDecision(orgId, projectId); useNotes getStickyNotes(org_id) |
| **B — RLS-only** | 9 | getDocuments; expenses/incomes select; v_project_marketplace_tags; finance_categories; v_project_phase_gate; project_events; getRecentLifecycleEvents; useProjectState |
| **C — Legacy** | 5 | getProject(user_id); purchase_orders (×2) and inventory (×1) .eq('user_id'); phaseGates calling READ APIs with client instead of orgId |

**Most critical legacy query:** **getProject(id)** in `src/lib/supabase.js` used for the initial Project Detail load. It filters by `.eq('user_id', userId)` only. For an org-based workspace, the canonical source of the project should be org_id; using user_id can return the wrong project or fail when the project belongs to another org the user belongs to. The second most critical is **phaseGates** passing **supabaseClient** as the second argument to getProjectProfitability, getSupplierQuotes, getPurchaseOrders, and getTasks — those APIs expect **orgId** after S2.4, so the phase-gate validation may run with wrong or fallback tenant context.
