# Onboarding Flow — Strategic Architecture Stub

Status: Partial implementation (ActivationWizard and Amazon-first path in place)  
Scope: First-time user experience, workspace creation, and initial configuration.

## Purpose

Design a structured **onboarding flow** so new users land in a meaningful workspace with enough context to get value quickly, instead of being dropped into a generic dashboard.

## Why it matters

- Reduces time-to-value for new sellers and teams.  
- Ensures workspaces are created with correct ownership and minimal required configuration.  
- Improves trial conversion by aligning the product to the seller’s reality from day one.

## Scope

- Detection of **first login** and routing into onboarding instead of normal app flow.  
- Minimal onboarding wizard (few, high-signal questions about seller type, main channel, key challenges).  
- **Workspace creation** with proper owner, memberships, and billing baseline.  
- **Seller profile** capture (regions, categories, risk appetite when relevant).  
- Hooks for connecting initial data sources in future phases (e.g., Amazon, Shopify).

## Key capabilities

- Clear, opinionated **onboarding path** for new users vs returning users.  
- Safe workspace creation and ownership assignment based on identity system and lead context.  
- Configurable defaults for decisions, automation, and dashboards based on onboarding answers.  
- Ability to resume or re-run parts of onboarding if context changes.

## Non-goals

- Full marketing site, pricing pages, or non-auth lead capture (handled elsewhere).  
- Deep implementation of every possible configuration — focus is on **minimal viable context**.  
- Replacing ongoing configuration UIs (settings, billing, automation configuration).

## Connections to FREEDOLIAPP

- **Lead system**: onboarding can be pre-filled or adapted using lead attributes and campaign info.  
- **Identity system**: determines who becomes workspace owner/admin and how memberships are created.  
- **Core operations and decisions**: onboarding decides which modules are highlighted first and may seed initial projects or automation suggestions.  
- **Automation and analytics**: a good onboarding baseline improves the quality of later decisions, automation proposals, and analytics.

## Current implementation status

- **Implemented:**
  - An **ActivationWizard** flow that guides new workspaces through activation.  
  - An **Amazon-first onboarding path** tailored to initial Amazon use cases.  
  - A **workspace activation flow** that ties activation to billing and workspace status.
- **Pending / gaps:**
  - A generalized **SaaS onboarding** experience that covers non-Amazon-first scenarios.  
  - A unified, role-aware first-login experience for all user types and entry points.

