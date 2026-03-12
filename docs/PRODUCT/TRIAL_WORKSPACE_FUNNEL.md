# Trial → Workspace Funnel — Product Overview

## Purpose

The **Lead → Trial → Workspace → Customer** funnel is the backbone of FREEDOLIAPP’s SaaS growth.  
It defines how an interested visitor becomes a trial user, how that trial becomes an active workspace, and how that workspace eventually becomes a paying customer that stays on the platform.

A clear funnel enables:

- predictable experiments (campaigns, onboarding variants, pricing tests),  
- reliable measurement of conversion and activation,  
- and consistent handover between marketing, product, and success teams.

---

## Current implementation

Today, FREEDOLIAPP has the following pieces in place:

- **Lead/trial capture via `trial_registrations`** when a user signs up for a trial.  
- **UTM/source fields** (e.g., source, utm_source, utm_campaign, utm_medium) to attribute signups.  
- An **email-based deduplication window** to reduce duplicate trial registrations.  
- **Workspace creation** that links a trial registration to a newly created `org` (workspace).  
- An **ActivationWizard / Amazon-first activation flow** that onboards new workspaces.

What is **missing** or only implicit is a single, canonical funnel model and explicit lifecycle states shared across marketing, product, and analytics.

---

## Target funnel

The target funnel standardizes all paths into the following stages:

`Lead → Trial → Workspace → Customer`

Expanded:

- **Lead**  
  - Someone with at least an email recorded, plus optional business context.  
  - May be captured via marketing pages, waitlists, or in-app prompts (pre-auth or during registration).

- **Trial**  
  - The lead has begun a **trial experience**, typically represented by a `trial_registrations` row and at least one successful login.  
  - Trial may be time-bound or gated by usage; the key is that the user is exploring the product.

- **Workspace**  
  - A tenant (`org`) is created and linked to the lead/trial.  
  - The workspace has at least one owner/admin membership and baseline configuration.

- **Customer**  
  - The workspace has an **active billing relationship** (paid plan, non-trial billing status).  
  - The lead is now fully converted; retention and expansion become the main goals.

Internally, this aligns with the more granular states:  
`lead → trial_started → workspace_created → activated → converted_to_customer`  
as defined in `LEAD_SYSTEM.md`.

---

## Integration points

Key touchpoints in the application that interact with this funnel:

- **Login / Signup**  
  - Entry point where an email is captured and a Supabase user is created.  
  - Should create or update the relevant lead/trial information.

- **`registerTrialLead` (or equivalent)**  
  - Backend helper that records trial registration, UTM parameters and dedupe logic.  
  - Central place to enforce **email deduplication** and consistent lead metadata.

- **`createWorkspace`**  
  - Creates an `org` and at least one `org_memberships` row (owner/admin).  
  - Must **link back** to the originating trial/lead so the funnel remains continuous.

- **ActivationWizard**  
  - Guides the new workspace through initial setup (Amazon-first path).  
  - Represents the `activation_started` and `activation_completed` phases of the funnel.

- **Billing**  
  - When a workspace moves to a paid plan (Stripe subscription active), the funnel reaches `converted_to_customer`.  
  - Billing state changes must be traceable back to the originating lead/trial for analytics.

---

## Risks

- **Duplicated leads**  
  - Multiple lead or trial records for the same email can fragment analytics and confusion about who owns which workspace.

- **Orphan workspaces**  
  - Workspaces created without a clear originating lead/trial make it hard to attribute revenue to acquisition channels.

- **Weak attribution**  
  - Missing or inconsistent UTM/source data prevents understanding which campaigns or channels perform best.

- **Unclear conversion states**  
  - Without explicit lifecycle states and events (trial_started, activation_completed, converted_to_customer), teams cannot reliably measure funnel health.

---

## Next implementation phase (high-level)

The next build steps (documentation only for now) should focus on:

1. **Canonical lead object**  
   - Introduce a clear lead model (as per `LEAD_SYSTEM.md`) that unifies trial registrations and acquisition data.

2. **Explicit lifecycle states**  
   - Implement a **lead lifecycle state machine** mapping: lead, trial_started, workspace_created, activated, converted_to_customer.

3. **Event instrumentation**  
   - Emit or persist key conversion events: `lead_captured`, `trial_started`, `workspace_created`, `activation_started`, `activation_completed`, `converted_to_customer`.

4. **Analytics visibility**  
   - Provide simple, org-independent dashboards or exports to see funnel counts and conversion rates over time.

5. **Idempotent linking**  
   - Ensure workspace creation and billing activation logic are idempotent with respect to a given lead/email so that retries do not create duplicates.

These steps should be implemented **on top of** the existing Supabase auth, trial_registrations, orgs, and billing flows, without changing core business logic or automation systems.

