# FREEDOLIAPP — DATA MAP V1

Status: Draft  
Owner: Product / Security  
Scope: Data processing overview for FREEDOLIAPP SaaS  

Goal

Document what data FREEDOLIAPP processes, where it is stored,
who can access it, and how it is protected.

This document supports:

- GDPR compliance
- enterprise customer security reviews
- internal security governance

---

# 1 — System Overview

FREEDOLIAPP is a SaaS platform that helps product businesses manage operational workflows including:

- suppliers
- purchase orders
- inventory
- operational decisions
- financial visibility

The platform does not process or hold payments.

Payments for the SaaS subscription are handled by Stripe.

---

# 2 — Infrastructure Providers

Frontend

Provider:  
Vercel

Purpose:  
Hosting of the web application and frontend assets.

---

Backend

Provider:  
Supabase

Purpose:  
Database, authentication, API layer and storage.

---

Payments

Provider:  
Stripe

Purpose:  
Subscription billing and payment processing.

---

# 3 — Data Categories Processed

FREEDOLIAPP processes the following categories of data.

---

## User Account Data

Description

Information required to create and manage user accounts.

Examples

- user name
- email address
- organization membership
- login metadata

Storage

Supabase database.

Access

Authorized users within the same organization and platform administrators.

---

## Organization Data

Description

Data describing the company using the platform.

Examples

- organization name
- workspace configuration
- subscription plan

Storage

Supabase database.

Access

Members of the same organization.

---

## Supplier Data

Description

Information about suppliers used by the organization.

Examples

- supplier name
- country and city
- supplier type
- contact information

Storage

Supabase database.

Access

Users belonging to the organization workspace.

---

## Purchase Order Data

Description

Operational records describing orders placed with suppliers.

Examples

- purchase order number
- supplier reference
- order quantity
- order status
- shipment information

Storage

Supabase database.

Access

Users within the organization workspace.

---

## Inventory Data

Description

Information related to product inventory.

Examples

- SKU
- stock levels
- inventory movements
- days of cover

Storage

Supabase database.

Access

Users within the organization workspace.

---

## Operational Decision Data

Description

System-generated insights and alerts.

Examples

- stockout risk alerts
- margin compression alerts
- reorder recommendations

Storage

Supabase database.

Access

Users within the organization workspace.

---

# 4 — Data Isolation Model

FREEDOLIAPP uses a multi-tenant architecture.

Each organization has isolated data.

Isolation mechanism

- org_id column
- Row Level Security (RLS) policies in PostgreSQL

This ensures users can only access data belonging to their organization.

---

# 5 — Authentication

Authentication is handled by Supabase Auth.

Supported login methods

- email/password
- OAuth providers (e.g. Google)

Security mechanisms

- hashed passwords
- secure session tokens
- HTTPS encryption

---

# 6 — Encryption

Data in transit

All communication uses HTTPS/TLS encryption.

Data at rest

Database storage is encrypted by the infrastructure provider.

---

# 7 — Access Control

Application access control is based on:

- authenticated user identity
- organization membership
- role-based permissions (where applicable)

Database access is restricted via RLS policies.

---

# 8 — Data Retention

Data is retained for the duration of the customer account.

Customers can request data deletion upon account termination.

Backups may retain historical copies for a limited period.

---

# 9 — Data Sharing

FREEDOLIAPP does not sell or share customer data.

Third-party processors include:

- Supabase (data hosting)
- Vercel (application hosting)
- Stripe (billing)

Each provider maintains its own security and compliance certifications.

---

# 10 — Security Controls

Security controls implemented include:

- HTTPS encryption
- authentication via Supabase
- Row Level Security policies
- infrastructure-level encryption
- secure API access

---

# 11 — Compliance Scope

FREEDOLIAPP aims to comply with:

- GDPR (EU data protection regulation)

The platform does not currently process sensitive personal data or financial transactions.

---

# 12 — Future Security Roadmap

Potential future improvements include:

- security audit
- penetration testing
- SOC2 readiness
- enhanced audit logging

---

# Conclusion

This document provides a high-level overview of how data is processed and protected within the FREEDOLIAPP platform.

