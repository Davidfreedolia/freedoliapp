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

---

## 9. Existing data sources audit

Per cadascun d’aquests blocs, documenta: fitxer exacte; funció/helper/component existent; input contract; output contract; reutilitzable directament per Home; necessita adapter de presentació; READY / NOT READY.

### 9.1 Profit KPIs (net profit 30d, revenue 30d, margin 30d)

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/profit/getWorkspaceProfit.js` |
| **Funció existent** | `getWorkspaceProfit(supabase, orgId, options)` |
| **Input contract** | `(supabase, orgId, { dateFrom?: string, dateTo?: string, marketplace?: string })`. Cal passar `dateFrom` i `dateTo` (YYYY-MM-DD) per una finestra 30d. |
| **Output contract** | `Promise<Array<{ asin: string, revenue: number, netProfit: number, margin: number, roi: number }>>` — array ordenat per netProfit DESC. No retorna totals agregats. |
| **Reutilitzable directament** | No: la Home necessita **totals** (sum netProfit, sum revenue, margin = sum(netProfit)/sum(revenue)). La pàgina Profit usa el mateix helper però mostra la taula per ASIN. |
| **Adapter** | Sí: una crida única a `getWorkspaceProfit(supabase, orgId, { dateFrom, dateTo })` amb dates 30d; a la Home (o un helper prim a `src/lib/profit/`) sumar `revenue` i `netProfit` i derivar margin. No duplicar fórmules. |
| **Estat** | **READY** — font real existeix; només cal agregació lleu al consumidor. |

**Component existent que el consumeix:** `src/pages/Profit.jsx` (loadData amb dateFrom/dateTo; no exposa KPI row reutilitzable com a component).

### 9.2 Profit trend

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/profit/getProfitTimeseries.js` |
| **Funció existent** | `getProfitTimeseries(supabase, orgId, options)` |
| **Input contract** | `(supabase, orgId, { dateFrom?: string, dateTo?: string, asin?: string, marketplace?: string })`. **Obligatoris** `dateFrom` i `dateTo`; si falten retorna `[]`. |
| **Output contract** | `Promise<Array<{ date: string, revenue: number, netProfit: number, margin: number, roi: number }>>` — ordenat per date ASC. |
| **Reutilitzable directament** | Sí: la Home pot cridar amb dateFrom/dateTo (p. ex. últims 30 dies) i rebre la sèrie. |
| **Adapter** | Només de presentació: mateix patró que Profit.jsx — Recharts LineChart amb eix X = date, eix Y = netProfit. No cal canviar el helper. |
| **Estat** | **READY** — helper i ús a Profit.jsx demostren el contract; component de gràfic es pot reutilitzar o replicar el patró. |

**Component existent:** `src/pages/Profit.jsx` — secció “Profit trend” amb Recharts (ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip); no exportat com a component independent.

### 9.3 Top ASINs

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/profit/getWorkspaceProfit.js` |
| **Funció existent** | `getWorkspaceProfit(supabase, orgId, options)` |
| **Input contract** | Mateix que 9.1: `dateFrom`, `dateTo`, `marketplace` opcional. |
| **Output contract** | Array per ASIN ordenat per **netProfit DESC**; cada item té `asin`, `revenue`, `netProfit`, `margin`, `roi`. |
| **Reutilitzable directament** | Sí: la Home pot cridar una sola vegada (compartint amb KPI 30d si es vol) i prendre els N primers (p. ex. 5–10) per al widget “Top ASINs”. |
| **Adapter** | Només presentació: llistat compacte (asin + netProfit/revenue/margin); no cal nou helper. |
| **Estat** | **READY** — mateixa font que KPI; un sol fetch pot servir KPI row + Top ASINs. |

**Component existent:** `src/pages/Profit.jsx` — taula de rows de getWorkspaceProfit; no component widget aïllat.

### 9.4 Margin alerts

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/profit/getMarginCompressionAlerts.js` |
| **Funció existent** | `getMarginCompressionAlerts(supabase, orgId, options)` |
| **Input contract** | `(supabase, orgId, { lookbackDays?: number, recentDays?: number, marketplace?: string })`. Per defecte lookback/recent a detectMarginCompression. |
| **Output contract** | `Promise<Array<{ asin: string, averageMarginLookback: number, averageMarginRecent: number, marginDrop: number }>>` — ordenat per marginDrop DESC. |
| **Reutilitzable directament** | Sí. |
| **Adapter** | Opcional: la franja global `MarginCompressionAlertStrip` amaga si no hi ha alertes; per la Home es pot voler un widget amb llista (N files) + CTA a /app/profit. |
| **Estat** | **READY** — motor i strip existents. |

**Component existent:** `src/components/profit/MarginCompressionAlertStrip.jsx` — crida getMarginCompressionAlerts(supabase, activeOrgId, { lookbackDays: 30, recentDays: 7 }); retorna null si loading o alerts.length === 0; sinó mostra franja + “View details” → /app/profit. Per widget Home amb llista de files, reutilitzar el helper i renderitzar taula curta.

### 9.5 Stockout alerts

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/inventory/getStockoutAlerts.js` |
| **Funció existent** | `getStockoutAlerts(supabase, orgId, options)` |
| **Input contract** | `(supabase, orgId, { lookbackDays?: number })` — lookbackDays per defecte 30. |
| **Output contract** | `Promise<Array<{ asin: string, currentStock: number, dailySales: number, daysOfStock: number }>>` — ordenat per daysOfStock ASC. |
| **Reutilitzable directament** | Sí. |
| **Adapter** | Opcional: mateix patró que margin — strip global amaga si no n’hi ha; widget Home pot mostrar llista N files + CTA. |
| **Estat** | **READY** — motor i strip existents. |

**Component existent:** `src/components/inventory/StockoutAlertStrip.jsx` — getStockoutAlerts(supabase, activeOrgId, { lookbackDays: 30 }); retorna null si loading o alerts.length === 0; sinó franja + “View details” → /app/profit.

### 9.6 Cash snapshot

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | `src/lib/finance/getCashflowForecast.js` |
| **Funció existent** | `getCashflowForecast(supabase, orgId, options)` |
| **Input contract** | `(supabase, orgId, { forecastDays?: number })` — forecastDays per defecte 30; min 1, max 365. |
| **Output contract** | `Promise<Array<{ date: string, cashBalance: number }>>` — una entrada per dia, ordenat per date. Primera = avui, última = avui + forecastDays - 1. |
| **Reutilitzable directament** | Sí: cash “avui” = result[0].cashBalance; cash “en 30d” = result[result.length - 1].cashBalance (quan forecastDays === 30). |
| **Adapter** | Només presentació: mateix que Cashflow.jsx (cashToday, cashIn30); la Home mostra 1–2 valors en KPI card, no el gràfic. |
| **Estat** | **READY** — engine i pàgina Cashflow.jsx ja fan aquest consum; zero duplicació de càlcul. |

**Component existent:** `src/pages/Cashflow.jsx` — getCashflowForecast(supabase, activeOrgId, { forecastDays: 30 }); cashToday = data[0].cashBalance; cashIn30 = data[data.length - 1].cashBalance; KPIs + gràfic. La Home només necessita els dos números.

### 9.7 Billing usage

| Camp | Valor |
|------|--------|
| **Fitxers exactes** | `src/lib/workspace/usage.js` (getWorkspaceUsage), `src/hooks/useWorkspaceUsage.js` (hook), `src/hooks/useOrgBilling.js` (hook) |
| **Funció/helper existent** | `getWorkspaceUsage(supabase, orgId)`; hooks `useWorkspaceUsage()`, `useOrgBilling(orgId)` |
| **Input contract** | getWorkspaceUsage: (supabase, orgId). useOrgBilling: orgId (string \| null). useWorkspaceUsage: sense args (agafa activeOrgId del WorkspaceContext). |
| **Output contract** | getWorkspaceUsage: `{ projects: { used, limit, percent }, seats: { used, limit, percent }, limitsReached: string[], nearLimits: string[] }`. useOrgBilling: `{ loading, billing: { plan, status, trial_ends_at, current_period_end_at, stripe_customer_id } \| null, isTrialExpired }`. |
| **Reutilitzable directament** | Sí: useWorkspaceUsage + useOrgBilling donen plan, status, used/limit per projects i seats; Billing.jsx ja els usa. |
| **Adapter** | Només presentació: widget compacte a la Home (plan, seats used/limit, projects used/limit; opcional nearLimits). |
| **Estat** | **READY** — D12; Billing.jsx i LimitReachedBanner n’ són el consumidor. |

**Component existent:** `src/pages/Billing.jsx` — useWorkspaceUsage + useOrgBilling; seccions “Current Plan” i “Usage” amb projects/seats. No component widget exportat; es pot reutilitzar el mateix hook i renderitzar una card resum.

### 9.8 Active sourcing projects

| Camp | Valor |
|------|--------|
| **Fitxer exacte** | Query directa a Supabase: taula `projects`. Hook existent: `src/hooks/useProjectsListState.js` |
| **Funció/component existent** | `useProjectsListState()` — retorna `{ data, loading, error, noOrg, refetch }`. Query interna: `supabase.from('projects').select('*').eq('org_id', activeOrgId).order('created_at', { ascending: false })`. |
| **Input contract** | activeOrgId del context; cap paràmetre addicional. La query no filtra per status ni phase. |
| **Output contract** | Array de projectes (tots els de l’org), ordenat per created_at DESC. Estructura depèn del schema (id, name, status, current_phase, updated_at, etc.). |
| **Reutilitzable directament** | Parcial: el hook retorna **tots** els projectes. “Active sourcing” requereix filtrar per status/phase (p. ex. excloure archived/cancelled; opcionalment només fases de sourcing). A la codebase, `status === 'active'` i `current_phase` (1 = Research) apareixen en altres llocs; no hi ha helper central de “active sourcing”. |
| **Adapter** | Sí: a la Home filtrar client-side (o crear query amb .neq('status','archived') etc. si el schema ho permet) i limitar a N (p. ex. 10); ordenar per updated_at DESC si es vol. |
| **Estat** | **READY** — font real (useProjectsListState o query equivalent); criteri “active sourcing” es documenta i s’aplica en adapter/presentació. Si el schema no té status/phase consistent, marcar què es considera “active” a D21 (p. ex. tots excepte status in ('archived','cancelled')). |

**Nota:** No s’ha detectat cap helper dedicat “getActiveSourcingProjects”; la llista de projectes a Dashboard i Projects ve de la mateixa query/hook. D21 pot reutilitzar useProjectsListState i aplicar filtre + limit a la capa de presentació.

---

## 10. Reuse strategy

Per cada widget D21 MVP, decisió clara:

| Widget D21 MVP | Decisió | Justificació |
|----------------|---------|--------------|
| KPI Net profit (30d) | **REUSE WITH ADAPTER** | getWorkspaceProfit existeix; cal una sola crida 30d + sum(netProfit) a la Home (o helper prim que retorni totals). |
| KPI Revenue (30d) | **REUSE WITH ADAPTER** | Mateix getWorkspaceProfit; sum(revenue). |
| KPI Margin (30d) | **REUSE WITH ADAPTER** | Mateixa font; margin = sum(netProfit)/sum(revenue). |
| KPI Cash snapshot | **REUSE WITH ADAPTER** | getCashflowForecast; prendre result[0].cashBalance i result[length-1].cashBalance; presentar en card. |
| Margin alerts (widget llista) | **REUSE WITH ADAPTER** | getMarginCompressionAlerts; widget amb N files + CTA. Strip global ja existeix; Home pot reutilitzar helper i fer llistat. |
| Stockout risk (widget llista) | **REUSE WITH ADAPTER** | getStockoutAlerts; mateix patró que margin. |
| Profit trend | **REUSE WITH ADAPTER** | getProfitTimeseries amb dateFrom/dateTo 30d; Recharts com a Profit.jsx; només presentació. |
| Top ASINs | **REUSE WITH ADAPTER** | getWorkspaceProfit; prendre .slice(0, N); presentar taula/llista compacta. |
| Billing usage | **REUSE WITH ADAPTER** | useWorkspaceUsage + useOrgBilling; card resum (plan, seats, projects). |
| Active sourcing projects | **REUSE WITH ADAPTER** | useProjectsListState (o query equivalent) + filtre client-side “active” + limit N. |
| Reorder candidates | **BLOCKED** | Motor D19 no implementat; no mock; espai reservat o ocult. |

---

## 11. No-go findings

Llista explícita del que **NO** s’ha de fer:

- **Copiar càlculs des de pàgines existents** — No duplicar fórmules de margin, profit o cash a la Home; tot ha de passar pels helpers (getWorkspaceProfit, getProfitTimeseries, getCashflowForecast, etc.).
- **Recrear queries al frontend si ja hi ha helper** — No fer `supabase.from('v_product_econ_day')` ni agregacions manuals a la Home; usar getWorkspaceProfit / getProfitTimeseries. Per projects, usar useProjectsListState o la mateixa query que fa el hook, no una query nova duplicada sense capa comuna.
- **Usar mock data temporal** — Cap widget D21 MVP pot dependre de dades falses; Reorder candidates no es simula amb mock.
- **Barrejar mètriques de finestres temporals diferents** — Tots els KPIs de profit (net profit, revenue, margin) i Top ASINs han de compartir la mateixa finestra 30d (mateix dateFrom/dateTo); cash snapshot ha d’usar la mateixa forecastDays (30) que el contracte del motor. No mostrar “profit 7d” al costat de “revenue 30d” sense etiquetar-ho clarament.

---

## 12. Final D21 MVP implementation order

Ordre estricte d’implementació:

1. **Data wiring** — Connexió de la pàgina Home/Dashboard amb els helpers: una crida a getWorkspaceProfit(30d), una a getProfitTimeseries(30d), una a getMarginCompressionAlerts, una a getStockoutAlerts, una a getCashflowForecast(30), useWorkspaceUsage, useOrgBilling, useProjectsListState (o query projects). Sense UI encara; només state + loaders + error handling. Garantir finestra 30d única per profit.
2. **KPI cards** — Renderitzar 4 cards: Net profit (30d), Revenue (30d), Margin (30d), Cash snapshot (avui + 30d). Format EUR i %; loading/error/empty per cadascuna.
3. **Alerts row** — Widgets Margin alerts i Stockout risk amb llista (N files) i CTA a /app/profit; empty state “No margin alerts” / “No stockout risk”.
4. **Performance row** — Profit trend (gràfic Recharts) i Top ASINs (taula/llista N primers); mateixes dades del data wiring.
5. **Billing / Projects row** — Billing usage card (plan, seats, projects); Active sourcing projects (llista filtrada + limit, CTA a /app/projects).
6. **Polish states** — Loading skeletons coherents, missatges d’error, empty states, navegació CTA; revisió de no duplicar càlculs i de finestres temporals consistents.

---

## 13. D21.3 — Data wiring skeleton (implemented)

**Fitxer del composador:** `src/hooks/useHomeDashboardData.js`

**Shape retornada:** (estable per la Home)

```js
{
  loading: boolean,
  error: string | null,
  data: {
    kpis: {
      netProfit30d: number | null,
      revenue30d: number | null,
      margin30d: number | null,
      cashNow: number | null,
    },
    alerts: {
      margin: Array,
      stockout: Array,
    },
    performance: {
      profitTrend: Array,
      topAsins: Array,
    },
    operations: {
      billingUsage: { usage, billing } | null,
    },
    projects: {
      active: Array,
    },
    blocked: {
      reorderCandidates: true,
    },
  } | null
}
```

**Dependències connectades a D21.3:**

- `getWorkspaceProfit(supabase, orgId, { dateFrom, dateTo })` — finestra 30d; agregat a totals i topAsins.
- `getProfitTimeseries(supabase, orgId, { dateFrom, dateTo })` — profitTrend.
- `getMarginCompressionAlerts(supabase, orgId, { lookbackDays: 30, recentDays: 7 })` — alerts.margin.
- `getStockoutAlerts(supabase, orgId, { lookbackDays: 30 })` — alerts.stockout.
- `getCashflowForecast(supabase, orgId, { forecastDays: 30 })` — cashNow (primera entrada).
- `useWorkspaceUsage()` — part de operations.billingUsage (usage).
- `useOrgBilling(activeOrgId)` — part de operations.billingUsage (billing).
- `useProjectsListState()` — projects.active després de filtre actius + limit 10.

**Camps blocked o null:**

- `blocked.reorderCandidates` — sempre `true`; motor D19 no implementat; cap mock.
- `kpis.*` — poden ser `null` si no hi ha dades o error (per exemple profit no disponible per l’org).
- `operations.billingUsage` — `null` si usage i billing no disponibles; sinó `{ usage, billing }`.
- `cashNow` — `null` si la sèrie de cashflow és buida.

---

## 14. D21.4 — KPI row + Alerts row (implemented)

**Implementat a D21.4:**

- **KPI row:** 4 targetes amb dades reals del composador `useHomeDashboardData`: Net profit (30d), Revenue (30d), Margin (30d), Cash now. Component `HomeKpiCard` (`src/components/home/HomeKpiCard.jsx`): títol, valor formatat, estat loading ("…"), fallback "—" quan no hi ha dada. Format: EUR (Intl.NumberFormat ca-ES) per imports; margin en percentatge (ratio 0–1 del contracte); si margin no arriba, "—".
- **Alerts row:** Dos panells amb `HomeAlertsPanel` (`src/components/home/HomeAlertsPanel.jsx`): Margin alerts i Stockout risk. Fins a 5 items per panell; empty state "No margin alerts." / "No stockout risk."; cada item = ASIN + mètrica clau (margin: marginDrop en %; stockout: daysOfStock en dies). Colors: coral (margin), amber (stockout) reutilitzant variables existents. Sense botons ni redireccions.
- **Error global:** Si el composador retorna error, es mostra un bloc d’alerta sobre la KPI row; les targetes es renderitzen igual (podent mostrar "—" si no hi ha data).
- **Pàgina:** `src/pages/Dashboard.jsx` — el render temporal/debug de D21.3 ha estat substituït per aquest MVP visual; la secció D21.4 es mostra dins del contingut existent del Dashboard.

**Widgets que segueixen pendents (no tocats a D21.4):**

- Performance row (Profit trend, Top ASINs)
- Billing usage row
- Projects row
- Reorder candidates (bloquejat fins D19)
- Layout complet D15 i polish avançat

**Decisions de UI mínimes (KPI i Alerts):**

- **KPI:** Un sol formatter de moneda (EUR, ca-ES) i un de percentatge (ratio 0–1); sense comparatives ni subtítols; "—" quan el valor és null o no finit.
- **Alerts:** Màxim 5 ítems per panell; línia per ítem amb ASIN + mètrica (drop % o dies); vora del panell amb color segons tipus (margin/stockout); sense CTA ni botons en aquesta fase.

---

## 14. D21.4 — KPI + Alerts MVP (implemented)

**Implementat a D21.4:**

- **KPI row:** 4 targetes amb dades reals del composador: Net profit (30d), Revenue (30d), Margin (30d), Cash now. Format EUR (Intl.NumberFormat ca-ES, currency) per imports; margin com a percentatge (ratio del contracte, sense duplicar càlcul). Loading coherent (skeleton "…"); fallback "—" si no hi ha dada.
- **Alerts row:** Dos panells (Margin alerts, Stockout risk). Fins a 5 items per panell; empty state curt ("No margin alerts." / "No stockout risk."). Cada item: ASIN + mètrica clau (margin: "drop X%"; stockout: "X days").
- **Components nous:** `src/components/home/HomeKpiCard.jsx`, `src/components/home/HomeAlertsPanel.jsx`. Reutilitzen tokens existents (var(--card-bg), var(--border-color), var(--text-1), var(--text-2), var(--margin-alert-coral), var(--stockout-alert-amber)).
- **Error global:** Si el composador retorna error, es mostra un bloc d’error únic a dalt; no es trenca la resta.
- **Render temporal/debug de D21.3** substituït per aquest MVP visual; sense botons ni redireccions encara.

**Widgets que segueixen pendents:**

- Performance row (Profit trend, Top ASINs)
- Billing usage row
- Projects row
- Reorder candidates (bloquejat fins D19)
- Layout complet D15, polish avançat, gràfics

**Decisions de UI mínimes (KPI i Alerts):**

- **KPI:** Valor principal únic per targeta; sense percentatges comparatius ni subtítols addicionals. Margin es deriva del contracte (ratio sum(netProfit)/sum(revenue)); si no és segur, es mostra "—" (no s’ha duplicat cap càlcul).
- **Alerts:** Línies simples (ASIN + mètrica); colors coral (margin) i amber (stockout) alineats amb les franjes globals existents; màxim 5 items; sense CTA ni botons a D21.4.
