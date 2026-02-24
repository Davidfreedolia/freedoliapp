# D4 — Frontend Architecture

Status: stable  
Owner: Lead UI Architect  
Last verified against: (run: `git rev-parse --short HEAD`) — 2025-02-17  

---

## 1. Org Context

active_org_id carregat en iniciar sessió.

Totes les queries filtren per org_id.

---

## 2. Module Pattern

Cada mòdul:
- Pàgina
- Data fetch
- Componentització
- Respecte del contracte D3

---

## 3. Data Access

Supabase client directe.
No backend intermediary.

---

## 4. Security Boundary

El frontend mai substitueix RLS.
Només orquestra.
