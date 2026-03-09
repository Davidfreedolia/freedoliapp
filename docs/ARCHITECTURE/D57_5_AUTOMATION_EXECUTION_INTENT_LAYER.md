# D57.5 — Automation Execution Intent Layer (Implementation)

Status: Implemented  
Phase: D57.5  
Scope: Transform an approved, readiness-validated proposal into a formal execution intent (automation_executions row, queued). No real execution.

---

## 1. Objectiu

Implementar la capa que transforma una `automation_proposal` en estat **ready** en una **execution intent** formal i auditable:

- Preparació final prèvia a execució
- Creació controlada d’un registre a `automation_executions` (status `queued`)
- Separació clara entre “llesta per executar” i “execució real”
- Idempotència i dedupe abans de crear intents
- Events de handoff

Sense executar cap acció de negoci. Només es pot escriure a `automation_executions`, `automation_proposals`, `automation_events`.

---

## 2. Helper principal

- **`createAutomationExecutionIntent(supabase, { proposalId, orgId })`**  
  Retorna `{ status: 'created' | 'duplicate' | 'blocked' | 'invalidated', executionId?, reason?, detail? }`.

---

## 3. Preconditions

Abans de crear l’intent es comprova:

- proposalId i orgId presents
- La proposta existeix i pertany a l’org
- proposal_status = 'approved'
- No està invalidada (invalidated_at null)
- **Readiness:** `evaluateAutomationProposalReadiness` retorna `ready`; si retorna blocked o invalidated, no es crea intent i es retorna el mateix status
- No existeix una execution activa equivalent (mateix proposal_id, execution_status en `queued` o `running`)
- action_type dins de SUPPORTED_ACTION_TYPES
- payload_json present a la proposta

Si alguna falla, es retorna blocked / invalidated / duplicate segons el cas, sense inserir.

---

## 4. Model d’intent

- **Taula:** `automation_executions`
- **Estats inicials:** només `execution_status = 'queued'`. No s’usa `running`, `succeeded`, `failed` en aquesta fase perquè no hi ha executor real.
- **execution_mode:** `approved_trigger` (l’intent ve d’una proposta aprovada i passada per readiness).
- **Camps omplerts a l’insert:** org_id, proposal_id, decision_id, action_type, execution_status: 'queued', execution_mode: 'approved_trigger', payload_json (còpia de la proposta), executed_by_system: false. started_at, finished_at, executed_by es deixen null.

---

## 5. Dedupe / idempotència

- Es comprova si ja existeix una fila a `automation_executions` amb el mateix `proposal_id`, `org_id` i `execution_status` dins de `['queued', 'running']`.
- Si existeix, es retorna `{ status: 'duplicate', reason: 'active_execution_exists', detail: '...' }` i no es crea cap fila nova.

---

## 6. Policy de proposal_status

- En crear l’intent **correctament** (després d’inserir a `automation_executions`), la proposta es passa a **queued_for_execution**.
- Si l’insert d’execution falla, **no** es canvia l’estat de la proposta (romandrà `approved`).
- Si l’update de la proposta a `queued_for_execution` falla, es fa només `console.warn`; el retorn segueix sent `created` amb executionId (l’intent ja existeix).

---

## 7. Events

- **execution_requested:** emès quan s’ha creat la fila a `automation_executions`. Payload mínim: execution_id, execution_status: 'queued', execution_mode: 'approved_trigger'. Best-effort: si falla l’insert de l’event, només `console.warn`.
- No s’implementa event `proposal_queued_for_execution` per reduir soroll; el canvi d’estat de la proposta es pot inferir del propi update.

---

## 8. Failure behavior

- Si el readiness no és ready, no es crea intent; es retorna blocked o invalidated segons el que retorni `evaluateAutomationProposalReadiness`.
- Si hi ha error inesperat (excepció), es captura amb try/catch; es retorna `{ status: 'blocked', reason: 'intent_creation_failed', detail: message }` i es fa `console.warn`. No es llença cap excepció cap amunt.
- Si la query de dedupe (hasActiveExecutionForProposal) falla, es tracta com "existeix intent activa" i es retorna `duplicate` per no crear en incertesa.
- Si falla l’event execution_requested, best-effort amb console.warn.
- Si falla l’insert a automation_executions, no es marca la proposta com queued_for_execution i es retorna blocked amb reason execution_insert_failed.

---

## 9. Què NO s’ha implementat

- Execució real (cap worker executor, cap acció de negoci: POs, preus, missatges, diners).
- Queue runner, edge functions noves, cron.
- UI gran nova, analytics noves, notificacions noves.
- Retries sofisticats.
- Integració automàtica amb scheduler (el helper s’invoca explícitament).

---

## 10. Fitxers

- **Creat:** `src/lib/automation/createAutomationExecutionIntent.js` — Helper únic; dedupe intern `hasActiveExecutionForProposal`, crida a `evaluateAutomationProposalReadiness`, insert execution, update proposal, event execution_requested.
- **Documentació:** `docs/ARCHITECTURE/D57_5_AUTOMATION_EXECUTION_INTENT_LAYER.md` (aquest document).
