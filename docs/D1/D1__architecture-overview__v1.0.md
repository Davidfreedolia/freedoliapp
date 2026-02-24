# D1 — Architecture Overview

Status: stable  
Owner: Lead Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17  
Related migrations: S1.0–S1.7  
Related modules: All D8 modules  

---

## 1. Scope

Defineix l’arquitectura real actual de FREEDOLIAPP:

- Frontend
- Base de dades
- Multi-tenant boundary
- Integracions
- On viu la lògica crítica

No documenta detalls de taules (veure D2).

---

## 2. System Components

### Frontend
- React + Vite
- Supabase JS client
- Active workspace (org_id) carregat des de context
- UI modular per mòduls (Projects, Suppliers, POs, etc.)

### Backend
- Supabase Postgres
- RLS com a capa de seguretat principal
- Helpers SQL:
  - is_org_member()
  - is_org_owner_or_admin()

### Storage
- Supabase Storage
- Policies associades a org boundary

---

## 3. Multi-tenant Boundary

Tenant = org

- orgs
- org_memberships
- org_id com a frontera de dades

Cap dada de negoci existeix fora d’un org_id.

---

## 4. Logic Distribution

### Database handles:
- Multi-tenant enforcement
- Backfill determinista
- Triggers
- Integrity rules

### Frontend handles:
- UX
- Fluxos operatius
- Orquestració

No hi ha backend custom.

---

## 5. Architectural Principles

- org_id és obligatori
- RLS és la capa de seguretat real
- No duplicació de models
- Migracions evolutives, no disruptives

---

## 6. Change Policy

S’actualitza si:
- Canvia l’arquitectura
- S’afegeix backend extern
- Es modifica el model multi-tenant
