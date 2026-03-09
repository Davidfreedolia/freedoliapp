# D57.4 — Automation Execution Readiness Gate (Implementation)

Status: Implemented  
Phase: D57.4  
Scope: Revalidate approved proposals before (future) execution. No execution, no workers, no new UI.

---

## 1. Objectiu

Implementar la capa que valida si una `automation_proposal` ja aprovada està realment llesta per poder ser executada en el futur:

- Revalidació prèvia a execució
- Invalidació si el context ha canviat o les condicions ja no es compleixen
- Bloqueig si hi ha contradiccions o una proposta equivalent més recent
- Model explícit de “readiness” (ready / blocked / invalidated)

Sense executar cap acció. Només es pot escriure a `automation_proposals` i `automation_events`.

---

## 2. Model de readiness

- **ready:** La proposta passa tots els checks; es considera llesta per a un futur pas d’execució (que no s’implementa en aquesta fase).
- **blocked:** La proposta no és ready per un motiu no terminal (p. ex. existeix una altra proposta activa més recent equivalent). No s’invalida la proposta.
- **invalidated:** La proposta ha fallat la revalidació de forma terminal; s’actualitza `proposal_status` a `invalidated`, `invalidated_at`, `invalidation_reason` i s’emeten events. No és candidata a execució.

---

## 3. Helper principal

- **`evaluateAutomationProposalReadiness(supabase, { proposalId, orgId })`**  
  Retorna `{ status: 'ready' | 'blocked' | 'invalidated', reason?: string, detail?: string }`.

---

## 4. Checks aplicats

Per una proposta concreta (id + org), en ordre:

1. **Proposta existeix i pertany a l’org** — Si no → `blocked`, reason `proposal_not_found`.
2. **proposal_status = 'approved'** — Si no → `blocked`, reason `proposal_not_approved`.
3. **No ja invalidada** — Si `invalidated_at` present → `invalidated`, reason `already_invalidated`.
4. **No expirada** — Si `expires_at < now` → s’invalida amb reason `expired`; retorn `invalidated`.
5. **Decisió origen existeix i és compatible** — Si la decisió no existeix → invalidació `decision_not_found`. Si `decision.status` no és `open` ni `acknowledged` → invalidació `decision_closed`.
6. **Context mínim disponible** — Cal `context.asin` o `context.project_id` (no buit). Si no → invalidació `context_unavailable`.
7. **context_hash coherent** — Es recalcula el hash del context actual; si és diferent del `context_hash` de la proposta → invalidació `context_mismatch`.
8. **Cap proposta activa equivalent més recent** — Cerca una altra proposta (mateix org, decision_id, action_type) amb status en approved/queued_for_execution/drafted/pending_approval i `created_at > proposal.created_at`. Si n’hi ha → `blocked`, reason `conflicting_newer_proposal`.
9. **action_type suportat** — Si no està a `SUPPORTED_ACTION_TYPES` → invalidació `action_type_unsupported`.
10. **Regla activa** — `getAutomationRuleForAction(orgId, actionType)`. Si no hi ha regla → invalidació `rule_not_found`. Si `is_enabled === false` → invalidació `rule_disabled`. Si `automation_level < 1` → invalidació `rule_level_not_allowed`.

Si tots els checks passen → **ready**.

---

## 5. Causes d’invalidació

| reason | Descripció |
|--------|------------|
| expired | La proposta ha superat `expires_at`. |
| decision_not_found | La decisió origen ja no existeix. |
| decision_closed | La decisió està resolta/descartada (no open ni acknowledged). |
| context_unavailable | Falta el context mínim (asin o project_id). |
| context_mismatch | El context actual no coincideix amb el context_hash de la proposta. |
| action_type_unsupported | L’action_type ja no és suportat. |
| rule_not_found | No hi ha regla activa per aquest action_type. |
| rule_disabled | La regla existeix però està desactivada. |
| rule_level_not_allowed | La regla té automation_level < 1. |
| already_invalidated | La proposta ja estava invalidada (només retorn; no es torna a escriure). |

En tots els casos (excepte `already_invalidated`) es fa update a `automation_proposals` (proposal_status, invalidated_at, invalidation_reason) i s’intenta escriure l’event `proposal_invalidated` (best-effort).

---

## 6. Causes de bloqueig (sense invalidar)

| reason | Descripció |
|--------|------------|
| missing_params | Falten proposalId o orgId. |
| proposal_not_found | La proposta no existeix o no pertany a l’org. |
| proposal_not_approved | La proposta no està en status approved. |
| conflicting_newer_proposal | Existeix una altra proposta activa equivalent més recent (mateix org, decision_id, action_type). |
| readiness_check_failed | Error inesperat durant la comprovació (query o lògica); no s’invalida la proposta; només es retorna blocked i es fa console.warn. |

En aquests casos no es modifica la proposta ni s’escriu `proposal_invalidated` (excepte els motius d’invalidació explícits documentats abans).

---

## 7. Events

- **proposal_invalidated:** Emès quan la proposta es marca com a invalidada (payload `reason`). Best-effort: si falla l’insert, només `console.warn`.
- **proposal_readiness_checked:** Emès quan el resultat és **ready** (payload `result: 'ready'`). Best-effort; no s’emeten per blocked/invalidated per reduir soroll.

---

## 8. Failure behavior

- **Errors inesperats:** El helper no pot llençar excepcions cap amunt per errors inesperats de query o de comprovació interna. Tota la lògica principal va dins un `try/catch` global. En cas d’error inesperat: no s’invalida la proposta, no es fa cap update destructiu; es retorna un estat controlat `{ status: 'blocked', reason: 'readiness_check_failed', detail: '<missatge o codi>' }` i es fa `console.warn` amb context mínim (proposalId, orgId, error message) per observabilitat. No s’escriu cap event nou per aquest cas (no existeix proposal_readiness_failed).
- Si falla l’escriptura d’un event (proposal_invalidated o proposal_readiness_checked), es fa només `console.warn`; no es reverteix l’update de la proposta.
- Si no es pot demostrar readiness, es retorna `blocked` o `invalidated`; no es retorna “ready” sense que tots els checks passin.

---

## 9. Què NO s’ha implementat

- Execució real (automation_executions, POs, preus, missatges).
- Queue runner, workers nous, edge functions noves.
- UI gran nova, analytics noves, notifications noves.
- Retries complexos.
- Integració automàtica amb un scheduler (la revalidació es crida explícitament via el helper).

---

## 10. Fitxers

- **Creat:** `src/lib/automation/evaluateAutomationProposalReadiness.js` — Helper únic de revalidació; invalida quan toca i emet events (best-effort).
- **Documentació:** `docs/ARCHITECTURE/D57_4_AUTOMATION_EXECUTION_READINESS_GATE.md` (aquest document).
