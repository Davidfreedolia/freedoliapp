# D18 — Trial Registration Capture

## Status
Draft

Current implementation status:
- table created
- lead capture helper created
- login entrypoint wired
- duplicate protection added
- workspace link added

## Objective
Capture lead information before starting the trial or Stripe checkout.

The goal is to build a minimal SaaS funnel without breaking the current onboarding flow.

## Problem

Current flow:

Landing
→ Login / Signup
→ Stripe checkout
→ App

Missing capability:

- Lead capture
- Trial analytics
- Conversion tracking

## Target Flow

Landing
→ Trial registration
→ Trial workspace creation
→ App access
→ Stripe upgrade

## Data Model (proposed)

Table: trial_registrations

Fields:

id (uuid)
created_at (timestamp)

email (text)
name (text)
company_name (text)

source (text)
utm_source (text)
utm_campaign (text)

status (enum)

possible values:
- started
- workspace_created
- converted
- abandoned

## Non-Goals

This phase does NOT:

- modify Stripe checkout
- change billing engine
- introduce CRM features
- change onboarding wizard
- D18 does not implement Google, Apple, Microsoft, or Amazon social login
- D18 only prepares the lead capture layer so future identity providers can reuse it

## Constraints

Must not break:

billing engine
Stripe checkout
workspace creation flow

## Implemented Contract

### Lead capture entrypoint
The current trial lead capture entrypoint is the Login flow.

File:
src/pages/Login.jsx

Lead capture is triggered when the user starts email login or magic link flow.

### Persistence
Helper:
src/lib/trials/registerTrialLead.js

Behavior:
- normalizes email with trim()
- if email is empty, does nothing
- checks latest trial_registrations record for same email
- if a record exists in the last 24 hours, skips insert
- otherwise inserts a new row with status = started
- never blocks onboarding
- never throws
- failures only produce console.warn

### Workspace linkage
Helper:
src/lib/workspace/createWorkspace.js

Behavior:
- after workspace creation, tries to update matching trial_registrations
- matches by email
- only updates rows where workspace_id is null
- sets:
  - status = workspace_created
  - workspace_id = created org_id
- this step is fire-and-forget and must not block workspace creation

### Current lifecycle
started
→ workspace_created
→ converted (future)

## Identity / Signup Options (Future)

Trial registration capture in D18 is independent from authentication method.

This phase does not implement social login.

However, future signup options should be documented as supported entry points for trial creation.

### Recommended priority

1. Email
2. Google
3. Microsoft
4. Apple

### Amazon Login

Amazon login is not a priority identity provider for D18.

Reason:
Freedoliapp is a SaaS for Amazon sellers, but user identity and Amazon marketplace integration are separate concerns.

Using Amazon as a primary login method may create confusion between:

- SaaS account access
- Amazon Seller account connection

Therefore, Amazon login is considered optional and future-only.

### Rule

Any future social login must plug into the same D18 lead capture flow.

That means:

- lead is still captured first
- workspace creation flow remains canonical
- billing flow remains unchanged

## Deliverable

Documentation ready before implementation. Implementation as per Implemented Contract is in place.
