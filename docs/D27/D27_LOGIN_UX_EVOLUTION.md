# D27 — Login UX Evolution

Status: DRAFT

## 1 Objective

Define how the login screen of FREEDOLIAPP will evolve to support multiple identity providers.

This phase does not implement login providers yet.

It defines the UX and architectural approach.

---

## 2 Current login model

Current login flow:

User enters email  
Magic link sent  
User logs in

This model works but limits future identity providers.

---

## 3 Future login options

Future login screen may include:

Sign in with Email  
Sign in with Google  
Sign in with Amazon  
Sign in with Shopify

These providers authenticate the user identity.

They do not automatically connect commerce channels.

---

## 4 Login UX structure

Login page layout concept:

Email login section

Divider

Continue with Google  
Continue with Amazon  
Continue with Shopify

Optional explanatory text:

"Commerce platforms can be connected after login."

---

## 5 Onboarding interaction

After successful login:

System checks if the user already belongs to a workspace.

If yes → redirect to workspace.

If not → onboarding flow starts.

This onboarding flow may create a new workspace.

---

## 6 Account linking

A user may later link additional login providers.

Example:

User initially signs in with email.

Later they may link:

Google login  
Shopify login

All identities map to the same user account.

---

## 7 Security considerations

The login system must ensure:

- verified email ownership
- secure OAuth token storage
- protection against workspace takeover
- explicit confirmation for account linking

---

## 8 UX rule

Login providers must remain simple.

Commerce integrations must remain inside the workspace settings.

Login should never implicitly connect business channels.

---

## 9 Definition of done

- login UX documented
- provider model clarified
- onboarding interaction defined
- no code changes

---

## 10. Login Screen Layout Specification

The login screen must remain simple and clear while supporting multiple identity providers.

### Layout structure

The login page contains three sections.

1. Brand area
2. Email login
3. OAuth providers

Example structure:

FREEDOLIAPP logo

Sign in to your workspace

Email login field

Send magic link button

Divider

Continue with Google  
Continue with Amazon  
Continue with Shopify

---

### UI principles

The login screen must:

- remain minimal
- clearly separate email login from OAuth providers
- avoid visual clutter
- explain that commerce platforms are connected later

Suggested text:

"You can connect your commerce platforms after signing in."

---

### Provider order

Recommended order:

1 Email login  
2 Google  
3 Amazon  
4 Shopify

Email remains the most universal fallback.

---

### Error handling

The login page must handle:

- invalid email
- expired magic link
- OAuth provider errors
- network issues

Errors must not expose technical details.

---

### Fallback rule

If OAuth fails, users must always be able to log in via email magic link.

---

### Accessibility

Login must support:

- keyboard navigation
- screen readers
- mobile layout

---

### Security

Login page must ensure:

- no sensitive data stored in frontend
- OAuth tokens handled server-side
- secure redirects

---
