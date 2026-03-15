# FASE 3 — ALERTES DE NEGOCI — RE-ENTRY AUDIT

**Data:** 2025-03-13  
**Source of truth:** Repo actual; `docs/ROADMAP/IMPLEMENTATION_STATUS.md` com a tracker canònic.  
**Regla:** Aquest document és només auditoria; no s’ha implementat res.

---

## 1. Estat actual reutilitzable

### 1.1 Decisions (model canònic, complet)

| Peça | Ubicació | Estat |
|------|----------|--------|
| Schema | `decisions`, `decision_context`, `decision_sources`, `decision_events` | Implementat (migració `20250228140000_d32_4_decision_engine.sql`). RLS amb `is_org_member` + `org_billing_allows_access`. |
| Scheduler | `supabase/functions/decision-scheduler/index.ts` | Implementat; invoca `syncReorderDecisions` per orgs amb billing access (`get_org_ids_billing_allows_access()`). |
| Bridge | `src/lib/decision-engine/integrations/reorderDecisions.js` | Implementat; dedupe per org+ASIN; crea decisions des de `getReorderAlerts`. |
| Inbox UI | `src/pages/Decisions.jsx`, `DecisionList`, `DecisionDetail` | Implementat; filtre status/tipus; accions acknowledge/acted/dismissed; feedback (D55). |
| Dashboard analytics | `src/pages/DecisionDashboard.jsx`, `getDecisionDashboardData.js` | Implementat; summary, groups, recent, `getDecisionAnalyticsSummary`. |
| Notifications in-app | `getDecisionNotifications.js`, `DecisionBadge.jsx`, `DecisionDropdown.jsx` | Implementat; badge al TopNavbar; unread = open + high/medium sense `decision_viewed` per usuari. |
| Helpers | `getDecisionInboxPage`, `getDecisionById`, `updateDecisionStatus`, `submitDecisionFeedback`, `trackDecisionViewed` | Implementats; tots org-scoped. |

**Conclusió:** El subsistema de decisions és la base lògica per “recomanacions accionables”. Es pot reaprofitar com a font d’alertes de negoci (reorder ja hi és) i com a patró (severity, dedupe, inbox, badge).

### 1.2 Alertes persistents (taula `alerts` — FASE 3 V1 base)

| Peça | Ubicació | Estat |
|------|----------|--------|
| Schema | `alert_definitions`, `alerts` | Implementat (`20260302_01_alert_system_base.sql`). `alerts`: org_id, alert_definition_id, entity_type/entity_id, severity, visibility_scope, status (open/acknowledged/resolved/muted), dedupe_key, first_seen_at/last_seen_at. Únic parcial (org_id, dedupe_key) WHERE status IN ('open','acknowledged'). |
| Seed definitions | F2, O1, S1, O2 | Implementat (`20260302100000_alert_system_rls_seed.sql`): F2_UNASSIGNED_EXPENSE, O1_PROJECT_STUCK_PHASE, S1_SEAT_USAGE_HIGH, O2_PO_NO_LOGISTICS. |
| RLS | Model C (owner_only / admin_owner) | Implementat; SELECT amb `is_org_member(org_id)` i (owner_only → només owner; admin_owner → is_org_owner_or_admin). **Nota:** RLS no exigeix `org_memberships.status = 'active'` (igual que abans de S3.3.D per billing). |
| RPCs | `alert_acknowledge`, `alert_resolve`, `alert_mute` | Implementats (`20260302101500_alert_system_rpc.sql`). |
| Escriptor actual | F6 `run_ops_health_checks()` | Insereix files a `alerts` amb dedupe_key `ops:{check}:{org}:{date}`. |
| Lector UI | `ShipmentDetailDrawer.jsx` | Llegeix `alerts` per `org_id` + `dedupe_key LIKE 'shipment:{id}:%'`; mostra xips; no hi ha writer específic per shipment en el codi revisat (drawer preparat per alertes logístiques futures). |

**Conclusió:** La infraestructura d’alertes persistents (taula + definicions F2/O1/S1/O2 + RLS + RPCs) existeix. **Falta el motor que ompli `alerts` per F2, O1, S1, O2** (no existeix `run_alert_engine(org_id)` ni equivalent).

### 1.3 Alertes de negoci no persistides (client / helpers)

| Peça | Ubicació | Estat |
|------|----------|--------|
| Project alerts | `src/lib/businessAlerts.js` | Implementat; `buildProjectAlerts(project, business, stock, gate)`. Max 4 per projecte; severity critical/warning/info; codis (OUT_OF_STOCK, LIVE_NEGATIVE_ROI, PRODUCTION_BLOCKED, LOW_COVER, etc.). **No persisteix;** es calcula a Dashboard. |
| Executive Dashboard | `src/pages/Dashboard.jsx` (tab Exec) | Agrega `buildProjectAlerts` per tots els projectes; ordena per `scoreAlert`; mostra fins a 20; filtres critical/warning/info. Font: businessSnapshot, stockSnapshot, gate (computats a partir de dades de projectes/PO/expenses/incomes). |
| Margin / Stockout | `getMarginCompressionAlerts`, `getStockoutAlerts` | Implementats; consultes Supabase per org; retornen llistes. |
| Home / Dashboard widgets | `useHomeDashboardData.js`, Dashboard (Home) | `alerts.margin` i `alerts.stockout`; panells “Margin alerts” i “Stockout risk”; empty state. |
| Strips | `MarginCompressionAlertStrip.jsx`, `StockoutAlertStrip.jsx` | Reutilitzables; criden els helpers; “View details” → /app/profit. |

**Conclusió:** Hi ha dues “capes” d’alertes de negoci sense persistència: (1) per projecte (businessAlerts.js + Exec dashboard) i (2) per workspace (margin/stockout). Són útils per a una primera versió d’alertes accionables si es decideix unificar o alimentar la taula `alerts` / la inbox de decisions.

### 1.4 Automation / event model (doc i esquema)

- **D57** (Decision Automation): descriu `automation_events`, idempotency/dedupe, relació amb decisions. Migració `20260309000000_d57_1_automation_data_model.sql` existeix.
- **D55** (Decision Feedback): `decision_events` amb event_type (created, acknowledged, acted, dismissed, decision_feedback_*). Implementat a `submitDecisionFeedback.js` i DecisionDetail.
- **D6:** `ops_events`, `ops_health_checks`, `ops_health_runs`; health runner escriu alertes a `alerts` amb dedupe. Patró reutilitzable per a “motor d’alertes” (evaluar condicions → inserir/actualitzar alerta).

### 1.5 Inbox / dashboard surfaces

- **Decision Inbox:** `/app/decisions` — llista + detall; filtres; accions; feedback. **Implementat.**
- **Decision Dashboard:** `/app/decisions/dashboard` (o ruta equivalent) — analytics (summary, groups, recent, analytics). **Implementat.**
- **TopNavbar:** DecisionBadge amb dropdown (decisions no vistes). **Implementat.**
- **Dashboard (Home):** KPIs, risk, focus, alerts (margin + stockout). **Implementat.**
- **Dashboard (Exec):** alerts = buildProjectAlerts; filtres per severity. **Implementat.**
- **Bell + drawer d’alertes (taula `alerts`):** No existeix; ROADMAP_MASTER el defineix com a objectiu FASE 3 (Bell + counter, Drawer llistat alertes).

---

## 2. Buits reals per obrir FASE 3

### 2.1 Imprescindible (blocker per a “alertes de negoci útils” coherents)

| Gap | Descripció | Blocker? |
|-----|------------|----------|
| **Motor d’alertes de negoci** | La taula `alerts` i les definicions F2, O1, S1, O2 existeixen, però no hi ha cap RPC ni job que avalui condicions i insereixi/actualitzi files. ROADMAP_MASTER especifica `run_alert_engine(org_id)` (manual, sense cron). | **Sí** — sense això, les alertes F2/O1/S1/O2 no apareixen mai a la taula. |
| **Superfície única per “alertes de negoci”** | Avui hi ha: (1) Exec tab = project alerts (client); (2) Home = margin/stockout (helpers); (3) Decision Inbox = decisions (reorder, etc.); (4) taula `alerts` = només F6 (ops) + possible shipment. No hi ha un lloc únic on el seller vegi “totes les alertes de negoci” prioritzades i accionables. | **Sí** — sense una superfície mínima (p. ex. Bell + drawer per `alerts` + enllaços a decisions), el valor de FASE 3 queda mig fet. |
| **Dedupe i prioritat** | Decisions tenen dedupe (per tipus+context, p. ex. org+ASIN). Alertes tenen dedupe_key + únic parcial open/ack. No hi ha una capa que eviti duplicats entre “alerta F2” i “decisió reorder” per al mateix fet (opcional però desitjable a llarg termini). | No (no bloqueja V1). |

### 2.2 Desitjable (no blocker)

| Gap | Descripció |
|-----|------------|
| **Auto-resolve** | ROADMAP_MASTER: “Auto-resolve quan la condició desapareix”. No implementat; les alertes es podrien tancar manualment (ack/resolve) i en una fase posterior afegir un job que tanqui les que ja no compleixen la condició. |
| **alert_events (audit)** | Contracte D0: “alert_events (audit mínim)”. La taula es menciona en backfill S1.2; no s’ha trobat migració que la creï dins el bloc FASE 3. Es pot deixar per a una subfase posterior. |
| **RLS `alerts` + active membership** | Les policies d’`alerts` fan servir `is_org_member`; no exigeixen `status = 'active'`. Per coherència amb S3.3, es podria afegir el filtre active en una subfase de FASE 3. |
| **Widget “Business Risks” al Dashboard** | ROADMAP_MASTER: widget Dashboard “Business Risks” (severity >= high). Es pot fer consumint la taula `alerts` un cop el motor existeixi. |
| **Unificar margin/stockout amb alertes** | Avui margin i stockout són només a Home/Dashboard via helpers; no es guarden a `alerts`. Unificar seria desitjable per a coherència però no és estrictament necessari per a una V1 sòlida. |

### 2.3 Resum de blockers

- **Blocker 1:** Implementar el motor que ompli `alerts` per almenys un subconjunt de F2, O1, S1, O2 (idealment RPC `run_alert_engine(org_id)` o equivalent invocable).
- **Blocker 2:** UI mínima per a alertes de la taula `alerts`: Bell + comptador + drawer (llistat) amb accions acknowledge/resolve (reutilitzant RPCs existents).

---

## 3. Proposta de scope mínim de FASE 3

Objectiu: **Primera versió sòlida d’alertes de negoci**: senyals accionables, útils i prioritzades, sense soroll ni duplicats innecessaris, multi-tenant correcte.

### 3.1 Inclòs al scope mínim

1. **Motor d’alertes (F2, O1, S1, O2)**  
   - RPC o funció invocable per org (p. ex. `run_alert_engine(p_org_id uuid)`) que:  
     - Avaluï condicions per a F2 (unassigned expense), O1 (project stuck), S1 (seat usage >90%), O2 (PO sent/confirmed sense logistics).  
     - Inserteix/actualitzi files a `alerts` amb `dedupe_key` estable i respectant l’únic parcial (open/ack).  
   - Contracte: invocació manual o des d’un sol punt (p. ex. scheduler existent o crida des de l’app); no cal cron en V1 si el doc ho indica.

2. **UI mínima per alertes (`alerts`)**  
   - Bell + comptador al TopNavbar (o secció clarament visible) per alertes open/acknowledged amb severity >= medium (o només high, segons acord).  
   - Drawer (o pàgina dedicada) amb llistat d’alertes de l’org: titol, missatge, severity, accions Acknowledge / Resolve (via RPCs existents).  
   - Tots els accessos filtrats per `org_id` i RLS; sense trencar multi-tenant.

3. **Coherència multi-tenant i billing**  
   - No reobrir S3.3; tots els nous accessos a `alerts` i a dades subjacents (expenses, projects, org_memberships, PO, logistics) amb `org_id` derivat de context segur (activeOrgId / RLS).  
   - Opcional en aquesta fase: afegir `status = 'active'` a les policies RLS d’`alerts` si es considera de risc baix.

### 3.2 Exclòs del scope mínim (no tocar en FASE 3)

- Email, push, websocket, digest.
- Noves taules (alert_events es pot deixar per després).
- Canvis a decisions/scheduler més enllà de manteniment necessari.
- Unificació amb margin/stockout (es pot documentar com a pas posterior).
- FASE 4 (tracking) i FASE 5 (finance complete).

---

## 4. Riscos i cauteles

### 4.1 Riscos tècnics (grounded al repo)

| Risc | On | Mitigació |
|------|-----|-----------|
| **Doble font d’alertes** | Dashboard Exec mostra buildProjectAlerts (client); la taula `alerts` tindrà F2/O1/S1/O2. El seller pot veure “alertes” en dos llocs amb criteris diferents. | Definir clarament: Bell + drawer = taula `alerts` (persistents); Exec tab = vista per projecte (legacy/client). A llarg termini es pot migrar project alerts cap a `alerts` o cap a decisions. |
| **RLS `alerts` sense active** | Les policies d’`alerts` usen `is_org_member`; no comproven `org_memberships.status = 'active'`. | Valorar subfase que afegeixi `status = 'active'` als subquery de memberships d’alerts (igual que S3.3.D per billing). |
| **Motor invocat sense org** | Si `run_alert_engine` es crida sense org_id o amb org_id d’un usuari no autoritzat, podria escriure dades incorrectes. | RPC amb SECURITY DEFINER i validació estricta d’`org_id` (per exemple que l’usuari sigui member de l’org o que només el service role pugui cridar per qualsevol org). |
| **Dedupe_key estable** | Si el dedupe_key canvia entre execucions, es crearien duplicats. | Definir convenció immutable per F2, O1, S1, O2 (p. ex. `F2:org_id`, `O1:org_id:project_id`, `S1:org_id`, `O2:org_id:po_id` o equivalent). |
| **F6 + FASE 3 al mateix tauler** | F6 ja escriu a `alerts` (ops). La UI de FASE 3 mostrarà alertes ops i alertes de negoci barrejades si no es filtra. | A la UI (drawer), filtrar per `alert_definition_id` o per categoria (excloure ops si cal) o mostrar tot amb etiqueta (ops vs business). |

### 4.2 Riscos de soroll, duplicació, gating

- **Soroll:** Limitar severitat (p. ex. només high per al Bell) i límit de ítems al drawer.  
- **Duplicació:** No duplicar lògica de condicions entre motor d’alertes i buildProjectAlerts; el motor és la font per a la taula; buildProjectAlerts es manté com a vista per projecte fins que es decideixi unificar.  
- **Gating:** No introduir nous gating que depenguin de billing més enllà del que ja fa RLS (org_billing_allows_access on correspongui); les alertes S1 (seient) ja són sensibles i tenen visibility_scope admin_owner.

### 4.3 Què no s’ha de fer en aquesta fase

- No reobrir S3.3 (billing/access) llevat que una auditoria específica detecti una dependència real bloquejant.
- No implementar FASE 4 (tracking) ni FASE 5 (finance complete).
- No afegir canals nous (email, push) ni canvis amplis a l’arquitectura de decisions.
- No refactoritzar tota la Dashboard ni tots els widgets d’alertes; només afegir la superfície mínima (Bell + drawer) i el motor.

---

## 5. Recomanació d’execució

Seqüència curta de **màxim 5 subblocs**, ordenada i amb justificació breu.

| # | Subfase | Abast | Justificació |
|---|---------|--------|--------------|
| **3.1** | **Auditoria RLS i definicions** | Revisar RLS d’`alerts` (active membership si cal); verificar que alert_definitions F2/O1/S1/O2 i convenció de dedupe_key estan documentades i estables. | Redueix risc de gating incorrecte i de dedupe inconsistent abans d’escriure el motor. |
| **3.2** | **Motor d’alertes** | Implementar `run_alert_engine(org_id)` (o equivalent): avaluar F2, O1, S1, O2; inserir/actualitzar `alerts` amb dedupe_key correcte; sense cron a V1 (invocació manual o des d’un sol trigger). | Blocker; sense això no hi ha dades a la taula per a la UI. |
| **3.3** | **API / helpers d’alertes per a la UI** | Funció o hook que retorni llistat d’alertes open/ack per org (filtres severity, límit); crides a alert_acknowledge / alert_resolve des del client. | Separa lògica de dades de la UI; reutilitzable pel Bell i pel drawer. |
| **3.4** | **UI: Bell + comptador + Drawer** | Afegir Bell (o ampliar el TopNavbar) amb comptador d’alertes; drawer amb llistat i accions Acknowledge/Resolve; tota la font = taula `alerts` (org-scoped). | Completa el valor visible per al seller; coherent amb ROADMAP_MASTER. |
| **3.5** | **Documentació i tancament** | Actualitzar `IMPLEMENTATION_STATUS.md` amb FASE 3 (subfases 3.1–3.4); documentar convencions dedupe_key, invocació del motor, i opcional widget “Business Risks” com a pas posterior. | Manté el tracker com a font de veritat i deixa el camí clar per a iteracions futures. |

**Ordre:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5. Les subfases 3.1 i 3.2 es poden fer en paral·lel parcial (3.1 ràpid; 3.2 depèn de 3.1 per convencions).

---

## Resum executiu

- **Reutilitzable:** Decisions (schema, scheduler, inbox, dashboard, badge/dropdown) i taula `alerts` (schema, RLS Model C, RPCs ack/resolve/mute, definicions F2/O1/S1/O2). També helpers margin/stockout i buildProjectAlerts (client).
- **Buits imprescindibles:** (1) Motor que ompli `alerts` per F2, O1, S1, O2. (2) UI mínima (Bell + drawer) per a alertes persistents.
- **Scope mínim:** Motor invocable + UI Bell + drawer; multi-tenant correcte; sense nous canals ni refactors amplis.
- **Riscos:** Doble font (Exec vs alerts), RLS alerts sense active, dedupe_key estable, barreja F6/alertes de negoci a la UI. Es mitiguen amb convencions clares i filtrat per tipus/categoria.
- **Execució proposada:** 3.1 Auditoria RLS/dedupe → 3.2 Motor → 3.3 API/hooks → 3.4 UI Bell+Drawer → 3.5 Doc i tracker.
