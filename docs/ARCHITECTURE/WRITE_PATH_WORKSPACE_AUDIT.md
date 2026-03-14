# Write Path Workspace Audit

**Phase:** S2.8 — Write Path Workspace Audit  
**Scope:** All create, update, upsert, and delete operations that touch tenant data.  
**Rules:** Audit only; no code changes, no migrations, no schema changes.

---

## Overview

Previous phases (S2.4–S2.7) normalized **read** paths to use `org_id` / `activeOrgId` where appropriate. **Write** paths were not in scope. This audit maps every identified write operation and classifies it as:

- **Type A — Org-aware:** Insert/update/upsert payload explicitly includes `org_id` (from context, project, or resolution).
- **Type B — RLS-dependent:** Write does not set `org_id` in the payload; tenant isolation depends on RLS or single-row by id.
- **Type C — Legacy:** Write uses only `user_id` (or no tenant field) and does not set `org_id`.

Writes that are org-aware reduce the risk of data being created in the wrong tenant when the same user belongs to multiple orgs. Legacy writes can still be safe if RLS enforces isolation by `user_id`, but they do not align with the canonical workspace model and can block future multi-org correctness.

---

## Write operations

| Location | Table | Operation | org_id in payload? | Classification |
|----------|--------|-----------|--------------------|----------------|
| **src/lib/supabase.js** | projects | insert | Yes (resolved from payload or org_memberships) | **A** |
| **src/lib/supabase.js** | projects | update | No (by id) | **B** |
| **src/lib/supabase.js** | projects | delete | No (by id) | **B** |
| **src/lib/supabase.js** | suppliers | insert | No; user_id only | **C** |
| **src/lib/supabase.js** | suppliers | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | suppliers | delete | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | purchase_orders | insert | No; poData spread only; callers (e.g. NewPOModal) do not pass org_id | **C** |
| **src/lib/supabase.js** | purchase_orders | update | No (by id) | **B** |
| **src/lib/supabase.js** | purchase_orders | delete | No (by id) | **B** |
| **src/lib/supabase.js** | documents | insert | Yes (resolved from project or org_memberships) | **A** |
| **src/lib/supabase.js** | documents | update | No (by id) | **B** |
| **src/lib/supabase.js** | documents | delete | No (by id) | **B** |
| **src/lib/supabase.js** | payments | insert | Yes (user_id + org_id) | **A** |
| **src/lib/supabase.js** | payments | update | No | **B** |
| **src/lib/supabase.js** | payments | delete | No (by id) | **B** |
| **src/lib/supabase.js** | product_identifiers | upsert | Yes (required activeOrgId) | **A** |
| **src/lib/supabase.js** | po_shipments | insert/update | Yes (org_id from PO or payload) | **A** |
| **src/lib/supabase.js** | po_shipments | update (setShipmentStatus) | No (by id) | **B** |
| **src/lib/supabase.js** | warehouses | insert | Yes (user_id + org_id) | **A** |
| **src/lib/supabase.js** | warehouses | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | warehouses | delete | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | company_settings | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | company_settings | insert | No; user_id only | **C** |
| **src/lib/supabase.js** | dashboard_preferences | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | dashboard_preferences | insert | No; user_id only | **C** |
| **src/lib/supabase.js** | project_profitability_basic | upsert | No; onConflict user_id,project_id; no org_id | **C** |
| **src/lib/supabase.js** | tasks | insert | Yes (org_id resolved from project or org_memberships) | **A** |
| **src/lib/supabase.js** | tasks | update | No (by id) | **B** |
| **src/lib/supabase.js** | tasks | delete | No (by id) | **B** |
| **src/lib/supabase.js** | supplier_quotes | insert | No; user_id only | **C** |
| **src/lib/supabase.js** | supplier_quote_price_breaks | insert | No (child table by quote_id) | **B** |
| **src/lib/supabase.js** | supplier_quotes | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | supplier_quotes | delete | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | supplier_sample_requests | upsert | Yes (user_id + org_id from project) | **A** |
| **src/lib/supabase.js** | decision_log | insert | No; user_id only | **C** |
| **src/lib/supabase.js** | decision_log | update | No; .eq('user_id', userId) | **B** |
| **src/lib/supabase.js** | recurring_expenses | insert | Yes (user_id + org_id) | **A** |
| **src/lib/supabase.js** | recurring_expenses | update/delete | No (by id) | **B** |
| **src/lib/supabase.js** | recurring_expense_occurrences | insert | Yes (user_id + org_id from recurring) | **A** |
| **src/lib/supabase.js** | recurring_expense_occurrences | update | No (by id) | **B** |
| **src/lib/supabase.js** | expenses | insert (ensureExpenseForOccurrence) | Yes (user_id + org_id) | **A** |
| **src/lib/supabase.js** | expenses | update (markRecurringExpenseAsPaid, etc.) | No (by id) | **B** |
| **src/lib/supabase.js** | projects (getOrCreateGlobalProject) | insert | Yes (user_id + org_id) | **A** |
| **src/lib/lifecycleEvents/record.js** | lifecycle_events | insert (all record* ) | Yes (org_id in payload) | **A** |
| **src/lib/decision-engine/decisionBridge.js** | decisions | insert | Yes (org_id) | **A** |
| **src/lib/decision-engine/decisionBridge.js** | decision_context, decision_sources, decision_events | insert | No (by decision_id) | **B** |
| **src/lib/decision-engine/decisionBridge.js** | decisions | update | No (by id) | **B** |
| **src/lib/decisions/updateDecisionStatus.js** | decisions | update | No (by id) | **B** |
| **src/lib/decisions/updateDecisionStatus.js** | decision_events | insert | No (by decision_id) | **B** |
| **src/lib/decisions/submitDecisionFeedback.js** | decision_events | insert | No | **B** |
| **src/lib/decisions/trackDecisionViewed.js** | decision_events (or similar) | insert | No | **B** |
| **src/lib/auditLog.js** | audit_log | insert | No; user_id only | **C** |
| **src/lib/workspace/createWorkspace.js** | orgs | insert | No (global create) | **B** |
| **src/lib/workspace/createWorkspace.js** | org_memberships | insert | Yes (org_id, user_id, role) | **A** |
| **src/lib/workspace/createWorkspace.js** | trial_registrations | update | No | **B** |
| **src/pages/ProjectDetailImpl.jsx** | project_events | insert | Yes (project_id, user_id, org_id: project?.org_id) | **A** |
| **src/pages/ProjectDetailImpl.jsx** | expenses | insert | No; user_id only | **C** |
| **src/components/ProjectEventsTimeline.jsx** | project_events | insert | No (project_id only; no org_id) | **C** |
| **src/components/ProjectEventsTimeline.jsx** | project_events | update/delete | No (by id) | **B** |
| **src/pages/Inventory.jsx** | inventory | insert/update | No; dataToSave has no org_id (user_id stripped from payload) | **C** |
| **src/pages/Inventory.jsx** | inventory_movements | insert | No (inventory_id, movement_type, quantity, notes only) | **B** |
| **src/pages/Finances.jsx** | (various) | insert/update/delete | Depends on table; many use user_id or RLS | **B/C** (see Legacy) |
| **src/pages/Settings.jsx** | signatures | insert/update/delete | No; user_id in some; org_memberships insert has org_id | **B** / **A** (membership) |
| **src/pages/Forwarders.jsx**, **Suppliers.jsx** | custom_cities | insert | No (country, city); table has org_id + trigger (S1.3) | **B** |
| **src/pages/Briefing.jsx** | briefings | upsert | No (project_id); RLS | **B** |
| **src/components/IdentifiersSection.jsx** | product_identifiers | insert/update | Via supabase.js (upsert requires activeOrgId) | **A** (if caller passes org) |
| **src/components/RecurringExpensesSection.jsx** | recurring_expenses | update | No (by id) | **B** |
| **src/components/GTINPoolSection.jsx** | gtin_pool (or similar) | update (soft delete) | No | **B** |
| **src/components/LogisticsFlow.jsx** | logistics_flow | insert/update | No | **B** |
| **src/components/SamplesSection.jsx** | (sample-related) | update | No | **B** |
| **src/components/ProfitabilityCalculator.jsx** | project_profitability_basic | upsert | Via supabase; no org_id in upsert | **C** |
| **src/lib/demoSeed.js**, **src/pages/DevSeed.jsx** | (multiple) | insert/update/delete | user_id; dev/demo only | **C** (deferred) |
| **src/lib/automation/** | automation_* tables, automation_events | insert/update | org_id in many automation tables | **A** / **B** (event logs) |
| **src/lib/trials/** | trial_registrations | insert/update | No (global/lead) | **B** |
| **src/pages/ActivationWizard.jsx** | (e.g. org_memberships) | insert | Yes (org_id, user_id, role) | **A** |

---

## Legacy write paths

Writes that use **only `user_id`** (or no tenant field) and **do not set `org_id`**:

| File | Table | Operation | Note |
|------|--------|-----------|------|
| **src/lib/supabase.js** | suppliers | insert | user_id only; table may have org_id column |
| **src/lib/supabase.js** | purchase_orders | insert | poData spread; callers (NewPOModal) do not pass org_id; data can be created without org |
| **src/lib/supabase.js** | company_settings | insert | user_id only |
| **src/lib/supabase.js** | dashboard_preferences | insert | user_id only |
| **src/lib/supabase.js** | project_profitability_basic | upsert | onConflict user_id, project_id; no org_id in record |
| **src/lib/supabase.js** | supplier_quotes | insert | user_id only |
| **src/lib/supabase.js** | decision_log | insert | user_id only |
| **src/lib/auditLog.js** | audit_log | insert | user_id only |
| **src/pages/ProjectDetailImpl.jsx** | expenses | insert | user_id only; no org_id |
| **src/components/ProjectEventsTimeline.jsx** | project_events | insert | project_id only; no org_id (RLS may restrict by project) |
| **src/pages/Inventory.jsx** | inventory | insert | no org_id in dataToSave; table may have user_id/org_id |
| **src/components/ProfitabilityCalculator.jsx** | (via upsertProjectProfitability) | upsert | no org_id |
| **src/lib/demoSeed.js**, **DevSeed.jsx** | multiple | insert/update/delete | user_id; dev/demo only |

**Most critical legacy write:** **purchase_orders insert** in `src/lib/supabase.js` (used by `createPurchaseOrder`). The payload is `{ ...poData }` and callers (e.g. NewPOModal) do **not** pass `org_id`. The table is tenant-scoped; if `org_id` is required by schema or RLS, new rows may be created with null `org_id` or may rely on a trigger. Either way, the application does not set workspace context on create, so the write is not workspace-aware and is the highest-priority fix for write normalization.

---

## RLS-dependent writes

Writes that do not include `org_id` in the payload; isolation depends on RLS or single-row by id:

- **projects** update/delete (by id)
- **suppliers** update/delete (.eq('user_id', userId))
- **purchase_orders** update/delete (by id)
- **documents** update/delete (by id)
- **payments** update/delete (by id)
- **po_shipments** update (setShipmentStatus by id)
- **warehouses** update/delete (.eq('user_id', userId))
- **company_settings** update (.eq('user_id', userId))
- **dashboard_preferences** update (.eq('user_id', userId))
- **tasks** update/delete (by id)
- **supplier_quotes** update/delete (.eq('user_id', userId))
- **supplier_quote_price_breaks** insert (by quote_id)
- **decision_log** update (.eq('user_id', userId))
- **recurring_expenses** update/delete (by id)
- **recurring_expense_occurrences** update (by id)
- **expenses** update (e.g. markRecurringExpenseAsPaid by id)
- **decisions** update (by id); **decision_context**, **decision_sources**, **decision_events** insert (by decision_id)
- **signatures** (Settings) insert/update/delete
- **custom_cities** insert (country, city; trigger sets org_id per S1.3)
- **briefings** upsert (by project_id)
- **project_events** update/delete (ProjectEventsTimeline by id)
- **inventory_movements** insert (by inventory_id)
- **logistics_flow**, **GTINPoolSection**, **SamplesSection** updates
- **automation_events** and related (event logs)
- **trial_registrations**, **orgs** (workspace/trial flows)

---

## Workspace-compliant writes

Writes that **explicitly set `org_id`** in the payload (or resolve it and add it before insert):

- **projects** insert (createProject: org_id from payload or org_memberships; getOrCreateGlobalProject: org_id)
- **documents** insert (createDocument: org_id resolved from project or org_memberships)
- **payments** insert (createPayment: user_id + org_id)
- **product_identifiers** upsert (upsertProductIdentifiers: requires activeOrgId)
- **po_shipments** insert/update (upsertPoShipment: org_id from PO or payload)
- **warehouses** insert (createWarehouse: user_id + org_id)
- **tasks** insert (createTask: org_id resolved from project or org_memberships)
- **supplier_sample_requests** upsert (org_id from project)
- **recurring_expenses** insert (user_id + org_id)
- **recurring_expense_occurrences** insert (user_id + org_id from recurring)
- **expenses** insert in ensureExpenseForOccurrence (user_id + org_id)
- **lifecycle_events** insert (all record*: org_id in payload)
- **decisions** insert (decisionBridge: org_id)
- **org_memberships** insert (createWorkspace, ActivationWizard: org_id, user_id, role)
- **project_events** insert in ProjectDetailImpl (project_id, user_id, org_id: project?.org_id)

---

## Risk assessment

- **High — Write creates tenant data without org_id**
  - **createPurchaseOrder** (purchase_orders insert): Callers do not pass org_id; if the table requires org_id or is used for org-scoped listing, new POs can be created outside the intended workspace or with null org_id.
  - **ProjectDetailImpl expenses insert**: New expense from the create modal has only user_id; expenses are tenant data and should carry org_id (e.g. from project or activeOrgId).
  - **company_settings** and **dashboard_preferences** insert: user_id only; in a multi-org world these are typically per-org; creating without org_id can lead to wrong or shared settings.
  - **supplier_quotes** and **suppliers** insert: user_id only; same risk for multi-org.
  - **decision_log** insert: user_id only; decision log is tenant data.
  - **ProjectEventsTimeline** project_events insert: no org_id; if RLS does not enforce by project’s org, events could be visible across tenants.

- **Medium — Update/delete by user_id or by id**
  - Many updates/deletes use .eq('user_id', userId) or .eq('id', id). They are RLS-dependent or row-scoped; if RLS is correct, risk is lower. If tables are migrated to org_id, these writes may need to use org_id for consistency.

- **Low — Already org-aware**
  - projects (createProject, getOrCreateGlobalProject), documents, payments, po_shipments, warehouses (insert), tasks (insert), recurring_expenses, recurring_expense_occurrences, ensureExpenseForOccurrence, lifecycle_events, decisions (insert), org_memberships, project_events (ProjectDetailImpl) are workspace-compliant for the listed operations.

---

## S2.9 Critical Tenant Write Fixes

**Phase:** S2.9 — Critical Tenant Write Fixes (implementation).

### Writes fixed

| Write path | Change |
|------------|--------|
| **createPurchaseOrder** | Signature `createPurchaseOrder(po, orgId = null)`. Insert payload uses `org_id: orgId ?? poData.org_id`. If neither provided, fallback without org_id and log warning. |
| **NewPOModal** | Calls `createPurchaseOrder(poData, activeOrgId ?? undefined)`. |
| **createSamplePurchaseOrder** | Resolves `org_id` from project and calls `createPurchaseOrder(..., sampleOrgId)`. |
| **createSupplier** | Signature `createSupplier(supplier, orgId = null)`. Insert includes `org_id` when orgId (or supplier.org_id) provided; fallback + console.warn when not. |
| **createForwarder** | Signature `createForwarder(forwarder, orgId = null)`; forwards orgId to createSupplier. |
| **createSupplier callers** | Suppliers.jsx, ProjectDetailImpl, QuotesSection (x2), Forwarders.jsx, RecurringExpensesSection pass `activeOrgId` (or `project?.org_id ?? activeOrgId` where in project context). |
| **createSupplierQuote** | Signature `createSupplierQuote(quote, orgId = null)`. Insert includes org_id when provided; fallback + console.warn when not. |
| **QuotesSection** | Both createSupplierQuote call sites pass `activeOrgId ?? undefined`. |
| **company_settings insert** | In updateCompanySettings, when creating a new row, resolves org_id from org_memberships and adds to insert payload so new company_settings are per-tenant when user has an org. |

### Purchase orders creation — org-aware

- **purchase_orders** creation is now org-aware when callers pass `orgId` (e.g. NewPOModal passes `activeOrgId`, createSamplePurchaseOrder passes project’s org_id). Legacy callers that do not pass orgId still work; a console warning is emitted.

### Writes that remain legacy (unchanged in S2.9)

- **dashboard_preferences** insert: still user_id only (no change).
- **project_profitability_basic** upsert: still no org_id in payload (no change).
- **decision_log** insert: still user_id only (no change).
- **audit_log** insert: still user_id only (no change).
- **ProjectDetailImpl** expenses insert: still user_id only (no change).
- **ProjectEventsTimeline** project_events insert: still no org_id (no change).
- **Inventory** inventory insert/update: not modified (no change).
- **Dev/demo** seed writes: not modified (no change).

---

## Summary counts

| Classification | Count (distinct write paths) | Description |
|----------------|------------------------------|-------------|
| **A — Org-aware** | 18+ | Insert/upsert includes org_id (or resolved and set before insert). |
| **B — RLS-dependent** | 35+ | Update/delete by id or user_id; no org_id in payload; RLS or row scope. |
| **C — Legacy** | 12+ | Insert/upsert uses only user_id or no tenant field; no org_id. |

**Most critical legacy write discovered:** **purchase_orders insert** in `src/lib/supabase.js` (`createPurchaseOrder`). The function inserts `{ ...poData }` and does not add or require `org_id`. Callers (e.g. NewPOModal) build `poData` without `org_id`. Purchase orders are core tenant data; creating them without workspace context can assign POs to the wrong org or leave org_id null, breaking org-scoped lists and reporting.

**After S2.9:** purchase_orders, suppliers, supplier_quotes, and company_settings (insert) creation paths now support and enforce org_id when callers pass activeOrgId or when org is resolved (e.g. from project). Legacy fallback remains with console warning where org_id is not provided.
