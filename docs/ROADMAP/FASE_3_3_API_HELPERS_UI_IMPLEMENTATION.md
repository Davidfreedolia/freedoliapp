# FASE 3.3 — API / helpers per a la UI d’alertes — Implementació

**Data:** 2025-03-13  
**Estat:** Implementat. UI Bell/Drawer no inclosa (3.4).

---

## 1. Fitxers modificats

- `src/lib/alerts/businessAlertsApi.js` (nou)
- `src/hooks/useBusinessAlerts.js` (nou)
- `docs/ROADMAP/FASE_3_3_API_HELPERS_UI_IMPLEMENTATION.md` (aquest fitxer)
- `docs/ROADMAP/IMPLEMENTATION_STATUS.md` (actualització tracker)

---

## 2. Què s’ha implementat

### Helpers de lectura

- **getBusinessAlerts(supabase, orgId, options):** Select a `alerts` amb `org_id = orgId`, `status IN ['open','acknowledged']`, `dedupe_key LIKE 'biz:%'`; ordenat per `first_seen_at` desc; limit configurable (per defecte 50). Retorna `{ items, total }` (total via count: 'exact').
- **getBusinessAlertsCount(supabase, orgId):** Comptatge per a badge; mateix filtre (biz:, open/ack); retorna nombre.

### Helpers d’acció

- **alertAcknowledge(supabase, alertId):** Crida `supabase.rpc('alert_acknowledge', { p_alert_id: alertId })`. Retorna `{ ok, error? }`.
- **alertResolve(supabase, alertId):** Crida `supabase.rpc('alert_resolve', { p_alert_id: alertId })`. Retorna `{ ok, error? }`.
- **runBusinessAlertEngine(supabase, orgId):** Crida `supabase.rpc('run_alert_engine', { p_org_id: orgId })`. Retorna `{ ok, processed?, error? }`.

### Filtre de negoci V1

- Totes les consultes a `alerts` fan `.like('dedupe_key', 'biz:%')`, de manera que només es llisten/compten alertes de negoci (F2, O1, S1, O2); no es barregen amb OPS ni SHIPMENT.

### Comptadors disponibles per a UI

- **count:** Nombre d’alertes open/ack amb prefix biz: (per badge).
- **alerts.length** / **total** des de getBusinessAlerts per llistats.

---

## 3. Contracte dels helpers

| Helper | Inputs | Outputs | Multi-tenant |
|--------|--------|--------|---------------|
| **getBusinessAlerts** | supabase, orgId, { limit?, statuses? } | { items: Array<alert>, total: number } | Sempre filtrat per orgId; RLS limita per org del usuari. |
| **getBusinessAlertsCount** | supabase, orgId | number | Idem. |
| **alertAcknowledge** | supabase, alertId | { ok: boolean, error?: string } | RPC valida permisos (owner/admin per visibility_scope). |
| **alertResolve** | supabase, alertId | { ok: boolean, error?: string } | Idem. |
| **runBusinessAlertEngine** | supabase, orgId | { ok: boolean, processed?: number, error?: string } | RPC exigeix is_org_member(orgId). |

**useBusinessAlerts(orgId, { listLimit? }):** Retorna `{ alerts, count, loading, error, refetch, acknowledge(alertId), resolve(alertId), runEngine() }`. `alerts` i `count` provenen d’una sola crida a getBusinessAlerts (total = count). `acknowledge`/`resolve`/`runEngine` després de success criden `refetch()`.

---

## 4. Decisions d’implementació

- **Fet:** Un sol mòdul API (businessAlertsApi.js) i un hook (useBusinessAlerts); filtre biz: a totes les lectures; cap duplicació de lògica amb ShipmentDetailDrawer (aquest continua amb prefix shipment:); invocació del motor opcional des del hook (runEngine).
- **Expressament fora:** Bell UI; Drawer UI; nous canals; refactor de dashboards; unificació amb alertes no persistides (businessAlerts.js); canvis de billing/gating; noves taules.

---

## 5. Validació

- **Com s’ha verificat:** Revisió de codi; linter sense errors.
- **Comprovat:** Prefix biz: coherent amb 3.1; RPCs amb noms correctes (p_alert_id, p_org_id); hook retorna contracte estable per a 3.4.
- **No provat encara:** Ús real des de cap component (3.4 afegirà Bell/Drawer que consumiran el hook).

---

## 6. Impacte al tracker

- A `IMPLEMENTATION_STATUS.md`: fila FASE 3.3 afegida (CLOSED); secció detallada FASE 3.3 afegida; FASE 3 resum actualitzat (3.1–3.3 tancats).
- Estat subfase 3.3: **COMPLETE**.
