# D57.1 — Automation Data Model (Implementation)

Status: Implemented (schema + RLS only)  
Phase: D57.1  
Scope: Database and RLS only. No execution, no UI, no workers.

---

## 1. Objectiu

Implementar **només** la base de dades i el model de seguretat per a Decision Automation, d’acord amb:

- `docs/ARCHITECTURE/D57_DECISION_AUTOMATION.md`

Deliverable: migració SQL + RLS estricta multi-tenant per `org_id` + documentació d’implementació.

---

## 2. Fitxers creats / modificats

| Fitxer | Acció |
|--------|--------|
| `supabase/migrations/20260309000000_d57_1_automation_data_model.sql` | Creat |
| `docs/ARCHITECTURE/D57_1_AUTOMATION_DATA_MODEL.md` | Creat |

**No s’han modificat** taules existents de decisions, frontend, analytics ni notificacions.

---

## 3. Taules creades

### 3.1 `automation_rules`

Configuració per org i `action_type`: enabled/disabled, automation_level (0–3), approval_mode, risk_threshold_max, max_units_per_execution, max_value_per_execution, max_daily_exposure, require_fresh_context, allow_auto_execute, valid_from/valid_to, created_at/created_by, updated_at/updated_by.

**Constraints:**  
`automation_level` 0–3, `approval_mode` in (none, single, dual, role_constrained, conditional), max_units/value/exposure >= 0, valid_to >= valid_from.

---

### 3.2 `automation_proposals`

Proposta d’acció generada des d’una decisió: org_id, decision_id (FK a decisions), decision_event_id (nullable, sense FK), action_type, source/target entity type/id, proposal_status, automation_level, approval_mode, risk_score, risk_band, payload_json, context_snapshot_json, context_hash, idempotency_key, valid_from, expires_at, invalidated_at/invalidation_reason, approved_at/by, rejected_at/by, created_at, created_by_system.

**Statusos:** drafted, pending_approval, approved, rejected, invalidated, expired, queued_for_execution, executed, execution_failed.  
**Constraints:** risk_band in (low, medium, high, critical), expires_at >= valid_from.  
**Índex únic:** (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL.

---

### 3.3 `automation_approvals`

Passos d’aprovació: org_id, proposal_id (FK), approval_step, required_role, approval_status, acted_at, acted_by, comment, created_at.  
**Statusos:** pending, approved, rejected, expired, skipped.

---

### 3.4 `automation_executions`

Registre d’execució (només model, sense lògica d’execució): org_id, proposal_id, decision_id, action_type, execution_status, execution_mode, payload_json, result_json, error_code, error_message, started_at, finished_at, executed_by, executed_by_system, rollback_state, rollback_reference, created_at.  
**Statusos:** queued, running, succeeded, failed, partially_succeeded, canceled, rolled_back.  
**Mode:** manual_trigger, approved_trigger, automatic_trigger.  
**Rollback_state:** not_applicable, possible, manual_only, blocked.

---

### 3.5 `automation_events`

Stream d’auditoria append-only: org_id, proposal_id, execution_id (nullable, FK a automation_executions), decision_id (nullable), event_type, event_payload_json, created_at, actor_type (system|user), actor_id.  
**RLS:** només SELECT i INSERT; sense UPDATE ni DELETE.

---

## 4. Índexs

- **automation_rules:** org_id, action_type, (org_id, action_type).
- **automation_proposals:** org_id, decision_id, proposal_status, action_type, expires_at; UNIQUE (org_id, idempotency_key) WHERE idempotency_key IS NOT NULL; compost `automation_proposals_org_status_action_created_idx` (org_id, proposal_status, action_type, created_at DESC) per cua/review de propostes pendents.
- **automation_approvals:** org_id, proposal_id, approval_status.
- **automation_executions:** org_id, proposal_id, decision_id, execution_status, created_at.
- **automation_events:** org_id, proposal_id, execution_id (partial), decision_id (partial), event_type, created_at.

---

## 5. RLS aplicada

- **Model:** totes les taules tenen `org_id`. Cap policy permissiva.
- **Patró:** alinear amb el canònic FREEDOLIAPP:
  - **SELECT:** `is_org_member(org_id) and (org_billing_allows_access(org_id) or is_org_owner_or_admin(org_id))` (lectura per membres; owners/admins poden llegir encara que billing bloquegi).
  - **INSERT/UPDATE/DELETE:** `is_org_member(org_id) and org_billing_allows_access(org_id)`.
- **automation_events:** només policies de SELECT i INSERT (append-only); sense UPDATE ni DELETE.

Totes les taules deriven seguretat directament de `org_id`; no cal justificar excepcions.

---

## 6. Decisions preses

- **decision_event_id** a `automation_proposals`: nullable, sense FK a `decision_events` per no acoblar la migració a l’esquema d’events; la consistència es pot aplicar a nivell d’aplicació.
- **execution_id** a `automation_events`: FK a `automation_executions(id)` ON DELETE SET NULL per integritat referencial sense esborrar events en esborrar una execució.
- **automation_events** sense UPDATE/DELETE: audit trail append-only tal com defineix D57.
- Noms de constraint `approval_mode` i `risk_band` alineats amb el document D57 (incloent 'none' i 'role_constrained', 'conditional').

---

## 7. Què NO s’ha implementat (D57.1)

- Cap lògica d’execució real (workers, edge functions, cron).
- Cap UI (approval center, automation queue, etc.).
- Cap RPC ni trigger complex.
- Cap canvi a taules `decisions` / `decision_events` (només FKs des de automation_proposals/automation_executions cap a decisions).
- Cap integració amb analytics, notificacions ni frontend.
- Cap generació de propostes ni workflow d’aprovació (fases posteriors, ex. D57.2).

---

## 8. Resum tècnic

Una sola migració idempotent (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS) afegeix les cinc taules del model d’automació, els constraints de dominis (status, level, risk_band, validesa temporal, valors >= 0), índexs per consultes per org, status i temps, i RLS estricta per org sense policies permissives. El model queda preparat per a fases següents (proposal generation, approval workflow, execution layer) sense executar res en aquesta fase.

---

## 9. Riscos o decisions obertes

- **decision_event_id** sense FK: si en fases posteriors es vol garantir que el valor referenciï realment un `decision_events.id`, es pot afegir la FK en una migració posterior (amb backfill si cal).
- **Unique idempotency:** l’índex únic (org_id, idempotency_key) només s’aplica quan idempotency_key no és null; la capa d’aplicació ha de garantir la generació i el respecte de la clau.
- **automation_events append-only:** no hi ha policy de DELETE; correccions o purgues d’auditoria requeririen rols elevats o migracions explícites.
- **Ordre de migracions:** aquesta migració depèn de `orgs`, `decisions` i `auth.users`; s’assumeix que les migracions D32 (decision engine) i el model d’orgs/memberships ja s’han aplicat.
