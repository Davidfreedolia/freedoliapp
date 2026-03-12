# PRODUCT ROADMAP GAPS — Strategic Architecture Overview

Status: Documented (strategic only, mixed implementation: implemented / partial / missing)  
Scope: High-level product layers that are missing or only partially implemented after D59.

This document does **not** define implementation details. It identifies major gaps so future phases can be planned coherently across product, engineering, and go-to-market.

### Implementation status summary (post D59)

| Layer                          | Status           | Notes                                                        |
|--------------------------------|------------------|--------------------------------------------------------------|
| Platform / tenant model        | Implemented      | orgs, org_memberships, RLS, billing gating in place         |
| Identity & authentication      | Partial          | email/password + magic link live; Google OAuth pending      |
| Lead capture system            | Partial          | trial_registrations + UTM + dedupe + workspace linking      |
| Onboarding & workspace creation| Partial          | ActivationWizard + Amazon-first path; general SaaS pending  |
| Listing Intelligence layer     | Documented only  | architecture described; no implementation yet               |
| Commerce channel integrations  | Documented only  | Shopify and others planned; not yet implemented             |
| Assistant / copilot layer      | Documented only  | assistant architecture documented; no implementation yet     |
| Global UI/UX consolidation     | Partial          | many UIs exist; dedicated consolidation phase still pending |

---

## 1 — Identity & Authentication Layer

### Purpose

FREEDOLIAPP needs a robust **identity and authentication foundation** before scaling advanced product features. Today, Supabase auth is available at a low level with email/password and magic-link login, but there is no fully defined, end-to-end identity layer as a first-class architecture component (Google OAuth and provider linking remain pending).

### Required capabilities

- **Google login (OAuth)**: frictionless sign-in for most SaaS adopters.
- **Email login**: username/password or magic-link flow for users without Google accounts.
- **Session management**: secure, persistent sessions with refresh tokens, session timeout, and controlled logout behaviour.
- **Secure user identity**: stable `user_id` as primary identity key for all user-scoped data and audit logs.
- **Recovery / re-entry**: password reset, re-login flows, and safe handling of expired/invalid sessions.

### System connections

- **Supabase auth**: should be treated as the canonical source of user identity, integrated consistently into:
  - Workspace selection and access control.
  - Membership lookups (`org_memberships`) and role resolution.
  - Audit logs and automation events (linking actions back to specific users).
- **Workspace creation**: identity layer must define who can create workspaces, how they are attributed (owner vs member), and how multiple workspaces per user are handled.
- **User memberships**: clear model for `owner`, `admin`, `member` roles, and how they are enforced across decisions, automation, and billing.

### Rationale

Without a stable authentication and identity layer:

- Permissions and roles become fragile or duplicated.
- Cross-module features (decisions, automation, analytics, billing) cannot reliably attribute actions to users.
- Scaling to more organizations and environments becomes risky.

This layer should be solidified **before** aggressive feature expansion or large-scale onboarding campaigns.

---

## 2 — Lead Capture System

### Purpose

FREEDOLIAPP is a SaaS product and requires a clear **lead acquisition layer** to feed trials and customers into the platform. Today, a trial_registrations-based flow with UTM/source capture, dedupe window, and workspace linking exists, but there is still no canonical lead object or unified lead lifecycle connected end-to-end to workspaces and trials.

### Minimal lead model

Leads should minimally track:

- **email** (primary deduplication key)
- **name**
- **company / brand**
- **seller type** (e.g., Amazon FBA, DTC brand, aggregator)
- **main sales channel** (Amazon, Shopify, etc.)
- **interest source** (landing, referral, campaign, webinar, etc.)

### Lifecycle

The canonical lifecycle should be:

`lead → trial → workspace → customer`

- **Lead**: created via marketing forms, inbound referrals, or manual entry.
- **Trial**: lead opts into a trial; `trial_registrations` (or equivalent) is created.
- **Workspace**: when trial is activated, a workspace is created and tied to the lead + auth user.
- **Customer**: paying account once billing is active.

### Technical connections

- Leads must **deduplicate by email** and potentially by workspace URL or org name to avoid duplicates.
- The lead object should tie into **trial registrations** (existing or future) so that conversion from lead → trial is traceable and measurable.

### Rationale

Without a lead capture system:

- Growth is opaque and reliant on ad-hoc tracking.
- It is difficult to run structured experiments (funnels, campaigns, onboarding flows).
- Product and sales teams lack visibility into who is using or evaluating the product.

---

## 3 — Onboarding & Workspace Creation

### Purpose

New users need a structured **onboarding flow** that creates a workspace and collects enough context to make the product useful quickly. ActivationWizard and an Amazon-first onboarding/activation path already exist, but the general SaaS first-time experience is not yet a fully designed, role-aware onboarding system.

### Required steps

- **New user first login**: detect first-time access and branch into an onboarding flow instead of dropping users into a generic dashboard.
- **Minimal onboarding wizard**:
  - Ask a small number of high-signal questions (seller type, main channel, primary challenges).
  - Decide which features or modules are initially highlighted.
- **Workspace creation**:
  - Create an org/workspace with clear ownership (user becomes owner/admin).
  - Connect memberships, billing status, and default configuration.
- **Seller profile creation**:
  - Create a profile for the seller/brand including regions, categories, and risk appetite where relevant.
- **Initial configuration**:
  - Connect initial data sources (e.g., Amazon or Shopify in later phases).
  - Configure minimal automation defaults and decision preferences.

### Goals

- **Reduce friction**: avoid dumping new users into a complex UI without guidance.
- **Collect useful context**: enough information to tailor decisions, automation, and insights.
- **Accelerate time-to-value**: aim for a “first meaningful insight” in minutes, not hours.

---

## 4 — Listing Intelligence Layer

### Purpose

FREEDOLIAPP targets commerce operators who must **create and optimize listings**, especially on Amazon. A dedicated **Listing Intelligence layer** is not yet implemented but is critical for end-to-end product-market fit.

### Capabilities

- **Keyword research**: ingest search terms, competition data, and marketplace signals.
- **Keyword clustering**: group related keywords by intent and importance.
- **Title generation**: generate Amazon-compliant, keyword-rich titles.
- **Bullet point generation**: persuasive bullets aligned with brand voice and marketplace rules.
- **Description generation**: long-form description where relevant (e.g., A+ content drafts in future).
- **Backend search terms**: optimize hidden keywords to capture additional demand.
- **Listing optimization score**: compute a score based on coverage, competitiveness, and compliance.
- **Listing draft builder**: interactive editor to assemble title, bullets, description and backend terms.

### System connections

- **Product research**: listings should be linked to product/projects chosen during research.
- **Product projects**: each project can have one or more listing drafts across marketplaces.
- **AI generation**: this layer should drive prompts and templates for content generation, using existing product context and market data.
- **Listing publishing workflows**: in future phases, drafts can be pushed to marketplaces (e.g., Amazon, Shopify), but D59 only documents the architecture.

### Rationale

Listing Intelligence bridges the gap between **decision/automation outputs** and **actual catalog improvements**, enabling concrete, revenue-impacting actions inside the product.

---

## 5 — Commerce Channel Integrations

### Purpose

To deliver full value, FREEDOLIAPP must connect directly with **commerce platforms** where sellers operate. At present, the architecture is focused on Amazon decisions; broader commerce connectors are not yet implemented.

### Connectors

- **First connector: Shopify**
  - Focus on DTC brands that use Shopify as their storefront and inventory source.
- **Future connectors** (later phases):
  - WooCommerce
  - TikTok Shop
  - Other regional marketplaces or custom channels

### Integration capabilities

- **Store connection**: OAuth or API key based connection to the store.
- **Product sync**: import products and variants, map them to internal product/projects.
- **Order sync**: ingest orders for cashflow, inventory, and performance analytics.
- **Inventory sync**: keep stock signals aligned between FREEDOLIAPP and channels for better decisions and automation.

### Rationale

Commerce integrations turn FREEDOLIAPP into a **multi-channel brain** rather than an isolated analytics tool. They are essential for:

- Accurate demand and inventory signals.
- Cross-channel automation (pricing, stock, marketing).
- Future modules like unified catalog and cross-channel listing management.

---

## 6 — Assistant / Copilot Layer

### Purpose

An **assistant / copilot layer** can make the platform significantly more approachable by turning complex data and automation flows into conversational or guided experiences.

### Capabilities

- **Context-aware suggestions**: propose relevant actions based on current page, selected project, or active decision.
- **Action explanations**: explain *why* a decision or automation proposal exists, in plain language.
- **Decision explanations**: convert raw decision/automation data into narratives operators can trust.
- **Workflow guidance**: step-by-step help for common flows (e.g., onboarding, listing optimization, order planning).
- **AI assistance for listings and operations**: use the Listing Intelligence and operations data to draft content, recommend next steps, and summarize performance.

### Integration principles

- The assistant should operate **on top of existing modules**, not replace them.
- It should call into:
  - Decision API (D32–D40)
  - Automation engine (D57) and UI (D58) in a read-aware manner
  - Analytics (D59) for summarization and insights
- It must respect role and org boundaries (multi-tenant and permission-aware).

### Rationale

The assistant layer is the glue between **raw capability** (decisions, automation) and **operator usability**, especially for less technical or time-constrained users.

---

## 7 — Global UI / UX Consolidation

### Purpose

After multiple feature slices (decisions, automation, analytics), the UI naturally accumulates **inconsistencies**. A dedicated **UI/UX consolidation phase** is required to bring coherence across the product.

### Topics

- **Design system consolidation**:
  - Normalize typography, colors, spacing, and components (cards, buttons, badges, inputs).
  - Promote a shared set of UI primitives rather than ad-hoc styling per module.
- **Navigation clarity**:
  - Review and streamline `/app` navigation structure.
  - Ensure decisions, automation, analytics, and core operations are discoverable and well-grouped.
- **Consistent cards and panels**:
  - Align layouts for inboxes, detail views, side panels, and dashboards.
- **Dashboard coherence**:
  - Make the main dashboards feel like a cohesive experience: top KPIs, key tasks, and alerts from decisions/automation.
- **Empty / loading states**:
  - Standardize how “no data yet” and “loading” are represented across modules.
- **Responsive behavior**:
  - Ensure critical workflows are usable on laptops and large screens first; define expectations for tablet/smaller viewports.

### Rationale

Without consolidation, each new module adds **UI debt**. A planned UX phase ensures that features built in D32–D59 feel like a single, mature product, not a collection of disconnected tools.

---

## 8 — Suggested Future Phase Order

### Recommended order

1. **Identity & Authentication**  
   Lock down user identity, auth flows, sessions, and role mapping.
2. **Lead Capture**  
   Ensure a clean lead → trial → workspace → customer funnel exists and is measurable.
3. **Onboarding**  
   Build the first-time experience on top of a stable identity/lead foundation.
4. **UI/UX consolidation**  
   Normalize design system and flows before adding major new surfaces.
5. **Listing Intelligence**  
   Enable high-impact, listing-centric workflows grounded in existing data.
6. **Shopify integration**  
   Expand to a major commerce channel once core UX and listings are in place.
7. **Assistant layer**  
   Add a contextual copilot on top of a mature, coherent product.

### Rationale

This order prioritizes **user acquisition and usability** before expansion:

- Identity, leads, and onboarding ensure that **new users can enter and understand** the product reliably.
- UI/UX consolidation makes the existing decision/automation value **visible and approachable**.
- Listing Intelligence and Shopify integration then expand **breadth of value**.
- Finally, the Assistant layer amplifies all prior investments by making the system easier to operate and understand.

