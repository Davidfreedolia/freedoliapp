# Workspace Context Audit

**Phase:** S2.1 — Workspace Context Audit  
**Scope:** How the application determines which organization (workspace) the user operates in, and what already exists for a frontend workspace context layer.  
**Rules:** Audit only; no code, migrations, or refactors.

---

## Current authentication model

- **Session retrieval:** `supabase.auth.getSession()` is used in `App.jsx`, `AppContext.jsx`, `ProtectedRoute.jsx`, `TopNavbar.jsx`, `WorkspaceContext.jsx`, `Diagnostics.jsx`, and `Login.jsx`. `supabase.auth.getUser()` is used in `supabase.js`, `getPendingAutomationApprovals.js`, `validateApprovalActor.js`, `ReceiptUploader.jsx`, and `ConnectedAccounts.jsx`.
- **User identity:** The authenticated user is taken from `session?.user` or `data?.user`; there is no separate “current user” service. Components and hooks that need the user typically call `getSession()` or `getUser()` or rely on `getCurrentUserId()` from `src/lib/supabase.js` (which uses `getUser()`).
- **User → org resolution:** This happens in **WorkspaceContext** only. On bootstrap, it loads `org_memberships` filtered by `user_id = session.user.id`, then chooses the active org from: (1) stored `freedoli_active_org_id` in localStorage if still in the list, (2) else first org where `role === 'owner'`, (3) else first membership. There is no server-side “current org” token; the frontend is the single place that resolves “which org the user is in.”

---

## Organization data model

- **Tables:** `orgs` and `org_memberships` (with `org_id`, `user_id`, `role`, etc.). `org_memberships` is queried with `.select('org_id, role, created_at, orgs(id, name)').eq('user_id', session.user.id)` in `WorkspaceContext.jsx`; elsewhere, ad-hoc queries fetch a single membership (e.g. `org_id` for the current user) for insert/update helpers in `supabase.js`.
- **Active org concept:** Yes. The frontend maintains an **active org** as:
  - **State:** `activeOrgId` in `WorkspaceContext` (and a mirror in `AppContext` via `setActiveOrgId`).
  - **Persistence:** `localStorage` key `freedoli_active_org_id` (constant `STORAGE_KEY` in `WorkspaceContext.jsx`).
- **Memberships:** The frontend fetches the full list of memberships (with org names) in `WorkspaceContext` and exposes it as `memberships` from `useWorkspace()`. Used by TopNavbar for the workspace switcher and by billing/activation pages.

---

## How the frontend currently resolves tenant context

- **Source of truth for “current org”:** `WorkspaceContext` is the canonical source. It:
  - Fetches `org_memberships` for the current user.
  - Sets `activeOrgId` from storage (if still a member), or owner org, or first org.
  - Persists `activeOrgId` to localStorage and syncs it into `AppContext` via `setAppActiveOrgId(orgId)`.
- **Consumption:** Components use either:
  - `useWorkspace()` → `activeOrgId`, `memberships`, `setActiveOrgId`, `isWorkspaceReady`, `revalidateActiveOrg`, or
  - `useApp()` → `activeOrgId`, `setActiveOrgId` (and other app state).
- **Provider order (App.jsx):** `AppProvider` wraps `WorkspaceProvider`; `WorkspaceProvider` calls `useApp()` to get `setActiveOrgId` and passes it down. So workspace state is set in `WorkspaceContext` and mirrored into `AppContext` for components that only use `useApp()`.
- **Switching workspace:** `setActiveOrgId(orgId)` in `WorkspaceContext` updates state, persists to localStorage, syncs to AppContext, and navigates to `/app` (replace). The URL does not include the workspace id.

---

## Query strategy (RLS vs explicit org filtering)

- **Mixed.** Both RLS and explicit `org_id` filtering are used.
  - **Explicit `org_id`:** Many API functions in `src/lib/supabase.js` accept an `activeOrgId` (or similar) argument and, when present, add `.eq('org_id', activeOrgId)` (e.g. `getProjects`, `getPayments`, `getGtinPool`, `getWarehouses`, `getOpenTasks`, `getRecurringExpenses`, `getPosNotReady`, etc.). Various libs (decisions, automations, lifecycle, profit, billing) also take `orgId` and filter by `org_id`.
  - **RLS-only / legacy path:** When `activeOrgId` is not passed, several functions fall back to **user_id**-based filtering (e.g. `getProjects(includeDiscarded, null)` uses `.eq('user_id', userId)`). So RLS still applies on the server, but the intended tenant scope is “current user’s data” rather than “current org’s data” when the caller omits org.
- **Call sites:** Some callers pass `activeOrgId` (e.g. Dashboard, Analytics, Warehouses, DailyOpsWidgets, Billing, Decisions, Automations, ActivationWizard). Others call without it (e.g. `AppContext.loadInitialData()` and `refreshProjects()` call `getProjects()` with no second argument; CalendarPage, Inventory, Calendar, Diagnostics, Orders, Finances, RecurringExpensesSection, LogisticsTrackingWidget call `getProjects()` or `getWarehouses()` without passing org). So part of the app is explicitly org-scoped and part relies on RLS + legacy user_id path.

---

## UI readiness for workspace context

- **Workspace switcher:** Present. **TopNavbar** shows the current workspace name and, when `memberships.length > 1`, a dropdown that lists all workspaces and calls `setActiveOrgId(w.id)` on selection. i18n keys: `topbar.workspaceLabel`, `topbar.workspaceSwitcherAria`.
- **Layout:** Main app layout is `AppContent` (sidebar + main area + TopNavbar). The sidebar does not show workspace; the TopNavbar does. There is no separate “workspace” route or layout; the UI assumes one active org at a time, chosen via context + switcher.
- **Billing / seats:** Billing and seat limits are tied to `activeOrgId`: `App.jsx` loads `orgs` and `org_memberships` count for `activeOrgId` and gates access (e.g. redirect to `/app/billing/locked` or `over-seat`). BillingBanner, WorkspaceLimitAlert, and related pages use `useWorkspace().activeOrgId` or `useApp().activeOrgId`.

---

## Routing implications

- **Structure:** Routes are **flat** under `/app` (e.g. `/app`, `/app/projects`, `/app/projects/:id`, `/app/orders`, `/app/billing`, etc.). There is **no** segment for workspace in the path (no `/app/:workspaceId/...`).
- **Workspace in URL:** The active workspace is **not** encoded in the URL. It is entirely in React state + localStorage. So bookmarking or sharing a link does not carry workspace context; switching workspace is a client-only state change and navigation to `/app`.
- **Support for global workspace context:** The current setup is already a **global** workspace context (one active org for the whole app session). Routing does not need to change for that. If in the future the product wanted “deep links” to a specific org, routing would need to be extended (e.g. optional `/app/workspace/:orgId/...` or query param).

---

## Risks

1. **Dual source of `activeOrgId`:** Both `useApp().activeOrgId` and `useWorkspace().activeOrgId` exist and are kept in sync by `WorkspaceProvider`. If a consumer read from one context before the other was updated, or if a future change broke the sync, behavior could be inconsistent. Prefer a single canonical source (e.g. only `useWorkspace()`) for org context.
2. **Initial load and org scope:** `AppContext`’s `loadInitialData()` and `refreshProjects()` call `getProjects()` and `getDashboardStats()` **without** passing `activeOrgId`. So the first projects/stats load may use the legacy `user_id` path (or RLS) rather than an explicit org filter. After workspace is ready, subsequent page-level fetches often pass `activeOrgId`; the global “projects” in AppContext may not be strictly org-scoped depending on timing.
3. **Inconsistent use of org in API calls:** Some pages/hooks pass `activeOrgId` into data functions; others do not. That leads to mixed reliance on RLS vs explicit filtering and possible confusion about “which org this data belongs to” in edge cases (e.g. user in multiple orgs).
4. **No workspace in URL:** Sharing or refreshing can lose workspace selection if localStorage is cleared; there is no URL-based recovery of “current org.”

---

## S2.2 Consolidation

**Implemented:** Active workspace data loading is consolidated so that global application data respects `activeOrgId` and reloads when the workspace changes.

- **Workspace as single source of truth:** `activeOrgId` is stored only in **WorkspaceContext**. AppContext no longer holds its own `activeOrgId` state; it reads `activeOrgId`, `isWorkspaceReady`, and `setActiveOrgId` from `useWorkspace()`. Components that use `useApp()` still receive `activeOrgId` and `setActiveOrgId` via the same value, but that value is provided by WorkspaceContext (AppContext re-exposes it).
- **Provider order:** In `App.jsx`, **WorkspaceProvider** now wraps **AppProvider**, so that AppProvider can call `useWorkspace()` and depend on workspace state. WorkspaceContext no longer syncs into AppContext; it is the only owner of `activeOrgId`.
- **Global data loads per org:** `loadInitialData(activeOrgId)` runs only when `isWorkspaceReady` and `activeOrgId` are set. It calls `getProjects(false, activeOrgId)` and `getDashboardStats(activeOrgId)`. When `activeOrgId` is null (e.g. no orgs or demo mode), global projects and stats are cleared. The effect dependency is `[activeOrgId, isWorkspaceReady]`, so switching workspace triggers a refetch automatically.
- **Refresh and API:** `refreshProjects()` uses the current `activeOrgId` from context and calls `getProjects(false, activeOrgId)` and `getDashboardStats(activeOrgId)`. `getDashboardStats(activeOrgId)` in `supabase.js` accepts an optional `activeOrgId`; when provided, projects and payments are filtered by `org_id`; when null, the legacy `user_id` path is used for backward compatibility.
- **Race conditions:** Initial load does not run until `isWorkspaceReady` is true; when there is no `activeOrgId`, the effect clears state and does not call the API.

---

## Recommended architecture for S2

- **Single workspace context:** Treat `WorkspaceContext` as the **only** source of `activeOrgId`, `memberships`, and `setActiveOrgId`. Have `AppContext` (or other consumers) read org from `useWorkspace()` instead of mirroring `activeOrgId` in AppContext, or document clearly that AppContext’s value is a mirror and must not be set elsewhere.
- **Explicit org in all tenant queries:** Ensure every data-loading path that should be org-scoped receives `activeOrgId` (from `useWorkspace()`) and passes it into the supabase/lib layer so that queries use `.eq('org_id', activeOrgId)` instead of falling back to `user_id`. This includes `loadInitialData` / `refreshProjects` when they are used in an org-scoped way (e.g. after workspace is ready, pass activeOrgId into `getProjects` and dashboard stats).
- **Optional URL/workspace param:** If product requirements later include shareable or bookmarkable workspace-specific URLs, introduce an optional route or query param (e.g. `orgId` or `workspace`) and resolve it in WorkspaceContext so that the same context layer continues to drive queries.
- **Billing and limits:** Keep tying billing and seat checks to `activeOrgId` from workspace context; ensure all billing/entitlement calls use the same context source.
