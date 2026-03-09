# D25 — Multichannel Ingestion and Auth Boundary

Status: DRAFT

## 1. Objective

Define how FREEDOLIAPP can support future multichannel commerce integrations (Shopify, dropshipping sources, eBay, etc.) without breaking the canonical architecture.

Also define the boundary between:

- authentication providers used to log into FREEDOLIAPP
- channel connections used to import operational/commercial data

This phase is architectural documentation only.

## 2. Core Principle

External commerce channels are **ingestion connectors**, not parallel product systems.

Authentication providers are **identity entry methods**, not business data models.

These two concerns must remain separated.

## 3. Separation of concerns

### A. Login / Identity Layer

Purpose:
allow a user to access FREEDOLIAPP.

Possible future providers:
- email / magic link
- Google
- Amazon
- Shopify
- other OAuth providers

Rule:
login providers authenticate the person into the app, but do not define the commerce data architecture.

### B. Channel Connection Layer

Purpose:
connect external business platforms to import data into the workspace.

Examples:
- Amazon seller account
- Shopify store
- dropshipping source
- future channels

Rule:
channel connections happen after login, inside the authenticated workspace context.

They belong to the ingestion architecture, not to the login architecture.

## 4. Architectural path for future channels

Future channels must follow this path:

External Channel  
↓  
Ingestion Layer  
↓  
Canonical Data Layer  
↓  
Existing Engines  
↓  
Application Layer  
↓  
Experience Layer

Examples:
- Shopify orders → canonical sales / orders / inventory tables
- dropshipping supplier feed → canonical products / suppliers / purchase / inventory entities

No channel may bypass canonical entities.

## 5. Login rule for multichannel future

FREEDOLIAPP may support multiple login providers in the future.

Examples:
- login with Google
- login with Amazon
- login with Shopify

But this does NOT replace workspace-level channel connection.

A user may:
- log in with one identity provider
- connect one or more business channels later inside the workspace

Example:
- user logs in with Google
- then connects Amazon and Shopify inside the app

This is the preferred model.

## 6. Why this separation matters

If login and channel connection are mixed:
- account model becomes fragile
- tenant ownership becomes unclear
- billing and entitlements become harder
- multichannel scaling becomes chaotic

If separated:
- auth stays simple
- workspace remains the tenant boundary
- connectors remain modular
- engines stay reusable

## 7. Canonical integration rule

Shopify, dropshipping, and future channels must:
- import data
- normalize data
- reuse canonical tables
- feed existing engines

They must NOT:
- create separate financial truth models
- duplicate profit logic
- duplicate cashflow logic
- duplicate reorder logic

## 8. Product implication

Future UX may include:

### Login options
Multiple sign-in providers on the login screen.

### Connected channels
A workspace settings area where the user connects:
- Amazon
- Shopify
- future channels

These are different product surfaces and must be implemented independently.

## 9. Roadmap implication

This document does not activate implementation yet.

It only establishes that:

- multichannel support belongs to ingestion architecture
- multi-provider login belongs to auth UX / identity layer
- both can coexist
- both must remain separated

## 10. Definition of done

- architecture documented
- auth vs connector boundary documented
- multichannel rule documented
- canonical reuse rule documented
- no code changes

## 11. Channel Connection Model

FREEDOLIAPP must support multiple external commerce channels connected to the same workspace.

Examples:

- Amazon Seller account
- Shopify store
- future marketplaces
- dropshipping suppliers
- fulfillment integrations

These integrations must be represented by a canonical **Channel Connection model**.

---

### Workspace as tenant boundary

Each channel connection always belongs to one workspace (`org_id`).

A workspace may connect multiple channels simultaneously.

Example:

Workspace A  
• Amazon Seller EU  
• Shopify Store  
• Dropshipping Supplier Feed

All data imported from these channels flows into the same canonical data model.

---

### Conceptual channel model

A channel connection represents:

- a platform
- a specific account/store
- credentials or tokens
- ingestion configuration

Conceptual structure:

ChannelConnection

Fields conceptually include:

- id
- org_id
- channel_type
- channel_identifier
- status
- created_at
- last_sync_at

---

### Channel types

Examples of channel types:

- amazon
- shopify
- ebay
- dropship_supplier
- future platforms

This allows the system to expand without changing the core architecture.

---

### Responsibilities of a channel connection

A channel connection is responsible for:

- authentication with the external platform
- scheduling ingestion jobs
- storing connection metadata
- triggering ingestion pipelines

It is NOT responsible for:

- business logic
- financial calculations
- decision engines

Those belong to the Engines Layer.

---

### Channel ingestion flow

Each channel connection triggers ingestion pipelines.

Example flow:

Channel Connection  
↓  
Ingestion Worker  
↓  
Normalization  
↓  
Canonical Tables  
↓  
Existing Engines

---

### Architectural guarantee

This model ensures:

- multichannel commerce support
- reuse of canonical entities
- reuse of engines
- separation between identity and commerce integrations
