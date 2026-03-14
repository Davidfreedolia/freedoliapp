# Secondary Write Normalization Audit

**Phase:** S2.10 — Secondary Write Normalization Audit  
**Scope:** Remaining write paths not addressed in S2.9 (purchase_orders, suppliers, supplier_quotes, company_settings insert).  
**Rules:** Audit only; no code changes, no migrations, no schema changes.

---

## Overview

S2.9 fixed the most critical tenant writes: **purchase_orders**, **suppliers**, **supplier_quotes**, and **company_settings** (insert) now support and enforce `org_id` when callers pass workspace context.

This audit maps **all remaining** write operations (insert / update / upsert / delete) across `src/lib`, `src/pages`, and `src/components`, and classifies them as:

- **Type A — Safe (org-aware):** Payload includes `org_id` or receives orgId from caller; record is created/updated in the correct workspace.
- **Type B — Acceptable (RLS-dependent):** No explicit `org_id` in payload; safety relies on update/delete by primary key or row ownership enforced by RLS.
- **Type C — Legacy:** Uses only `user_id` or lacks workspace awareness; may be acceptable if RLS isolates by user but does not align with canonical workspace model.

---

## Write operations

| Location | Table | Operation | org_id | user_id | Classification |
|----------|--------|-----------|--------|---------|----------------|
| **src/lib/supabase.js** | projects | insert | Yes (resolved) | Yes | **A** |
| **src/lib/supabase.js** | projects | update | No | No (by id) | **B** |
| **src/lib/supabase.js** | projects | delete | No | No (by id) | **B** |
| **src/lib/supabase.js** | suppliers | insert | Yes (S2.9) | Yes | **A** |
| **src/lib/supabase.js** | suppliers | update/delete | No | .eq('user_id') / by id | **B** |
| **src/lib/supabase.js** | purchase_orders | insert | Yes (S2.9) | — | **A** |
| **src/lib/supabase.js** | purchase_orders | update/delete | No | by id | **B** |
| **src/lib/supabase.js** | documents | insert | Yes (resolved) | Yes | **A** |
| **src/lib/supabase.js** | documents | update/delete | No | by id | **B** |
| **src/lib/supabase.js** | payments | insert | Yes | Yes | **A** |
| **src/lib/supabase.js** | payments | update/delete | No | by id | **B** |
| **src/lib/supabase.js** | po_shipments | insert/update | Yes | Yes | **A** |
| **src/lib/supabase.js** | po_shipments | update (setShipmentStatus) | No | by id | **B** |
| **src/lib/supabase.js** | warehouses | insert | Yes | Yes | **A** |
| **src/lib/supabase.js** | warehouses | update/delete | No | .eq('user_id') | **B** |
| **src/lib/supabase.js** | company_settings | insert | Yes (S2.9 resolved) | Yes | **A** |
| **src/lib/supabase.js** | company_settings | update | No | .eq('user_id') | **B** |
| **src/lib/supabase.js** | dashboard_preferences | insert | No | Yes | **C** |
| **src/lib/supabase.js** | dashboard_preferences | update | No | .eq('user_id') | **B** |
| **src/lib/supabase.js** | project_profitability_basic | upsert | No | onConflict user_id,project_id | **C** |
| **src/lib/supabase.js** | tasks | insert | Yes (resolved) | Yes | **A** |
| **src/lib/supabase.js** | tasks | update/delete | No | by id | **B** |
| **src/lib/supabase.js** | supplier_quotes | insert | Yes (S2.9) | Yes | **A** |
| **src/lib/supabase.js** | supplier_quotes | update/delete | No | .eq('user_id') / by id | **B** |
| **src/lib/supabase.js** | supplier_quote_price_breaks | insert/delete | No | by quote_id | **B** |
| **src/lib/supabase.js** | supplier_sample_requests | upsert/update | Yes (from project) | Yes | **A** |
| **src/lib/supabase.js** | decision_log | insert | No | Yes | **C** |
| **src/lib/supabase.js** | decision_log | update | No | .eq('user_id') | **B** |
| **src/lib/supabase.js** | recurring_expenses | insert | Yes | Yes | **A** |
| **src/lib/supabase.js** | recurring_expenses | update/delete | No | by id | **B** |
| **src/lib/supabase.js** | recurring_expense_occurrences | insert | Yes | Yes | **A** |
| **src/lib/supabase.js** | recurring_expense_occurrences | update | No | by id | **B** |
| **src/lib/supabase.js** | expenses | insert (ensureExpenseForOccurrence) | Yes | Yes | **A** |
| **src/lib/supabase.js** | expenses | update (markRecurringExpenseAsPaid, etc.) | No | by id | **B** |
| **src/lib/supabase.js** | sticky_notes | insert | Yes (from project/context) | Yes | **A** |
| **src/lib/supabase.js** | sticky_notes | update/delete | No | by id / .eq('user_id') | **B** |
| **src/lib/supabase.js** | product_identifiers | upsert/insert/update | Yes (activeOrgId) | — | **A** |
| **src/lib/supabase.js** | gtin_pool | update/delete | No | by id / .eq('user_id') | **B** |
| **src/lib/supabase.js** | po_amazon_readiness | upsert/update | No | by po/project | **B** |
| **src/lib/lifecycleEvents/record.js** | lifecycle_events | insert | Yes | — | **A** |
| **src/lib/decision-engine/decisionBridge.js** | decisions | insert | Yes | — | **A** |
| **src/lib/decision-engine/decisionBridge.js** | decision_context, decision_sources, decision_events | insert | No | by decision_id | **B** |
| **src/lib/decisions/submitDecisionFeedback.js** | decision_events | insert | No | by decision_id | **B** |
| **src/lib/auditLog.js** | audit_log | insert | No | Yes | **C** |
| **src/lib/workspace/createWorkspace.js** | orgs | insert | N/A (global) | created_by | **B** |
| **src/lib/workspace/createWorkspace.js** | org_memberships | insert | Yes | Yes | **A** |
| **src/lib/workspace/createWorkspace.js** | trial_registrations | update | No | — | **B** |
| **src/lib/automation/createAutomationExecutionIntent.js** | automation_executions | insert | Yes | — | **A** |
| **src/lib/automation/createAutomationExecutionIntent.js** | automation_events | insert | Yes | — | **A** |
| **src/lib/automation/createAutomationProposal.js** | automation_proposals | insert/update | Yes (proposal row) | — | **A** |
| **src/lib/automation/createAutomationProposal.js** | automation_events | insert | Yes | — | **A** |
| **src/lib/automation/approveAutomationProposal.js** | automation_events | insert | Yes (payload) | — | **A** |
| **src/lib/automation/rejectAutomationProposal.js** | automation_events | insert | Yes (payload) | — | **A** |
| **src/lib/automation/createAutomationApprovalSteps.js** | automation_approvals | insert | — | — | **B** |
| **src/lib/automation/createAutomationApprovalSteps.js** | automation_events | insert | Yes | — | **A** |
| **src/lib/automation/runAutomationExecutionManually.js** | automation_events | insert | — | — | **B** |
| **src/lib/automation/runAutomationExecutionManually.js** | automation_executions | update | No | by id | **B** |
| **src/lib/automation/evaluateAutomationProposalReadiness.js** | automation_events | insert | — | — | **B** |
| **src/lib/trials/registerTrialLead.js** | trial_registrations | insert | No | — | **B** |
| **src/lib/trials/markTrialConverted.js** | trial_registrations | update | No | — | **B** |
| **src/pages/ProjectDetailImpl.jsx** | project_events | insert (phase change) | Yes (project?.org_id) | Yes | **A** |
| **src/pages/ProjectDetailImpl.jsx** | expenses | insert (create modal) | Yes (S2.11: project?.org_id ?? activeOrgId) | Yes | **A** |
| **src/components/ProjectEventsTimeline.jsx** | project_events | insert | No | No | **C** |
| **src/components/ProjectEventsTimeline.jsx** | project_events | update/delete | No | by id | **B** |
| **src/pages/Inventory.jsx** | inventory | insert/update | No | stripped from payload | **C** |
| **src/pages/Inventory.jsx** | inventory_movements | insert | No | No | **B** |
| **src/pages/Finances.jsx** | expenses | insert/update | Yes when activeOrgId | Yes | **A** |
| **src/pages/Finances.jsx** | incomes | insert/update | Yes when activeOrgId | Yes | **A** |
| **src/pages/Finances.jsx** | finance_categories | insert/update/delete | No | Yes / by id | **C** / **B** |
| **src/pages/Finances.jsx** | finance_views | insert/update/delete | No | Yes / by id | **C** / **B** |
| **src/pages/Settings.jsx** | signatures | insert/update/delete | No | stripped / by id | **B** |
| **src/pages/Settings.jsx** | org_memberships | insert | Yes | Yes | **A** |
| **src/pages/Suppliers.jsx** | custom_cities | insert | No (trigger sets org_id) | — | **B** |
| **src/pages/Forwarders.jsx** | custom_cities | insert | No (trigger) | — | **B** |
| **src/pages/Briefing.jsx** | briefings | upsert | No | by project_id | **B** |
| **src/pages/ActivationWizard.jsx** | org_activation | insert | — | — | **B** |
| **src/components/LogisticsFlow.jsx** | logistics_flow | insert/update | Yes when orgId passed | — | **A** / **B** |
| **src/components/IdentifiersSection.jsx** | product_identifiers | insert | Via supabase (activeOrgId) | — | **A** |
| **src/components/IdentifiersSection.jsx** | gtin_pool | update | No | by id | **B** |
| **src/components/GTINPoolSection.jsx** | gtin_pool | update (soft delete) | No | by id | **B** |
| **src/components/ProfitabilityCalculator.jsx** | project_viability | upsert | No | by project_id | **B** |
| **src/components/SamplesSection.jsx** | supplier_sample_requests | update | No | by id | **B** |
| **src/components/RecurringExpensesSection.jsx** | expenses | update | No | by id | **B** |
| **src/lib/demoSeed.js** | (multiple) | insert/update/delete | user_id / dev only | Yes | **C** (deferred) |
| **src/pages/DevSeed.jsx** | (multiple) | insert/delete/update | user_id / dev only | Yes | **C** (deferred) |

---

## Safe writes

Writes that explicitly set `org_id` (or receive it from caller and include it in payload):

- **projects** insert (createProject, getOrCreateGlobalProject)
- **documents** insert (createDocument)
- **payments** insert (createPayment)
- **po_shipments** insert/update (upsertPoShipment)
- **warehouses** insert (createWarehouse)
- **company_settings** insert (updateCompanySettings when creating; S2.9)
- **tasks** insert (createTask)
- **supplier_quotes** insert (createSupplierQuote; S2.9)
- **supplier_sample_requests** upsert/update (createSampleRequestsFromQuotes, etc.)
- **suppliers** insert (createSupplier; S2.9)
- **purchase_orders** insert (createPurchaseOrder; S2.9)
- **recurring_expenses** insert
- **recurring_expense_occurrences** insert
- **expenses** insert in ensureExpenseForOccurrence (supabase.js)
- **sticky_notes** insert (createStickyNote)
- **product_identifiers** upsert/insert (supabase.js with activeOrgId)
- **lifecycle_events** insert (all record* in lifecycleEvents/record.js)
- **decisions** insert (decisionBridge)
- **org_memberships** insert (createWorkspace, Settings invite)
- **project_events** insert in ProjectDetailImpl (phase change with org_id: project?.org_id)
- **expenses / incomes** insert/update in Finances.jsx when activeOrgId is set (data.org_id = activeOrgId)
- **automation_executions** insert, **automation_events** insert (createAutomationExecutionIntent, createAutomationProposal, approve/reject, createAutomationApprovalSteps)
- **automation_proposals** insert/update
- **logistics_flow** insert/update when orgId is passed (LogisticsFlow.jsx)

---

## RLS-dependent writes

Writes that do not include `org_id` in the payload; isolation depends on RLS or single-row by id:

- **projects** update/delete (by id)
- **suppliers** update/delete (.eq('user_id') or by id)
- **purchase_orders** update/delete (by id)
- **documents** update/delete (by id)
- **payments** update/delete (by id)
- **po_shipments** update (setShipmentStatus by id)
- **warehouses** update/delete (.eq('user_id'))
- **company_settings** update (.eq('user_id'))
- **dashboard_preferences** update (.eq('user_id'))
- **tasks** update/delete (by id)
- **supplier_quotes** update/delete (.eq('user_id') or by id)
- **supplier_quote_price_breaks** insert/delete (by quote_id)
- **decision_log** update (.eq('user_id'))
- **recurring_expenses** update/delete (by id)
- **recurring_expense_occurrences** update (by id)
- **expenses** update (e.g. markRecurringExpenseAsPaid, RecurringExpensesSection, Finances by id)
- **sticky_notes** update/delete (by id / .eq('user_id'))
- **product_identifiers** update (by id)
- **gtin_pool** update/delete (by id)
- **po_amazon_readiness** upsert/update (by po/project)
- **decision_context**, **decision_sources**, **decision_events** insert (by decision_id)
- **decisions** update (by id)
- **orgs** insert (global create)
- **trial_registrations** update/insert (global/trial flow)
- **automation_approvals** insert (by proposal)
- **automation_events** insert (some call sites without org_id in payload)
- **automation_executions** update (by id)
- **project_events** update/delete in ProjectEventsTimeline (by id)
- **inventory_movements** insert (by inventory_id)
- **finance_categories** update/delete (by id / .eq('user_id'))
- **finance_views** update/delete (by id)
- **signatures** insert/update/delete (by id; dataToSave without org_id)
- **custom_cities** insert (country, city; trigger sets org_id per S1.3)
- **briefings** upsert (by project_id)
- **org_activation** insert (ActivationWizard)
- **logistics_flow** insert/update when orgId not passed
- **project_viability** upsert (by project_id)
- **supplier_sample_requests** update (SamplesSection by id)

---

## Legacy writes

Writes that use only `user_id` (or no tenant field) and do not set `org_id`:

| Location | Table | Operation | Note |
|----------|--------|-----------|------|
| **src/lib/supabase.js** | dashboard_preferences | insert | user_id only |
| **src/lib/supabase.js** | project_profitability_basic | upsert | onConflict user_id, project_id; no org_id in record |
| **src/lib/supabase.js** | decision_log | insert | user_id only |
| **src/lib/auditLog.js** | audit_log | insert | user_id only |
| **src/components/ProjectEventsTimeline.jsx** | project_events | insert | project_id, title, type, event_date, notes only; no org_id |
| **src/pages/Inventory.jsx** | inventory | insert/update | dataToSave has no org_id (user_id stripped); new rows may lack tenant |
| **src/pages/Finances.jsx** | finance_categories | insert | user_id only |
| **src/pages/Finances.jsx** | finance_views | insert | user_id only |
| **src/lib/demoSeed.js** | multiple | insert/update/delete | user_id; dev/demo only |
| **src/pages/DevSeed.jsx** | multiple | insert/delete/update | user_id; dev only |

---

## Risk assessment

- **Higher impact — tenant data without org_id**
  - **ProjectDetailImpl expenses insert:** Fixed in S2.11; now includes `org_id` (project?.org_id ?? activeOrgId) when available.
  - **ProjectEventsTimeline project_events insert:** New event has `project_id` but no `org_id`. If RLS does not enforce by project’s org, events could be visible across tenants; adding org_id would align with workspace model.
  - **inventory insert/update (Inventory.jsx):** Payload has no org_id (and user_id is stripped). If the table is org-scoped, new/updated rows may not be tied to the active workspace.
  - **decision_log insert:** Audit-style log per entity; user_id only. For org-scoped analytics or filtering, org_id would be needed.
  - **audit_log insert:** Global audit trail with user_id only; same as above for org-scoped reporting.

- **Medium impact — user-scoped or UI preference**
  - **dashboard_preferences** insert: user_id only; often treated as per-user or per-org. If preferences become per-workspace, insert should include org_id.
  - **project_profitability_basic** upsert: keyed by user_id, project_id; no org_id. For multi-org, profitability is per-workspace; org_id would align with model.
  - **finance_categories** / **finance_views** insert: user_id only. If categories/views are shared at org level, org_id would be required.

- **Lower impact — RLS or by-id only**
  - **signatures** (Settings): update/delete by id; insert without org_id. Risk depends on whether signatures are user vs org scoped.
  - **custom_cities**: insert without org_id; trigger sets org_id (S1.3) → acceptable.
  - **Dev/demo seed** writes: excluded from production normalization; keep as-is.

---

## Recommended normalization targets (if any)

Without proposing large refactors, the following **secondary** writes are the best candidates for future normalization (add org_id when context is available):

1. ~~**ProjectDetailImpl expenses insert**~~ — Done in S2.11; expense insert now includes org_id when available.
2. **ProjectEventsTimeline project_events insert** — Add `org_id` from project (e.g. from parent or loadEvents context) so new events are tenant-scoped.
3. **Inventory.jsx inventory insert** — Resolve org_id (e.g. from activeOrgId or project) and include it in dataToSave for new rows.
4. **decision_log insert** (supabase.js) — Accept optional orgId and include org_id in insert when provided (callers in project/decision context can pass project.org_id or activeOrgId).
5. **dashboard_preferences insert** — When creating, resolve org_id from org_memberships (similar to company_settings in S2.9) so new rows are per-tenant if schema supports it.
6. **project_profitability_basic upsert** — Include org_id in the upsert record when available (e.g. from project or activeOrgId) for consistent workspace-scoped profitability.

No change recommended for: **audit_log** (global audit trail may stay user-scoped), **finance_categories** / **finance_views** (unless product decision is to make them org-scoped), **Dev/demo** seed code.

---

## S2.11 Financial Tenant Write Fixes

**Phase:** S2.11 — Financial Tenant Write Fixes (implementation).

### ProjectDetail expense insert fix

- **File:** `src/pages/ProjectDetailImpl.jsx`
- **Change:** Expense creation from the project detail create modal now includes `org_id` when available. `orgId` is set to `project?.org_id ?? activeOrgId ?? null` and added to the insert payload via `...(orgId && { org_id: orgId })`, so new expenses are linked to the correct workspace and financial reports remain correct in multi-org.

### Confirmation: expenses now support org_id

- **ProjectDetailImpl:** Expense insert now includes `org_id` (from project or activeOrgId) when in a workspace context.
- **Finances.jsx:** Expense and income insert/update already set `data.org_id = activeOrgId` when `activeOrgId` is present (`if (activeOrgId) data.org_id = activeOrgId`). No change required.
- **ensureExpenseForOccurrence** (supabase.js): Already resolves `org_id` from the recurring expense’s project (or global project) and includes it in the expense insert payload. Recurring expenses continue to propagate org_id; no change required.

### Remaining financial legacy writes

- **finance_categories** insert (Finances.jsx): still user_id only; not changed in S2.11.
- **finance_views** insert (Finances.jsx): still user_id only; not changed in S2.11.
- **project_profitability_basic** upsert (supabase.js): still no org_id in record; not changed in S2.11.

---

## Summary counts (remaining / secondary)

| Classification | Count (distinct write paths) |
|----------------|------------------------------|
| **A — Safe (org-aware)** | 30+ |
| **B — RLS-dependent** | 45+ |
| **C — Legacy** | 11+ |

**Most risky remaining legacy write (after S2.11):** **ProjectEventsTimeline project_events insert** (`src/components/ProjectEventsTimeline.jsx`): new events have `project_id` but no `org_id`. Next-highest: **Inventory.jsx** inventory insert (no org_id in payload). **ProjectDetailImpl expenses insert** was fixed in S2.11 and now includes org_id when available.
