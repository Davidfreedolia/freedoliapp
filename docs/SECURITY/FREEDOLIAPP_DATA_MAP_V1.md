# FREEDOLIAPP — DATA MAP V1

Status: Draft  
Owner: Product / Security  
Scope: Data processing overview for FREEDOLIAPP SaaS

---

## 1 — System Overview

FREEDOLIAPP is a SaaS platform that helps product businesses manage operational workflows including:

- suppliers  
- purchase orders  
- inventory  
- operational decisions  
- financial visibility

The platform does **not** process or hold customer payments.  
Payments for the SaaS subscription are handled by **Stripe**.

---

## 2 — Infrastructure Providers

**Frontend**  
Provider: Vercel  
Purpose: hosting of the web application and frontend assets.

**Backend**  
Provider: Supabase  
Purpose: database, authentication, API layer and storage.

**Payments**  
Provider: Stripe  
Purpose: subscription billing and payment processing.

---

## 3 — Data Categories

**User Account Data**  
Examples: email, user name, workspace membership.

**Organization Data**  
Examples: organization name, plan, workspace settings.

**Supplier Data**  
Examples: supplier name, country, contact data.

**Purchase Order Data**  
Examples: purchase order number, quantities, supplier, shipment information.

**Inventory Data**  
Examples: SKU, stock levels, inventory movements.

**Decision Data**  
Examples: alerts, reorder recommendations, margin warnings.

---

## 4 — Data Isolation Model

FREEDOLIAPP uses a **multi-tenant** architecture.

Tenant isolation is implemented using:

- an `org_id` column on application data  
- PostgreSQL **Row Level Security (RLS)** policies

These mechanisms ensure users can only access data belonging to their organization.

---

## 5 — Authentication

Authentication is handled by **Supabase Auth**.

Supported methods may include:

- email/password  
- OAuth providers (e.g. Google)

---

## 6 — Encryption

**Data in transit**  
All communication between client and backend uses **HTTPS/TLS** encryption.

**Data at rest**  
Database and storage are encrypted by the respective infrastructure providers.

---

## 7 — Access Control

Application access is controlled by:

- authenticated user identity  
- organization membership  
- database **RLS policies**

Only authorized users within an organization can access that organization’s data.

---

## 8 — Data Retention

Data is stored for the **lifetime of the customer account**.

Customers can request deletion of their data.  
Backups may retain temporary copies for a limited period as part of standard backup procedures.

---

## 9 — Subprocessors

FREEDOLIAPP relies on the following subprocessors:

- **Supabase** — database, authentication, APIs, storage  
- **Vercel** — application and frontend hosting  
- **Stripe** — subscription billing and payment processing

---

## 10 — Conclusion

This document provides a **high-level overview** of what data FREEDOLIAPP processes, where it is stored, and how it is protected within the platform and its infrastructure providers.

