# FREEDOLIAPP — Legal Compliance Plan

## Purpose

Before opening FREEDOLIAPP to public user acquisition, the product must meet a **minimum legal compliance baseline**.  
This baseline protects users, the company, and partners by making data practices transparent, defining contractual terms, and respecting privacy and data rights from the first public entrypoint.

The goal of this plan is to describe **what** legal artefacts and flows are required, not to provide final legal text.

---

## Core legal documents required

The following documents are **mandatory** for a modern SaaS like FREEDOLIAPP:

### Privacy Policy

- **Purpose:** Explain what personal and business data is collected, how it is used, with whom it is shared, and how long it is retained.  
- **Why it matters:** Required by privacy regulations (e.g. GDPR, local laws) and necessary for user trust.  
- **When user must see/accept it:**
  - Publicly accessible from all pages (footer / `/privacy`).  
  - Linked in the signup flow; acceptance is implied by signup but should be clearly stated.

### Terms of Service

- **Purpose:** Define the contract between FREEDOLIAPP and the customer/user: permitted use, limitations of liability, account responsibilities, and governing law.  
- **Why it matters:** Sets legal expectations and boundaries, reduces ambiguity in case of disputes.  
- **When user must see/accept it:**
  - Public route `/terms`.  
  - Explicitly referenced in the signup form; acceptance must be clearly indicated.

### Cookie Policy

- **Purpose:** Describe which cookies and similar technologies are used, for what purposes (essential vs analytics/marketing), and how users can manage preferences.  
- **Why it matters:** Required under GDPR/ePrivacy for transparency about tracking technologies.  
- **When user must see/accept it:**
  - Public route `/cookies`.  
  - Linked from the cookie banner / preferences UI.

### Data Processing Agreement (DPA)

- **Purpose:** Define how FREEDOLIAPP acts as a **data processor** for customer data, including security measures, subprocessors, and data subject rights.  
- **Why it matters:** Required for B2B customers under GDPR and similar frameworks when processing personal data on their behalf.  
- **When user must see/accept it:**
  - Public route `/dpa`.  
  - Available from account/billing settings and upon request; acceptance may be embedded in master Terms or as a separate DPA.

### Acceptable Use Policy (AUP)

- **Purpose:** Specify prohibited uses of the platform (abuse, illegal content, security attacks, misuse of Amazon data, etc.).  
- **Why it matters:** Gives FREEDOLIAPP clear grounds to act against abuse and protect infrastructure, partners and other customers.  
- **When user must see/accept it:**
  - Linked from `/legal` and `/terms`.  
  - Acceptance can be bundled with Terms of Service, but the rules must be clearly visible.

---

## Public legal routes required

At minimum, the following public routes must exist and be reachable without authentication:

- **`/privacy`**  
  - Serves the Privacy Policy.  
  - Linked in site/app footers and from signup/login pages.

- **`/terms`**  
  - Serves the Terms of Service.  
  - Linked from signup and account settings.

- **`/cookies`**  
  - Serves the Cookie Policy.  
  - Linked from the cookie banner and from `/legal`.

- **`/dpa`**  
  - Serves the Data Processing Agreement or DPA summary with link to full text.  
  - Linked from billing/account pages and `/legal`.

- **`/legal`**  
  - Aggregated legal hub that links to Privacy, Terms, Cookies, DPA, Acceptable Use and other compliance docs.  
  - May include high-level legal overview and contact for legal/privacy questions.

---

## Signup consent requirements

Minimum consent model for user signup:

- **Access to Terms & Privacy**  
  - Signup form must link clearly to **Terms of Service** and **Privacy Policy** (e.g. “By signing up you agree to the Terms and acknowledge the Privacy Policy”).  
  - Links must open the public `/terms` and `/privacy` routes.

- **Explicit acceptance**  
  - Signup UX must make it unambiguous that by creating an account, the user accepts the Terms and acknowledges the Privacy Policy.  
  - For higher assurance, an explicit checkbox (not pre-checked) may be used, but at minimum the language must be clear and visible.

- **Traceable consent**  
  - The system should be able to infer that a given account was created under a given version of the Terms/Privacy (e.g. via timestamps and versioning, even if not yet exposed in UI).  
  - Exact implementation is out of scope for this phase, but must be planned.

---

## Cookie consent requirements

FREEDOLIAPP must follow a **GDPR-style** approach to cookies and tracking:

- **Essential cookies**  
  - Required for core app functionality (authentication session, CSRF tokens, basic security).  
  - Do not require explicit consent but must be disclosed.

- **Analytics cookies**  
  - Used for product analytics (e.g. page views, feature usage).  
  - **Must not be set** until the user consents to analytics/non-essential cookies.

- **Reject non-essential cookies**  
  - Users must be able to **reject** non-essential cookies and still access the core product (subject to terms and eligibility).  
  - A simple “Accept all only” banner is **not sufficient**.

- **Manage preferences**  
  - Users must have a way to **change cookie preferences later**, not just on first visit.  
  - This can be a “Cookie settings” link in the footer or account settings re-opening the consent UI.

Implementation details (categories, storage) will be handled in Phase C3, but the above principles are non-negotiable.

---

## Data rights

Under GDPR-like regimes, users (and customers) have the following rights:

- **Right to deletion (erasure)**  
  - Ability to request deletion of their personal data, subject to legal retention obligations.  
  - FREEDOLIAPP must define operational procedures to honor such requests.

- **Right to data export (portability)**  
  - Ability to request a copy of their personal data in a structured, commonly used format.  
  - At minimum, this should cover user profile data and tenant-level operational data owned by the customer.

- **Right to correction (rectification)**  
  - Ability to correct inaccurate or outdated personal data (e.g. name, email contact details).  
  - The UI and support processes must support updating such information safely.

These rights must be described in the Privacy Policy and supported operationally in Phase C4.

---

## Subprocessors

FREEDOLIAPP relies (or will rely) on third-party providers that process data on its behalf. These must be documented as **subprocessors** in the DPA and/or Privacy Policy:

- **Supabase** — authentication, database, and backend infrastructure.  
- **Vercel** — hosting and edge delivery of the frontend/web application.  
- **Stripe** — payment processing, billing customer and subscription management.  
- **Amazon SP-API** (when connected) — access to Amazon seller data via official APIs, acting as a data source for analytics and decision-making.

Any new subprocessors must go through a privacy and security review and be added to the relevant legal documents before use.

---

## Legal notes specific to FREEDOLIAPP

- FREEDOLIAPP is **not affiliated with Amazon** or any marketplace operator.  
- Amazon data must be accessed and processed **only via official APIs or permitted methods**, according to Amazon’s policies and developer terms.  
- FREEDOLIAPP provides **software tools, analytics, and automation assistance**, but does **not guarantee business outcomes**, profits, or compliance with third-party policies on behalf of the customer.  
- Customers remain responsible for how they use FREEDOLIAPP outputs in their own businesses.

These points must be reflected clearly in Terms of Service and marketing copy to avoid confusion.

---

## Implementation phases

To make the plan actionable, the work is split into four phases:

- **Phase C1 — Legal documentation**  
  - Draft Privacy Policy, Terms of Service, Cookie Policy, DPA, and Acceptable Use Policy (in collaboration with legal counsel).  
  - Define subprocessors and data rights language.  
  - Map current product behaviour to legal descriptions.

- **Phase C2 — Public legal pages**  
  - Implement public routes `/privacy`, `/terms`, `/cookies`, `/dpa`, `/legal` and bind them to the drafted documents.  
  - Ensure these routes are discoverable from the marketing site and in-app footers.

- **Phase C3 — Signup consent + cookie banner**  
  - Update signup/login flows to clearly reference Terms and Privacy.  
  - Implement a GDPR-style cookie banner and preference management UI.  
  - Ensure non-essential cookies (e.g. analytics) only activate after consent.

- **Phase C4 — Data rights operational handling**  
  - Define and implement procedures to handle data deletion, export, and correction requests.  
  - Provide at least one contact channel (support form or email) and internal runbooks to respond within reasonable timeframes.

This plan is a **foundation** and may need refinement as jurisdictions, product scope, and partner requirements evolve.

