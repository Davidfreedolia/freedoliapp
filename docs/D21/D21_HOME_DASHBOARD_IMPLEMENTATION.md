# D21 — Home Dashboard Implementation

**Status:** DRAFT  
**Owner:** Product / Architecture

---

## 1. Objectiu

Implementar la Home definida a D15 com a capa de composició sobre engines existents, sense duplicar càlculs al frontend.

---

## 2. Principis no negociables

- La Home no calcula mètriques financeres pel seu compte
- La Home només consumeix helpers/engines existents
- Cap widget pot dependre de mock data
- Cap regressió sobre billing, profit, alerts o cashflow
- Tot ha de ser multi-tenant via org activa + RLS existent

---

## 3. Widgets D21 MVP

### 3.1 KPI Row

- **Net profit (30d)**
- **Revenue (30d)**
- **Margin (30d)**
- **Cash snapshot**

Per a cada KPI, definir:

| KPI | source helper/engine | output esperat | format UI | loading / error / empty state |
|-----|----------------------|----------------|-----------|------------------------------|
| Net profit (30d) | `getWorkspaceProfit(supabase, orgId, { dateFrom, dateTo })` amb finestra 30d; agregar sum( netProfit ) | número (EUR) | Moneda (EUR), signe +/−, decimals 0 o 2 | loading: skeleton; error: missatge breu + retry; empty: "—" o "No data" |
| Revenue (30d) | Mateix `getWorkspaceProfit`; agregar sum( revenue ) | número (EUR) | Moneda (EUR), decimals 0 o 2 | Idem |
| Margin (30d) | Mateix agregat; margin = sum(netProfit)/sum(revenue) si revenue > 0, sinó null | percentatge (0–100) o null | "X%" o "—" | Idem |
| Cash snapshot | `getCashflowForecast(supabase, orgId, { forecastDays: 30 })`; prendre primera i última entrada de la sèrie | cash avui (primera), cash en 30d (última) | "Cash today: X EUR" / "Cash in 30d: Y EUR" o un sol valor representatiu segons UX | loading: skeleton; error: missatge; empty: "—" |

### 3.2 Alerts

- **Margin alerts**
- **Stockout risk**

Per a cada widget:

| Widget | font real | límit inicial de files | comportament si no hi ha alertes |
|--------|------------|------------------------|----------------------------------|
| Margin alerts | `getMarginCompressionAlerts(supabase, orgId, { lookbackDays, recentDays })` — `src/lib/profit/getMarginCompressionAlerts.js` | p. ex. 5–10 files | Mostrar "No margin alerts" / empty state; no amagar el widget |
| Stockout risk | `getStockoutAlerts(supabase, orgId, { lookbackDays: 30 })` — `src/lib/inventory/getStockoutAlerts.js` | p. ex. 5–10 files | Mostrar "No stockout risk" / empty state; no amagar el widget |

### 3.3 Performance

- **Profit trend**
- **Top ASINs**

Definir:

| Widget | helper reutilitzat | finestra temporal inicial | shape de dades per UI |
|--------|--------------------|---------------------------|------------------------|
| Profit trend | `getProfitTimeseries(supabase, orgId, { dateFrom, dateTo })` — `src/lib/profit/getProfitTimeseries.js` | 30 dies (o 90 si es defineix) | `Array<{ date, revenue, netProfit, margin, roi }>`; eix X = date, eix Y = netProfit |
| Top ASINs | `getWorkspaceProfit(supabase, orgId, { dateFrom, dateTo })` — `src/lib/profit/getWorkspaceProfit.js` | 30d | Array ja ordenat per netProfit DESC; mostrar N primers (p. ex. 5–10) amb asin, netProfit, revenue, margin |

### 3.4 Operations

- **Billing usage**

Definir:

| Aspecte | Definició |
|---------|-----------|
| helper existent a reutilitzar | `getWorkspaceUsage(supabase, orgId)` — `src/lib/workspace/usage.js`; opcionalment `useOrgBilling(activeOrgId)` per plan/status (D12, Billing) |
| mètriques visibles | plan (de org_billing / useOrgBilling), seats used / seat limit, projects used / projects limit; opcionalment nearLimits / limitsReached (D12) |

### 3.5 Projects

- **Active sourcing projects**

Definir:

| Aspecte | Definició |
|---------|-----------|
| query/font real | Taula `projects` filtrat per `org_id`; select id, name, status (o phase), updated_at, etc. |
| criteri de "active sourcing project" | Projects amb status/phase que es considerin "active" i dins de fases de sourcing (no arxivat ni cancel·lat); criteri exacte alineat amb el model de dades (p. ex. `status not in ('archived','cancelled')` i phase en conjunt de fases de sourcing). Llista limitada (p. ex. 10) ordenada per updated_at DESC. |

---

## 4. Widgets fora de scope MVP

- **Reorder candidates live**

Explicar clarament:

Aquest widget queda **bloquejat** fins implementació efectiva del motor D19. A D21 només es permet:

- reservar espai al layout, o
- ocultar widget fins que D19 existeixi

Però **no** es permet mock ni càlcul provisional.

---

## 5. Mapping engine → widget

| Widget | Engine/helper font | Ruta/fitxer font | Estat |
|--------|--------------------|------------------|--------|
| KPI Net profit (30d) | getWorkspaceProfit (agregat) | `src/lib/profit/getWorkspaceProfit.js` | READY |
| KPI Revenue (30d) | getWorkspaceProfit (agregat) | `src/lib/profit/getWorkspaceProfit.js` | READY |
| KPI Margin (30d) | getWorkspaceProfit (agregat) | `src/lib/profit/getWorkspaceProfit.js` | READY |
| KPI Cash snapshot | getCashflowForecast | `src/lib/finance/getCashflowForecast.js` | READY |
| Margin alerts | getMarginCompressionAlerts | `src/lib/profit/getMarginCompressionAlerts.js` | READY |
| Stockout risk | getStockoutAlerts | `src/lib/inventory/getStockoutAlerts.js` | READY |
| Profit trend | getProfitTimeseries | `src/lib/profit/getProfitTimeseries.js` | READY |
| Top ASINs | getWorkspaceProfit | `src/lib/profit/getWorkspaceProfit.js` | READY |
| Billing usage | getWorkspaceUsage (+ useOrgBilling) | `src/lib/workspace/usage.js`, `src/hooks/useOrgBilling.js` | READY |
| Active sourcing projects | query projects | `projects` (Supabase) per org_id + filtre active/sourcing | READY |
| Reorder candidates | (motor D19) | — | BLOCKED |

---

## 6. Proposed file touch plan

**docs**

- `docs/D21/D21_HOME_DASHBOARD_IMPLEMENTATION.md` (nou)
- `docs/INDEX.md` (actualitzar entrada D21)

**page home/dashboard**

- `src/pages/Dashboard.jsx` (o pàgina Home dedicada si es desacobla) — integrar nous widgets D21 segons layout D15; sense duplicar càlculs, només crides als helpers.

**components nous**

- Components de widget per KPI row, Alerts (margin, stockout), Performance (profit trend, top ASINs), Operations (billing usage), Projects (active sourcing) — o reutilitzar blocs existents de Profit/Cashflow/Billing/Settings on faci sentit.

**helpers reutilitzats**

- Cap helper nou obligatori; tots els widgets consumeixen `getWorkspaceProfit`, `getProfitTimeseries`, `getMarginCompressionAlerts`, `getStockoutAlerts`, `getCashflowForecast`, `getWorkspaceUsage`, `useOrgBilling`, i query a `projects`. Si es vol un helper d’agregat 30d per KPI (sum netProfit/revenue), es pot afegir una funció prima que cridi `getWorkspaceProfit` i retorni totals — preferiblement a `src/lib/profit/` sense duplicar fórmules.

**zero canvis a engines**

- No es modifiquen `getWorkspaceProfit`, `getProfitTimeseries`, `getMarginCompressionAlerts`, `getStockoutAlerts`, `getCashflowForecast`, `getWorkspaceUsage`, ni motors de billing; només es consumeixen des de la Home.

---

## 7. Risks

- **Duplicació de càlculs:** si la Home recalcula marges, profit o cash a partir de dades en brut en lloc d’usar els helpers. Mitigació: contracte clar — tot via helpers; code review.
- **Barreja de widgets amb dades inconsistents:** finestres temporals diferents (p. ex. 7d vs 30d) entre widgets sense indicar-ho. Mitigació: definir una finestra per defecte (30d) i documentar-la; same dateFrom/dateTo on sigui possible.
- **Dependència incompleta de D19:** mostrar reorder candidates amb mock. Mitigació: D19 marcat com a BLOCKED; no mock; espai reservat o widget ocult fins D19.
- **Regressions visuals a Home existent:** canvis al layout o a la Dashboard actual que trenquin fluxos existents. Mitigació: D21 MVP en slice incremental; tests visuals o checklist abans de merge.

---

## 8. Definition of done

- D21 MVP dibuixa només dades reals
- No hi ha càlculs financers duplicats a UI
- Loading / error / empty states definits per als widgets MVP
- D19 queda marcat com a blocked dependency, no falsejat
