# FREEDOLIAPP — Documentation Index

Status: Current entrypoint for documentation  
Scope: Index of main documents and their roles.

---

## Master document

- **`MASTER_PRODUCT_ARCHITECTURE.md`** — *Master product architecture overview (post D59).*  
  - **Status:** current

---

## Architecture

- **`ARCHITECTURE/INDEX.md`** — *Index of detailed architecture D-docs (D30–D59 and related).*  
  - **Status:** current
- **`ARCHITECTURE/FREEDOLIAPP_SAAS_MASTER_ARCHITECTURE.md`** — *SaaS master architecture & strategic roadmap.*  
  - **Status:** current
- **`ARCHITECTURE/ARCHITECTURE_LAYERS.md`** — *High-level architecture layers description.*  
  - **Status:** current
- **`ARCHITECTURE/D52_ARCHITECTURE_GUARDRAILS.md`** — *Architecture guardrails and constraints.*  
  - **Status:** current
- **`ARCHITECTURE/D57_DECISION_AUTOMATION.md`** — *Decision automation architecture (D57 overview).*  
  - **Status:** current
- **`ARCHITECTURE/D58_AUTOMATION_OPERATOR_UI.md`** — *Automation Operator UI architecture (D58).*  
  - **Status:** current
- **`ARCHITECTURE/PRODUCT_ROADMAP_GAPS.md`** — *Strategic product gaps and future phases.*  
  - **Status:** active roadmap
- **`ARCHITECTURE/IDENTITY_SYSTEM.md`** — *Identity system architecture stub (auth & roles).*  
  - **Status:** partial (email/password + magic link implemented; completion pending)

---

## Identity

- **`IDENTITY/I1_GOOGLE_OAUTH.md`** — *Identity Phase I1 — Google OAuth implementation notes.*  
  - **Status:** implemented
- **`IDENTITY/I2_APPLE_OAUTH.md`** — *Identity Phase I2 — Apple OAuth implementation notes.*  
  - **Status:** implemented

*(See `docs/ARCHITECTURE/INDEX.md` for the full list of D-series architecture docs.)*

---

## Systems

- **`SYSTEMS/LISTING_INTELLIGENCE.md`** — *Listing Intelligence system (research, drafting, optimization).*  
  - **Status:** active roadmap
- **`SYSTEMS/SHOPIFY_INTEGRATION.md`** — *Shopify connector system (products, orders, inventory sync).*  
  - **Status:** active roadmap
- **`SYSTEMS/ASSISTANT_LAYER.md`** — *Assistant / copilot layer system.*  
  - **Status:** active roadmap

---

## Product

- **`D0/D0_PRODUCT_STRATEGY_AND_ROADMAP.md`** — *Initial product strategy and high-level roadmap.*  
  - **Status:** current (historical but still relevant for context)
- **`ROADMAP_STATUS.md`** — *Current roadmap status and phase tracking.*  
  - **Status:** current
- **`PRODUCT/LEAD_SYSTEM.md`** — *Lead system architecture stub (lead → trial → workspace → customer).*  
  - **Status:** partial (trial_registrations + UTM + dedupe + workspace linking)
- **`PRODUCT/ONBOARDING_FLOW.md`** — *Onboarding flow stub (first-time experience and workspace creation).*  
  - **Status:** partial (ActivationWizard + Amazon-first onboarding; general SaaS pending)
- **`PRODUCT/TRIAL_WORKSPACE_FUNNEL.md`** — *Lead → Trial → Workspace → Customer funnel overview.*  
  - **Status:** active roadmap

---

## Operations

- **`PRODUCTION_READINESS_PLAN.md`** — *Production readiness plan and gating criteria.*  
  - **Status:** operational rule
- **`GO_LIVE_CHECKLIST.md`** — *Go-live checklist for Stripe and production deployment.*  
  - **Status:** operational rule
- **`DEPLOY.md`** — *Deployment guide for FREEDOLIAPP.*  
  - **Status:** operational rule
- **`SMOKE_TEST_REAL_WORKFLOW.md`** — *Smoke tests for real workflows.*  
  - **Status:** operational rule
- **`VALIDATION_STATUS.md`** — *Validation status summary.*  
  - **Status:** operational rule
- **`OPERATIONS/LEGAL_COMPLIANCE_PLAN.md`** — *Plan for legal and privacy compliance before public launch.*  
  - **Status:** active roadmap

---

## Legal

- **`LEGAL/PRIVACY_POLICY.md`** — *Privacy Policy stub (structure; legal draft pending).*  
  - **Status:** draft
- **`LEGAL/TERMS_OF_SERVICE.md`** — *Terms of Service stub (structure; legal draft pending).*  
  - **Status:** draft
- **`LEGAL/COOKIE_POLICY.md`** — *Cookie Policy stub (structure; legal draft pending).*  
  - **Status:** draft
- **`LEGAL/DPA.md`** — *Data Processing Agreement stub (structure; legal draft pending).*  
  - **Status:** draft
- **`LEGAL/ACCEPTABLE_USE_POLICY.md`** — *Acceptable Use Policy stub (structure; legal draft pending).*  
  - **Status:** draft

---

## Legacy

At this stage, **no documents have been formally reclassified as legacy in this pass**.  
In future consolidation phases, clearly pre-SaaS or single-user documents will be either:

- moved under `docs/LEGACY/`, or  
- updated in-place with a **LEGACY** banner at the top.

Examples of likely candidates (to be reviewed later):

- Early technical dossiers predating the SaaS architecture.  
- Reports that assume no auth, permissive RLS, or single-user operation.

---

## How to use this index

- Start with **`MASTER_PRODUCT_ARCHITECTURE.md`** to understand the product and layers.  
- Use **Architecture** docs for detailed technical design and constraints.  
- Use **Systems** and **Product** docs to understand future or partially implemented modules.  
- Use **Operations** docs when preparing deployments, production changes, or audits.  
- Treat **Legacy** material as historical context only once it is explicitly marked.

