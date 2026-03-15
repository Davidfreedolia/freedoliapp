# S3.3.E SEAT LIMIT SOURCE AUDIT

## 1. Executive verdict

- **Is seat-limit source-of-truth canonicalized?** **No.** Seat limit is read from three different places: `orgs.seat_limit`, `org_billing.plan` → `get_plan_limits(plan)`, and `billing_org_entitlements.seat_limit` / feature `team.seats`. No single source is used consistently across enforcement and display.

- **Is there active seat-limit split-brain?** **Yes.** (1) **DB enforcement:** trigger `enforce_seat_limit` uses `get_org_billing_state` → `org_billing.plan` then `get_plan_limits(plan)` (fixed growth=1, pro=5, agency=15). RPC `org_add_member` uses `orgs.seat_limit`. (2) **App gate/usage:** `getWorkspaceUsage` / `useBillingUsage` use `billing_org_entitlements` (feature `team.seats` or `ent.seat_limit`). (3) **UI display:** Settings and BillingOverSeat show `org.seat_limit` (from `orgs`). The Stripe webhook updates only `billing_org_entitlements`; `orgs.seat_limit` is never updated and remains default 1.

- **Is there credible admin lockout risk?** **Medium (display/UX), not login.** The legitimate admin (`david@freedolia.com`) is not at risk of being denied login: access is governed by active membership and RLS. The risk is **incorrect over-seat gating or disabled “Add member”**: if `orgs.seat_limit` stays at 1 while the plan allows more, the Settings page can show “Seat limit 1” and disable adding a second member even though the DB trigger and entitlements would allow it. So the org (including the admin) is “locked out” of adding members by stale UI/display logic, not by being unable to access the app.

- **Top 3 seat-limit risks**
  1. **Three sources, no sync:** `orgs.seat_limit` (default 1, never updated by webhook), `org_billing.plan` → `get_plan_limits`, and `billing_org_entitlements`. Trigger and app/usage can allow N seats while Settings/BillingOverSeat show 1 and block adding members.
  2. **Add-member path split:** The app uses **direct INSERT** into `org_memberships` (Settings.jsx), so the **trigger** is the only DB enforcement. The RPC `org_add_member` uses `orgs.seat_limit` and is not used by the current UI; if ever called, it could block at 1 while the trigger allows 5.
  3. **Stale `orgs.seat_limit` in UI:** Settings and BillingOverSeat read `org.seat_limit` for display and for `seatLimitReached`. That value is never updated by subscription/webhook flows, so it remains 1 and can wrongly disable “Add member” or show a misleading limit.

---

## 2. Findings

### Finding 1: DB enforcement uses two different seat-limit sources (trigger vs RPC)

- **Severity:** high  
- **File(s):**  
  - `supabase/migrations/20260315110000_s3_2b_active_seat_semantics.sql`  
  - `supabase/migrations/20260303090300_d8_2_plan_enforcement_limits.sql`  
- **Exact object(s):** `public.enforce_seat_limit()` (trigger on `org_memberships` INSERT), `public.org_add_member(p_org_id, p_user_id, p_role)`.  
- **Exact inconsistency:**  
  - **Trigger:** `v_seats_limit` from `get_plan_limits(v_plan)` where `v_plan` comes from `get_org_billing_state(NEW.org_id)` → **org_billing.plan** (growth=1, pro=5, agency=15).  
  - **RPC:** `v_seat_limit` from `SELECT o.seat_limit FROM public.orgs o WHERE o.id = p_org_id` (default 1, fallback 1).  
  So the trigger enforces plan-based limits; the RPC enforces the `orgs` column. If `orgs.seat_limit` is 1 and `org_billing.plan` is `pro`, the trigger allows up to 5; the RPC would block after 1.  
- **Why risky:** Direct INSERT (used by Settings) is guarded only by the trigger. If the app were ever switched to call `org_add_member`, behavior would diverge. Even today, any other caller of `org_add_member` would see the stricter (stale) limit.  
- **Recommended next patch (small/surgical):** In `org_add_member`, derive `v_seat_limit` from the same source as the trigger: e.g. get plan from `get_org_billing_state(p_org_id)`, then `get_plan_limits(plan).seats_limit`, with fallback to `orgs.seat_limit` only when `org_billing` has no row. No change to trigger or to who may call the RPC. Preserves admin: owner/admin still the only callers; limit becomes consistent with trigger.

---

### Finding 2: UI display and “seat limit reached” use orgs.seat_limit only

- **Severity:** high  
- **File(s):** `src/pages/Settings.jsx`, `src/pages/BillingOverSeat.jsx`.  
- **Exact object(s):** `seatLimit = org?.seat_limit ?? null` (Settings), `seatLimit = org?.seat_limit ?? 1` (BillingOverSeat); `seatLimitReached` and display of “Seat limit” and disable of “Add member”.  
- **Exact inconsistency:** Both pages load `org` from `supabase.from('orgs').select('*')`, so `seat_limit` is **orgs.seat_limit**. That column is not updated by the Stripe webhook (webhook only upserts `billing_org_entitlements`). So after subscription changes, UI still shows 1 and can show “Seat limit reached” and disable the add-member button even when the plan allows more seats.  
- **Why risky:** Admin or owner sees “1 / 1 seats” and cannot add a second member from the UI, while the DB trigger and entitlements would allow it. No login lockout, but effective “lockout” from adding members.  
- **Recommended next patch (small/surgical):** In Settings and BillingOverSeat, derive displayed and guard seat limit from the same source as the app gate: e.g. use `useBillingUsage(activeOrgId)` or `getWorkspaceUsage` so that `seatsLimit` comes from `billing_org_entitlements` (getOrgFeatureLimit(ent, 'team.seats') ?? ent.seat_limit), and use that for both display and `seatLimitReached`. Keep using `org` for other fields; only replace the source of the seat limit number. No hardcoded email; admin remains identified by active owner/admin membership.

---

### Finding 3: App gate and usage hooks already use billing_org_entitlements

- **Severity:** low (consistency note)  
- **File(s):** `src/lib/workspace/usage.js`, `src/hooks/useBillingUsage.js`, `src/App.jsx`.  
- **Exact object(s):** `getWorkspaceUsage`, `useBillingUsage`, billing gate in App (over_seat redirect).  
- **Exact inconsistency:** None; these paths already use `getOrgEntitlements` → `billing_org_entitlements` and `getOrgFeatureLimit(ent, 'team.seats') ?? ent.seat_limit` for the limit. So the **routing gate** (redirect to over-seat) is based on the same source the webhook updates.  
- **Why risky:** N/A. This is the most canonical app-side source today.  
- **Recommended next patch (small/surgical):** None for this finding. Aligning Settings/BillingOverSeat to this source (Finding 2) is the right direction.

---

### Finding 4: Stripe webhook updates only billing_org_entitlements, not orgs

- **Severity:** medium  
- **File(s):** `supabase/functions/stripe_webhook/index.ts`.  
- **Exact object(s):** `refreshOrgEntitlements`; upsert into `billing_org_entitlements` with `seat_limit: seatLimit`. No update to `orgs.seat_limit`.  
- **Exact inconsistency:** Subscription and overrides determine `seatLimit` (plan or override); it is written only to `billing_org_entitlements`. So `orgs.seat_limit` stays at schema default (1) for the life of the org unless some other code updates it (none found).  
- **Why risky:** Any logic that reads seat limit from `orgs` (RPC `org_add_member`, Settings, BillingOverSeat) sees a stale value. Reinforces split-brain.  
- **Recommended next patch (small/surgical):** Out of scope for a “seat limit source only” patch. Either (a) have the webhook also update `orgs.seat_limit` when it upserts entitlements (then UI could keep using org if desired), or (b) leave webhook as-is and make all consumers use entitlements (Findings 1 and 2). Prefer (b) to avoid dual writes and keep one source of truth.

---

### Finding 5: Settings add-member uses direct INSERT; trigger is the only DB enforcement

- **Severity:** medium  
- **File(s):** `src/pages/Settings.jsx` (handleAddMember).  
- **Exact object(s):** `supabase.from('org_memberships').insert({ org_id, user_id, role: 'member' })`. No call to `org_add_member` RPC.  
- **Exact inconsistency:** The UI checks `seatLimitReached` (from `orgs.seat_limit`) and `assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)` (from `billing_org_entitlements`) before insert. The actual enforcement at INSERT is only the trigger, which uses `get_plan_limits(org_billing.plan)`. So up to three different limits can be in play: display/button (orgs), assert (entitlements), DB (org_billing plan).  
- **Why risky:** If `org_billing.plan` is out of sync with entitlements, the trigger could allow an insert that the app thought it blocked (or the opposite). The most consistent fix is to have one source for both app and DB; the next patch should align DB (org_add_member) and then UI to that source.  
- **Recommended next patch (small/surgical):** Covered by Findings 1 and 2: unify DB enforcement (RPC + trigger) on one source; unify UI display and guards on entitlements so they match the gate and, after patch, the DB.

---

## 3. Source map

| Source / path | Type | Canonical / legacy / ambiguous | Notes |
|---------------|------|--------------------------------|--------|
| **orgs.seat_limit** | column | Legacy | Default 1; not updated by webhook. Used by org_add_member, Settings, BillingOverSeat. |
| **org_billing.plan** → **get_plan_limits(plan)** | function + table | Legacy (trigger only) | Trigger enforce_seat_limit. Fixed mapping growth=1, pro=5, agency=15. |
| **billing_org_entitlements.seat_limit** / **team.seats** | table + feature | Canonical (app) | Updated by Stripe webhook. Used by getWorkspaceUsage, useBillingUsage, App gate, Settings assertOrgWithinLimit. |
| **enforce_seat_limit** (trigger) | enforcement | Legacy source, canonical behavior | Counts active members only; limit from get_plan_limits(org_billing.plan). |
| **org_add_member** (RPC) | enforcement | Legacy | Limit from orgs.seat_limit. Not used by current UI; if used, would diverge from trigger. |
| **getWorkspaceUsage** / **useWorkspaceUsage** | display / gate | Canonical (app) | Limit from entitlements (team.seats / seat_limit). Drives over_seat redirect. |
| **useBillingUsage** | display | Canonical (app) | Same as above. |
| **Settings.jsx** (seat limit display, seatLimitReached, Add member disable) | display / guard | Legacy | Uses org.seat_limit. Can show 1 and disable add when plan allows more. |
| **BillingOverSeat.jsx** (seat limit display) | display | Legacy | Uses org.seat_limit. |
| **Stripe webhook** (refreshOrgEntitlements) | writer | Canonical (entitlements) | Writes seat_limit only to billing_org_entitlements. |
| **billing_org_overrides.seat_limit_override** | override | Compatibility | Used by webhook when building entitlements; not read elsewhere for enforcement in this audit. |

---

## 4. Safe next patch recommendation

**Single recommended patch:** **Unify DB seat limit in `org_add_member` with the trigger (plan-based limit with fallback).**

- **Scope:** One migration that replaces only the seat-limit derivation inside `org_add_member`: instead of `SELECT o.seat_limit FROM public.orgs o WHERE o.id = p_org_id`, compute limit from `get_org_billing_state(p_org_id)` and `get_plan_limits(plan).seats_limit`, and use `orgs.seat_limit` only when `org_billing` has no row (e.g. new org). Same logic as trigger: one source for “plan-based” limit, fallback for legacy orgs without `org_billing`.
- **Rationale:** (1) One DB enforcement path: trigger and RPC agree. (2) No change to who can call the RPC (still owner/admin only); no change to active-membership semantics. (3) Admin safety: the legitimate active admin is already a member; the patch does not change membership or RLS. If the org has no `org_billing` row, fallback to `orgs.seat_limit` (≥1) so existing single-owner orgs are not tightened. (4) No hardcoded email; admin remains “owner/admin” by canonical membership.
- **What not to do in this patch:** Do not change the trigger, do not change the webhook, do not change App gate or useWorkspaceUsage. UI alignment (Settings/BillingOverSeat) can be a separate, follow-up patch so that display and “add member” guard use entitlements-based limit.

---

## 5. What NOT to touch yet

- **Do not** add hardcoded email or user-id exceptions for `david@freedolia.com`; access must remain based on canonical active owner/admin membership and billing rules.
- **Do not** change the trigger `enforce_seat_limit` in the same patch as `org_add_member`; one migration for RPC is enough to remove the DB split-brain.
- **Do not** change the Stripe webhook to write to `orgs.seat_limit` in this phase unless you also commit to making all consumers use `orgs` as the single source (then UI would need to keep using org); current direction is one source (entitlements for app, plan for DB).
- **Do not** refactor Settings or BillingOverSeat in the same patch as the RPC; do the RPC migration first, then a separate UI patch to derive displayed/guard limit from `useBillingUsage` / getWorkspaceUsage.
- **Do not** change `get_plan_limits` mapping (growth/pro/agency) or add new plan codes in this patch.
- **Do not** touch RLS, billing_status, or org_billing_allows_access; out of scope for seat-limit-only audit.
