# FREEDOLIAPP — Engineering Master Dossier

**Audience:** Senior engineer (external or new to codebase) who must understand the system in depth.  
**Scope:** Architecture, multi-tenancy, billing, security, deployment, and operational rules.  
**References:** This document points to specific files under `/docs` for detail; it does not duplicate full specs.

---

## 1. Executive Overview

FREEDOLIAPP is a **multi-tenant SaaS** product (React + Vite frontend, Supabase PostgreSQL + RLS backend, Vercel serverless for Stripe). The **tenant boundary is the organisation** (`org_id`). Every operational table (projects, suppliers, purchase_orders, etc.) is scoped by `org_id`. Users belong to one or more orgs via `org_memberships`; the frontend maintains an **active org** (workspace context) and applies **billing gating**: if the org is not in a billable state or is over seat limit, access to app content is blocked and the user is shown locked or over-seat screens.

**Key facts:**
- **Billing:** Stripe; only the **webhook** writes billing fields to `orgs`. Checkout and portal endpoints return URLs only.
- **Seats:** Enforced in DB via RPC `org_add_member` (not RLS). UI redirects to over-seat when `seats_used > seat_limit`.
- **Security:** RLS on all tenant tables: `is_org_member(org_id)` and `org_billing_allows_access(org_id)` (with owner exception for SELECT on `orgs` and `org_memberships`).
- **Deployment:** Git push to `master` triggers production deploy on Vercel. No manual prod deploys via CLI.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React SPA)                                 │
│  AppProvider → WorkspaceProvider → Routes                                        │
│  - activeOrgId (localStorage: freedoli_active_org_id)                           │
│  - Billing gate: redirect to /app/billing/locked | over-seat if !allowed         │
│  - All tenant queries: .eq('org_id', activeOrgId)                               │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ Supabase client (JWT)              │ POST /api/stripe/* (JWT for
                    │ .from('*').select().eq('org_id',…) │  checkout/portal; no JWT webhook)
                    ▼                                    ▼
┌───────────────────────────────────┐    ┌─────────────────────────────────────────┐
│  SUPABASE                         │    │  VERCEL SERVERLESS (API routes)          │
│  - PostgreSQL + PostgREST         │    │  - create-checkout-session               │
│  - RLS on all tenant tables       │    │  - create-portal-session                 │
│  - org_billing_allows_access()    │    │  - webhook (raw body, idempotency table) │
│  - org_add_member() RPC           │    │  Service role used only in webhook       │
│  - Auth (JWT)                     │    └─────────────────────────────────────────┘
└───────────────────────────────────┘                          │
         │                                                      │ Supabase service role
         │                                                      │ (writes to orgs only in webhook)
         ▼                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL: orgs, org_memberships, projects, suppliers, purchase_orders, …     │
│  stripe_webhook_events (idempotency); RLS blocks anon/authenticated on it       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Stack summary:**

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18, Vite, React Router 6      |
| State       | React Context (App, Workspace); localStorage for activeOrgId and lang |
| API (data)  | Supabase JS client (PostgREST + Auth) |
| API (Stripe)| Vercel serverless (Node): `api/stripe/*.js` |
| Backend     | Supabase: PostgreSQL, RLS, Auth    |
| Hosting     | Vercel (frontend + API routes)     |

---

## 3. Multi-Tenant Model

**Rule:** All business data is isolated by **organisation**. The tenant key is `org_id` (UUID, FK to `orgs.id`).

- **Tables:** Every tenant-scoped table has a column `org_id UUID NOT NULL REFERENCES orgs(id)` (or equivalent). Examples: `projects`, `suppliers`, `purchase_orders`, `org_memberships`, etc.
- **No user-scoped isolation for business data:** `user_id` is used only for audit (e.g. `created_by`), not for row-level filtering of tenant data. Filtering is always by `org_id`.
- **Membership:** Table `org_memberships(org_id, user_id, role)`. Roles: `owner`, `admin`, `member`. A user can belong to multiple orgs; the frontend chooses one “active” org at a time.
- **RLS:** Policies use `public.is_org_member(org_id)` so that only users who have a row in `org_memberships` for that `org_id` can see or modify rows.

```
  orgs                    org_memberships              tenant tables (e.g. projects)
  ┌────────────┐          ┌────────────────────┐       ┌─────────────────────────────┐
  │ id (PK)    │◄─────────│ org_id (FK)        │       │ id, org_id (FK), name, …   │
  │ name       │          │ user_id (FK auth)  │       │ RLS: is_org_member(org_id)  │
  │ billing_*  │          │ role               │       │   AND org_billing_allows_…   │
  └────────────┘          └────────────────────┘       └─────────────────────────────┘
```

**References:** `docs/D0/FASE2_CBA_ARCHITECTURE_FINAL.md`, `docs/D0/ROADMAP_MASTER_POST_S1.22.md`, `docs/D3/D3__multi-tenant-contract__v1.0.md`.

---

## 4. Billing Architecture

**Source of truth:** Only the **Stripe webhook** (`POST /api/stripe/webhook`) may write to billing-related columns on `orgs`. No other code path (including checkout or portal endpoints) must update `orgs` for billing.

**Columns on `orgs` (billing):**

| Column                     | Type                 | Purpose                                      |
|---------------------------|----------------------|----------------------------------------------|
| `billing_status`          | `billing_status_enum` | `trialing` \| `active` \| `past_due` \| `canceled` |
| `plan_id`                 | text                 | Stripe Price ID                              |
| `seat_limit`              | integer              | CHECK >= 1                                   |
| `trial_ends_at`           | timestamptz          | End of trial                                 |
| `stripe_customer_id`      | text                 | UNIQUE (partial index)                       |
| `stripe_subscription_id`  | text                 | UNIQUE (partial index)                       |

**Billable:** Access to tenant data is allowed only when `billing_status IN ('trialing', 'active')`. `past_due` and `canceled` block access (enforced in RLS and in the frontend billing gate).

**Flow:**
1. User (owner/admin) calls create-checkout-session or create-portal-session with JWT and `org_id`.
2. API returns Stripe URL; user is redirected; **no DB write**.
3. Stripe sends events to the webhook; webhook verifies signature, ensures idempotency via `stripe_webhook_events`, then **updates `orgs`** (e.g. `checkout.session.completed` → set customer_id, subscription_id, billing_status, plan_id, seat_limit, trial_ends_at).

**References:** `docs/D2/BILLING_MODEL.md`, `docs/D0/PAS3_STRIPE_ENV_AND_WEBHOOK.md`, `api/stripe/webhook.js`.

---

## 5. Seat Enforcement

Seat limits are **not** enforced in RLS. They are enforced when **adding a member** via the RPC **`org_add_member(p_org_id, p_user_id, p_role)`**.

- **Who can call:** Only a user who is **owner or admin** of the org (checked via `is_org_owner_or_admin(p_org_id)`).
- **Logic:**  
  - `seats_used = COUNT(*) FROM org_memberships WHERE org_id = p_org_id`  
  - Read `seat_limit` from `orgs`.  
  - If `(p_org_id, p_user_id)` already exists → return `'already_member'` (idempotent).  
  - If `seats_used >= seat_limit` → `RAISE EXCEPTION 'seat_limit_reached'`.  
  - Else → `INSERT` into `org_memberships` and return `'ok'`.
- **Security:** Function is `SECURITY DEFINER` with `SET search_path = public`; `GRANT EXECUTE` to `authenticated`.

If an org already has more members than `seat_limit` (e.g. historical data), the **UI** still redirects to `/app/billing/over-seat` when `seats_used > seat_limit`; the RPC prevents adding further members until the limit is increased or members are removed.

**References:** `docs/D2/SEAT_ENFORCEMENT_RPC.md`, migration `supabase/migrations/*_f2_cba_seat_enforcement_rpc.sql`.

---

## 6. RLS Security Model

- **Tenant tables:** For SELECT, policy requires:  
  `is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id))`.  
  So owners/admins can still **read** `orgs` and `org_memberships` when billing is blocked (recovery path). For INSERT/UPDATE/DELETE the policy requires:  
  `is_org_member(org_id) AND org_billing_allows_access(org_id)` (no owner exception).
- **Helper:** `org_billing_allows_access(p_org_id uuid)` returns true iff the org exists and `billing_status IN ('trialing', 'active')`. It is `SECURITY DEFINER` so RLS can use it without leaking data.
- **Special tables:** `orgs` and `org_memberships` have SELECT policies that allow owner/admin to read even when billing is not billable. All other tenant tables do not allow INSERT/UPDATE/DELETE when billing is not billable.
- **stripe_webhook_events:** Access is restricted to the service role (anon and authenticated revoked); no RLS policies for app users.

```
  Request (JWT) → PostgREST → RLS
       │
       ├─ SELECT tenant table
       │    → is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id))
       │
       ├─ INSERT/UPDATE/DELETE tenant table
       │    → is_org_member(org_id) AND org_billing_allows_access(org_id)
       │
       └─ SELECT orgs / org_memberships (owner recovery)
            → is_org_member(org_id) AND (org_billing_allows_access(org_id) OR is_org_owner_or_admin(org_id))
```

**References:** `docs/D2/RLS_BILLING_GATING.md`, migration `supabase/migrations/*_f2_cba_billing_rls_gating.sql`.

---

## 7. Workspace Context (Frontend)

The **active organisation** is stored and resolved as follows:

- **Storage key:** `freedoli_active_org_id` (localStorage). Value: UUID string of the active org.
- **Bootstrap (after auth):**  
  1. Fetch current user’s `org_memberships`.  
  2. Read stored `freedoli_active_org_id`.  
  3. If it is a valid UUID and the user is still a member of that org → keep it.  
  4. Else → choose org where role is `owner`, or else the first org by `created_at`.  
  5. Persist chosen org to localStorage and set `isWorkspaceReady = true`.
- **Switch org:** `setActiveOrgId(orgId)` updates React state, writes to localStorage, syncs with AppContext, and navigates to `/app` (replace). Components that depend on `activeOrgId` re-fetch; all tenant queries use `.eq('org_id', activeOrgId)`.
- **Provider order:** `AppProvider` → `WorkspaceProvider` → `Routes`. `WorkspaceProvider` needs `setAppActiveOrgId` from `AppContext`.

**Hook:** `useWorkspace()` returns `activeOrgId`, `memberships`, `setActiveOrgId`, `isWorkspaceReady`, `revalidateActiveOrg`, `storageKey`.  
**Reference:** `docs/D3/WORKSPACE_CONTEXT.md`, `src/contexts/WorkspaceContext.jsx`.

---

## 8. Stripe Integration

**Endpoints (Vercel serverless, under `api/stripe/`):**

| Method | Path                              | Auth        | Purpose |
|--------|-----------------------------------|------------|--------|
| POST   | `/api/stripe/create-checkout-session` | Bearer JWT | Body: `org_id`, optional `price_id`, `quantity`, `trial_days`. Returns `{ url }`. Caller must be owner/admin of org. Does **not** write to DB. |
| POST   | `/api/stripe/create-portal-session`   | Bearer JWT | Body: `org_id`. Requires `orgs.stripe_customer_id`. Returns `{ url }`. Does **not** write to DB. |
| POST   | `/api/stripe/webhook`                 | Stripe signature | Raw body; verified with `STRIPE_WEBHOOK_SECRET`. Idempotency: insert into `stripe_webhook_events` by `event.id`; on unique violation return 200 duplicate. **Only** this handler updates `orgs` (billing fields). |

**Webhook behaviour (summary):**
- Read raw body (buffer); verify signature; parse event.
- Insert `(id = event.id, type = event.type)` into `stripe_webhook_events`. If duplicate key (23505) → respond 200 `{ received: true, duplicate: true }`.
- Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`; extract `org_id` from metadata/client_reference_id; update `orgs` using **Supabase service role**.

**Environment (serverless):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (for JWT verification on checkout/portal). See `docs/D0/PAS3_STRIPE_ENV_AND_WEBHOOK.md`.

**References:** `api/stripe/create-checkout-session.js`, `api/stripe/create-portal-session.js`, `api/stripe/webhook.js`, `docs/D0/PAS3_STRIPE_ENV_AND_WEBHOOK.md`.

---

## 9. Deployment Model

- **Production:** Pushing to branch **`master`** triggers an automatic production deployment on **Vercel**. No manual production deploy via Vercel CLI or tokens.
- **Preview:** Non-`master` branches get preview deployments.
- **Config:** Framework Vite; build `npm run build`; output `dist`. Environment variables are set in the Vercel project (Production / Preview).
- **API routes:** Live under the same Vercel project (e.g. `https://<project>.vercel.app/api/stripe/...`). Webhook URL must be configured in Stripe Dashboard to point to this base URL + `/api/stripe/webhook`.

```
  Developer                    GitHub                      Vercel
  git push origin master  →   master updated  →   Auto deploy (prod)
  git push origin feature →   branch pushed   →   Preview deploy
```

**References:** `docs/DEPLOY.md`, `docs/VERCEL_ENV_SETUP.md`, `docs/VERCEL_SETUP.md`.

---

## 10. Local Setup Guide

**Prerequisites:** Node.js (version aligned with project; check `.nvmrc` or `package.json` engines if present), npm, Git.

**Steps:**

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd freedoliapp
   npm install
   ```

2. **Environment (frontend)**  
   Copy `.env.example` to `.env.local` (or `.env` as per Vite). Set at least:
   - `VITE_SUPABASE_URL` — Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase anon key  
   Optional: `VITE_GOOGLE_CLIENT_ID` for Drive; `VITE_ENV`, `VITE_DEMO_MODE` if used.

3. **Database**  
   Use a Supabase project (dev or linked). Apply migrations in order:
   ```bash
   npx supabase link --project-ref <ref>   # if using remote
   npx supabase db push
   ```
   For a fresh dev DB, follow `docs/DEV_SETUP_ORDER.md` (bootstrap scripts, seed if needed).

4. **Run frontend**
   ```bash
   npm run dev
   ```
   App runs (e.g. `http://localhost:5173`). Auth and data go to the Supabase project configured in env.

5. **Stripe (optional, for checkout/portal/webhook)**  
   - Run Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/stripe/webhook` (or the port your dev server uses for API).  
   - Set `STRIPE_WEBHOOK_SECRET` to the CLI-provided secret for local testing.  
   - Serverless routes need `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` in the environment (e.g. Vercel dev or similar). See `docs/D0/PAS3_STRIPE_ENV_AND_WEBHOOK.md`.

6. **Build**
   ```bash
   npm run build
   ```
   Must complete without errors before pushing to `master`.

**References:** `docs/DEV_SETUP_ORDER.md`, `.env.example`, `docs/VERCEL_ENV_SETUP.md`, `docs/D0/PAS3_STRIPE_ENV_AND_WEBHOOK.md`.

---

## 11. Operational Rules (What NOT to Touch)

These are **structural decisions** that must not be changed without explicit agreement:

| Rule | Description |
|------|-------------|
| **No billing writes outside webhook** | Only `api/stripe/webhook.js` (or equivalent webhook handler) may UPDATE/INSERT billing-related columns on `orgs`. Checkout and portal endpoints must not write to `orgs`. |
| **Tenant boundary** | All tenant data is scoped by `org_id`. Do not introduce user-scoped isolation for business data. |
| **RLS and billing** | Do not remove or relax `org_billing_allows_access(org_id)` from tenant policies. Do not remove the owner exception for SELECT on `orgs` and `org_memberships` without a replacement recovery path. |
| **Seat enforcement** | Adding members must go through logic that enforces `seat_limit` (currently `org_add_member` RPC). Do not allow direct INSERT into `org_memberships` from the app without this check. |
| **Workspace storage key** | `freedoli_active_org_id` is the canonical key for the active org. Do not change it without updating frontend and docs. |
| **Production deploy** | Do not deploy to production using `vercel --prod` or local tokens. Production is only updated via push to `master`. |
| **Service role key** | `SUPABASE_SERVICE_ROLE_KEY` must never be used in the frontend or in client-side code. Only in serverless (e.g. webhook). |

**References:** `docs/ROADMAP_STATUS.md` (Decision Log), `docs/D0/FASE2_CBA_ARCHITECTURE_FINAL.md`.

---

## 12. Known Limitations

- **Finances:** P&L and cashflow are not fully robust; PO financial integrity (e.g. immutability after status change, full audit trail) is pending (FASE 5).
- **i18n:** Billing screens use the custom `t(lang, key)` and `messages.js` (ca, en, es). The rest of the app may use react-i18next; two systems coexist and keys are not fully unified.
- **Over-seat existing data:** If an org already has more members than `seat_limit`, the UI shows over-seat and RPC blocks new members; reducing seats or members may require manual DB or Stripe actions.
- **Webhook raw body:** Signature verification requires the raw request body. The webhook handler must be configured so that the body is not parsed before verification (e.g. Vercel/Next.js body parser disabled for this route if applicable).
- **Stripe in production:** End-to-end flow (checkout → payment → webhook → org update) should be validated in production with real Stripe config and webhook URL.
- **Documentation spread:** Many docs exist under `/docs`; this dossier and `docs/ROADMAP_STATUS.md` are entry points; for deep dives use the referenced D0/D2/D3 docs.

---

## 13. Future Roadmap Direction

- **FASE 3 — Business Alerts:** Notifications and alerts (e.g. POs, stock, deadlines); rules and channels TBD.
- **FASE 5 — Finance Complete:** Robust P&L and cashflow; PO hardening (validation, immutability, audit); no manual tampering with totals.
- **I18N Hardening:** Extend the `t()` / `useLang()` system beyond billing; align or coexist with react-i18next; optional language selector in UI.

Details and priorities are in **`docs/ROADMAP_STATUS.md`**. Technical baseline is summarised in **`docs/D0/FASE2_CBA_ARCHITECTURE_FINAL.md`** and the D2/D3 docs referenced throughout this dossier.

---

*This dossier is the single entry point for an engineer who needs to work on FREEDOLIAPP; it defers to the referenced docs for full specifications and migration details.*
