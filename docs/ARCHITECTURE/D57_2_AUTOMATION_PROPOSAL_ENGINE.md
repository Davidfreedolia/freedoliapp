# D57.2 — Automation Proposal Engine (Implementation)

Status: Implemented  
Phase: D57.2  
Scope: Decision → eligibility → automation_proposal. No execution, no UI, no workers.

---

## 1. Objectiu

Implementar la capa que converteix decisions elegibles en `automation_proposals`, seguint D57 i D57.1.

- **Flux:** decision → avaluació d’elegibilitat → proposta (persistida) + event `proposal_created`.
- **No s’implementa:** execució real, POs, missatges a proveïdors, preus, cron/autopilot, aprovacions operatives completes.

---

## 2. Punts d’entrada

- **Únic punt d’entrada exposat:** `maybeCreateAutomationProposalForDecision(supabase, { orgId, decisionId })`.
  - Es crida des del flux on es creen decisions: frontend `syncReorderDecisions` (src) i scheduler Deno `syncReorderDecisions` (_shared).
- **Helpers interns:** getAutomationRuleForAction, evaluateDecisionAutomationEligibility, buildAutomationProposalFromDecision, createAutomationProposal.

---

## 3. Action types implementats

Només tres:

- `prepare_reorder` (decision_type `reorder`)
- `create_internal_task` (decision_type `internal_task`)
- `schedule_review` (decision_type `schedule_review`)

---

## 4. Model d’elegibilitat

`evaluateDecisionAutomationEligibility(supabase, { orgId, decisionId, actionType? })` retorna:

- `eligible: true` → es pot cridar build + create.
- `eligible: false`, `reason`: `not_eligible` | `blocked`, `detail` opcional.

Comprovacions:

- org_id i decision_id vàlids.
- Decisió existeix i pertany a l’org.
- status = open o acknowledged.
- action_type suportat (derivat de decision_type si no es passa).
- Existeix regla activa a `automation_rules` (org + action_type, is_enabled, valid_from/valid_to).
- automation_level >= 1.
- **Context mínim:** per tots els action types (prepare_reorder, create_internal_task, schedule_review) es exigeix com a mínim `context.asin` o `context.project_id` (no buit); si no es compleix → `not_eligible`, `detail: 'missing_context'`, per evitar propostes sense context útil.
- No hi ha proposta activa equivalent (mateix org, decision_id, action_type, status en drafted/pending_approval/approved/queued_for_execution).

---

## 5. Model de dedupe

Abans d’inserir, `createAutomationProposal` comprova:

- Proposta activa amb mateix org_id, decision_id, action_type.
- Proposta existent amb mateix org_id i idempotency_key (si es proporciona).

Si existeix, retorna `{ ok: false, reason: 'duplicate' }`. La BD té índex únic (org_id, idempotency_key) com a xarxa addicional.

---

## 6. Model de risc inicial

Centralitzat a `automationRisk.js` → `computeProposalRisk({ priorityScore, context, actionType })`.

- **Bandes:** low, medium, high (determinista).
- **Factors:** priority_score de la decisió, reorder_units i confidence del context.
- No hi ha motor de risc sofisticat; es documenta i es manté determinista.

---

## 7. Finestra de validesa inicial

- `valid_from` = now.
- `expires_at` = now + X dies segons action_type (constants.js):
  - prepare_reorder: 7 dies
  - create_internal_task: 14 dies
  - schedule_review: 7 dies

---

## 8. Events generats

- **proposal_created:** en inserir una proposta; es registra a `automation_events` (proposal_id, decision_id, event_type, event_payload_json, actor_type system). L’escriptura d’aquest event és **best-effort**: si falla l’insert a `automation_events`, no es fa rollback de la proposta ni es llença cap excepció; només es registra `console.warn`. S’accepta la inconsistència menor “proposta sense event” per no contaminar el flux de decisions.
- **proposal_blocked:** no es persisteix a `automation_events` en aquesta fase (requeriria proposal_id; es deixa per a fases posteriors si cal).

---

## 9. Fitxers creats / modificats

| Fitxer | Acció |
|--------|--------|
| `src/lib/automation/constants.js` | Creat |
| `src/lib/automation/automationRisk.js` | Creat |
| `src/lib/automation/getAutomationRuleForAction.js` | Creat |
| `src/lib/automation/evaluateDecisionAutomationEligibility.js` | Creat |
| `src/lib/automation/buildAutomationProposalFromDecision.js` | Creat |
| `src/lib/automation/createAutomationProposal.js` | Creat |
| `src/lib/automation/maybeCreateAutomationProposalForDecision.js` | Creat |
| `src/lib/decision-engine/integrations/reorderDecisions.js` | Modificat (crida a maybeCreateAutomationProposalForDecision després de createDecision) |
| `supabase/functions/_shared/automationProposal.ts` | Creat (mirall Deno per al scheduler) |
| `supabase/functions/_shared/decisionSchedulerSync.ts` | Modificat (crida a maybeCreateAutomationProposalForDecision després de createDecision) |
| `docs/ARCHITECTURE/D57_2_AUTOMATION_PROPOSAL_ENGINE.md` | Creat |

---

## 10. Què NO s’ha implementat

- Execució real d’accions (PO, reorder, preus, missatges).
- Autopilot o cron nous per a propostes.
- Workflow d’aprovació operatiu (només metadada approval_mode a la proposta).
- UI nova (approval center, cua d’automació).
- Edge Functions noves.
- Notificacions o analytics més enllà del mínim (cap canvi específic).
- Refactor massiu del Decision Engine.
- Registre de `proposal_blocked` a automation_events.

---

## 11. Estat inicial de la proposta

- Si la regla té `approval_mode !== 'none'` → `proposal_status = 'pending_approval'`.
- Si `approval_mode === 'none'` → `proposal_status = 'drafted'`.

Criteri únic i documentat; sense variants addicionals.
