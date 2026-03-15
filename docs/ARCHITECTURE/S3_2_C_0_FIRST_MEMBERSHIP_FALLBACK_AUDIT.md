# S3.2.C.0 FIRST-MEMBERSHIP FALLBACK AUDIT

## 1. Executive summary

- **Total occurrences (first-membership org inference in app code):** 11  
  All in `src/lib/supabase.js`. No other `src` files derive `org_id` from “first org_membership” for tenant operations.
- **High-risk reads:** 1 — `getOrCreateGlobalProject(activeOrgId = null)` can return or create the global project in the wrong org when `activeOrgId` is omitted.
- **High-risk writes:** 11 — Every listed function can write (or insert) tenant data into the org inferred from the first membership row when explicit `org_id`/`activeOrgId` is missing.
- **Top 3 most dangerous functions:**  
  1. **createPayment** — payments are money; wrong org is critical.  
  2. **createDocument** — documents are tenant-scoped; wrong org leaks/confuses data.  
  3. **createWarehouse** — no project/PO to narrow scope; purely first-membership fallback.

---

## 2. Full occurrence table

| # | File | Function | R/W | Affected entity | Fallback pattern | Current behavior | Severity | Classification | Recommended canonical replacement |
|---|------|----------|-----|-----------------|------------------|------------------|----------|----------------|-----------------------------------|
| 1 | src/lib/supabase.js | createProject | WRITE | projects | `org_memberships` by user_id, limit(1), maybeSingle() | If payload has no org_id, uses first membership org; then inserts project. | critical | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId (or org_id in payload); fail fast with missing_org_context if null. |
| 2 | src/lib/supabase.js | createDocument | WRITE | documents | project_id → projects.org_id; else org_memberships user_id limit(1) maybeSingle() | Resolves org from project; if none, first membership. Inserts document. | critical | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or org_id; infer from project_id when present; else fail fast. |
| 3 | src/lib/supabase.js | createPayment | WRITE | payments | project_id → projects.org_id; else org_memberships user_id order(created_at) limit(1) maybeSingle() | Same as above. Inserts payment. | critical | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or org_id; infer from project_id when present; else fail fast. |
| 4 | src/lib/supabase.js | upsertPoAmazonReadiness | WRITE | po_amazon_readiness | purchase_order_id → PO org_id; else org_memberships user_id order(created_at) limit(1) maybeSingle() | Resolves org from PO; if none, first membership. Upserts readiness. | high | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or resolve only from PO; fail if PO has no org_id. |
| 5 | src/lib/supabase.js | createWarehouse | WRITE | warehouses | org_memberships user_id limit(1) maybeSingle() only | No project/PO; purely first membership. Inserts warehouse. | critical | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId (or org_id in payload); fail fast if missing. |
| 6 | src/lib/supabase.js | updateCompanySettings | WRITE | company_settings | On insert path: org_memberships user_id limit(1) maybeSingle() to set org_id | When creating new company_settings, uses first membership to set org_id. | high | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId for create path; or getCompanySettings(orgId) and pass orgId into create. |
| 7 | src/lib/supabase.js | createTask | WRITE | tasks | entity_type/entity_id → project org_id; else org_memberships user_id limit(1) maybeSingle() | Resolves org from project when task tied to project; else first membership. Inserts task. | high | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or org_id; infer from project when entity is project; else fail fast. |
| 8 | src/lib/supabase.js | createStickyNote | WRITE | sticky_notes | project_id → projects.org_id; else org_memberships user_id limit(1) maybeSingle() | Same pattern. Inserts sticky note. | high | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or org_id; infer from project_id when present; else fail fast. |
| 9 | src/lib/supabase.js | convertStickyNoteToTask | WRITE | tasks | sticky note org_id / project → projects.org_id; else org_memberships user_id limit(1) maybeSingle() | When creating task from note, resolves org from note/project; else first membership. | high | HIGH-RISK WRONG-ORG WRITE | Use sticky note’s org_id or project’s org_id only; fail if neither set. |
| 10 | src/lib/supabase.js | createRecurringExpense | WRITE | recurring_expenses | project_id → projects.org_id; else org_memberships user_id limit(1) maybeSingle() | Same pattern. Inserts recurring expense. | high | HIGH-RISK WRONG-ORG WRITE | Require activeOrgId or org_id; infer from project_id when present; else fail fast. |
| 11 | src/lib/supabase.js | getOrCreateGlobalProject | READ+WRITE | projects | activeOrgId optional; if null, org_memberships user_id limit(1) maybeSingle() | Gets or creates “FREEDOLIA (General)” project; org from activeOrgId or first membership. Can return/create in wrong org. | high | HIGH-RISK WRONG-ORG READ + WRITE | Require activeOrgId; remove fallback; fail fast with missing_org_context if null. |

**Not first-membership fallback (excluded from count):**

- **src/contexts/WorkspaceContext.jsx** — Loads all active memberships for user (filtered by status=active); does not use limit(1) to infer a single org for tenant ops. Selection logic uses full list. **N/A.**
- **src/lib/workspace/usage.js** — `getWorkspaceUsage(supabase, orgId)`: orgId is passed in; counts by org_id. **N/A.**
- **src/hooks/useBillingUsage.js** — Counts by org_id (activeOrgId from hook arg). **N/A.**
- **src/pages/Settings.jsx** — Count/list org_memberships by activeOrgId. **N/A.**
- **src/pages/BillingOverSeat.jsx** — Count by activeOrgId. **N/A.**
- **src/lib/workspace/createWorkspace.js** — Inserts into org_memberships for the org just created; does not infer org from another membership. **N/A.**
- **src/lib/automation/validateApprovalActor.js** — `getOrgMemberRole(supabase, { userId, orgId })`: orgId is provided; looks up membership by (user_id, org_id). **LEGACY BUT LOW RISK** (explicit org in params; add status=active filter in future for consistency).

---

## 3. Top 10 removal hit list

Ordered from most dangerous to least.

1. **createPayment** (src/lib/supabase.js ~915–921) — Financial data; wrong org is unacceptable.
2. **createDocument** (src/lib/supabase.js ~826–832) — Tenant documents; wrong org causes cross-tenant leakage/confusion.
3. **createWarehouse** (src/lib/supabase.js ~2119–2130) — No project/PO; 100% first-membership fallback.
4. **createProject** (src/lib/supabase.js ~331–341) — Creates projects in wrong org; high impact.
5. **getOrCreateGlobalProject** (src/lib/supabase.js ~4841–4852) — Read + write in wrong org; used as shared “global” project.
6. **createTask** (src/lib/supabase.js ~2745–2760) — Tasks can be created from multiple entry points; wrong org mixes work.
7. **createStickyNote** (src/lib/supabase.js ~3746–3765) — Same as tasks; sticky notes are tenant-scoped.
8. **createRecurringExpense** (src/lib/supabase.js ~4553–4569) — Recurring expenses are financial; wrong org is high risk.
9. **updateCompanySettings** (src/lib/supabase.js ~2221–2232) — Insert path sets org_id from first membership; can attach settings to wrong org.
10. **upsertPoAmazonReadiness** (src/lib/supabase.js ~1600–1616) — PO usually has org; fallback only when PO missing org; still wrong-org write risk.

**11th:** **convertStickyNoteToTask** (src/lib/supabase.js ~3826–3870) — Prefer deriving org only from note/project; remove first-membership fallback.

---

## 4. Safe next patch recommendation

**Single patch (surgical, high value, limited blast radius):**

- **Patch: Require `activeOrgId` in `createPayment` and remove first-membership fallback.**
  - In `src/lib/supabase.js`, in `createPayment`:
    - Treat `org_id` from payload or `activeOrgId` (add an optional parameter if callers can pass it) as required when `project_id` does not imply org (e.g. when project lookup fails or is not used).
    - Remove the block that queries `org_memberships` by user_id with order/limit(1)/maybeSingle() and assigns `orgId = membership?.org_id`.
    - If after resolving from `project_id` the org is still missing, throw (e.g. “No org context for payment” / missing_org_context) instead of falling back.
  - Update every caller of `createPayment` to pass the current workspace `activeOrgId` (from WorkspaceContext/AppContext) so payment is always created in the intended org.
  - No change to billing logic, routing, or UI design; only payment creation path and its call sites.

This targets the highest-impact write (payments) and establishes the pattern “require explicit org or fail” for one critical path before applying it elsewhere.

---

## 5. What NOT to touch yet

- **Migrations / DB:** Do not change RLS, triggers, or migrations in this audit; scope is app-level first-membership fallback only.
- **WorkspaceContext / App.jsx:** Do not refactor bootstrap or routing; only call sites that need to pass `activeOrgId` into supabase helpers when we change those helpers.
- **Stripe / Edge Functions:** Stripe functions that look up membership by (user, org) with org from request/session are not “first membership” inference; leave them as-is until invitation/status semantics are updated.
- **validateApprovalActor.js:** Uses explicit (userId, orgId); no org inference. Optional future change: filter by status=active in the membership lookup; not required for this audit.
- **getCompanySettings(null):** Uses user_id and company_settings limit(1); it is a different pattern (user-scoped fallback), not first-membership. Do not mix with this patch.
- **Bulk or batch helpers:** Do not change other supabase.js functions beyond the one chosen for the single patch above until that patch is validated.
