# D5 — Security Model

Status: stable  

## 1. Security Layers

- Supabase Auth
- RLS
- Storage policies

## 2. Multi-tenant Enforcement

is_org_member
is_org_owner_or_admin

## 3. Sensitive Surfaces

- Storage objects
- Financial tables
- Audit logs

## 4. Verification

RLS enabled
No cross-tenant leaks
