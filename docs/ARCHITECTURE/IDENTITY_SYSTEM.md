# Identity System Architecture (Stub)

Status: Partial implementation (SaaS auth in place; completion pending)  
Scope: Identity, authentication, and access control foundation for FREEDOLIAPP.

## Purpose

Define a coherent **identity and authentication layer** that all modules can rely on for user identity, sessions, and authorization. Supabase auth already exists, but this document describes the architecture needed to make it a first-class, stable subsystem.

## Why it matters

- All tenant-aware data and automation depends on **knowing who the user is** and which orgs they belong to.  
- Permissions (owner/admin/member), billing, and audit logs must be grounded in a consistent identity model.  
- Without a strong identity layer, features like automation approvals, billing gates, and assistant actions become fragile or unsafe.

## Scope

- Authentication flows (Google OAuth, email login).  
- Session management and token handling.  
- User → org membership and role resolution.  
- Basic recovery and re-entry flows (password reset, re-authentication).  
- Integration points for audit logging and activity tracking.

## 1. Current authentication methods

### Email/password

- Supabase auth is configured with **email/password** signup and login.  
- Credentials are stored and validated by Supabase; the app treats Supabase as the **source of truth** for user identity.  
- Successful login yields a session whose `user.id` is used across the rest of the system.

### Magic link

- **Magic link** login is enabled as an alternative to password-based auth.  
- Users can authenticate via a one-time link sent to their email, which creates a standard Supabase session once consumed.  
- This is particularly useful for less technical users and for quick re-entry without remembering a password.

### Session handling (current)

- Frontend stores the Supabase session and exposes the current `user` to the app shell.  
- Org/tenant context is derived from `org_memberships` and an `active_org_id` value, not from the session alone.  
- Session invalidation and refresh rely on Supabase client defaults; a dedicated identity layer around session lifecycle is still incomplete.

## 2. Pending providers

- **Google OAuth**
  - Desired as a primary provider for SaaS teams and agencies.  
  - Not yet wired as a first-class provider in production; flows and UI are pending.  
  - Provider **linking** (email/password + Google for the same user) is not yet implemented.

Other social providers are out of scope for Phase A unless explicitly justified later.

## 3. User identity model

The identity layer is built on top of Supabase auth plus application-level tables.

### Core tables

- **`auth.users`**  
  - Canonical identity record managed by Supabase.  
  - Fields: `id` (UUID), `email`, provider metadata, created/updated timestamps, etc.  
  - Never written directly by the app; all mutations go through Supabase auth APIs.

- **`profiles`**  
  - Application-level profile for each `auth.users` record.  
  - Typical fields: display name, locale, optional metadata used by the UI.  
  - `profiles.user_id` → `auth.users.id` (1:1, enforced by application logic / constraints).

- **`org_memberships`**  
  - Join table between users and organizations (workspaces).  
  - Fields (simplified): `org_id`, `user_id`, `role` (`owner | admin | member`), timestamps.  
  - `org_memberships.user_id` → `auth.users.id`.  
  - `org_memberships.org_id` → `orgs.id`.

- **`orgs` / workspaces**  
  - Represents each tenant / workspace.  
  - Contains billing state and plan information (billing_status, seat_limit, etc.).  
  - Linked to memberships via `org_memberships`.

### Conceptual identity model

- A **User** is an `auth.users` row + its `profiles` row.  
- A **Workspace** is an `orgs` row.  
- The intersection (**membership**) is an `org_memberships` row with a role.  
- All tenant-scoped data rows must include `org_id` and are filtered by RLS and membership.

## 4. Target identity capabilities

The target identity architecture for Phase A aims to make FREEDOLIAPP behave like a complete SaaS identity layer.

- **Email/password login**  
  - Standard signup and login via email + password, backed by Supabase auth.

- **Magic link login**  
  - Passwordless login via signed email link for convenience and improved UX.

- **Google OAuth**  
  - Sign-in with Google as a first-class option for work accounts.  
  - Ability to connect Google as an additional provider to an existing account (provider linking).

- **Password reset**  
  - Secure, self-service password reset flow using email-based verification.  
  - Clear UX and error handling around expired or invalid reset links.

- **Account settings**  
  - Centralized “Account / Profile” area where users can see and manage identity-related info:  
    - email visibility  
    - password change / reset entry points  
    - connected providers (Google, etc.) once supported  
    - language / locale and other profile preferences.

- **Provider linking**  
  - Ability to attach multiple auth providers (e.g., email/password + Google) to a single logical user.  
  - Avoids duplicate user records and fragmentation of memberships or audit trails.

## 5. Identity flows

The following diagrams are **logical flows**, not UI wireframes. They describe how identity should behave end-to-end.

### 5.1 Login flow (email/password)

1. User opens login page and enters email + password.  
2. App calls Supabase auth (`signInWithPassword`).  
3. On success, Supabase returns a session with `user.id`.  
4. App loads `profiles` and `org_memberships` for `user.id`.  
5. App determines or restores `active_org_id` and redirects to `/app`.  
6. If no membership exists, app may route to onboarding/activation paths.

### 5.2 Signup flow

1. User opens signup page and submits minimal info (email, password; optional name).  
2. App calls Supabase auth (`signUp`).  
3. On success:
   - Create `profiles` row for `user.id`.  
   - Optionally create a first `org` and corresponding `org_memberships` (owner).  
4. Initialize `trial_registrations` / lead data if applicable.  
5. Redirect to ActivationWizard / first-time onboarding for the new workspace.

### 5.3 Password reset flow

1. User clicks “Forgot password” on login screen.  
2. App calls Supabase auth to send a **password reset email**.  
3. User clicks the reset link in their email, which opens the app at a special reset route.  
4. App validates the token (Supabase) and allows user to set a new password.  
5. After success, user is logged in or redirected to login with a success message.

### 5.4 Google OAuth flow

1. User clicks “Continue with Google” on login/signup page.  
2. App redirects to Google via Supabase OAuth provider.  
3. On success, Supabase returns a session with `user.id` and provider metadata.  
4. If this `user.id` is new:
   - Create `profiles` row and, if appropriate, new `org` + `org_memberships`.  
5. If this `user.id` corresponds to an existing account:
   - Treat this as a **linked provider** (once implemented) and reuse existing memberships and profile.  
6. Proceed to workspace selection or ActivationWizard as in the email/password flow.

## 6. Database relationships

Key relationships for the identity layer:

- `auth.users.id` **1–1** `profiles.user_id`  
- `auth.users.id` **1–N** `org_memberships.user_id`  
- `orgs.id` **1–N** `org_memberships.org_id`  
- `orgs.id` **1–N** tenant-scoped tables (projects, POs, decisions, automation, etc.) via `org_id`

Visually (logical):

`auth.users` ⇄ `profiles`  
`auth.users` ⇄ `org_memberships` ⇄ `orgs`  
`orgs` ⇄ (projects, suppliers, POs, decisions, automation_*, …) via `org_id`

## 7. Implementation status (capability matrix)

| Capability         | Status      | Notes                                                                 |
|--------------------|------------|-----------------------------------------------------------------------|
| Email/password     | Implemented| Supabase auth sign-up/login in place                                  |
| Magic link         | Implemented| Passwordless login supported via Supabase                             |
| Google OAuth       | Missing    | Provider planned; flows and UI not yet wired                          |
| Password reset     | Partial    | Supabase supports it; productized UX and flows need consolidation     |
| Account settings   | Partial    | Some profile/settings exist; no unified identity settings surface yet |
| Provider linking   | Missing    | No mechanism to join multiple providers under one logical user        |

## Current implementation status

- **Implemented:**
  - Supabase auth with **email/password** login.
  - **Magic link** login flows for passwordless access.
  - Basic session-based access to workspaces and `org_memberships`.
- **Pending / partial:**
  - **Google OAuth** login and provider linking for multi-provider identities.
  - Unified contracts for recovery flows and re-entry across all modules.
  - Formalized “identity layer” abstraction reused consistently by decisions, automation, and assistant.

## Key capabilities

- **Multi-provider login** (Google + email) using Supabase auth as the backend.  
- **Stable user identifier** (`user_id`) used consistently across `org_memberships`, audit events, approvals, and executions.  
- **Role resolution**: given a user and `org_id`, resolve role (owner/admin/member) and enforce it in RLS and UI.  
- **Session lifecycle**: secure session storage, refresh tokens, automatic sign-out on invalid sessions, and explicit logout.  
- **Security hooks**: attach user identity to sensitive events (approvals, executions, billing changes).

## Non-goals

- Implementing a custom auth server or identity provider from scratch.  
- Defining business logic for billing, automation, or decisions (they consume identity, but do not redefine it).  
- Implementing all UI flows; this document focuses on **architecture and contracts**.

## Connections to FREEDOLIAPP

- **Platform / tenant model**: identity drives which org(s) a user can access, and which workspace is active.  
- **Decision and automation systems**: approval and execution helpers use validated identity and roles.  
- **Billing gates**: only authenticated users with appropriate roles can access billing settings or seat management.  
- **Assistant layer (future)**: the assistant must know which user and org context it is operating under to respect permissions and privacy.

