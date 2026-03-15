# S3.2.C FINAL VERIFICATION AUDIT

## Executive verdict

- **S3.2.C complete:** yes  
- **Remaining dangerous occurrences:** 0  
- **Top remaining risk:** none (no first-membership org inference left in app code)

## Remaining occurrences

**None.** No remaining code in `src` derives `org_id` from the first `org_memberships` row for reads or writes.

Verified:

- **src/lib/supabase.js:** No references to `org_memberships` or `membership`. All previous first-membership fallbacks (createPayment, createDocument, createWarehouse, createProject, getOrCreateGlobalProject, createTask, createRecurringExpense, createStickyNote, convertStickyNoteToTask, upsertPoAmazonReadiness, updateCompanySettings insert) have been removed and replaced with payload/activeOrgId/entity-derived org or fail-fast.
- **Remaining org_memberships usages in src (all safe):**
  - **useBillingUsage.js:** Count by `.eq('org_id', orgId).eq('status', 'active')` — org is passed in; not inference.
  - **Settings.jsx:** Count/list by `.eq('org_id', activeOrgId)`; insert with explicit `org_id: org.id` — not inference.
  - **BillingOverSeat.jsx:** Count by `.eq('org_id', activeOrgId)` — not inference.
  - **WorkspaceContext.jsx:** Load all active memberships for user (no limit(1)); used to build workspace list and choose activeOrgId — not “first row wins” for a tenant write.
  - **validateApprovalActor.js:** Lookup by `.eq('user_id', userId).eq('org_id', orgId)` — orgId is provided; not inference.
  - **usage.js:** Count by `.eq('org_id', orgId)` — orgId passed in; not inference.
  - **createWorkspace.js:** Insert with `org_id: org.id` (org just created) — not inference.

No occurrence in the list above uses `limit(1)` or `order(...).limit(1)` on `org_memberships` to derive org for a tenant-scoped write or read.

## Recommended next step

**Close S3.2.C.** No further patch required for first-membership fallback removal in app code. Optional follow-ups (out of scope for this audit): add `status = 'active'` to validateApprovalActor membership lookup for consistency with S3.2.B guards; document the canonical “require activeOrgId or entity-derived org” pattern for future helpers.

## Notes

- Verification was repo-grounded: grep for `org_memberships`, `limit(1)`, `maybeSingle`, and `select('org_id')` in `src`, and confirmed that no remaining pattern in `src/lib/supabase.js` or elsewhere derives org from the first membership row.
- Migrations and Supabase Edge Functions were not in scope; only app code under `src` was audited.
