# FREEDOLIAPP — Master Product Architecture

Status: Current source-of-truth overview (post D59)  
Scope: High-level product definition, core architecture, functional layers, and documentation map.

This document is the **top-level reference** for how FREEDOLIAPP is structured as a product and platform. It sits above detailed architecture specs (D-series docs), systems docs, and operations guides.

---

## 1. Product Definition

FREEDOLIAPP is an **Amazon seller operating system** evolving into a broader commerce control center. It is:

- a **multi-tenant SaaS** platform where each organization (workspace) is a tenant,
- designed for **human-governed automation** — the system proposes and prepares actions, while operators approve, trigger, and supervise,
- focused on **analytics visibility** — decisions, automation, and financials are traceable and auditable,
- oriented around **projects and operations**, not just static reports.

Target users include solo Amazon sellers, teams, and agencies managing multiple sellers, all working inside clearly separated workspaces.

---

## 2. Current Core Architecture

### Tenant boundary

- **Workspace / org is the tenant boundary.**  
  All business data is scoped by `org_id`. User-based tenancy is deprecated.

### Multi-tenant discipline

- **`org_id` is mandatory** on tenant data tables (decisions, automation, finance, inventory, etc.).
- RLS policies enforce access based on org membership and billing status.

### Role model

- Roles are attached via `org_memberships`:
  - **owner**
  - **admin**
  - **member**
- Owners/admins can typically manage billing and high-risk operations; members have restricted or view-only access for security-sensitive flows (e.g., automation approvals and executions).

### Billing and feature gating

- Billing state (trial/active/past_due/canceled) is stored on `orgs` and enforced via:
  - **RLS helpers** (e.g., `org_billing_allows_access`),
  - **UI gates** (locked / over-seat pages),
  - **Stripe** integration for checkout, portal, and webhooks.
- Some modules and automation levels may be **gated by plan** or billing state in future phases.

### Production discipline

- Data changes flow through **explicit migrations** and documented architecture decisions (D-files).
- Security and RLS are treated as **non-negotiable constraints**: all new tables must be org-scoped and protected.
- Production readiness is tracked via dedicated docs (`PRODUCTION_READINESS_PLAN.md`, `GO_LIVE_CHECKLIST.md`, etc.).

---

## 3. Functional Product Layers

The product can be viewed as a set of layers, from platform to operator experience.

### Platform / tenant model

- Org + membership model (workspace selection, seat limits, billing).
- RLS and multi-tenant guards as first-class architectural primitives.

### Identity & access

- Supabase auth as identity provider.  
- Role-based access tied to `org_memberships`.  
- Identity/auth completion (social auth, recovery flows) is documented as a **gap** (see section 5).

### Core operations

- Projects, suppliers, purchase orders, logistics, notes, and related operational views.  
- Provide the backbone for real-world business workflows inside each workspace.

### Financial layer

- Profit, cashflow, and finance-related modules that track commercial performance.  
- Integrate with orders, costs, and other data to inform decisions and automation.

### Decision system

- Canonical decisions captured in `decisions`, `decision_context`, `decision_sources`, `decision_events`.  
- Scheduler, inbox, notifications, and analytics around decisions (D32–D40, D53–D56).

### Automation system

- D57 automation architecture and data model (`automation_rules`, `automation_proposals`, `automation_approvals`, `automation_executions`, `automation_events`).  
- Readiness gates, approval gates, execution intents, and manual execution helpers (D57.1–D57.6).  
- Automation is **never blind**: human approval and readiness checks are required before actions.

### Operator console

- D58 Automation Operator UI:  
  - Automation Inbox  
  - Proposal Detail (approval + execution panels)  
  - Automation Activity timeline  
- Designed for human operators to supervise and act on automation proposals.

### Automation analytics

- D59 analytics layer:  
  - Metrics summary (proposals/executions by status)  
  - Funnel stats (decision → proposal → approval → execution)  
  - Risk distribution and execution reliability  
  - Velocity of proposals over time  
- Read-only; no business logic or mutations.

### Product gaps / future layers

Several layers are intentionally documented but **not yet fully implemented** (see section 5):

- Identity/Auth completion
- Lead capture and trial funnel
- Onboarding flows
- Listing Intelligence
- Shopify (and other channel) integration
- Assistant / copilot layer
- Global UI/UX consolidation
- Observability expansion

### Implementation status summary (post D59)

| Layer / system             | Status          | Notes                                                                 |
|----------------------------|-----------------|-----------------------------------------------------------------------|
| Platform / tenant model    | Implemented     | orgs, org_memberships, RLS, billing gating, workspace switching      |
| Identity & access          | Partial         | Supabase auth + email/password + magic link; Google OAuth pending    |
| Lead system                | Partial         | trial_registrations + UTM + dedupe + workspace linking               |
| Onboarding                 | Partial         | ActivationWizard + Amazon-first activation; general SaaS pending     |
| Core operations            | Implemented     | projects, suppliers, POs, inventory and related workflows            |
| Financial layer            | Partial         | core profit/cashflow flows exist; need further hardening             |
| Decision system            | Implemented     | D32–D40, D53–D56 decision engine, inbox, notifications, analytics    |
| Automation system          | Implemented     | D57 data model, proposals, approvals, readiness, execution intents   |
| Operator console (D58)     | Implemented     | automation inbox, detail, approvals, executions, activity            |
| Automation analytics (D59) | Implemented     | metrics, funnel, risk, reliability, velocity dashboards              |
| Listing Intelligence       | Documented only | architecture stub; no runtime implementation yet                     |
| Shopify integration        | Documented only | connector stub; no runtime implementation yet                        |
| Assistant layer            | Documented only | assistant stub; no runtime implementation yet                        |
| Global UI/UX consolidation | Partial         | UI exists; dedicated consolidation phase still to be executed        |
| Observability expansion    | Partial         | baseline observability exists; broader dashboards & tracing pending  |

---

## 4. Current Implemented Systems

Below is a non-exhaustive overview of high-level modules that already exist in the product.

- **Projects**: project-centric view of products and initiatives, used as the backbone for many workflows.  
- **Suppliers**: supplier records, quotes, and logistics connections.  
- **Purchase Orders**: POs linked to projects and suppliers, integrated with inventory and cashflow.  
- **Inventory**: stock signals, ledgers, and alerts (e.g., stockout risk).  
- **Finances / Profit / Cashflow**: profit analysis, cashflow forecasting, and finance dashboards.  
- **Billing**: workspace billing state, Stripe integration, locked/over-seat screens, and seat enforcement.  
- **Decision engine**: core decision model, scheduler, inbox, notifications, and analytics (D32–D40, D53–D56).  
- **Automation operator UI (D58)**: inbox, detail views, approvals, execution panels, and activity feed.  
- **Automation analytics (D59)**: metrics, funnel, risk, reliability, and velocity dashboards for automation.

These modules are at different maturity levels, but they share the same **multi-tenant, org-scoped foundation**.

---

## 5. Systems Still Missing or Partial

Several strategically important layers are only partially implemented or still conceptual. They are documented in more detail in `docs/ARCHITECTURE/PRODUCT_ROADMAP_GAPS.md` and dedicated stubs under `docs/PRODUCT` and `docs/SYSTEMS`.

- **Identity/Auth completion** (`docs/ARCHITECTURE/IDENTITY_SYSTEM.md`)  
  - Consolidated login (Google + email), recovery flows, and stable identity contracts across modules.
- **Lead capture** (`docs/PRODUCT/LEAD_SYSTEM.md`)  
  - Canonical lead object and flow from lead → trial → workspace → customer.
- **Onboarding** (`docs/PRODUCT/ONBOARDING_FLOW.md`)  
  - First-time experience, workspace creation, seller profile, and minimal configuration.
- **Listing Intelligence** (`docs/SYSTEMS/LISTING_INTELLIGENCE.md`)  
  - Keyword research, content generation, optimization scoring, and draft management.
- **Shopify integration** (`docs/SYSTEMS/SHOPIFY_INTEGRATION.md`)  
  - Store connection, product/order/inventory sync for DTC brands.
- **Assistant layer** (`docs/SYSTEMS/ASSISTANT_LAYER.md`)  
  - Contextual copilot on top of decisions, automation, listings, and operations.
- **Global UI/UX consolidation**  
  - Design system, navigation, and dashboard coherence across modules (tracked across product/UX docs).  
- **Observability expansion**  
  - Deeper metrics, tracing, and health signals for decisions/automation and critical flows.

These are **active roadmap items**, not yet canonical architecture in production.

---

## 6. Documentation Map

The documentation set is structured as follows (non-exhaustive):

- **Master document**
  - `docs/MASTER_PRODUCT_ARCHITECTURE.md` (this file) — product-level source of truth.

- **Architecture (current technical truth) — `docs/ARCHITECTURE/`**
  - Decision system: D31–D40, D45–D56, `D43_ARCHITECTURE_MAP.md`.
  - Automation system: `D57_DECISION_AUTOMATION.md`, `D57_1`…`D57_6`, `D58_AUTOMATION_OPERATOR_UI.md`, `D59`-related content.
  - Cross-cutting architecture: `ARCHITECTURE_LAYERS.md`, `FREEDOLIAPP_SAAS_MASTER_ARCHITECTURE.md`, `D52_ARCHITECTURE_GUARDRAILS.md`.
  - Gaps and roadmap: `PRODUCT_ROADMAP_GAPS.md`.

- **Systems (module-focused) — `docs/SYSTEMS/`**
  - Future-focused stubs:
    - `LISTING_INTELLIGENCE.md`
    - `SHOPIFY_INTEGRATION.md`
    - `ASSISTANT_LAYER.md`
  - Future: additional system-specific docs as modules mature.

- **Product (roadmap and flows) — `docs/PRODUCT/`**
  - `LEAD_SYSTEM.md` — lead and funnel concepts.
  - `ONBOARDING_FLOW.md` — onboarding and workspace creation.
  - `D0_PRODUCT_STRATEGY_AND_ROADMAP.md` (original strategy), `ROADMAP_STATUS.md`.

- **Operations (production rules) — `docs/OPERATIONS/`**
  - `PRODUCTION_READINESS_PLAN.md`
  - `GO_LIVE_CHECKLIST.md`
  - `DEPLOY.md` and related deployment notes.
  - Smoke tests, validation and incident reports that describe **how** to operate or validate the system.

- **Legacy (historical) — `docs/LEGACY/`**
  - In future passes, clearly pre-SaaS / single-user docs will be moved or duplicated here with a **LEGACY** banner.
  - These docs are intended for historical context only, not as current architecture sources.

- **Other directories (D0–D29, etc.)**
  - Contain earlier design and analysis work; many remain relevant but must be interpreted through the lens of the SaaS architecture.

---

## 7. Recommended Source of Truth Rule

To avoid ambiguity, FREEDOLIAPP adopts the following **source-of-truth hierarchy**:

- **`MASTER_PRODUCT_ARCHITECTURE.md`**  
  - Single top-level reference for *what* the product is and *how* the big pieces fit together.

- **Architecture docs (`docs/ARCHITECTURE/`)**  
  - **Technical truth** of the system: data models, RLS rules, flows, and per-module architecture decisions.
  - D-series documents and guardrail docs define how code and schema must behave.

- **Systems docs (`docs/SYSTEMS/`)**  
  - **Module-level architecture** for specific systems (e.g., Listing Intelligence, Shopify integration, Assistant layer) — especially for future or partially implemented components.

- **Product docs (`docs/PRODUCT/`)**  
  - **Product and roadmap truth**: strategy, roadmaps, lead/onboarding flows, phase plans.

- **Operations docs (`docs/OPERATIONS/`)**  
  - **Deployment and go-live truth**: how to run, validate, and monitor the system in production.

- **Legacy docs (`docs/LEGACY/`)**  
  - **Historical only**. These describe pre-SaaS or deprecated behaviour and must **not** be treated as current architecture or implementation guides.

When documents disagree:

1. `MASTER_PRODUCT_ARCHITECTURE.md` defines the product-level intent.  
2. Architecture docs define the **current technical implementation**.  
3. Operations docs define **how production must behave**.  
4. Legacy docs are reference material only and should never override the other three categories.

