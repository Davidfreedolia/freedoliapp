FREEDOLIAPP — SaaS Master Architecture & Strategic Roadmap
1. Product Vision

FREEDOLIAPP is evolving into a hybrid SaaS platform for Amazon sellers, teams, and agencies.

Business model:

Workspace subscription (base plan)

Seat-based pricing (per user inside workspace)

Target users:

Solo Amazon sellers

Seller teams (VA, partner, accountant)

Agencies managing multiple sellers

2. Core Architectural Principle
🔒 Workspace (org) is the tenant boundary

All business data must belong to an org_id.

User-based tenancy is deprecated.

3. Canonical Data Model
Entities
orgs

id

name

created_at

created_by

billing_status

current_plan

seat_limit

org_memberships

org_id

user_id

role (owner | admin | member)

created_at

projects

id

org_id

...

purchase_orders

id

org_id

buyer_info (snapshot)

total_amount

currency

items (jsonb)

All operational tables must include:

org_id UUID NOT NULL REFERENCES orgs(id)
4. RLS Rules (Non-Negotiable)

No Allow all policies on tenant data.

Every policy must validate:

is_org_member(org_id)

user_id is only for:

created_by

audit tracking

membership logic

Never for data isolation.

5. Financial Integrity Rules
Mandatory Server-Side Controls

Validate items JSONB schema.

Enforce:

total_amount = SUM(items.qty * items.unit_price)

Block updates to:

buyer_info

items

total_amount
after creation.

Snapshot company settings at PO creation.

6. Security Model
Prevent:

XSS via logo_url

XSS via items.description

Cross-tenant access

Arbitrary total_amount manipulation

Required:

URL validation (http/https only)

Audit trail table

JSONB schema validation

Immutable POs

7. SaaS Roadmap
Phase S1 — Complete Multi-Tenant Hardening

org_id everywhere

Remove permissive RLS

JSONB validation

total trigger validation

Phase S2 — Workspace Context in Frontend

active_org_id

workspace selector

role-based UI

Phase S3 — Billing (Stripe Hybrid)

Stripe customer = org

Subscription = org

Seats = quantity

Webhook sync

Feature gating

Phase S4 — Compliance

purchase_orders_audit

PDF storage versioning

Immutable financial records

EU data retention compliance

Phase S5 — Scalability

JSONB GIN indexes

Rate limiting RPC

Observability

Optional server-side PDF generation

8. Engineering Rules Going Forward

No new operational table without org_id.

No permissive RLS.

All financial data validated server-side.

Billing status gates access.

Snapshot logic immutable.

9. Strategic Outcome

After S1–S3:

FREEDOLIAPP becomes commercially viable as:

Secure SaaS

Multi-tenant safe

Financially robust

Ready for scale