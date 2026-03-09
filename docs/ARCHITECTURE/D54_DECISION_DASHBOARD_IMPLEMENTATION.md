# D54 — Decision Dashboard Implementation

Status: Draft

---

## 1. Objectiu

Implementar la primera versió del **Decision Dashboard** de FREEDOLIAPP com a vista executiva, seguint:

- D45 — Decision Dashboard (arquitectura, mètriques, diferència vs Inbox).
- D46 — Decision UX Navigation Model (rol del Dashboard vs Inbox vs Topbar).

Objectiu de producte:

- Donar a cada org una **vista agregada** de:
  - Volum de decisions.
  - Urgència (high severity).
  - Comportament del seller (acted vs dismissed).
  - Activitat recent.

Aquesta vista **complementa** la Decision Inbox (operativa) i no la substitueix.

---

## 2. Fitxers creats / modificats

### 2.1 Pàgina

- `src/pages/DecisionDashboard.jsx`
  - Nova pàgina `/app/decision-dashboard`.

### 2.2 Service layer (data)

- `src/lib/decisions/getDecisionDashboardData.js`
  - Helpers backend-first per obtenir dades agregades del Dashboard:
    - `getDecisionDashboardSummary`
    - `getDecisionDashboardGroups`
    - `getDecisionDashboardRecentActivity`

### 2.3 Enrutament i navegació

- `src/App.jsx`
  - Afegit:
    - `const DecisionDashboard = lazyWithErrorBoundary(() => import('./pages/DecisionDashboard'), 'DecisionDashboard')`
    - Ruta:
      - `<Route path="decision-dashboard" element={<AppPageWrap context="page:DecisionDashboard"><DecisionDashboard /></AppPageWrap>} />`

- `src/components/Sidebar.jsx`
  - Afegida entrada al menú:
    - `{ path: '/app/decision-dashboard', icon: TrendingUp, labelKey: 'sidebar.decisionDashboard' }`
  - Afegit prefetch:
    - `case '/decision-dashboard': import('../pages/DecisionDashboard.jsx').catch(() => {})`

- `src/i18n/locales/en.json`, `es.json`, `ca.json`
  - Afegit:
    - `sidebar.decisionDashboard`: `"Decision Dashboard"` (per ara mateix literal en tots tres idiomes).

### 2.4 Documentació

- `docs/ARCHITECTURE/D54_DECISION_DASHBOARD_IMPLEMENTATION.md`
  - Aquest document.

---

## 3. Mètriques implementades (KPIs principals)

La pàgina `DecisionDashboard.jsx` carrega dades mitjançant `getDecisionDashboardSummary` amb paràmetres:

- `orgId` (des de `useWorkspace().activeOrgId`).
- `days` (finestra temporal seleccionada, 7 o 30 dies; per defecte 30).

KPIs:

1. **Open decisions**
   - `openCount`:
     - Nombre de decisions amb `status IN ('open', 'acknowledged')` per a l’org.
   - Snapshot actual (no limitat per finestra).

2. **High severity open decisions**
   - `highSeverityOpenCount`:
     - Subconjunt d’`openCount` amb `severity = 'high'`.
     - `severity` derivada de `priority_score`:
       - `>= 100` → `high`
       - `>= 50` → `medium`
       - altrament → `low`.

3. **Acted rate**
   - Percentatge de decisions creades en la finestra (`created_at >= fromIso`) que:
     - Tenen com a primer event de tancament (`decision_events`) un `event_type = 'acted'`.
   - `actedRate = actedCount / totalClosed`.

4. **Dismissed rate**
   - Percentatge de decisions creades en la finestra amb:
     - Primer event de tancament `event_type = 'dismissed'`.
   - `dismissedRate = dismissedCount / totalClosed`.

5. **Average time-to-action**
   - Temps mitjà (en hores) entre:
     - `created_at` de la decisió.
     - Primer event de tancament (`acted` o `dismissed`).
   - Es mostra a la UI com:
     - minuts (`< 1h`), hores (`< 24h`) o dies.

Totes les mètriques anteriors són:

- **Org-scoped** (`eq('org_id', orgId)`).
- Limitades a la finestra temporal on s’escau (`created_at >= fromIso`).

---

## 4. Widgets implementats

La pàgina `DecisionDashboard.jsx` mostra els següents blocs:

### 4.1 KPI Strip (Overview)

Component intern `KpiCard` per a:

- **Open decisions** (`openCount`).
- **High severity open** (`highSeverityOpenCount`).
- **Acted rate** (`formatPercent(actedRate)`).
- **Dismissed rate** (`formatPercent(dismissedRate)`).
- **Avg time-to-action** (`formatHours(avgTimeToActionHours)`).

Objectiu:

- Resum ràpid de volum i qualitat de resposta.

### 4.2 Decisions by status

Widget `Card` + `SimpleBarList`:

- Dades des de `getDecisionDashboardGroups`:
  - `byStatus[status] = count`.
- Visual:
  - Llista de barres horitzontals proporcional al volum per `status`.

### 4.3 Decisions by type

Mateix patró que el punt anterior:

- `byType[decision_type] = count`.
- Ajuda a veure:
  - Quin tipus de decisions dominen el volum.

### 4.4 High severity open decisions (highlight)

Widget simple:

- Mostra `highSeverityOpenCount` en gran.
- Text explicatiu:
  - “Count of high severity decisions that are currently open or acknowledged.”
- Botó:
  - `View in Inbox` → `/app/decisions` (navegació directa).

### 4.5 Recent decision activity

Widget `Card` amb llista d’items de `getDecisionDashboardRecentActivity`:

- Cada item inclou:
  - `title` (de la decisió).
  - `decisionType`.
  - `status` (event o estat).
  - `at` (data i hora).
- Les línies mostren:
  - Tant “created” com events de lifecycle (p. ex. `acted`, `dismissed`).
- CTA:
  - Botó `Open` que navega a `/app/decisions?id=<decision_id>`.

---

## 5. Time Window i data layer

### 5.1 Time window

A la UI:

- Select simple per:
  - `7` dies (`Last 7 days`).
  - `30` dies (`Last 30 days`, per defecte).

Quan `windowDays` canvia:

- Es torna a cridar `load()`:
  - `getDecisionDashboardSummary({ orgId, days: windowDays })`.
  - `getDecisionDashboardGroups({ orgId, days: windowDays })`.
  - `getDecisionDashboardRecentActivity({ orgId, days: windowDays })`.

### 5.2 Service layer (`getDecisionDashboardData.js`)

#### 5.2.1 `getDecisionDashboardSummary({ orgId, days })`

- Calcula:
  - Snapshot d’open/high severity open (no limitat per `days`).
  - Mètriques de tancament en la finestra:
    - `actedRate`.
    - `dismissedRate`.
    - `avgTimeToActionHours`.
- Queries:
  - `decisions` (open snapshot):
    - `.from('decisions')`
    - `.select('id, priority_score, status')`
    - `.eq('org_id', orgId)`
    - `.in('status', ['open', 'acknowledged'])`
  - `decisions` (creades en finestra):
    - `.select('id, created_at, status')`
    - `.eq('org_id', orgId)`
    - `.gte('created_at', fromIso)`
  - `decision_events`:
    - `.select('decision_id, event_type, created_at, event_data')`
    - `.in('decision_id', decisionIds)`
  - Processa a memòria:
    - Grup per decisió.
    - Primer `acted`/`dismissed` com a tancament.

#### 5.2.2 `getDecisionDashboardGroups({ orgId, days })`

- Queries:
  - `decisions`:
    - `.select('id, decision_type, status, created_at')`
    - `.eq('org_id', orgId)`
    - `.gte('created_at', fromIso)`
- Agrupa a memòria:
  - `byStatus[status]++`.
  - `byType[decision_type]++`.

#### 5.2.3 `getDecisionDashboardRecentActivity({ orgId, days, limit })`

- Queries:
  - `decisions`:
    - `.select('id, decision_type, status, title, created_at')`
    - `.eq('org_id', orgId)`
    - `.gte('created_at', fromIso)`
  - `decision_events`:
    - `.select('decision_id, event_type, created_at, event_data')`
    - `.gte('created_at', fromIso)`
- Construeix items:
  - Una entrada “created” per cada decisió.
  - Una entrada per cada event associat.
- Ordena per `at DESC` i aplica `limit (20)` a memòria.

---

## 6. Performance i multi-tenant

### 6.1 Org-scoped

Totes les consultes:

- Filtren per `org_id = orgId` quan accedeixen a `decisions`.
- Per `decision_events`, es filtra per:
  - Llista de `decision_id` (derivats de decisions ja filtrades per org).
  - O per `created_at >= fromIso` (events recents), confiants en RLS basat en `decisions`.

### 6.2 Finestra temporal

Les agregacions:

- Es limiten sempre a:
  - `created_at >= fromIso` (per `days` = 7 o 30).
- Eviten:
  - Consultes “all time” no acotades.

### 6.3 Full scans

No s’introdueixen:

- Full table scans deliberats sobre tot l’històric.
- Les queries treballen sempre sobre:
  - Org concreta.
  - Finestra temporal finita.

Escalabilitat:

- Per volums creixents (vegeu D50), futures fases podran:
  - Introduir vistes materialitzades o taules resum.
  - Reutilitzar la mateixa API de service layer.

---

## 7. UI rules i navegació

### 7.1 Pàgina executiva, no operativa

`DecisionDashboard.jsx`:

- No permet:
  - Canviar `status` de decisions.
  - Fer accions de lifecycle.
- Es centra en:
  - KPIs i agregats.
  - Activitat recent.
  - Enllaços de navegació cap a Inbox.

### 7.2 Navegació cap a Decision Inbox

Des del Dashboard:

- Botó `Open Decision Inbox` (header):
  - Navega a `/app/decisions`.
- Widget `High severity open decisions`:
  - Botó `View in Inbox` → `/app/decisions`.
- Llista `Recent decision activity`:
  - Cada item:
    - `onClick` i botó `Open`:
      - Naveguen a `/app/decisions?id=<decision_id>`.

Això segueix D46:

- Dashboard → Inbox per a interacció item-level.

### 7.3 Sidebar entry

Sidebar:

- Nova entrada:
  - Label: `sidebar.decisionDashboard` (mostrat com “Decision Dashboard” a en/es/ca).
  - Path: `/app/decision-dashboard`.

No es modifica:

- Entrada existent de `/app/decisions`.

---

## 8. Limitacions actuals

1. **Sense filtres avançats (tipus, severitat, engine)**  
   - La finestra temporal és global (7 o 30 dies).
   - No hi ha filtres addicionals a la UI (p. ex. per tipus de decisió).

2. **Sense agrupació per producte/projecte**  
   - D45 sugeria ús de `decision_context` per agrupacions avançades.
   - D54 es limita a:
     - Status.
     - Decision type.

3. **Mètriques de time-to-action simplificades**  
   - Es calcula només per:
     - Decisions creades en la finestra.
     - Que tenen un primer event `acted` o `dismissed`.
   - No es distingeixen:
     - Temps fins a `acknowledged` vs temps fins a tancament.

4. **Sense cache ni vistes materialitzades**  
   - Tot es calcula on-demand via Supabase.
   - Finestra i org fan que el volum sigui raonable en l’estat actual.

5. **Internacionalització parcial**  
   - El label de sidebar `Decision Dashboard` és literal en en/es/ca.
   - Textos interns de la pàgina estan en anglès (no i18n per a cada cadena encara).

---

## 9. Definition of Done (D54)

D54 es considera complet quan:

- [x] Existeix una **nova pàgina** `/app/decision-dashboard`:
  - [x] Accesssible via ruta `decision-dashboard` sota `/app`.
  - [x] Protegida per `AppPageWrap` / `ProtectedRoute`.
- [x] El **sidebar** conté una entrada `Decision Dashboard` sense trencar `/app/decisions`.
- [x] El **service layer** de decisions inclou helpers separats:
  - [x] `getDecisionDashboardSummary`.
  - [x] `getDecisionDashboardGroups`.
  - [x] `getDecisionDashboardRecentActivity`.
- [x] S’han implementat els KPIs mínims:
  - [x] Open decisions.
  - [x] High severity open decisions.
  - [x] Acted rate.
  - [x] Dismissed rate.
  - [x] Average time-to-action.
- [x] S’han creat els widgets mínims:
  - [x] Decisions by status.
  - [x] Decisions by type.
  - [x] High severity open decisions (resum).
  - [x] Recent decision activity.
- [x] S’ha implementat una finestra temporal bàsica (7d / 30d, 30d per defecte).
- [x] Des del Dashboard és possible:
  - [x] Navegar a `/app/decisions`.
  - [x] Obrir una decisió concreta mitjançant `/app/decisions?id=<decision_id>`.
- [x] Les consultes són:
  - [x] Org-scoped.
  - [x] Limitades per finestra temporal on cal.
  - [x] Sense full scans no acotats.
- [x] Aquest document descriu:
  - [x] Objectiu.
  - [x] Fitxers creats/modificats.
  - [x] Mètriques i widgets implementats.
  - [x] Limitacions actuals.

