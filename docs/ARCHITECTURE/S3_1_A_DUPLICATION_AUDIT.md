# S3.1.A DUPLICATION AUDIT

**Scope:** UI governance/billing duplication and chaos. Audit only; no code changes, no deletions, no refactors.

**Sources:** Direct inspection of `src/App.jsx`, `src/contexts/WorkspaceContext.jsx`, `src/context/AppContext.jsx`, `src/pages/Settings.jsx`, `src/pages/Billing*.jsx`, `src/hooks/useOrgBilling.js`, `src/hooks/useWorkspaceUsage.js`, `src/lib/billing/*`, `src/lib/workspace/*`, `src/lib/billingApi.js`, `src/components/billing/*`, `src/components/BillingBlockedScreen.jsx`, `src/components/home/HomeBillingUsage.jsx`, `supabase/functions/stripe*`, and route definitions.

---

## 1. UI surfaces inventory

| Path | Purpose | Current status | Data source |
|------|---------|----------------|-------------|
| **src/pages/Billing.jsx** | Main billing page: plan, status, trial, period end, upgrade CTA, portal, usage alerts (LimitReachedBanner), FeatureLockedCard. | **canonical** | `useOrgBilling(activeOrgId)` → org_billing; `useWorkspaceUsage()` → getWorkspaceUsage → billing_org_entitlements + projects/org_memberships counts; `getOrgEntitlements(supabase, activeOrgId)` → billing_org_entitlements; `createStripeCheckoutSession` / `createStripePortalSession` (billingApi) |
| **src/pages/BillingSettings.jsx** | Simpler billing UI: plan upgrade, manage billing (portal), same PLANS. No usage alerts, no LimitReachedBanner. | **duplicate** | `useOrgBilling(activeOrgId)` → org_billing; `createStripeCheckoutSession` / `createStripePortalSession` (billingApi). Same Stripe API as Billing.jsx. |
| **src/pages/BillingLocked.jsx** | Gate page when billing is locked (past_due / canceled / trial expired). Shown after App.jsx redirect. | **canonical** (gate) | `location.state?.org` or `supabase.from('orgs').select('*').eq('id', activeOrgId)`; `useOrgBilling(activeOrgId)` → org_billing; `createStripeCheckoutSession` / `createStripePortalSession` (billingApi). |
| **src/pages/BillingOverSeat.jsx** | Gate page when seats used > seat_limit. Shown after App.jsx redirect. | **canonical** (gate) | `location.state` (org, seatsUsed) or `orgs` + `org_memberships` count; `createStripePortalSession` (billingApi). |
| **src/pages/Settings.jsx** | Company, signatures, workspace tab (org, seats, members list, add member, “Manage billing” button). | **canonical** (settings + members) | `getCompanySettings(activeOrgId)`, `org_memberships` (list + count), `orgs` (current org), `getOrgEntitlements` / `assertOrgWithinLimit` for add member. **Manage billing** calls `stripe_create_portal` / `stripe_create_checkout` (underscore names) directly — **different from billingApi**. |
| **src/components/billing/BillingBanner.jsx** | Top-of-app banner when status is past_due/canceled or trial expired. Links to `/app/settings/billing` (redirects to `/app/billing`). | **canonical** | `useOrgBilling(activeOrgId)` → org_billing. |
| **src/components/billing/WorkspaceLimitAlert.jsx** | Dismissible alert when projects or seats limit reached. Used in App.jsx. | **canonical** | `usage` from parent (AppContent → useWorkspaceUsage()). |
| **src/components/billing/FeatureLockedCard.jsx** | Upsell card for locked feature (uses hasOrgFeature(entitlements, featureCode)). | **canonical** | Entitlements from parent (e.g. Billing.jsx getOrgEntitlements). |
| **src/components/billing/LimitReachedBanner.jsx** | Banner for single resource (projects or seats) at/over limit. Used on Billing.jsx. | **canonical** | Props from parent (usage from useWorkspaceUsage on Billing). |
| **src/components/home/HomeBillingUsage.jsx** | Dashboard widget: billing usage (plan, status, trial, period, seats/projects used/limit). | **canonical** (widget) | `billingUsage` from parent: `homeData?.operations?.billingUsage` (composed in useHomeDashboardData from getWorkspaceUsage + org_billing–like data). |
| **src/components/BillingBlockedScreen.jsx** | Full-screen “Subscription inactive” block with link to /app/settings. | **legacy / dead** | Props `org`; no imports found in codebase (only self-reference). Never rendered. |
| **App.jsx (AppContent)** | Inline billing gate: loads org, seat count, seat_limit, billing_status, trial_ends_at; redirects to `/app/billing/locked` or `/app/billing/over-seat` when locked or over seat. | **duplicate logic** | `supabase.from('orgs').select('*').eq('id', activeOrgId)`; `supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', activeOrgId)`. Does **not** use billing_org_entitlements or getWorkspaceUsage; uses orgs.seat_limit and orgs.billing_status directly. |

**Route summary (from App.jsx):**

- `/app/billing` → Billing (main page).
- `/app/billing/locked` → BillingLocked (no AppPageWrap; rendered when gate triggers).
- `/app/billing/over-seat` → BillingOverSeat (same).
- `/app/settings/billing` → **Redirect** to `/app/billing` (BillingSettings is never rendered as a route).

---

## 2. Billing source-of-truth map

| File / path | Source used | Operation type | Risk level |
|-------------|-------------|----------------|------------|
| **src/App.jsx (AppContent useEffect)** | `orgs` (row by activeOrgId), `org_memberships` (count by org_id) | read (seat_limit, billing_status, trial_ends_at; computes locked / overSeat) | **high** — Duplicate gate logic; does not use billing_org_entitlements or D12 usage engine; uses orgs.seat_limit / orgs.billing_status which may diverge from entitlements. |
| **src/hooks/useOrgBilling.js** | `org_billing` (plan, status, trial_ends_at, current_period_end_at, stripe_customer_id) | read | **low** — Single read path for org_billing. |
| **src/hooks/useWorkspaceUsage.js** | `getWorkspaceUsage(supabase, activeOrgId)` → projects count, org_memberships count, **billing_org_entitlements** (projects.max, team.seats / seat_limit) | read | **low** — Canonical usage; uses entitlements. |
| **src/lib/workspace/usage.js** | `projects` (count), `org_memberships` (count), `getOrgEntitlements` → billing_org_entitlements | read | **low** — Canonical. |
| **src/lib/billing/entitlements.js** | `billing_org_entitlements` | read (getOrgEntitlements, hasOrgFeature, getOrgFeatureLimit, assertOrgActive, assertOrgFeature, assertOrgWithinLimit) | **low** — Canonical gating. |
| **src/pages/Billing.jsx** | org_billing (useOrgBilling), billing_org_entitlements (getOrgEntitlements), usage (useWorkspaceUsage) | read; gate (display) | **low** — Uses canonical sources. |
| **src/pages/BillingLocked.jsx** | orgs, org_billing (useOrgBilling) | read | **low** — Gate page. |
| **src/pages/BillingOverSeat.jsx** | orgs, org_memberships count | read | **medium** — Seat count duplicated vs useWorkspaceUsage; seat_limit from orgs vs entitlements. |
| **src/pages/BillingSettings.jsx** | org_billing (useOrgBilling) | read | **low** — Read-only duplicate surface. |
| **src/pages/Settings.jsx** | orgs, org_memberships (list + count), getOrgEntitlements, assertOrgWithinLimit | read; write (org_memberships insert for add member) | **medium** — Seat limit check and “Manage billing” use different Stripe functions (see Stripe map). |
| **src/components/billing/BillingBanner.jsx** | org_billing (useOrgBilling) | read | **low** — Banner only. |
| **src/hooks/useHomeDashboardData.js** | Composes getWorkspaceUsage + billing (usage + billing for operations.billingUsage) | read | **low** — Composed from same engines. |
| **supabase/functions/stripe-webhook** | Writes to org_billing (and related); stripe_webhook_events | sync (write) | **low** — Canonical sync. |
| **supabase/functions/stripe_webhook** | (Verify separately; naming suggests duplicate webhook.) | — | **unclear** — Both stripe-webhook and stripe_webhook exist. |

---

## 3. Governance source-of-truth map

| File / path | Source used | Uses activeOrgId correctly? | Logic duplicated? |
|-------------|-------------|-----------------------------|-------------------|
| **src/contexts/WorkspaceContext.jsx** | `org_memberships` (user’s memberships with orgs(id, name)); localStorage for active org id | N/A (provides activeOrgId) | No — Single source for activeOrgId and memberships list. |
| **src/context/AppContext.jsx** | `useWorkspace()` for activeOrgId, isWorkspaceReady | Yes (consumes only) | No. |
| **src/pages/Settings.jsx** | loadWorkspace: org_memberships (user’s membership + orgs), then org_memberships (count + list by org_id). activeOrgId from useApp() | Yes (uses activeOrgId; loadWorkspace uses current user’s membership to get org, then filters by that org) | **Yes** — Re-implements “current org + members list + seat count” instead of reusing WorkspaceContext + useWorkspaceUsage. |
| **src/pages/BillingLocked.jsx** | memberships from useWorkspace(); isOwnerAdmin = memberships.some(m => m.org_id === activeOrgId && (m.role === 'owner' \|\| m.role === 'admin')) | Yes | No — Uses context. |
| **src/pages/BillingOverSeat.jsx** | Same isOwnerAdmin from useWorkspace() | Yes | No. |
| **src/lib/workspace/createWorkspace.js** | orgs insert, org_memberships insert (owner) | N/A (creation) | No — Single create path. |
| **src/pages/Settings.jsx (add member)** | getOrgEntitlements, assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed); org_memberships.insert | Yes (org from loadWorkspace tied to active org) | Seat limit check duplicated vs App.jsx gate and useWorkspaceUsage. |

---

## 4. Stripe duplication map

| Function name | Invoked by | Status | Notes |
|---------------|------------|--------|--------|
| **stripe-checkout-session** | `src/lib/billingApi.js` → createStripeCheckoutSession(orgId, plan) | **active** | D8.2; used by Billing.jsx, BillingLocked.jsx, BillingSettings.jsx, App.jsx handleUpgradeForLimit. |
| **stripe-portal-session** | `src/lib/billingApi.js` → createStripePortalSession(orgId) | **active** | D8.2; used by Billing.jsx, BillingLocked.jsx, BillingOverSeat.jsx, BillingSettings.jsx. |
| **stripe_create_checkout** | `src/pages/Settings.jsx` handleManageBilling (direct supabase.functions.invoke) | **legacy / duplicate** | S8.2 “TEST MODE”; different env (STRIPE_PRICE_ID_CORE). Same purpose as stripe-checkout-session. |
| **stripe_create_portal** | `src/pages/Settings.jsx` handleManageBilling (direct invoke) | **legacy / duplicate** | S8.2 “TEST MODE”. Same purpose as stripe-portal-session. |
| **stripe-webhook** | Supabase config / Stripe dashboard (webhook URL) | **active** | D8.2; syncs to org_billing; idempotent via stripe_webhook_events. |
| **stripe_webhook** | (Naming with underscore; may be alternate or legacy.) | **unclear** | Both stripe-webhook and stripe_webhook exist in functions folder; need deploy/config to see which is registered. |

---

## 5. Cleanup candidates

| Item | Type | Reason it looks duplicate/legacy | Probable canonical replacement | Deletion risk |
|------|------|----------------------------------|----------------------------------|---------------|
| **BillingSettings.jsx** | page | Route redirects to /app/billing; component never rendered. Same data as Billing.jsx (useOrgBilling + billingApi). Simpler duplicate UI. | Billing.jsx (canonical billing page) | **low** — Route is redirect only; removing the lazy import and route redirect target leaves only Billing.jsx. |
| **BillingBlockedScreen.jsx** | component | Not imported anywhere in repo. Dead code. | N/A (or BillingLocked.jsx if full-screen block ever needed) | **low** — Unused. |
| **Settings.jsx handleManageBilling** (stripe_create_* invokes) | flow | Uses stripe_create_portal / stripe_create_checkout instead of billingApi (stripe-portal-session / stripe-checkout-session). Duplicate Stripe entrypoints. | createStripePortalSession(activeOrgId) / createStripeCheckoutSession(activeOrgId, 'growth') from billingApi | **medium** — Change call site only; keep Settings.jsx. |
| **App.jsx inline billing gate** (orgs + org_memberships count + seat_limit + billing_status) | flow | Reimplements gate using orgs table and seat count instead of getWorkspaceUsage + billing_org_entitlements. Diverges from D11/D12 canonical model. | useWorkspaceUsage + getOrgEntitlements or single “billing gate” hook that uses entitlements + usage | **high** — Behavioral change; must align with entitlements and usage engine. |
| **stripe_create_checkout** (Supabase function) | function | S8.2 TEST MODE; superseded by stripe-checkout-session (D8.2). | stripe-checkout-session | **medium** — After Settings.jsx uses billingApi, function can be deprecated; verify no other callers. |
| **stripe_create_portal** (Supabase function) | function | S8.2 TEST MODE; superseded by stripe-portal-session. | stripe-portal-session | **medium** — Same as above. |
| **stripe_webhook** (underscore) vs **stripe-webhook** (hyphen) | function | Two webhook-named functions; one may be legacy or duplicate. | Single webhook (stripe-webhook) | **high** — Must confirm which is registered in Stripe dashboard and which writes to org_billing. |

---

## 6. Canonicalization proposal (NO CODE)

Based on the repo as it exists today:

- **Canonical billing read model:**  
  - **Plan/status/trial/customer:** `org_billing` via `useOrgBilling(activeOrgId)`.  
  - **Limits and usage:** `billing_org_entitlements` + `projects` count + `org_memberships` count via `getWorkspaceUsage(supabase, activeOrgId)` / `useWorkspaceUsage()` and `getOrgEntitlements(supabase, activeOrgId)` for gating (assertOrgActive, assertOrgWithinLimit, etc.).  
  - **Do not** gate on `orgs.billing_status` / `orgs.seat_limit` alone; align with entitlements and usage engine.

- **Canonical seat-limit source:**  
  - **billing_org_entitlements** (e.g. `team.seats` or `seat_limit` from getOrgFeatureLimit / entitlements), plus **org_memberships** count.  
  - Implemented in `src/lib/workspace/usage.js` and `getOrgEntitlements` / `getOrgFeatureLimit`.  
  - **Not** `orgs.seat_limit` in isolation (App.jsx and BillingOverSeat currently use orgs; should be aligned with entitlements).

- **Canonical membership/role source:**  
  - **org_memberships** with `activeOrgId` from WorkspaceContext.  
  - Role/owner checks: `memberships.some(m => m.org_id === activeOrgId && (m.role === 'owner' || m.role === 'admin'))` (as in BillingLocked/BillingOverSeat).  
  - Single place that loads “current org’s members” for UI: either WorkspaceContext (if extended) or one shared hook that uses activeOrgId + org_memberships; Settings.jsx loadWorkspace duplicates this.

- **Canonical members-management surface:**  
  - **Settings.jsx** “Workspace” tab (members list, add member, seat limit message) is the only members-management UI. Keep it; ensure it uses canonical seat limit (entitlements) and canonical Stripe entrypoints (billingApi).

- **Canonical Stripe function set:**  
  - **stripe-checkout-session** (create checkout for plan).  
  - **stripe-portal-session** (create portal session).  
  - **stripe-webhook** (one webhook to sync subscription/invoice to org_billing).  
  - All client calls go through **src/lib/billingApi.js** (createStripeCheckoutSession, createStripePortalSession).  
  - Deprecate/remove **stripe_create_checkout** and **stripe_create_portal** once no callers remain; confirm single **stripe-webhook** (or stripe_webhook) in production.

---

## 7. Safe deletion batch proposal (Batch 1 — LOW risk only)

Only items that can be removed later with **low** risk:

| Item | Type | Reason safe to remove later |
|------|------|-----------------------------|
| **src/components/BillingBlockedScreen.jsx** | component | Not imported anywhere. Dead code. Removing it has no callers to update. |
| **src/pages/BillingSettings.jsx** (as a rendered page) | page | Route `/app/settings/billing` already redirects to `/app/billing`. The lazy-loaded BillingSettings component is never mounted. After removing the lazy import and the redirect route (so `/app/settings/billing` 404s or redirects via a single Navigate), the file can be deleted; any link to `/app/settings/billing` (e.g. BillingBanner) already ends on Billing.jsx. |

**Not in Batch 1 (medium/high risk):**  
- Changing App.jsx billing gate to use entitlements (behavioral).  
- Switching Settings.jsx to billingApi (call-site change; low risk but not “deletion”).  
- Deleting stripe_create_* functions (verify no other callers first).  
- Merging or removing stripe_webhook vs stripe-webhook (requires production/config check).

---

**End of S3.1.A Duplication Audit.**
