# S3.3.L DECISION SCHEDULER BILLING STATUS AUDIT

## 1. Executive verdict

- **Is decision-scheduler billing status logic aligned with current DB gating?** **No.** The scheduler selects orgs with `orgs.billing_status IN ('trialing', 'active')` only. Post-S3.3.K, DB gating uses `org_billing_allows_access(id)`, which prefers `org_billing.status` and falls back to `orgs.billing_status`. So the scheduler still uses the legacy source; it does not use the same “billing allows access” semantics as RLS.

- **Severity:** **medium.** The scheduler can include orgs that RLS considers billing-inactive (e.g. `org_billing.status = 'past_due'` while `orgs.billing_status` remains default `'trialing'`). It does not directly expose data or lock out the admin; it runs background work for orgs that are gated as inactive.

- **Is there credible admin impact risk?** **No.** The risk is over-inclusion: the scheduler may process orgs that are past_due in `org_billing`. There is no path where the admin is wrongly excluded from app access because of this divergence. The admin is identified by membership/RLS; the scheduler only decides which orgs get `syncReorderDecisions` run.

---

## 2. Findings

### Finding 1: Scheduler filters by orgs.billing_status only

- **Severity:** medium  
- **File(s):** `supabase/functions/decision-scheduler/index.ts`  
- **Exact inconsistency:** Lines 49–52: `supabaseAdmin.from("orgs").select("id").in("billing_status", ["trialing", "active"])`. The set of orgs selected is exactly those with `orgs.billing_status` in that list. It does not consider `org_billing.status` or call `org_billing_allows_access`.  
- **Why it matters:** After S3.3.K, “billing allows access” is defined by `org_billing_allows_access` (prefer org_billing, fallback orgs). The scheduler uses only orgs, so if `org_billing` has been updated to past_due/canceled and orgs has not, the scheduler will still include that org and run `syncReorderDecisions` for it. Operationally, we run decision sync for orgs we otherwise treat as billing-inactive.  
- **Recommended next patch (small/surgical):** Align scheduler to the same source: either (a) add a small RPC that returns org ids for which `org_billing_allows_access(id)` is true, and have the scheduler call that RPC instead of querying orgs by billing_status; or (b) have the scheduler query orgs that have a matching “allowed” state from org_billing (e.g. join orgs with org_billing and filter by ob.status IN ('trialing','active'), with a union for orgs with no org_billing row and o.billing_status IN ('trialing','active')). Option (a) reuses the single helper and keeps one place for the rule.

---

### Finding 2: No use of org_billing_allows_access or org_billing in scheduler

- **Severity:** medium (same as above)  
- **File(s):** `supabase/functions/decision-scheduler/index.ts`  
- **Exact inconsistency:** The function does not call any DB helper and does not read `org_billing`. It uses a single table filter on `orgs`.  
- **Why it matters:** Same as Finding 1: the “which orgs are active for billing” rule is duplicated and diverged from the canonical helper.  
- **Recommended next patch:** Same as Finding 1 — align to `org_billing_allows_access` via RPC or equivalent logic.

---

## 3. Recommendation

**Recommendation:** **defer** a patch to the next planned maintenance window, unless you are already touching the decision-scheduler for other reasons.

- **Reason:** Severity is medium; there is no admin lockout or data-exposure risk. The inconsistency is “scheduler may process orgs that are past_due in org_billing.” Aligning the scheduler to `org_billing_allows_access` (e.g. via a small RPC) is a small, surgical change but not urgent. Doing it in a dedicated micro-patch (S3.3.M or similar) keeps the change traceable and avoids mixing with other work.

---

## 4. What NOT to touch

- **Do not** change RLS, `org_billing_allows_access`, or any other billing surface in this audit; scope is scheduler only.
- **Do not** add hardcoded email or org-id exceptions for the admin.
- **Do not** refactor `syncReorderDecisions` or the rest of the scheduler flow; only the “which orgs to select” logic is in scope for a future patch.
- **Do not** connect the scheduler to `billing_org_entitlements` in this pass; alignment with `org_billing_allows_access` (and thus org_billing + orgs fallback) is enough.
