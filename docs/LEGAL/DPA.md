# FREEDOLIAPP — DATA PROCESSING AGREEMENT

Status: Draft  
Owner: Legal / Product  
Scope: Data processing agreement between FREEDOLIAPP and customers

---

## 1 — Roles

Under this Data Processing Agreement:

- The **Customer** acts as the **Data Controller**.  
- **Freedoliapp** acts as the **Data Processor**.

The Customer determines the purposes and means of processing personal data. Freedoliapp processes such data solely on behalf of, and in accordance with the instructions of, the Customer.

---

## 2 — Processing Scope

Freedoliapp provides a SaaS platform to manage operational workflows, including:

- suppliers  
- purchase orders  
- inventory  
- operational decisions  
- financial visibility

Within this scope, Freedoliapp processes operational business data and related personal data **on behalf of the Customer** for the purpose of providing, maintaining and improving the service.

Freedoliapp does not use Customer data for its own independent purposes.

---

## 3 — Security Measures

Freedoliapp implements appropriate technical and organizational measures to protect Customer data, including:

- **HTTPS**: all communication between client and backend uses HTTPS/TLS encryption.  
- **Authentication**: access to the platform requires authenticated user accounts and secure session management.  
- **Infrastructure security**: data is hosted on secure cloud infrastructure providers that implement encryption at rest and security best practices.  
- **Row Level Security (RLS) policies**: PostgreSQL RLS and organization-level identifiers are used to isolate data between different customers and ensure users can only access data belonging to their organization.

These measures are designed to protect data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure or access.

---

## 4 — Subprocessors

For the provision of the service, Freedoliapp relies on the following subprocessors:

- **Supabase** — database, authentication, APIs and storage.  
- **Vercel** — application and frontend hosting.  
- **Stripe** — subscription billing and payment processing.

Freedoliapp ensures that subprocessors are bound by data protection obligations that are at least as protective as those set out in this Agreement.

---

## 5 — Data Deletion

Upon termination of the Customer’s account, the Customer may request deletion of its data from the service, subject to applicable legal obligations and standard backup retention.

Freedoliapp will delete or anonymize Customer data within a reasonable timeframe, except where retention is required by law or necessary for the establishment, exercise or defense of legal claims.

---

## 6 — Compliance

Freedoliapp aims to comply with applicable data protection requirements, including the **General Data Protection Regulation (GDPR)**, when processing personal data on behalf of the Customer.

Freedoliapp will process personal data only on documented instructions from the Customer, implement appropriate security measures and support the Customer’s compliance efforts as reasonably required under this Agreement.

# FREEDOLIAPP — Data Processing Agreement (Stub)

Status: Draft (structure only, not final legal text)  

## Purpose

Define the terms under which FREEDOLIAPP acts as a **data processor** for customers under GDPR and similar regulations, including security measures, subprocessors, and data subject rights.

## Key sections to be completed

- Roles of the parties (controller vs processor)  
- Subject matter and duration of processing  
- Nature and purpose of processing (commerce operations, analytics, automation assistance)  
- Types of personal data and categories of data subjects  
- Processor obligations (confidentiality, security, breach notification)  
- Subprocessors (Supabase, Vercel, Stripe, Amazon SP-API, and others) and conditions for adding new ones  
- Data subject rights assistance (access, deletion, export, correction)  
- International transfers and appropriate safeguards  
- Return or deletion of data on termination  
- Audit and compliance mechanisms

## FREEDOLIAPP-specific notes

- Most customer data is stored in Supabase and served via Vercel; these must be explicitly listed as subprocessors.  
- Stripe processes billing data as a separate controller/processor, which must be clarified.  
- Amazon SP-API is used as a **data source**; FREEDOLIAPP does not control Amazon’s own processing but must respect Amazon’s API terms.

