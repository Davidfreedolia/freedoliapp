# FASE 3.5 — Documentació i tancament

Tancament documental de **FASE 3 — Alertes de negoci**. Sense canvis de codi, motor, API ni schema.

---

## 1. Fitxers modificats

- `docs/ROADMAP/FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md` (nou)
- `docs/ROADMAP/IMPLEMENTATION_STATUS.md` (actualització: FASE 3 i 3.5 tancats; resum executiu; secció FASE 3 i nova secció 3.5)

---

## 2. Què queda registrat de FASE 3

### Contracte final de la fase

- **Taula `alerts`:** Alertes de negoci persistides amb `dedupe_key` prefix `biz:`; status `open` | `acknowledged` | `resolved` | `muted`; severity `low` | `medium` | `high` | `critical`.
- **Convenció `dedupe_key`:** `biz:{CODE}:{org_id}[:{entity_id}]`; índex parcial únic per `(org_id, dedupe_key)` amb `status IN ('open','acknowledged')` per evitar duplicats actius.
- **Tipus V1:** F2 (unassigned expense), O1 (project stuck 30d), S1 (seat usage ≥90%), O2 (PO sent/confirmed sense shipment). Resolució de definicions via `alert_definitions.code`.
- **Motor:** RPC `public.run_alert_engine(p_org_id uuid)`; invocació manual; valida `is_org_member(p_org_id)`; escriu/actualitza `alerts` amb upsert; retorna `{ ok, processed }`.
- **API client:** `businessAlertsApi.js` (getBusinessAlerts, getBusinessAlertsCount, alertAcknowledge, alertResolve, runBusinessAlertEngine); filtre explícit `dedupe_key LIKE 'biz:%'`, `status IN ('open','acknowledged')`.
- **Hook:** `useBusinessAlerts(orgId, { listLimit })` → alerts, count, loading, error, refetch, acknowledge(id), resolve(id), runEngine().
- **UI:** `BusinessAlertsBadge` al TopNavbar; icona AlertTriangle; badge amb count; drawer amb llista, Acknowledge i Resolve per alerta; refetch en obrir i després d’accions.

### Limitacions V1 (explícites)

- Només tipus F2, O1, S1, O2; cap tipus nous en aquesta fase.
- Invocació del motor manual (no cron ni scheduler integrat).
- No auto-resolve: les alertes es tancen per acknowledge/resolve des de la UI o RPC.
- No nous canals (email, push, websocket).
- No unificació amb alertes no persistides ni amb OPS/SHIPMENT a la mateixa UI; la Bell de negoci mostra només alertes `biz:`.
- Run engine no exposat a la UI (disponible via API/hook; opcional per a fases posteriors).
- F6 (run_ops_health_checks) no s’ha tocat; si escriu severity no vàlida a `alerts`, és un risc conegut fora d’abast FASE 3.

### Riscos / control debt deixats explícits

- **F6 severity:** Els inserts de F6 poden usar `severity` no dins del CHECK de `alerts`; no corregit en FASE 3; pot requerir patch en fase posterior.
- **Invocació automàtica:** El motor no s’executa en background; qualsevol automatització (cron/scheduler) és treball futur.
- **i18n:** Text de la UI d’alertes de negoci en anglès; no inclòs en FASE 3.
- **Navegació a entitat:** La UI no enllaça a project/expense/PO; es deixa per a millores posteriors.

---

## 3. Estat final de FASE 3

- **CLOSED.**

**Justificació:** Les subfases 3.1 (auditoria RLS i definicions), 3.2 (motor), 3.3 (API/hook) i 3.4 (UI Bell + drawer) estan implementades i documentades. La subfase 3.5 (documentació i tancament) consolida el contracte, limitacions i debt; el tracker reflecteix FASE 3 com a tancada.

**Dins del tancament:** Sistema d’alertes de negoci V1 operatiu: motor invocable, API i hook, UI al TopNavbar amb comptador i accions acknowledge/resolve; convenció biz:; multi-tenant; sense barreja amb OPS/SHIPMENT.

**Fora expressament:** Auto-run del motor; nous tipus d’alerta; nous canals; unificació amb altres alertes; correcció F6; i18n; navegació a entitat; qualsevol fase posterior (3.6, 4, etc.).

---

## 4. Impacte al tracker

- **IMPLEMENTATION_STATUS.md:**
  - **Taula:** Fila **FASE 3** → Status **CLOSED**; Scope/outcome actualitzats (3.1–3.5 tancats; FASE 3 formalment tancada). Fila **FASE 3.5** afegida: "Documentació i tancament" | CLOSED | Consolidació doc; contracte; limitacions; debt.
  - **Resum executiu:** Inclusió de FASE 3 com a tancada; alertes de negoci V1 (motor, API, UI Bell+drawer) consolidat.
  - **Secció "FASE 3 — Alertes de negoci":** Status CLOSED; resum del que s’ha fet i referència a FASE_3_5_DOCUMENTACIO_I_TANCAMENT.md; limitacions i dependències futures breus.
  - **Nova secció "FASE 3.5 — Documentació i tancament":** Status CLOSED; descripció del tancament documental; sense canvis de codi.

---

## 5. Cauteles post-tancament

- **No interpretar:** Que FASE 3 inclogui invocació automàtica del motor, nous tipus d’alerta, correcció de F6 o unificació amb OPS/SHIPMENT. Tot això queda fora.
- **No tocar ara:** Motor, API, schema, RLS, ni components UI d’alertes de negoci per a “tancar” FASE 3; el tancament és documental.
- **Dependències futures anotades però NO activades:**
  - Possible invocació periòdica de `run_alert_engine` (cron/scheduler) en fase posterior.
  - Possibles nous tipus d’alerta (definicions + lògica al motor) en fase posterior.
  - Correcció de F6 severity si es vol escriure a `alerts` amb valors vàlids.
  - i18n i enllaços a entitats des del drawer, com a millores UX.
  - Cap d’aquestes dependències s’activa en aquesta subfase; queden només documentades.
