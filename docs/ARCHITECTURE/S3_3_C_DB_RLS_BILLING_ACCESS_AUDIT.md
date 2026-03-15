# S3.3.C DB / RLS BILLING ACCESS AUDIT

## 1. Executive verdict

- **Is DB-level billing/access canonicalized?** **No.** Billing access and seat limits are derived from three different sources: `orgs.billing_status` / `orgs.seat_limit`, `org_billing` (plan/status), and `billing_org_entitlements` (billing_status/seat_limit). No single source of truth is used consistently.

- **Is there still DB-level split-brain?** **Yes.** (1) RLS gating uses `orgs.billing_status`; trigger enforcement uses `org_billing.status` and `org_billing.plan`. (2) Seat limit: trigger uses `get_org_billing_state` → `get_plan_limits(plan)` (plan-based fixed values); RPC `org_add_member` uses `orgs.seat_limit`. (3) Several RLS policies on billing/entitlement tables allow any membership row (no `status = 'active'`), so invited/suspended users can still read billing data.

- **Top 3 DB-level risks**
  1. **Dual source for billing status:** `org_billing_allows_access` reads `orgs.billing_status`; `enforce_seat_limit` / `enforce_spapi_limit` use `get_org_billing_state` → `org_billing.status`. If `orgs.billing_status` and `org_billing.status` diverge, RLS can allow access while triggers block (or the reverse).
  2. **Dual source for seat limit:** `enforce_seat_limit` uses plan-based limits from `get_plan_limits(org_billing.plan)`; `org_add_member` uses `orgs.seat_limit`. The two enforcement paths can allow different maxima.
  3. **Billing-related RLS without active membership:** Policies on `org_billing`, `billing_org_entitlements`, `billing_customers`, `billing_subscriptions`, `billing_invoices`, and `billing_org_overrides` use `org_memberships` without `status = 'active'`, so invited/suspended members can read billing data.

---

## 2. Findings

### Finding 1: org_billing_allows_access uses orgs.billing_status only

- **Severity:** high  
- **File(s):** `supabase/migrations/20260301003000_f2_cba_billing_rls_gating.sql`  
- **DB object(s):** `public.org_billing_allows_access(p_org_id uuid)`  
- **Exact inconsistency:** The function returns true iff `orgs.billing_status IN ('trialing', 'active')`. It does not read `org_billing` nor `billing_org_entitlements`. So all RLS policies that gate on “billing allows access” depend on `orgs.billing_status` only.  
- **Why risky:** If the app or webhooks update `org_billing.status` but not `orgs.billing_status` (or vice versa), RLS and trigger-based checks can disagree: e.g. RLS allows tenant data access while `enforce_seat_limit` raises BILLING_INACTIVE.  
- **Recommended next patch (small/surgical):** Either (a) change `org_billing_allows_access` to derive status from a single canonical source (e.g. `org_billing.status` or a small helper that prefers `billing_org_entitlements` when present), or (b) document and enforce a single write path that keeps `orgs.billing_status` and `org_billing.status` in sync; no change to policy expressions, only to the implementation of the helper.

---

### Finding 2: Seat limit has two DB sources (trigger vs RPC)

- **Severity:** high  
- **File(s):**  
  - `supabase/migrations/20260315110000_s3_2b_active_seat_semantics.sql` (enforce_seat_limit, org_add_member)  
  - `supabase/migrations/20260303090300_d8_2_plan_enforcement_limits.sql` (get_org_billing_state, get_plan_limits)  
- **DB object(s):** `public.enforce_seat_limit()` (trigger on `org_memberships`), `public.org_add_member(...)`, `public.get_org_billing_state(uuid)`, `public.get_plan_limits(text)`.  
- **Exact inconsistency:**  
  - **Trigger:** Uses `get_org_billing_state(org_id)` → `org_billing.plan` and `org_billing.status`; then `get_plan_limits(plan)` returns a fixed seats_limit (growth=1, pro=5, agency=15).  
  - **RPC:** Reads `orgs.seat_limit` and compares to active membership count.  
  So the trigger enforces a plan-based cap; the RPC enforces an org-level column. If `orgs.seat_limit` ≠ `get_plan_limits(org_billing.plan).seats_limit`, behavior diverges (e.g. trigger allows 5, RPC blocks at 2).  
- **Why risky:** At runtime, direct inserts to `org_memberships` (e.g. via service role) are limited by the trigger (plan-based); the app calling `org_add_member` is limited by `orgs.seat_limit`. A single “seat limit” concept is enforced in two different ways.  
- **Recommended next patch (small/surgical):** In `org_add_member`, derive `v_seat_limit` from the same source as the trigger (e.g. `get_org_billing_state(p_org_id)` + `get_plan_limits(plan)`, with a fallback to `orgs.seat_limit` only when `org_billing` has no row), so both code paths use one canonical limit. Alternatively, make the trigger use `orgs.seat_limit` so both use the same source; either way, one source of truth.

---

### Finding 3: Billing tables RLS do not restrict to active membership

- **Severity:** high  
- **File(s):**  
  - `supabase/migrations/20260303100100_fix_org_billing_select_policy_org_memberships.sql`  
  - `supabase/migrations/20260304170000_d11_billing_engine_foundation.sql`  
  - `supabase/migrations/20260304171000_d11_2_billing_org_overrides.sql`  
- **DB object(s):** RLS policies: `org_billing_select_own`, `billing_org_entitlements_select`, `billing_customers_select`, `billing_subscriptions_select`, `billing_invoices_select`, `billing_overrides_select_same_org`.  
- **Exact inconsistency:** All use “user is in org” via `org_memberships` without filtering by `status = 'active'`. Examples:  
  - `org_billing`: `org_id in (select org_id from public.org_memberships where user_id = auth.uid())`  
  - `billing_org_entitlements` (and other D11 tables): `org_id in (select org_id from public.org_memberships where user_id = auth.uid())`  
  - `billing_org_overrides`: `exists (select 1 from public.org_memberships om where om.org_id = ... and om.user_id = auth.uid())`  
  So invited or suspended members can still SELECT these billing-related tables.  
- **Why risky:** After S3.2/S3.3.B, “access” is intended to mean active membership. Billing data is sensitive; invited/suspended users should not see it. This is a semantic gap between membership lifecycle and billing visibility.  
- **Recommended next patch (small/surgical):** Add `and status = 'active'` to every billing-related policy that uses `org_memberships` (in a single migration). No change to table structure or to other logic.

---

### Finding 4: billing_org_entitlements is not used for access or limits

- **Severity:** medium  
- **File(s):** `supabase/migrations/20260304170000_d11_billing_engine_foundation.sql`  
- **DB object(s):** Table `public.billing_org_entitlements` (columns include `billing_status`, `seat_limit`); RLS allows SELECT by org members (without active filter — see Finding 3).  
- **Exact inconsistency:** No DB function or policy uses `billing_org_entitlements` to decide “does billing allow access?” or “what is the seat limit?”. `org_billing_allows_access` uses `orgs`; `get_org_billing_state` uses `org_billing`; `org_add_member` uses `orgs.seat_limit`; `enforce_seat_limit` uses `get_org_billing_state` + `get_plan_limits`. So the “canonical” D11 entitlements table is not wired into access or enforcement.  
- **Why risky:** Documentation or future code may assume entitlements are the source of truth. Today, changing `billing_org_entitlements` has no effect on RLS or triggers; only `orgs` and `org_billing` do. This is a design/ambiguity risk rather than an immediate wrong-access bug.  
- **Recommended next patch (small/surgical):** None for this phase. Either (a) document that access/limits are currently from `orgs` + `org_billing` and entitlements are read-only for UI, or (b) in a later phase, add a single helper (e.g. “effective billing status” / “effective seat limit”) that prefers `billing_org_entitlements` when present and use it in one place only (e.g. `org_billing_allows_access` and seat-limit logic). Do not refactor all call sites in this audit.

---

### Finding 5: Alert RPCs use inline org_memberships check without status

- **Severity:** medium  
- **File(s):** `supabase/migrations/20260302101500_alert_system_rpc.sql`  
- **DB object(s):** `public.alert_acknowledge`, `public.alert_resolve`, `public.alert_mute`.  
- **Exact inconsistency:** For `visibility_scope = 'owner_only'`, the RPCs use `EXISTS (select 1 from public.org_memberships om where om.org_id = v_alert.org_id and om.user_id = auth.uid() and om.role = 'owner')` without `and om.status = 'active'`. For `admin_owner` they use `is_org_owner_or_admin` (which is already active-only after S3.2.B.2). So owner_only allows an invited/suspended “owner” to acknowledge/resolve/mute.  
- **Why risky:** Inconsistent with “only active members can perform actions.” Low blast radius (only alert RPCs).  
- **Recommended next patch (small/surgical):** For owner_only branch, use `is_org_owner_or_admin` (already active) or add `and om.status = 'active'` to the inline EXISTS so both branches align with active membership.

---

### Finding 6: enforce_spapi_limit still uses get_org_billing_state (no status sync issue with S3.2)

- **Severity:** low  
- **File(s):** `supabase/migrations/20260303090300_d8_2_plan_enforcement_limits.sql`  
- **DB object(s):** `public.enforce_spapi_limit()`, `public.get_org_billing_state(uuid)`.  
- **Exact inconsistency:** `enforce_spapi_limit` uses `get_org_billing_state` for plan and status; it does not touch `org_memberships` for membership checks (it counts `spapi_connections`). So the only inconsistency is the same as Finding 1: “billing status” comes from `org_billing`, while RLS uses `orgs.billing_status`.  
- **Why risky:** Same dual-source risk as Finding 1 for status; no extra risk from membership status.  
- **Recommended next patch (small/surgical):** Resolved by whatever canonicalizes billing status (see Finding 1); no separate patch needed for spapi.

---

## 3. Dependency map

| Object | Type | Canonical / Legacy / Ambiguous | Notes |
|--------|------|-------------------------------|--------|
| `org_billing_allows_access(p_org_id)` | function | Legacy (orgs-only) | Used by many RLS policies; reads **orgs.billing_status** only. |
| `get_org_billing_state(p_org_id)` | function | Legacy (org_billing) | Returns plan, status from **org_billing**. Used by enforce_seat_limit, enforce_spapi_limit. |
| `get_plan_limits(plan)` | function | Canonical for plan limits | Fixed mapping plan → seats_limit, spapi_limit. Used by both triggers. |
| `is_org_member(check_org)` | function | Canonical | S3.2.B.2: uses **status = 'active'**. Used by RLS. |
| `is_org_owner_or_admin(check_org)` | function | Canonical | S3.2.B.2: uses **status = 'active'**. Used by RLS and alert RPCs. |
| `enforce_seat_limit()` | trigger | Legacy (plan-based limit) | Uses get_org_billing_state + get_plan_limits; counts active members only (S3.2.B). |
| `org_add_member(...)` | RPC | Legacy (orgs.seat_limit) | Uses **orgs.seat_limit** and active count. |
| RLS on tenant tables (projects, suppliers, etc.) | policies | Canonical for membership | Depend on is_org_member + org_billing_allows_access (or owner exception). |
| RLS on org_billing | policy | Legacy (no active filter) | org_billing_select_own: org_memberships without status. |
| RLS on billing_org_entitlements, billing_customers, billing_subscriptions, billing_invoices | policies | Legacy (no active filter) | org_id in (select … org_memberships where user_id) — no status. |
| RLS on billing_org_overrides | policy | Legacy (no active filter) | exists (org_memberships …) — no status. |
| Alert RPCs (owner_only branch) | RPC | Ambiguous | Inline org_memberships check without status = 'active'. |
| `billing_org_entitlements` table | table | Ambiguous | Has billing_status, seat_limit; no DB logic reads them for gating or enforcement. |

---

## 4. Safe next patch recommendation

**Single recommended patch:** **Add `status = 'active'` to all billing-related RLS policies that use `org_memberships`.**

- **Scope:** One migration that updates only the USING clause of:
  - `org_billing_select_own` (org_billing)
  - `billing_org_entitlements_select`
  - `billing_customers_select`
  - `billing_subscriptions_select`
  - `billing_invoices_select`
  - `billing_overrides_select_same_org` (billing_org_overrides)
- **Change:** In each, add `and status = 'active'` (or equivalent for the EXISTS form) to the subquery on `org_memberships`.
- **Rationale:** Aligns billing visibility with S3.2/S3.3.B “active membership only” semantics; low blast radius (only who can read billing tables); no change to billing_status or seat_limit sources. Remaining split-brain (orgs vs org_billing vs entitlements) can be addressed in a later, separate patch.

---

## 5. What NOT to touch yet

- **Do not** change `org_billing_allows_access` to read from `org_billing` or `billing_org_entitlements` in this phase without a single, agreed canonical source and sync story (risk of breaking RLS for all tenant tables).
- **Do not** refactor `org_add_member` and `enforce_seat_limit` to share one seat limit source in the same patch as the RLS active-status change; do the RLS patch first, then a separate migration for seat-limit canonicalization.
- **Do not** add new RPCs or change payloads; this audit is DB/RLS/helper only.
- **Do not** touch frontend, WorkspaceContext, or edge functions; S3.3.B already addressed edge functions.
- **Do not** remove or repurpose `orgs.billing_status` or `orgs.seat_limit` until a canonical source is chosen and migration path is defined.
- **Do not** wire `billing_org_entitlements` into access/limits in this phase; document its current role (read-only for UI) or leave for a later phase.
