# D26 — Auth Providers & Login Strategy

Status: DRAFT

## 1 Objective

Define the authentication provider strategy for FREEDOLIAPP.

The system must support multiple login providers while preserving:

- workspace tenancy
- billing integrity
- account ownership clarity

---

## 2 Supported login methods (future)

FREEDOLIAPP may support:

- email / magic link
- Google OAuth
- Amazon OAuth
- Shopify OAuth
- future providers

These providers authenticate the **user identity**, not the business channels.

---

## 3 Core rule

Authentication providers identify the **person** using the app.

Channel connectors identify the **commerce accounts** connected to the workspace.

These two concepts must remain separate.

---

## 4 Login flow model

User opens login page.

User chooses login provider.

Examples:

Login with Email  
Login with Google  
Login with Amazon  
Login with Shopify

After authentication:

System checks if the user already belongs to a workspace.

If yes → redirect to existing workspace.

If not → onboarding flow creates a new workspace.

---

## 5 Account linking

A user may link multiple identity providers to the same account.

Example:

User account  
• Google login  
• Email login  
• Shopify login

All identities resolve to the same user record.

---

## 6 Workspace relationship

Users belong to workspaces via:

org_memberships

This ensures:

- tenant isolation
- proper permission management
- correct billing attribution

---

## 7 Security requirements

The system must ensure:

- OAuth tokens are stored securely
- identity providers cannot hijack workspace ownership
- account linking requires verified email match or explicit confirmation

---

## 8 Product implications

Login screen may show multiple providers.

Example UI:

Sign in with Email  
Sign in with Google  
Sign in with Amazon  
Sign in with Shopify

But connecting a commerce platform still happens inside the workspace.

---

## 9 Architectural benefit

This model allows:

- flexible login methods
- multichannel commerce connectors
- stable tenant model
- clean billing integration

---

## 10 Definition of done

- auth strategy documented
- login provider model defined
- account linking concept defined
- workspace relationship clarified
- no code changes

---

## 11. Channel Connections & Plan Limits

FREEDOLIAPP allows workspaces to connect external commerce channels (Amazon, Shopify, etc.) after login.

Channel connections belong to the workspace (`org_id`) and are independent from the login provider used by the user.

### Channel connection examples

A workspace may connect:

- Amazon Seller EU account
- Shopify store
- additional marketplaces in the future
- dropshipping supplier feeds

### Multiple channels per workspace

A single workspace may connect multiple channels simultaneously.

Example:

Workspace A  
• Amazon EU account  
• Shopify Store A  
• Shopify Store B

All imported data flows into the same canonical data model and feeds existing engines.

### Plan-based limits

Channel connections may be limited by subscription plan.

Example model:

Starter Plan  
• 1 channel connection

Growth Plan  
• up to 3 channel connections

Pro Plan  
• unlimited channel connections

These limits must be enforced through the existing **entitlements / feature gating system**.

### Architectural rule

Channel limits are enforced at the **Application Layer**, while engines remain channel-agnostic.

Engines operate only on canonical data and must not contain logic specific to any commerce platform.

### Billing implications

Channel limits must integrate with the existing billing system:

- billing_subscriptions
- billing_org_entitlements

The billing system determines how many channel connections a workspace may create.

### Future scalability

This model allows:

- multichannel commerce
- controlled SaaS pricing tiers
- reuse of engines across platforms
- stable tenant architecture

---
