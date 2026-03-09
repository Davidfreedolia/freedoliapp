# D57.6 — Manual Execution Trigger (Implementation)

Status: Implemented  
Phase: D57.6  
Scope: Run manually a queued automation_execution for allowed action types only. In D57.6 the execution is **soft execution** only (no real business action); a successful soft execution does **not** move the proposal to `executed`.

---

## 1. Objectiu

Permetre executar manualment una `automation_execution` en estat `queued`:

- Punt d’entrada manual i explícit: `runAutomationExecutionManually(supabase, { executionId, orgId, actorUserId })`
- Validació final abans d’executar (readiness, action type permès)
- Canvi d’estat coherent: execution → running → succeeded | failed; proposal → execution_failed només si l’execució falla; en soft execution reeixida la proposta **no** passa a executed (es manté queued_for_execution)
- Resultat controlat: `succeeded` | `failed` | `blocked` | `not_found` amb reason/detail
- Audit trail: execution_started, execution_succeeded | execution_failed

Només action types segurs i interns: **create_internal_task**, **schedule_review**. No prepare_reorder, no PO, no preu, no missatges.

---

## 2. Action types suportats en D57.6

- **create_internal_task** — permès; execució real: només “soft execution” (no existeix model estable de task intern).
- **schedule_review** — permès; execució real: només “soft execution” (no existeix model estable de review/recordatori).

Si `action_type` no és un d’aquests, es retorna **blocked** i no es toca res.

---

## 3. Preconditions

Abans d’executar es comprova:

- executionId, orgId, actorUserId presents
- Execution existeix i pertany a l’org
- execution_status = 'queued'
- Proposal associada existeix i pertany a l’org
- proposal_status = 'queued_for_execution' (coherent amb D57.5)
- `evaluateAutomationProposalReadiness` retorna **ready**
- action_type dins de MANUAL_EXECUTION_ACTION_TYPES (create_internal_task, schedule_review)

Si alguna falla, es retorna not_found / blocked sense canviar estats.

---

## 4. Política d’estats

- **automation_executions:**  
  - Inici: queued → es passa a **running** (started_at, executed_by).  
  - Fi: **succeeded** (finished_at, result_json) o **failed** (finished_at, error_code, error_message).  
  - blocked és només valor de retorn; la fila no es persisteix com a “blocked” (romandria queued si es bloqueja abans d’arrencar).

- **automation_proposals:**  
  - Si l’execució acaba **succeeded** → proposal_status = **executed**.  
  - Si l’execució acaba **failed** → proposal_status = **execution_failed**.

---

## 5. Events

- **execution_started** — emès en començar (execution_id, execution_status: running, actor_id). Best-effort; console.warn si falla.
- **execution_succeeded** — emès quan execution_status passa a succeeded (execution_id, result). Best-effort.
- **execution_failed** — emès quan l’execució falla (execution_id, error_code, error_message). Best-effort.

Si l’execució queda bloquejada abans de passar a running (preconditions), no s’emet event específic.

---

## 6. Failure behavior

- Readiness no ready → no s’executa; retorn **blocked** amb reason/detail.
- action_type no permès → **blocked**.
- Fallada en actualitzar execution a running → **blocked** (no es canvia cap estat).
- Fallada durant “execució” (aquí només soft: no s’espera fallada) o en actualitzar a succeeded → execution es marca **failed**, proposal **execution_failed**, event execution_failed, retorn **failed**.
- Fallada en escriure event → best-effort amb console.warn.
- Excepció inesperada → try/catch; retorn **blocked** amb reason intent_creation_failed; no es llença cap amunt.

---

## 7. Side effects reals implementats / soft execution

En D57.6 l’execució és **només soft execution**: no hi ha acció de negoci real. Una soft execution reeixida **no** mou la proposta a `executed`; la proposta es manté a **queued_for_execution** perquè encara no s’ha fet cap acció de negoci real. `execution_status = succeeded` reflecteix únicament que el trigger manual i la resolució interna han acabat bé.

- **create_internal_task:** No existeix model estable de task intern. Implementat només **soft execution**: es desa result_json amb soft_execution: true, action_type, resolved_at, note explicant que l’intent s’ha resolt sense side effect extern. No es crea cap fila en taules de negoci. La proposta no passa a executed.
- **schedule_review:** No existeix model estable de review/recordatori. Mateix **soft execution** auditada; result_json documenta la resolució sense side effect extern. La proposta no passa a executed.

Quan en el futur existixin models estables (tasks internes, reviews) o execució real, es podran connectar i aleshores una execució succeeded sense soft_execution podrà marcar la proposta com executed.

---

## 8. Writes permesos

- **automation_executions** — update (execution_status, started_at, finished_at, executed_by, result_json, error_code, error_message).
- **automation_proposals** — update (proposal_status a execution_failed quan l’execució falla; en soft execution reeixida no es canvia, es manté queued_for_execution; en execució real futura succeeded → executed).
- **automation_events** — insert (execution_started, execution_succeeded, execution_failed).

No s’escriu en taules de negoci ni de decisions. No es creen models nous en aquesta fase.

---

## 9. Què NO s’ha implementat

- Autopilot, cron, queue runner.
- Edge functions noves.
- UI gran nova.
- prepare_reorder ni cap acció que impliqui PO, canvi de preu o missatges.
- Multi-step retry engine, analytics noves, notificacions noves.
- Model nou de tasks internes o de reviews (només soft execution).

---

## 10. Fitxers

- **Modificat:** `src/lib/automation/constants.js` — afegit MANUAL_EXECUTION_ACTION_TYPES (create_internal_task, schedule_review).
- **Creat:** `src/lib/automation/runAutomationExecutionManually.js` — runAutomationExecutionManually, preconditions, running → succeeded/failed, proposal executed/execution_failed, events, soft execution.
- **Documentació:** `docs/ARCHITECTURE/D57_6_MANUAL_EXECUTION_TRIGGER.md` (aquest document).
