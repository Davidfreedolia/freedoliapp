# Assistant / Copilot Layer — Strategic Architecture Stub

Status: Active roadmap (not implemented)  
Scope: Context-aware assistant that helps operators understand data, decisions, and automation inside FREEDOLIAPP.

## Purpose

Provide an **assistant / copilot layer** that turns complex operational and automation data into guided experiences, explanations, and suggestions for human operators.

## Why it matters

- Reduces cognitive load when navigating decisions, automation proposals, and analytics.  
- Makes the platform usable for less technical users or busy operators.  
- Increases trust by explaining *why* the system recommends specific actions.

## Scope

- Context-aware help on key pages (projects, decisions, automation, analytics).  
- Explanations for decisions and automation proposals in plain language.  
- Guided workflows for common tasks (onboarding, listing optimization, order planning).  
- Summaries of complex data (e.g., automation performance, risk hotspots) on demand.

## Key capabilities

- **Context engine**: understand where the user is (page, selected project, active org) and what data is relevant.  
- **Explanation engine**: translate decision and automation rules into user-friendly narratives.  
- **Action suggestions**: propose next steps without auto-executing them.  
- Respect **roles and RLS** — the assistant must not expose data or actions the user is not allowed to see.

## Non-goals

- Autopilot that executes arbitrary actions without human approval.  
- General-purpose chat unrelated to FREEDOLIAPP’s data and workflows.  
- Redefining existing architecture; the assistant **sits on top** of current systems.

## Connections to FREEDOLIAPP

- **Decision system**: surfaces, explains, and groups decisions and their outcomes.  
- **Automation system and operator UI**: explains proposals, approvals, and executions, suggesting when to act.  
- **Analytics (D59)**: summarizes automation performance and risk levels.  
- **Identity and permissions**: uses current user/org context and role to tailor responses and available suggestions.

