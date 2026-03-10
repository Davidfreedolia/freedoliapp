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

