# FREEDOLIAPP V1 — Product Scope

## 1. Purpose

FREEDOLIAPP V1 defines the **first production-ready version** of the platform for Amazon-first commerce operators.  
It focuses on giving a small team or seller everything they need to **plan, buy, track, and decide** around their Amazon catalogue inside a multi-tenant, billing-aware SaaS workspace.

V1 is not “feature complete” for all future ambitions; it is the **minimum coherent product** that can support real businesses with real money at stake.

---

## 2. Core capabilities included in V1

### Platform

- Multi-tenant **workspace/org model** with roles (owner/admin/member).  
- **RLS-enforced** data isolation by `org_id`.  
- Stripe-backed **billing and seat gating** for workspaces.  
- Stable navigation and workspace switching inside `/app`.

### Operations

- **Projects** as the core unit of work for products and initiatives.  
- **Suppliers** and basic procurement data.  
- **Purchase Orders** linked to projects and suppliers, with amounts, currencies and items.  
- **Inventory and stock signals** sufficient for operational decisions (e.g. when to reorder).  
- Support for **notes / operational context** around projects and orders.

### Amazon integration

- Amazon-first workflows for **profitability and operations** (as defined in existing D-docs).  
- Data structures that can represent Amazon-centric catalogue, orders and performance metrics.  
- Decision and automation layers assuming **Amazon as the primary channel**.

### Decision engine

- Canonical **decision model**: decisions, context, sources and events.  
- **Scheduler** to trigger decision runs.  
- **Decision inbox** for operators to review and act.  
- **Decision notifications** and basic decision analytics (D32–D40, D53–D56).

### Automation system

- Full **D57 automation stack**:
  - `automation_rules`, `automation_proposals`, `automation_approvals`, `automation_executions`, `automation_events`.  
  - Proposal engine, approval gate, readiness gate, execution intent layer, and **manual execution trigger**.  
- Clear separation between **ready for execution** and actual (soft) execution.  
- Human-governed automation: operators must approve and trigger.

### Analytics

- Decision analytics for monitoring **decision performance and coverage**.  
- Automation analytics (D59): metrics summary, funnel, risk distribution, execution reliability, velocity.  
- Read-only, **org-scoped** analytics that never bypass RLS or billing gates.

### UI surfaces

- Core app shell and navigation for `/app`.  
- Dashboards and operational views for projects, suppliers, POs, inventory and finances.  
- **Decision Inbox** and related decision views.  
- **Automation Operator UI** (D58): inbox, proposal detail, approvals, executions, activity timeline.  
- **Automation Analytics** dashboard (D59).

---

## 3. Partial systems in V1

These systems **exist but are not yet fully complete**; V1 ships with a usable, Amazon-first subset.

### Identity improvements

- Supabase auth with **email/password** and **magic link** login is in place.  
- Role-based access via `org_memberships` is enforced.  
- Google OAuth, provider linking and fully unified recovery flows remain **post-V1 enhancements**.

### Lead system completion

- **trial_registrations** and UTM/source capture exist, with dedupe and workspace linking.  
- V1 does **not** yet expose a canonical, cross-team **lead object** or full lead lifecycle reporting.

### Onboarding improvements

- **ActivationWizard** and an **Amazon-first activation path** exist for new workspaces.  
- V1 does not yet include a fully generalized, role-aware onboarding for all user types and channels.

### UX consolidation

- Multiple modules (decisions, automation, analytics, core ops) are usable and consistent enough for V1.  
- A dedicated **UI/UX consolidation phase** is planned post-V1 to unify components, layouts and patterns.

---

## 4. Explicitly excluded from V1

These items are **out of scope** for FREEDOLIAPP V1 and must not block go-live.

- **Listing Intelligence**: keyword research, listing draft builder, content scoring and publishing flows.  
- **Assistant layer**: copilot/assistant experiences on top of decisions, automation and analytics.  
- **Shopify connector**: native Shopify integration for products, orders and inventory.  
- **eBay connector**: native eBay integration; all non-Amazon marketplaces are post-V1.

---

## 5. Success criteria for V1

For V1 to be considered successful, a seller (or small team) must be able to:

- Create and manage **one or more workspaces** with correct roles and billing.  
- Model their **products, suppliers and purchase orders** inside FREEDOLIAPP.  
- Track **inventory and stock signals** well enough to plan reorders and avoid stockouts.  
- Use the **Decision engine** to surface actionable, Amazon-centric decisions.  
- Use the **Automation system** to receive **automation proposals**, approve them, queue executions and run **manual executions** (soft execution) with full audit trail.  
- Monitor **automation performance and risk** via the Automation Analytics dashboard.  
- Operate day-to-day work from the app UI (dashboards, inboxes, detail views) **without needing external spreadsheets** for the core flows V1 targets.

If a seller can reliably run these workflows inside FREEDOLIAPP, with correct tenant isolation and billing enforcement, V1 is delivering its intended value.

