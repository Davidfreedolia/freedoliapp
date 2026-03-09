# D57.3 — Automation Approval Gate Model (Implementation)

Status: Implemented  
Phase: D57.3  
Scope: Approval gate model for automation_proposals. No execution, no new UI, no workers.

---

## 1. Objectiu

Implementar el model funcional mínim d’aprovació per a `automation_proposals`:

- Qui ha d’aprovar (org member, optional required_role).
- Quan una proposta queda pendent d’aprovació (approval_mode !== 'none' → pending_approval; es creen steps).
- Com es persisteixen els passos (`automation_approvals`).
- Com es marca una proposta com aprovada o rebutjada (update proposal_status + approved_at/by o rejected_at/by).
- Traçabilitat amb `automation_events` (approval_requested, approval_granted, approval_rejected, proposal_approved, proposal_rejected).

Sense executar cap acció real després.

---

## 2. Approval modes suportats

- **single:** 1 step; una aprovació vàlida marca el gate com complert.
- **dual:** 2 steps; calen 2 aprovacions vàlides (passos separats).
- **role_constrained:** 1 step amb `required_role` (per defecte `admin`); l’actor ha de complir el rol (owner/admin ≥ admin).

**No suportat en aquesta fase:** `conditional` (es retorna `unsupported_approval_mode` si s’intenta crear steps). `none` no crea steps.

---

## 3. Model de steps

- **Creació:** Quan es crea una proposta amb `approval_mode !== 'none'`, es crida `createAutomationApprovalSteps` (des de `createAutomationProposal`):
  - single / role_constrained → 1 fila a `automation_approvals` (approval_step 1, required_role null o el rol).
  - dual → 2 files (approval_step 1 i 2, required_role null).
- **Condició obligatòria:** Una proposta amb gate només queda en `pending_approval` si els approval steps s’han creat correctament. Si la creació dels steps falla (qualsevol motiu, incl. `approval_mode` no suportat), la proposta **no** es deixa en `pending_approval`: es marca immediatament com a `invalidated` amb `invalidation_reason = 'approval_setup_failed'` i s’intenta escriure un event `proposal_invalidated` (best-effort; si falla només `console.warn`). Així s’evita l’estat inconsistent “pending_approval sense cap fila a automation_approvals”.
- **Estats d’un step:** pending, approved, rejected, expired, skipped (constraint BD).
- **Resolució:** Només es poden aprovar/rebutjar steps amb `approval_status = 'pending'`. Un cop actuat, el step passa a approved o (en rebuig terminal) la proposta sencera passa a rejected sense canviar cada step individual a rejected.

---

## 4. Model de resolució

- **pending_approval:** Proposta amb gate i steps creats; encara no s’han completat les aprovacions requerides ni s’ha rebutjat.
- **approved:** Tots els steps requerits han estat aprovats (single/role_constrained: 1 approved; dual: 2 approved). Es posen `approved_at`, `approved_by` a la proposta.
- **rejected:** Un actor ha cridat `rejectAutomationProposal`; la proposta passa a rejected, `rejected_at`, `rejected_by`. Terminal.

**Criteri:** single → 1 aprovació vàlida; dual → 2 aprovacions vàlides; role_constrained → 1 aprovació vàlida i l’actor compleix required_role.

---

## 5. Validació d’actor

- **Helper:** `validateApprovalActor(supabase, { orgId, requiredRole? })`.
- **Comprovacions:**
  - Usuari autenticat (supabase.auth.getUser()).
  - És membre de l’org (`org_memberships`).
  - Si `required_role` està informat: rol de l’usuari ≥ required_role (jerarquia owner > admin > member).
- No es crea IAM nou; es reutilitza el model existent d’org_memberships i rol.

---

## 6. Events generats

| Event                | Quan                                                                 |
|----------------------|----------------------------------------------------------------------|
| approval_requested   | Quan es creen els approval steps (després d’inserir a automation_approvals). |
| approval_granted     | Quan un usuari aprova un step (update a automation_approvals).       |
| approval_rejected    | Emès quan un actor rebutja la proposta sencera (terminal), juntament amb proposal_rejected. |
| proposal_approved    | Quan el gate queda satisfet (tots els steps requerits approved).    |
| proposal_rejected   | Quan un actor rebutja la proposta (terminal).                        |
| proposal_invalidated | Quan falla el setup del gate (steps no creats): la proposta es marca invalidated; payload mínim `reason: 'approval_setup_failed'`. Best-effort (si falla l’insert, només `console.warn`). |

Tots es persisteixen a `automation_events` (org_id, proposal_id, decision_id si hi és, event_type, event_payload_json, actor_type, actor_id). Els events d’escriptura són best-effort (errors es loguen, no es reverteix la proposta ni els steps).

---

## 7. Failure behavior

- **Creació d’approval steps fallida:** La proposta **no** roman en `pending_approval`. Es marca immediatament `proposal_status = 'invalidated'`, `invalidation_reason = 'approval_setup_failed'`, `invalidated_at = now`. S’intenta escriure l’event `proposal_invalidated` (best-effort; si falla només `console.warn`). El retorn de `createAutomationProposal` inclou `invalidatedSetup: true` per reflectir que la proposta no queda operativa per aprovació. Això evita l’estat inconsistent “pending_approval sense cap fila a automation_approvals”.
- **Event fallit (approval_requested, approval_granted, proposal_approved, approval_rejected, proposal_rejected, proposal_invalidated):** Best-effort; no es fa rollback de proposal ni approvals; només es registra warning. Consistent amb D57.2.
- **Update de proposal (approved/rejected) fallit:** Es retorna error al caller; no es llença excepció no controlada. L’step ja ha quedat approved en approve; si falla l’update de la proposta a approved, es retorna èxit parcial (step approved, proposalStatus pendent) amb reason.

---

## 8. Condicions de seguretat

- No es pot aprovar una proposta que no estigui en `pending_approval`.
- No es pot rebutjar una proposta que no estigui en `pending_approval`.
- No es pot aprovar un step que no estigui en `pending` (només es modifica el “següent pending step”).
- No es permet doble aprovació del mateix step (un cop approved, el step deixa d’estar pending).
- Cross-tenant: totes les queries filtren per org_id; l’actor es valida com a membre de l’org.
- Errors controlats: retorns { ok: false, reason } sense trencar el sistema.

---

## 9. Què NO s’ha implementat

- Execució real (automation_executions, POs, preus, missatges).
- Mode `conditional` (bloquejat).
- UI gran nova / inbox nova sencera.
- Edge functions o workers nous.
- Notifications noves complexes.
- Analytics noves.
- Retry engine per steps fallits.

---

## 10. Fitxers (referència)

- `src/lib/automation/createAutomationApprovalSteps.js` — crea steps i event approval_requested.
- `src/lib/automation/approveAutomationProposal.js` — aprova un step; si el gate es compleix, marca proposta approved i emet proposal_approved.
- `src/lib/automation/rejectAutomationProposal.js` — rebutja la proposta (terminal) i emet approval_rejected + proposal_rejected.
- `src/lib/automation/validateApprovalActor.js` — valida org member i optional required_role.
- `src/lib/automation/proposalGateState.js` — isProposalGateSatisfied, getNextPendingStep (intern).
- `src/lib/automation/getPendingAutomationApprovals.js` — llista propostes pending_approval amb steps (per org; opcional filtre per usuari/rol).
- Integració: `createAutomationProposal.js` crida `createAutomationApprovalSteps` quan approval_mode !== 'none'.
