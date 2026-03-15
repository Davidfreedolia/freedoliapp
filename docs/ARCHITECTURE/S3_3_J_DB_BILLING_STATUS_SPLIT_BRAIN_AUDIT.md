# S3.3.J DB BILLING STATUS SPLIT-BRAIN AUDIT

## 1. Executive verdict

- **Is DB billing status canonicalized?** **No.** Three separate surfaces hold or derive “billing status”: `orgs.billing_status`, `org_billing.status`, and `billing_org_entitlements.billing_status`. No single DB source is used consistently for access gating and trigger decisions.

- **Is there active DB billing status split-brain?** **Yes.** RLS gating uses `org_billing_allows_access` → **orgs.billing_status** only. Trigger/runtime decisions use `get_org_billing_state` → **org_billing.status** (and plan). The decision-scheduler reads **orgs.billing_status** to select “active” orgs. The D11 webhook updates only **billing_org_entitlements** (and billing_subscriptions); the D8.2 webhook updates **org_billing**. **orgs.billing_status** has no writer in the repo and remains at schema default.

- **Is there credible admin restriction risk from status divergence?** **Yes.** If `orgs.billing_status` were ever set to past_due/canceled (e.g. by a future writer or manual update) while `org_billing.status` stayed trialing/active, RLS would deny tenant data access but triggers would allow inserts → effective lockout for the admin on SELECT. The reverse: if only org_billing is updated to past_due and orgs stays trialing, RLS would allow access and triggers would block → inconsistent “allowed to read but not to add member.” Either divergence is a risk.

- **Top 3 DB billing-status risks**
  1. **org_billing_allows_access** reads **orgs.billing_status** only; triggers and get_org_billing_state use **org_billing.status**. No shared source.
  2. **orgs.billing_status** is never updated by any webhook in the repo; it stays at default. So RLS gating is effectively “always allow” for all orgs unless something else writes orgs.
  3. **Two webhook implementations:** `stripe-webhook` (D8.2) writes org_billing; `stripe_webhook` (D11) writes billing_org_entitlements and billing_subscriptions. Neither writes orgs.billing_status. Which webhook is deployed determines which status source is live; RLS does not use either consistently.

---

## 2. Findings

### Finding 1: org_billing_allows_access reads only orgs.billing_status

- **Severity:** high  
- **File(s):** `supabase/migrations/20260301003000_f2_cba_billing_rls_gating.sql`  
- **DB object(s):** `public.org_billing_allows_access(p_org_id uuid)`  
- **Exact inconsistency:** Function returns true iff `EXISTS (SELECT 1 FROM public.orgs o WHERE o.id = p_org_id AND o.billing_status IN ('trialing', 'active'))`. It does not read `org_billing` or `billing_org_entitlements`. All RLS policies that gate on “billing allows access” therefore depend solely on `orgs.billing_status`.  
- **Why risky:** Triggers and get_org_billing_state use org_billing.status. If the two diverge, RLS and trigger behavior disagree. Today orgs.billing_status is never updated by repo code, so it is a stale/legacy source.  
- **Recommended next patch (small/surgical):** Change `org_billing_allows_access` to derive “allows access” from a single source: e.g. read from `org_billing.status` (with fallback to `orgs.billing_status` when no org_billing row) so RLS and triggers share the same effective status. One migration; no change to policy expressions or to who can call the function.

---

### Finding 2: get_org_billing_state and triggers use org_billing only

- **Severity:** high (counterpart to Finding 1)  
- **File(s):** `supabase/migrations/20260303090300_d8_2_plan_enforcement_limits.sql`, `supabase/migrations/20260315110000_s3_2b_active_seat_semantics.sql`  
- **DB object(s):** `public.get_org_billing_state(p_org_id uuid)`, `public.enforce_seat_limit()`, `public.enforce_spapi_limit()`  
- **Exact inconsistency:** get_org_billing_state returns `(plan, status)` from `org_billing` only (coalesce to 'growth','trialing' if no row). Triggers use this for “allow insert only when status IN (trialing, active)” and for plan-based limits. So trigger/runtime “billing status” is **org_billing.status**; RLS is **orgs.billing_status**.  
- **Why risky:** Same as Finding 1: two sources, no sync.  
- **Recommended next patch (small/surgical):** Unify by making the single gating helper (org_billing_allows_access) use the same source as get_org_billing_state (org_billing), so one reader for “does billing allow access?” (Finding 1 patch covers this).

---

### Finding 3: orgs.billing_status has no writer in repo

- **Severity:** high  
- **File(s):** Repo-wide grep: no update to `orgs.billing_status` in supabase/functions or migrations (except schema/default).  
- **DB object(s):** Column `public.orgs.billing_status` (type billing_status_enum, default 'trialing').  
- **Exact inconsistency:** F2 CBA docs state that only the webhook should write billing fields on orgs. In the repo, no webhook updates orgs.billing_status. stripe_webhook (D11) writes billing_org_entitlements; stripe-webhook (D8.2) writes org_billing. stripe_create_checkout updates orgs only with stripe_customer_id. So orgs.billing_status remains at default for all orgs.  
- **Why risky:** RLS gating is therefore non-operational for “past_due blocks access” unless some out-of-repo process updates orgs. Any future writer that updates only orgs and not org_billing would create split-brain.  
- **Recommended next patch (small/surgical):** Do not add a second writer to orgs in this patch. Prefer making the single reader (org_billing_allows_access) use the source that is actually updated (org_billing or, if canonical, billing_org_entitlements). See §4.

---

### Finding 4: decision-scheduler uses orgs.billing_status

- **Severity:** medium  
- **File(s):** `supabase/functions/decision-scheduler/index.ts`  
- **DB object(s):** Query `supabaseAdmin.from("orgs").select("id").in("billing_status", ["trialing", "active"])`.  
- **Exact inconsistency:** Scheduler selects orgs to process by orgs.billing_status. That column is never updated, so all orgs are selected (default trialing). If org_billing_allows_access is later changed to use org_billing, the scheduler would still use orgs and could run for orgs that are past_due in org_billing.  
- **Why risky:** Operational inconsistency: “active orgs” for scheduler vs “billing allows access” for RLS could differ once a single source is chosen.  
- **Recommended next patch (small/surgical):** After org_billing_allows_access is aligned to one source, consider updating the scheduler to use the same source (e.g. only run for orgs where that source is trialing/active). Can be a separate, small follow-up.

---

### Finding 5: billing_org_entitlements.billing_status is written but not used for DB gating

- **Severity:** medium  
- **File(s):** `supabase/functions/stripe_webhook/index.ts` (refreshOrgEntitlements), `supabase/migrations/20260304170000_d11_billing_engine_foundation.sql`  
- **DB object(s):** Table `billing_org_entitlements` (column billing_status); no function or RLS policy in migrations reads it for “billing allows access.”  
- **Exact inconsistency:** D11 webhook computes billingStatus and upserts it into billing_org_entitlements. App/UI use entitlements for usage and limits. No DB-level gating (org_billing_allows_access, get_org_billing_state, or RLS) reads billing_org_entitlements for access.  
- **Why risky:** Entitlements are the “canonical” updated surface for D11 flow but are not used by RLS or triggers; so DB access semantics are disconnected from the D11 writer.  
- **Recommended next patch (small/surgical):** Out of scope for minimal patch. Option for a later phase: have org_billing_allows_access prefer billing_org_entitlements when present (e.g. “allow” when entitlements.billing_status IN ('trialing','active','grace')) and fall back to org_billing or orgs. Do not do that in the same migration as “use org_billing” unless we explicitly make org_billing the single source first.

---

## 3. Source map

| Source | Type | Canonical / legacy / compatibility / ambiguous | Consumers | Writers |
|--------|------|-------------------------------------------------|------------|---------|
| **orgs.billing_status** | column | Legacy (no writer in repo) | org_billing_allows_access (RLS); decision-scheduler | None in repo (schema default only). |
| **org_billing.status** | column | Compatibility (written by D8.2 webhook) | get_org_billing_state → enforce_seat_limit, enforce_spapi_limit; stripe-checkout-session, stripe-portal-session read org_billing | stripe-webhook (D8.2) via updateOrgBilling. |
| **billing_org_entitlements.billing_status** | column | Canonical for D11 (limits/features); not used for DB gating | App/usage only; no RLS or trigger reads it for access | stripe_webhook (D11) refreshOrgEntitlements. |
| **org_billing_allows_access(p_org_id)** | function | Legacy (reads orgs only) | All tenant RLS policies (gating) | N/A. |
| **get_org_billing_state(p_org_id)** | function | Compatibility (reads org_billing) | enforce_seat_limit, enforce_spapi_limit; org_add_member (for plan/limit) | N/A. |

**Gating consumers:** RLS policies on tenant tables and orgs/org_memberships call org_billing_allows_access → **orgs.billing_status**.  
**Trigger/runtime consumers:** enforce_seat_limit, enforce_spapi_limit use get_org_billing_state → **org_billing.status** (and plan).  
**Writers:** orgs.billing_status = none. org_billing = stripe-webhook (D8.2). billing_org_entitlements = stripe_webhook (D11).

---

## 4. Safe next patch recommendation

**Single recommended patch:** Change **org_billing_allows_access** to derive “allows access” from **org_billing.status** with a safe fallback so RLS and triggers share one source.

- **Implementation:** In one migration, replace the body of `org_billing_allows_access(p_org_id)` with: return true iff there is an org row for p_org_id and ( (select ob.status from public.org_billing ob where ob.org_id = p_org_id limit 1) is in ('trialing','active') **or** (when org_billing has no row) public.orgs.billing_status for that org is in ('trialing','active'). So: prefer org_billing.status when present; fall back to orgs.billing_status when org_billing has no row (e.g. new orgs or D8.2 webhook not yet run).
- **Rationale:** (1) Single reader for “does billing allow access?” aligned with get_org_billing_state and triggers. (2) No change to policy names or expressions. (3) Admin safety: owner/admin still have SELECT on orgs/org_memberships via existing owner exception; if org_billing row is missing, fallback to orgs preserves current behavior. (4) No hardcoded email; safety from canonical membership and existing RLS.
- **Blast radius:** One function; all RLS policies that call it immediately see the new semantics. If the deployed webhook is D11-only and never writes org_billing, org_billing may often be missing and fallback to orgs keeps “allow” for default trialing.

---

## 5. What NOT to touch yet

- **Do not** add a writer to orgs.billing_status in this patch; that would duplicate state and increase sync burden.
- **Do not** change get_org_billing_state or the triggers in this patch; only the RLS helper so it uses the same logical source (org_billing when present).
- **Do not** wire billing_org_entitlements into org_billing_allows_access in this patch unless you explicitly make entitlements the single source and add fallback logic; keep the patch to “org_billing + orgs fallback” only.
- **Do not** change the decision-scheduler in the same migration; do that in a follow-up if needed so “active orgs” for the scheduler match the chosen source.
- **Do not** touch frontend, useOrgBilling, or app billing gate logic; they already use org_billing or entitlements where documented.
- **Do not** remove or alter the owner exception on orgs/org_memberships RLS (SELECT when billing blocked); that is the recovery path for the admin.
