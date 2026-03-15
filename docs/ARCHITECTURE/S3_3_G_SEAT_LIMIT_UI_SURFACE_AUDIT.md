# S3.3.G SEAT LIMIT UI SURFACE ALIGNMENT AUDIT

## 1. Executive verdict

- **Is UI seat-limit display canonicalized?** **No.** Two pages (Settings, BillingOverSeat) still read seat limit from `org.seat_limit` (org loaded from `orgs` table). The rest of the app (App gate, Billing page, HomeBillingUsage, WorkspaceLimitAlert, LimitReachedBanner) uses usage from `useWorkspaceUsage` / `getWorkspaceUsage`, which derives limit from `billing_org_entitlements` (canonical).

- **Is there active UI seat-limit split-brain?** **Yes.** Settings and BillingOverSeat show and guard with `orgs.seat_limit` (never updated by webhook; typically 1). The routing gate and other billing/usage surfaces use entitlements-based limit. So the same org can see “1 / 1 seats” and a disabled “Add member” in Settings while the Billing page and over-seat gate use the real plan limit (e.g. 5).

- **Is there credible UX/admin lockout risk?** **Yes.** The legitimate active admin can open Settings, see “Seat limit 1” and a disabled “Add member” button when the plan actually allows more seats. They are not locked out of the app (gate uses canonical usage), but they are blocked from using “Add member” in the UI due to stale `org.seat_limit`. No hardcoded exception is needed; fixing the source of the displayed/guard limit removes the risk.

- **Top 3 UI seat-limit risks**
  1. **Settings: display + action guard from orgs.seat_limit** — “Seat limit” label and value, `seatLimitReached`, and disabled “Add member” all use `org?.seat_limit`. When that stays 1, the button stays disabled even when DB and entitlements allow more.
  2. **BillingOverSeat: display from orgs.seat_limit** — After redirect to over-seat (which is correct per canonical usage), the page shows `seatsUsed / seatLimit` with `seatLimit = org?.seat_limit ?? 1`, so the number can show “2 / 1” or similar inconsistent copy.
  3. **Double guard in Settings** — `handleAddMember` also calls `assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)`, so the real server-side guard is entitlements-based; only the UI disable and toast use stale org. Aligning the UI to the same source removes the inconsistency and avoids unnecessary “blocked” UX.

---

## 2. Findings

### Finding 1: Settings.jsx — display and action guard use orgs.seat_limit

- **Severity:** high  
- **File(s):** `src/pages/Settings.jsx`  
- **Exact object(s):** `org` from `loadWorkspace` (supabase.from('orgs').select('*')); `seatLimit = org?.seat_limit ?? null`; `seatLimitReached = seatLimit != null && seatsUsed >= seatLimit`; display `{org.seat_limit ?? '—'}`; disabled state `disabled={seatLimitReached || ...}`; toast in `handleAddMember` when `seatLimitReached`; warning paragraph when `seatLimitReached`.  
- **Exact inconsistency:** Seat limit for display and for “seat limit reached” / “Add member” disabled is taken only from `orgs.seat_limit`. That column is not updated by the webhook, so it remains default 1. Entitlements (and DB trigger) may allow more; the UI then blocks the admin from adding a second member.  
- **Why risky:** Real admin sees “1 / 1 seats”, disabled “Add member”, and “Seat limit reached” even when the plan allows more. No login lockout; UX lockout from adding members.  
- **Recommended next patch (small/surgical):** In Settings (Workspace tab), add `useBillingUsage(activeOrgId)` (or use existing pattern that provides entitlements-based limit). Derive `seatLimit` and `seatLimitReached` from `seatsLimit` (and optionally `seatsUsed`) from that hook instead of from `org.seat_limit`. Keep displaying that same value in “Seat limit” and use it for the button disable and warning. Do not change `handleAddMember` logic beyond removing the redundant early return when “limit reached” if you align the guard to the same source (so the guard and assert stay consistent). No hardcoded email; admin remains owner/admin via canonical membership.

---

### Finding 2: BillingOverSeat.jsx — display uses orgs.seat_limit

- **Severity:** medium  
- **File(s):** `src/pages/BillingOverSeat.jsx`  
- **Exact object(s):** `org` from state (from supabase.from('orgs').select('*')); `seatLimit = org?.seat_limit ?? 1`; display in `billingOverSeat_seatsCount` as `{ seatsUsed, seatLimit }`.  
- **Exact inconsistency:** User is sent to this page when `usage.limitsReached` includes 'seats' (canonical). The page then shows seats used and limit; the limit is taken from `orgs.seat_limit` (stale). So the copy can show e.g. “2 / 1 seats” (seatsUsed from active count, seatLimit 1) or a mismatched pair if org.seat_limit were ever updated elsewhere.  
- **Why risky:** Confusing or inconsistent numbers on the over-seat screen; no direct action guard here (no “Add member”), but the message and CTA are clearer if the displayed limit matches the gate that sent the user here.  
- **Recommended next patch (small/surgical):** In BillingOverSeat, derive seat limit (and optionally seats used) from the same source as the gate: e.g. call `useBillingUsage(activeOrgId)` and use `seatsLimit` (and `seatsUsed`) for the displayed `billingOverSeat_seatsCount`. Keep the rest of the page (org for other needs, CTAs) unchanged. Safe for admin: they already reached this page because canonical usage said over limit; showing the same limit here is consistent.

---

### Finding 3: App gate, Billing, and shared components already use canonical usage

- **Severity:** low (consistency note)  
- **File(s):** `src/App.jsx`, `src/pages/Billing.jsx`, `src/components/billing/LimitReachedBanner.jsx`, `src/components/billing/WorkspaceLimitAlert.jsx`, `src/components/home/HomeBillingUsage.jsx`.  
- **Exact object(s):** `useWorkspaceUsage()` → `usage.limitsReached`, `usage.seats`; `LimitReachedBanner` with `used={usage?.seats?.used}`, `limit={usage?.seats?.limit}`; `WorkspaceLimitAlert(usage)` using `usage.seats?.limit`; `HomeBillingUsage` with `usage?.seats?.limit`.  
- **Exact inconsistency:** None; these paths use usage from `getWorkspaceUsage` (entitlements: `getOrgFeatureLimit(ent, 'team.seats') ?? ent.seat_limit`).  
- **Why risky:** N/A.  
- **Recommended next patch (small/surgical):** None for this finding. These are the reference for “canonical” UI seat limit.

---

### Finding 4: useOrgBilling does not expose seat limit

- **Severity:** low  
- **File(s):** `src/hooks/useOrgBilling.js`  
- **Exact object(s):** Hook fetches `org_billing` (plan, status, trial_ends_at, etc.); return value has no seat_limit.  
- **Exact inconsistency:** N/A. Seat limit is not part of this hook; no change needed for seat-limit alignment.  
- **Why risky:** N/A.  
- **Recommended next patch (small/surgical):** None. Optional future: if a single “workspace billing summary” hook were to expose both billing state and usage (including seats limit), it could be used by Settings/BillingOverSeat; out of scope for this audit.

---

### Finding 5: Settings also displays org.billing_status (same legacy org fetch)

- **Severity:** low (out of scope for seat-only patch)  
- **File(s):** `src/pages/Settings.jsx`  
- **Exact object(s):** In the same Workspace block, “Status” shows `org.billing_status ?? '—'` (from `orgs`).  
- **Exact inconsistency:** Same `org` row that carries stale `seat_limit` carries `billing_status` (also not updated by current webhook to orgs). For seat-limit alignment we only change where seat limit comes from; we do not need to change billing_status display in this patch.  
- **Why risky:** If we later canonicalize billing status display, it would be a separate change.  
- **Recommended next patch (small/surgical):** Do not include billing_status in the seat-limit UI patch. Document as “what NOT to touch yet” if desired.

---

## 3. Source map

| Surface | Type | Canonical / legacy / ambiguous | Notes |
|--------|------|--------------------------------|--------|
| **App.jsx** (over_seat gate) | action guard (routing) | Canonical | `usage?.limitsReached?.includes('seats')` from useWorkspaceUsage. |
| **Settings.jsx** (Seat limit label, value, seatLimitReached, Add member disabled, warning, handleAddMember early return) | display + action guard | Legacy | `org.seat_limit` from loadWorkspace (orgs). |
| **Settings.jsx** (assertOrgWithinLimit in handleAddMember) | action guard (server-side) | Canonical | getOrgEntitlements → team.seats. |
| **BillingOverSeat.jsx** (seatsCount display) | display | Legacy | `org?.seat_limit ?? 1` from orgs. |
| **Billing.jsx** (LimitReachedBanner seats, Usage block seats) | display | Canonical | usage from useWorkspaceUsage. |
| **WorkspaceLimitAlert** | display / informational | Canonical | usage from parent (App → useWorkspaceUsage). |
| **HomeBillingUsage** | display | Canonical | usage from parent (useHomeDashboardData → useWorkspaceUsage). |
| **useWorkspaceUsage** | hook | Canonical | getWorkspaceUsage → entitlements. |
| **useBillingUsage** | hook | Canonical | getOrgEntitlements → team.seats / seat_limit. |
| **useOrgBilling** | hook | N/A (no seat limit) | org_billing only; no seat_limit. |
| **LimitReachedBanner** | display / CTA | Compatibility | Receives used/limit from parent; parent (Billing) passes canonical usage. |

---

## 4. Safe next patch recommendation

**Single recommended patch:** **Align Settings.jsx Workspace-tab seat limit to canonical source (useBillingUsage).**

- **Scope:** Only the Settings page, Workspace tab: (1) Add `useBillingUsage(activeOrgId)` (or equivalent that exposes entitlements-based `seatsLimit` and `seatsUsed`). (2) Derive `seatLimit` from `seatsLimit` (with a fallback for loading or null, e.g. `org?.seat_limit ?? null` so existing behavior holds until data loads). (3) Derive `seatLimitReached` from the same canonical limit and seats used. (4) Use that limit for the “Seat limit” display, the “Add member” disabled state, the warning paragraph, and the early return in `handleAddMember`. Do not change who can add members (still owner/admin via RLS and existing checks); do not add any email-based exception.
- **Rationale:** Settings is the only UI that both displays seat limit and guards an action (Add member) with it. Aligning it to the same source as the App gate and the DB (entitlements / plan-based) removes the UX “locked out of adding members” case. One page, one hook, minimal blast radius.
- **Follow-up (separate patch):** BillingOverSeat display can be aligned to the same source in a second small patch so the over-seat page shows the same limit that triggered the redirect.

---

## 5. What NOT to touch yet

- **Do not** add hardcoded email or user-id exceptions for the admin; safety must remain canonical owner/admin membership and billing logic only.
- **Do not** change useWorkspaceUsage, getWorkspaceUsage, or useBillingUsage contract or implementation in this patch; only consume them in Settings (and later BillingOverSeat).
- **Do not** change orgs table, DB enforcement, webhook, or RLS as part of UI alignment.
- **Do not** refactor the whole Settings page or add new “admin console” features; S3.4.A remains a future phase.
- **Do not** change the display of `org.billing_status` in Settings in the same patch as seat limit; that is a separate canonicalization if needed later.
- **Do not** remove the `assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)` call in handleAddMember; keep it as the server-side guard. The UI guard (disabled + toast) should simply use the same limit so they agree.
