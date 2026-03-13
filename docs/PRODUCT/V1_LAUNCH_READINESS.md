# FREEDOLIAPP — V1 Launch Readiness

## Status
Draft

## Goal
Define whether the current product is ready to onboard first paying customers.

## Scope
This checklist only covers what is required to launch V1.  
It does not include post-V1 improvements or future roadmap ideas.

---

## 1. Product Surface

Main user-facing product areas present in the current repository:

| Area                    | Route(s) / Location                | Status      | Notes |
|-------------------------|------------------------------------|------------|-------|
| Landing                 | `/` (`src/pages/Landing.jsx`)     | Implemented | Hero, value prop and CTAs wired to `/trial` and `/login`. |
| Trial                   | `/trial` (`src/pages/Trial.jsx`)  | Implemented | Captures lead via `trial_registrations` helper + magic link. |
| Login                   | `/login` (`src/pages/Login.jsx`)  | Implemented | Email/password, magic link, Google OAuth, Apple OAuth. |
| Activation              | `/activation` (`ActivationWizard`) | Implemented | Routed via `OnboardingGate` and protected by auth. |
| Home / Dashboard        | `/app` index (`Dashboard.jsx`)    | Implemented | Executive-style overview, KPIs, alerts and widgets. |
| Projects                | `/app/projects`                   | Implemented | Full list with filters, cards, empty state and New Project modal. |
| Project Detail          | `/app/projects/:id`               | Implemented | Detail route and briefing route exist. |
| Suppliers               | `/app/suppliers`                  | Implemented | List, filters, stats, CRUD, empty state with CTA. |
| Orders (POs)            | `/app/orders`                     | Implemented | PO list, filters, stats, detail modal, empty state with CTA. |
| Inventory               | `/app/inventory`                  | Implemented | Inventory page exists and is routed; detailed behavior is org-scoped. |
| Finances                | `/app/finances`                   | Implemented | Finances and exports pages exist. |
| Profit                  | `/app/profit`                     | Implemented | Profit dashboard present and wired. |
| Cashflow                | `/app/cash`                       | Implemented | Cashflow dashboard present and wired. |
| Decisions               | `/app/decisions`                  | Implemented | Decision dashboard and feed exist. |
| Automations             | `/app/automations/*`              | Implemented | Operator UI, activity and analytics present (D57–D59). |
| Help                    | `/app/help`                       | Implemented | In-app help and documentation pointers. |
| Billing                 | `/app/billing*`                   | Implemented | Billing pages and lock/over-seat handling present. |
| Settings                | `/app/settings`                   | Implemented | Workspace/account-level settings view present. |

From a surface perspective, the core V1 areas (Landing, Trial, Login, Activation, Home, Projects, Suppliers, Orders, Finances) are **implemented** and wired into the main router.

---

## 2. Entry Funnel

Entry funnel aspects, based on current implementation:

| Item                                   | Status  | Evidence / Notes |
|----------------------------------------|---------|------------------|
| Landing CTA consistency                | Ready   | Primary CTA “Start free trial” calls `navigate('/trial')`; secondary CTA “Sign in” calls `navigate('/login')`. |
| Trial route                            | Ready   | `/trial` route defined in `App.jsx` and renders `Trial.jsx`. |
| Trial lead capture                     | Ready   | `Trial.jsx` uses `registerTrialLead` + Supabase `signInWithOtp` (magic link). |
| Login (email/password)                 | Ready   | `Login.jsx` implements `signInWithPassword`. |
| Login (magic link)                     | Ready   | `Login.jsx` supports magic link mode with proper state and audit logging. |
| Login (OAuth Google/Apple)            | Ready   | Google + Apple OAuth buttons wired to `supabase.auth.signInWithOAuth`. |
| Activation route                       | Ready   | `/activation` route present, protected by `ProtectedRoute` and orchestrated by `OnboardingGate`. |
| Activation gating                      | Ready   | `OnboardingGate` redirects to `/activation` when onboarding required. |
| First value experience on `/app`       | Ready   | `Dashboard.jsx` shows a first-time banner: “Welcome to Freedoliapp. Start by creating your first product.” with CTA to `/app/projects`. Banner is persisted via `localStorage`. |
| Projects empty state                   | Ready   | `Projects.jsx` displays `projects.empty.*` copy and a “create project” CTA when there are no projects. |
| Suppliers empty state                  | Ready   | `Suppliers.jsx` shows “No hi ha proveïdors. Crea el primer!” with “Afegir Proveïdor” button. |
| Orders empty state                     | Ready   | `Orders.jsx` shows “No hi ha comandes. Crea la primera!” with “Nova Comanda” button when no orders and no filters. |

Entry funnel is **coherent and complete** for a first cohort: a user can discover the product, start a trial, authenticate, go through activation and reach the dashboard with a clear next step.

---

## 3. Workspace / SaaS Readiness

Workspace and SaaS multi-tenant aspects:

| Item                                 | Status  | Evidence / Notes |
|--------------------------------------|---------|------------------|
| Workspace name dynamic in UI         | Ready   | `TopNavbar.jsx` uses `useWorkspace()` memberships and `orgs(name)` to display current workspace name. No hardcoded “Freedolia” label remains. |
| Workspace selector presence          | Ready   | When user has multiple memberships, a dropdown in `TopNavbar` lists all workspaces with names and roles. |
| Workspace switching                  | Ready   | Selector calls `setActiveOrgId(orgId)` from `WorkspaceContext`, which updates context, localStorage and navigates to `/app` with `replace: true`. |
| Active org persistence               | Ready   | `WorkspaceContext` persists `activeOrgId` in localStorage under `freedoli_active_org_id` and restores it on boot if still valid for the user. |
| Single-workspace behavior            | Ready   | When only one workspace is available, a static label “Workspace: {name}” is shown with no dropdown. |
| Billing lock / over-seat handling    | Ready   | `AppContent` computes `billingState` and routes to `/app/billing/locked` or `/app/billing/over-seat` when gating is required. |
| Org-scoped behavior                  | Ready   | Core queries use `activeOrgId` or `org_id` filters (e.g., projects, analytics, automation). RLS is assumed from schema design; UI clearly assumes org-scoped data. |

From a SaaS perspective, the app behaves as a multi-tenant product with dynamic workspace selection and billing-aware gating.

---

## 4. Launch Blocking Risks

Only real blockers for onboarding the **first paying customers** are listed here.

Current assessment based on repository state:

- **Entry funnel integrity**  
  - The funnel `/ → /trial → /login (magic link/OAuth) → /activation → /app` is present and wired.  
  - No obvious dead links or missing routes in this chain.

- **Workspace selector stability**  
  - Selector is driven by `WorkspaceContext` and uses existing `setActiveOrgId` behavior.  
  - Dropdown is hardened (outside click, Escape, no redundant switching).  
  - Risk: if a user has zero org memberships, workspace behavior falls back to “no org” states (already handled in some views), but this is more of an onboarding/configuration issue than a code bug.

- **Billing gating**  
  - Billing routes and gating logic exist and are implemented client-side.  
  - Real risk depends on **Stripe / Supabase configuration**, which cannot be fully validated from code alone. Code-wise, the gating behavior is present.

- **Legal content**  
  - Legal pages and routes (`/privacy`, `/terms`, `/cookies`, `/dpa`, `/legal`) are wired and render markdown from `docs/LEGAL/*`.  
  - The documents are stubs and still need final legal review, but the technical surface is present.

At this point, there are **no clear hard blockers in the codebase** that would prevent onboarding an initial small cohort of paying customers, assuming:

- Stripe and environment configuration are correctly set up.
- Legal content is reviewed and approved outside the codebase.

---

## 5. Go / No-Go

### Conclusion

**GO (with controlled risk).**

Based on the current repository state, Freedoliapp can onboard its **first paying customers** with acceptable risk, provided that:

- Stripe / billing configuration is correctly set up in the environment.
- Legal documents are reviewed and accepted.

The core SaaS surfaces (multi-tenant workspaces, billing gating, entry funnel, dashboard, projects, suppliers, orders, finances) are present and wired end-to-end.

### Must be fixed / verified before launch

- **Billing configuration**: Verify Stripe keys, webhook endpoints, and test a full subscription/trial → paid flow in the target environment.
- **Legal review**: Replace legal stubs in `docs/LEGAL/*` with finalized, lawyer-reviewed content.

### Can wait until after launch

- Additional UX polish on secondary dashboards and analytics.
- Expanded empty states and helper copy in non-core modules.
- Post-V1 backlog items listed in `POST_V1_BACKLOG.md` (PPC Intelligence, Communication Hub, etc.).

