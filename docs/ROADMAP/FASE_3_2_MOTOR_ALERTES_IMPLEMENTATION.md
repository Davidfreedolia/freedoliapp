# FASE 3.2 — Motor d'alertes de negoci — Implementació

**Data:** 2025-03-13  
**Estat:** Implementat (migració + doc). UI Bell/Drawer no inclosa (3.4).

---

## 1. Fitxers modificats

- `supabase/migrations/20260315180000_f3_2_run_alert_engine.sql` (nou)
- `docs/ROADMAP/FASE_3_2_MOTOR_ALERTES_IMPLEMENTATION.md` (aquest fitxer)
- `docs/ROADMAP/IMPLEMENTATION_STATUS.md` (actualització tracker)

---

## 2. Què s'ha implementat

### Motor invocable

- **RPC:** `public.run_alert_engine(p_org_id uuid) RETURNS jsonb`
- **Invocació:** Manual (authenticated). El caller ha de ser membre actiu de l’org (`is_org_member(p_org_id)`).
- **Escriptura:** INSERT a `public.alerts` amb ON CONFLICT (org_id, dedupe_key) WHERE (status IN ('open','acknowledged')) DO UPDATE SET last_seen_at = now().

### Quins 4 tipus avalua

| Codi | Descripció | Condició | dedupe_key |
|------|-------------|----------|------------|
| **F2** | Unassigned expense | `expenses` amb `org_id = p_org_id` i `project_id IS NULL` | biz:F2_UNASSIGNED_EXPENSE:{org_id}:{expense_id} |
| **O1** | Project stuck in phase | `projects` amb `org_id`, status active/null, `updated_at` &lt; ara − 30 dies | biz:O1_PROJECT_STUCK_PHASE:{org_id}:{project_id} |
| **S1** | Seat usage high | Seients actius / límit ≥ 90% (límit via get_org_billing_state + get_plan_limits, fallback orgs.seat_limit) | biz:S1_SEAT_USAGE_HIGH:{org_id} |
| **O2** | PO without logistics | `purchase_orders` amb status IN ('sent','confirmed') sense fila a `shipments` | biz:O2_PO_NO_LOGISTICS:{org_id}:{po_id} |

### Com escriu a `alerts`

- Per cada entitat que compleix la condició: es resol `alert_definition_id` per code (F2_UNASSIGNED_EXPENSE, etc.), es construeix `dedupe_key` amb prefix `biz:` (convenció 3.1), es fa INSERT amb severity dins ('low','medium','high','critical'), visibility_scope 'admin_owner', status 'open'. Si ja existeix una alerta open/ack amb el mateix (org_id, dedupe_key), es fa UPDATE de `last_seen_at` només.

### Com evita duplicats

- Únic parcial a `alerts`: (org_id, dedupe_key) WHERE status IN ('open','acknowledged'). Una sola alerta open/ack per clau. ON CONFLICT DO UPDATE refresca `last_seen_at` sense crear una segona fila.

---

## 3. Contracte del motor

- **Nom:** `public.run_alert_engine(p_org_id uuid)`
- **Entrada:** `p_org_id` (uuid) — org per la qual s’executa el motor.
- **Sortida:** `jsonb` — `{ "ok": true, "processed": N }` on N és el nombre d’alertes inserides o actualitzades; si `p_org_id` és null, `{ "ok": false, "error": "org_id_required" }`; si el caller no és membre de l’org, excepció `forbidden: not a member of this org`.
- **Garanties multi-tenant:** Totes les consultes i inserts són per `p_org_id`. El caller ha de ser org member (active); la funció és SECURITY DEFINER i fa INSERT directe a `alerts` (sense policy INSERT per authenticated), de manera que només el codi de la funció escriu; la validació inicial impedeix cridar per un org on el caller no és membre.

---

## 4. Decisions d’implementació

- **Fet:** RPC únic; comprovació d’existència de taules/columnes (expenses.project_id, shipments) abans d’executar cada tipus; límit 50 per tipus per execució; S1 amb severity 'critical' si seients >= límit, 'high' si >= 90%; sense auto-resolve (no es tanquen alertes quan la condició desapareix).
- **Expressament fora:** UI Bell/Drawer (3.4); nous canals (email, push); refactor de dashboards; unificació amb alertes no persistides; correcció de F6 severity; cron/scheduler (invocació manual a V1).

---

## 5. Validació

- **Com s’ha verificat:** Revisió de la migració (sintaxi ON CONFLICT per índex únic parcial; severities dins del CHECK; dedupe_key amb prefix biz:; ús de get_org_billing_state i get_plan_limits per S1).
- **Comprovat:** Coherència amb FASE 3.1 (convenció dedupe_key, severity, visibility_scope); no es toquen F6 ni taules de billing; RPC GRANT EXECUTE TO authenticated.
- **No provat encara:** Execució real contra una base de dades (migració no executada en aquest entorn); invocació des del client (no hi ha cap caller a la UI encara).

---

## 6. Impacte al tracker

- A `IMPLEMENTATION_STATUS.md`: afegir fila FASE 3 (Alertes de negoci), 3.1 (Auditoria RLS i definicions), 3.2 (Motor d’alertes); marcar 3.1 i 3.2 com a CLOSED; secció detallada per FASE 3.
- Estat subfase 3.2: **COMPLETE**.
