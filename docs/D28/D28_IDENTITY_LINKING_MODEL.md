# D28 — Identity Linking Model

Status: DRAFT

## 1 Objective

Define how FREEDOLIAPP manages multiple identity providers for the same user.

The system must support multiple login providers without creating duplicate user accounts.

---

## 2 Identity problem

If users can log in using:

- email
- Google
- Amazon
- Shopify

the system must determine whether these identities represent the same person.

---

## 3 Primary identity rule

Each user has one primary identity record.

Additional login providers must link to the same user.

Example:

User Account

Primary identity  
email: user@email.com

Linked identities  
Google OAuth  
Shopify OAuth  
Amazon OAuth

All providers resolve to the same user account.

---

## 4 Linking strategy

Linking may occur through:

### Verified email match

If OAuth provider returns an email identical to an existing verified email, the system may link automatically.

---

### Manual confirmation

If identity is uncertain, user must confirm linking.

Example:

"You already have an account with this email.  
Do you want to link your Google account?"

---

## 5 Security rules

Linking must prevent account takeover.

The system must ensure:

- email verification
- explicit user confirmation when needed
- protection against OAuth email spoofing

---

## 6 Workspace integrity

Linked identities must not alter workspace ownership.

Users remain associated with workspaces via:

org_memberships

Identity linking only affects authentication.

---

## 7 Account management UX

Users should later be able to see linked providers:

Example:

Account Settings

Linked Accounts  
• Email login  
• Google login  
• Shopify login

Users may unlink providers except the primary identity.

---

## 8 Definition of done

- identity linking model documented
- duplicate user prevention defined
- linking security rules defined
- no code changes

---

## 9. Login to Workspace Resolution

After authentication, FREEDOLIAPP must determine which workspace the user should enter.

This process is called **workspace resolution**.

---

### Step 1 — Identify user

After login, the system resolves the user identity using:

- email
- linked OAuth identity

This resolves to a single user account.

---

### Step 2 — Check workspace memberships

The system queries:

org_memberships

Possible outcomes:

#### Case A — User belongs to one workspace

Redirect directly to that workspace.

---

#### Case B — User belongs to multiple workspaces

Show workspace selector.

Example:

Select workspace:

• Freedolia  
• Test Workspace

---

#### Case C — User belongs to no workspace

Start onboarding flow.

---

### Step 3 — Onboarding flow

If the user has no workspace:

1. Create workspace
2. Create org_membership
3. Link trial registration if exists
4. Redirect to application

---

### Trial linking rule

If a trial registration exists for the user's email:

trial_registrations

The system must attempt to link:

trial → workspace

Status becomes:

workspace_created

---

### Workspace ownership

The first user creating the workspace becomes:

workspace owner.

Ownership is recorded through:

org_memberships

---

### Architectural guarantee

This model ensures:

- no orphan users
- no duplicate workspaces
- correct trial linking
- stable tenant boundaries

---
