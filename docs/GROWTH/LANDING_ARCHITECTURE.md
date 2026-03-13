# FREEDOLIAPP — Landing Architecture

## Status
Planned

## Goal

Define the separation between:

- public marketing pages
- authentication entry
- the application itself

This separation improves performance, SEO and maintainability.

---

# 1 — APPLICATION STRUCTURE

FREEDOLIAPP consists of three layers:

1. **Public landing**
2. **Entry / authentication**
3. **Application**

---

# 2 — PUBLIC LANDING

Public pages accessible without authentication.

Examples:

- `/`
- `/features`
- `/pricing`
- `/how-it-works`

Responsibilities:

- explain the product
- capture leads
- guide visitors to the trial

Landing includes:

- marketing content
- screenshots
- Freedoli assistant
- call to action for trial

These pages must be SEO-friendly and fast.

---

# 3 — ENTRY / AUTHENTICATION

Entry pages allow users to start or access the application.

Examples:

- `/login`
- `/trial`
- `/activation`

Responsibilities:

- authentication
- account creation
- onboarding wizard

Supported authentication methods:

- Google login
- magic link email

Passwords are avoided to reduce friction.

---

# 4 — APPLICATION

All operational functionality lives under the application routes.

Example routes:

- `/app/dashboard`
- `/app/projects`
- `/app/suppliers`
- `/app/orders`
- `/app/inventory`
- `/app/analytics`

These routes require authentication.

---

# 5 — ROUTE STRUCTURE

Example routing structure:

**Public:**

- `/`
- `/features`
- `/pricing`
- `/how-it-works`

**Entry:**

- `/login`
- `/trial`
- `/activation`

**Application:**

- `/app/*`

---

# 6 — USER FLOWS

**New user:**

```
Landing
→ Start free trial
→ Login
→ Activation wizard
→ Dashboard
```

**Existing user:**

```
Landing
→ Login
→ Dashboard
```

---

# 7 — ASSISTANT INTEGRATION

Freedoli assistant appears on:

- Landing pages
- Application dashboard

The assistant helps visitors understand the product
and guides new users through onboarding.

---

# 8 — DESIGN PRINCIPLES

Landing architecture must follow:

- fast loading pages
- SEO friendly structure
- clear separation from application code
- minimal friction to start trial

Target experience:

**Visitor → Trial → Dashboard in under 2 minutes.**
