# Lead System — Strategic Architecture Stub

Status: Partial implementation (canonical layer pending)  
Scope: Canonical lead model and funnel from lead → trial → workspace → customer.

## Purpose

Define how FREEDOLIAPP captures, stores, and evolves **leads** from first contact to paying customers, and how this connects to workspaces and billing.

## Why it matters

- Growth depends on a **predictable, observable funnel** from marketing to active workspaces.  
- Sales and product teams need clear visibility into who is evaluating, trialing, and converting.  
- Without a lead system, onboarding, billing, and usage analytics remain disconnected.

## Scope

- Lead entity (email, company/brand, seller type, primary channel, acquisition source).  
- Lifecycle: lead → trial registration → workspace creation → paying customer.  
- De-duplication rules (email, company, workspace URL).  
- Basic attribution to campaigns or entry points.

## Key capabilities

- **Unified lead record** independent of auth user accounts.  
- **Trial linkage**: leads connect to trials and resulting workspaces.  
- **Conversion tracking** across key milestones (signed up, activated workspace, became paying).  
- **Reporting hooks** for product and growth analytics (e.g., funnels per channel).

## Non-goals

- Full CRM implementation or deep pipeline management.  
- Marketing automation tooling beyond minimal tracking.  
- Redefining billing or identity models (they integrate with leads; they are not owned by this system).

## Connections to FREEDOLIAPP

- **Identity system**: when a lead becomes a user, the lead record must link to `user_id` and `org_id` where appropriate.  
- **Onboarding**: onboarding flows may branch based on lead attributes (seller type, channel, challenges).  
- **Billing**: billing activation and plan selection should be traceable back to the originating lead and campaign.  
- **Product analytics**: dashboards can slice activation and retention by lead attributes and acquisition source.

## Current implementation status

- **Implemented:**
  - `trial_registrations`-based lead capture for self-serve signups.  
  - Basic **UTM/source** capture to attribute where signups come from.  
  - A **deduplication window** to avoid repeated trial registrations for the same email.  
  - Linking between trial registrations and created **workspaces/orgs**.
- **Pending / gaps:**
  - A **canonical lead object** shared across marketing, trials, workspaces, and billing.  
  - Unified reporting on the full `lead → trial → workspace → customer` lifecycle.

## Current implemented base

The current product already implements a minimal but useful lead → trial → workspace flow:

- **Lead capture via `trial_registrations`**  
  Self-serve signups create entries in a `trial_registrations`-like structure that records at least the email and basic metadata of the interested user.

- **Email-based dedupe window**  
  A deduplication rule prevents multiple trial registrations for the **same email** within a defined window, reducing noise and double counting.

- **Source / UTM capture**  
  Fields such as `source`, `utm_source`, `utm_campaign`, `utm_medium` are recorded where available so growth can attribute signups to marketing activities.

- **Workspace linkage after org creation**  
  When an org/workspace is created, the relevant `trial_registrations` entry is associated with the resulting `org_id`, allowing the product to follow the path from trial to workspace.

- **Current status transitions**  
  Trial registration status changes (e.g., registered → workspace_created / expired) exist implicitly in code and queries, but are not yet modeled as a canonical **lead lifecycle state machine**.

## Canonical target funnel

The target funnel normalizes all flows (marketing site, in-app prompts, referrals) into a clear sequence:

`lead → trial_started → workspace_created → activated → converted_to_customer`

- **lead**  
  A person or company with enough information captured (at least email) to be contacted and analyzed, regardless of whether they have signed in.

- **trial_started**  
  The lead has explicitly started a **trial experience**, usually by registering and landing in an onboarding or ActivationWizard flow.

- **workspace_created**  
  A workspace (`org`) has been created and linked to the lead, turning the lead into an actual tenant with data isolation and billing context.

- **activated**  
  The workspace has passed a minimal activation bar (e.g., completed ActivationWizard, created at least one project, connected key data). The product is now “in use”, not just created.

- **converted_to_customer**  
  The workspace has become a **paying customer** (billing status and plan indicate active, paying subscription) and the lead is now considered fully converted.

## Canonical lead object (target model)

In the future, the system should converge on a single canonical **Lead** object, even if parts of it are backed by existing tables.

### Identity

- `email` — primary identifier for the lead. **(already captured)**  
- `name` — person’s name or contact name. **(partially captured / inferred)**

### Business context

- `company_or_brand` — brand or company name. **(future field or partially captured via free-text)**  
- `seller_type` — e.g., Amazon FBA, DTC brand, agency. **(future field)**  
- `main_marketplace` — e.g., Amazon, Shopify, multi-channel. **(future field)**  
- `team_size` — approximate team size or role count. **(future field)**

### Acquisition

- `source` — high-level source (landing, referral, campaign, webinar, etc.). **(already / partially captured)**  
- `utm_source` — UTM source param. **(already captured)**  
- `utm_campaign` — UTM campaign param. **(already captured)**  
- `utm_medium` — UTM medium param. **(already captured)**

### Lifecycle

- `status` — lead lifecycle state (`lead`, `trial_started`, `workspace_created`, `activated`, `converted_to_customer`, etc.). **(future canonical field; today implicit)**  
- `workspace_id` — `org_id` linked when a workspace is created. **(already captured via linkage)**  
- `converted_at` — timestamp when the lead is considered fully converted (customer). **(future field)**

## Funnel ownership rules

- **Lead capture timing**  
  Leads should be captured **before or during authentication**, using email as the anchor. Marketing forms and in-app registration both feed the same conceptual lead.

- **Workspace creation as lifecycle upgrade**  
  When a workspace is created, the associated lead must transition (or be markable) from `trial_started` to `workspace_created`, never creating a separate lead object for the same email without an explicit, justified reason.

- **No duplicate business identity per email**  
  For a given email, multiple leads should not be created unless there is a clear, modeled use case (e.g., multiple brands under one contact). Default behavior is **dedupe by email**.

- **Idempotent workspace linkage**  
  Linking a lead (or trial registration) to a workspace must be **idempotent**: re-running the linkage process for the same email/workspace combination must not create duplicate relations or inconsistent states.

## Conversion events (target)

The following events (or equivalent audit markers) should be emitted or recorded to track funnel progress:

- `lead_captured` — when a new lead record (or trial registration) is created for an email that was not present in the dedupe window.  
- `trial_started` — when the lead actually starts a trial experience (e.g., first login into a trial workspace or entering ActivationWizard).  
- `workspace_created` — when an `org` is created and linked to the lead.  
- `activation_started` — when the ActivationWizard or main onboarding flow begins for that workspace.  
- `activation_completed` — when activation criteria are met (e.g., wizard finished, key setup steps done).  
- `converted_to_customer` — when billing status/plan indicate the workspace is now a paying customer linked back to the original lead.

Each event should be triggered by **real state transitions** in the system (new rows or status changes), not by front-end heuristics alone.

## Capability matrix: current vs target

| Capability                    | Status      | Notes                                                                 |
|-------------------------------|------------|-----------------------------------------------------------------------|
| Lead capture                  | Implemented| `trial_registrations` capture email + metadata                        |
| UTM attribution               | Implemented| UTM/source fields recorded on trial registrations                     |
| Email dedupe                  | Implemented| Dedupe window prevents repeated trial registrations per email         |
| Workspace linking             | Implemented| Trial registrations linked to created `org` / workspace               |
| Canonical lead model          | Missing    | Conceptual model only; no single canonical table/object yet          |
| Lead lifecycle state machine  | Missing    | States implicit in code; no explicit lifecycle model or transitions   |
| Conversion analytics visibility| Partial   | Some visibility via existing metrics; no dedicated lead funnel dashboards |

