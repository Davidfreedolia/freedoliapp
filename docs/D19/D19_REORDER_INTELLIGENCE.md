# D19 — Reorder Intelligence (Pre-Design)

**Status:** pre-design (documentació i definició funcional; sense implementació)  
**Objectiu:** Definir el motor de recomanació de recompra abans d’implementar-lo.

---

## 1. Objectiu

El motor ha de respondre:

- Quan he de tornar a comprar aquest producte?
- Quina quantitat hauria de comprar?
- Tinc prou cash per fer-ho?

---

## 2. Inputs principals

Fonts previstes:

- vendes mitjanes diàries
- stock actual
- lead time del supplier
- buffer days
- cashflow forecast
- MOQ si existeix
- qty per carton / pack si existeix

---

## 3. Càlcul base

Definir:

- **dailySales** — mitjana d’unitats venudes per dia (font: vista o motor existent, p. ex. v_product_units_sold_day o D16).
- **currentStock** — stock actual (font: inventory o equivalent).
- **daysOfStock** — currentStock / dailySales (dies fins a quedar-se sense estoc).
- **reorderPointDays** — leadTimeDays + bufferDays (dies abans dels quals cal reordenar).
- **recommendedReorderDate** — data en què es recomana fer la recompra (avui + (reorderPointDays − daysOfStock) si daysOfStock < reorderPointDays, o equivalent).
- **recommendedQty** — quantitat recomanada a demanar (veure regla MVP).

---

## 4. Regla MVP

**Alerta de reorder** si:

```text
daysOfStock <= reorderPointDays
```

**RecommendedQty MVP:**

```text
recommendedQty = dailySales * (leadTimeDays + coverDaysTarget) - currentStock
```

(Arrodonir a enter ≥ 0; tenir en compte MOQ si existeix.)

Amb:

- **bufferDays** configurable
- **coverDaysTarget** configurable

---

## 5. Cash awareness

El motor ha d’indicar si la recompra és:

- **affordable** — el cashflow forecast indica cash suficient per l’estimatedOrderCost en la data de reorder.
- **risky** — cash just o incert.
- **not affordable** — cash insuficient.

Basat en el **cashflow forecast** disponible (D17).

---

## 6. Output del motor

Format previst:

```text
{
  asin,
  currentStock,
  dailySales,
  daysOfStock,
  reorderPointDays,
  recommendedReorderDate,
  recommendedQty,
  estimatedOrderCost,
  cashStatus
}
```

- **cashStatus:** `'affordable' | 'risky' | 'not_affordable'`
- **estimatedOrderCost:** estimació del cost de la comanda (recommendedQty × cost unitari si existeix, sinó placeholder).

---

## 7. UI prevista

Aquest motor alimentarà:

- **widget Home v1:** Reorder candidates
- **futura vista:** `/app/inventory` o `/app/reorder`
- **alertes** globals o contextuals

---

## 8. MVP rules

- sense AI
- sense models complexos
- càlcul determinista
- fonts reals del sistema
- documentar qualsevol placeholder

---

## 9. Dependències

**Requereix:**

- **D16** — Inventory Intelligence (stockout risk, stock, vendes)
- **D17** — Cashflow Forecast (per cash awareness)
- dades de **supplier / PO** si existeixen (lead time, cost, MOQ)

---

## 10. Resultat esperat

Freedoliapp ha de poder dir:

- **Reorder this product in X days**
- **Suggested quantity: Y**
- **Cash status:** affordable / risky / not affordable

---

## Implementation — Engine (D19.1)

**Fitxer:** `src/lib/inventory/getReorderCandidates.js`

**Signatura:** `getReorderCandidates(supabase, orgId, options?)`  
Options: `{ limit?: number, lookbackDays?: number, leadTimeDays?: number }`. Default limit 10.

### Fórmula final

Per cada producte (ASIN) del workspace:

- **daily_sales** = mitjana d’unitats venudes per dia (darrers `lookbackDays` dies, default 30). Font: `v_product_units_sold_day` (orders_count com a proxy d’unitats).
- **lead_time_days** = opció o fallback 30 (no existeix font única per producte; documentat com a limitació).
- **stock_on_hand** = suma de `total_units` a `inventory` per org_id + project_id.
- **incoming_units** = suma de quantities d’`items` de `purchase_orders` per org_id + project_id (POs sense filtre d’estat; si `items` no té format esperat, 0).
- **demand_during_lead_time** = daily_sales × lead_time_days.
- **reorder_needed** = demand_during_lead_time − (stock_on_hand + incoming_units).
- Si **reorder_needed > 0** → candidat; **reorderUnits** = round(reorder_needed); **daysUntilStockout** = daily_sales > 0 ? stock_on_hand / daily_sales : 0.

Ordenació: 1) daysUntilStockout asc, 2) reorderUnits desc. Es retorna fins a `limit` candidats.

### Fonts de dades

| Dada | Font | Notes |
|------|------|--------|
| Llista ASINs | `product_identifiers` (org_id, asin no null) | Únic per workspace. |
| project_id, productName | `product_identifiers` + `projects.name` | Resolució ASIN → project. |
| daily_sales | `v_product_units_sold_day` (d, orders_count, org_id, product_id) | Mitjana darrers 30 dies. |
| stock_on_hand | `inventory` (org_id, project_id, total_units) | Suma total_units. |
| incoming_units | `purchase_orders` (org_id, project_id, items) | Suma item.quantity / item.qty / item.units; sense filtre d’estat de PO. |
| lead_time_days | Fallback 30 | No s’usa supplier_quotes.lead_time_days ni cap altra font per producte. |

### Output contract (ampliat D19.3)

```js
[
  {
    asin: string,
    productName: string | null,
    dailySales: number,
    stockOnHand: number,
    incomingUnits: number,
    leadTimeDays: number,
    reorderUnits: number,
    daysUntilStockout: number,
    coverageDays: number,
    demandDuringLeadTime: number,
    leadTimeSource: 'configured' | 'fallback' | 'derived' | 'unknown',
    confidence: 'high' | 'medium' | 'low',
    issues: string[]
  }
]
```

### Limitacions actuals

- **Lead time:** no s’integra lead time per producte/supplier; es fa servir un fallback global (default 30 dies). Es pot estendre amb supplier_quotes o dades de PO si es defineix.
- **POs obertes:** es sumen totes les POs del projecte; no es filtra per estat (open/ordered/received). Si el schema permet filtrar per estat, es pot afegir.
- **Cash awareness:** el motor no crida getCashflowForecast; no retorna cashStatus ni estimatedOrderCost. La UI o un adapter superior pot combinar getReorderCandidates + getCashflowForecast.
- **MOQ / qty per carton:** no aplicat; reorderUnits és el resultat brut arrodonit.

---

## Widget Home (D19.2)

El widget **Reorder candidates** a la Home consumeix el motor real `getReorderCandidates(supabase, orgId, { limit: 5 })` via el composador `useHomeDashboardData`. No es recalcula res al component.

**Camps mostrats al widget:** productName (o ASIN si no hi ha nom), reorderUnits, daysUntilStockout (o "—" si no fiable), stockOnHand, incomingUnits. Màxim 5 files.

**Estats:** loading; empty state "No reorder actions needed right now." quan no hi ha candidats; si el motor falla, el composador retorna `reorder.candidates = []` i es mostra el mateix empty state (no es trenca la resta de la Home). D19.3: el widget pot mostrar la pista discreta "(low confidence)" quan el candidat té `confidence === 'low'`; els camps nous del contracte (coverageDays, confidence, issues) queden disponibles per a la UI.

---

## Hardening — Quality rules and confidence model (D19.3)

### Contracte ampliat (output per candidat)

Cada candidat retornat per `getReorderCandidates` inclou:

- **Camps existents:** asin, productName, dailySales, stockOnHand, incomingUnits, leadTimeDays, reorderUnits, daysUntilStockout.
- **Nous camps de qualitat:** coverageDays (dies de cobertura amb stock + incoming; cap a 999, mai Infinity), demandDuringLeadTime, leadTimeSource (`'configured' | 'fallback' | 'derived' | 'unknown'`), confidence (`'high' | 'medium' | 'low'`), issues (array de strings; sempre array).

### Regles de confidence (aplicades al motor)

- **high:** dailySales ≥ 0.5 (MIN_DAILY_SALES_RELIABLE), stockOnHand finit i ≥ 0, leadTimeSource ≠ unknown, i cap issue crític (sense lead_time_fallback o weak_daily_sales).
- **medium:** dailySales > 0 i stockOnHand finit, però hi ha algun issue (p. ex. lead_time_fallback o weak_daily_sales) o dailySales < 0.5; la recomanació segueix sent usable.
- **low:** falta lead time real, dailySales molt feble o nul, o dades incompletes; es mostra com a candidat amb confiança baixa per no amagar informació, però la UI pot marcar-ho (p. ex. "(low confidence)").

En l’estat actual del motor, leadTimeSource és sempre `'fallback'`; per tant es pot tenir high només si no s’afegeix cap issue (p. ex. si es relaxa “lead_time_fallback” com a issue o es considera acceptable).

### Política per dades incompletes

- **Productes sense vendes recents (dailySales = 0):** no es consideren candidats; no es genera reorder. Evita recomanacions absurdes.
- **reorderUnits:** mai negatiu; sempre Math.max(0, round(reorderNeeded)).
- **coverageDays:** mai Infinity; es limita a COVERAGE_DAYS_CAP (999). Divisió per zero: si dailySales ≤ 0, el producte no entra com a candidat.
- **Si un producte no es pot avaluar amb sentit:** no surt com a candidat (exemple: dailySales = 0). Si surt amb dades parcials útils però dubtoses, surt amb confidence = low i issues clars (p. ex. weak_daily_sales).

### Ordenació final

1. **Risc més imminent:** daysUntilStockout ascendent (els que abans queden sense stock primer).
2. **Confiança més alta:** high abans que medium abans que low.
3. **reorderUnits més altes:** descendent com a desempat.

### Limitacions actuals honestes (post-hardening)

- leadTimeSource és sempre `fallback`; no hi ha integració amb supplier/product config.
- issues inclouen, quan cal: `missing_lead_time` (leadTimeSource fallback/unknown), `no_incoming_po_data` (incomingUnits no fiable o 0), `weak_daily_sales` (vendes < 0.5 u/dia). No es marquen (per ara) altres mancances com a incoming PO no filtrat per estat.
- El widget Home mostra només una pista discreta "(low confidence)"; la resta de camps de qualitat queden disponibles per a futures vistes o alertes.

---

## Alerting integration (D19.4)

### Helper creat

**Fitxer:** `src/lib/inventory/getReorderAlerts.js`  
**Funció:** `getReorderAlerts(supabase, orgId, options?)`  
Options: `{ limit?: number }` (default 20).

Reutilitza `getReorderCandidates`; no recalcula la lògica. Cada alerta deriva d’un candidat real retornat pel motor D19.

### Contracte de sortida

Cada element de l’array retornat:

```js
{
  type: 'reorder',
  severity: 'high' | 'medium' | 'low',
  asin: string,
  productName: string | null,
  message: string,
  reorderUnits: number,
  daysUntilStockout: number,
  confidence: string,
  issues: string[],
  source: 'reorder_intelligence'
}
```

- **message:** text breu i accionable (ex.: "Reorder Product X: 50 units suggested in ~12 days").
- **issues:** còpia de l’array del candidat; sempre array.

### Regles de severitat

- **high:** daysUntilStockout ≤ 7, o (daysUntilStockout ≤ 14 i reorderUnits > 0 i confidence ≠ low). Risc imminent o reorder urgent amb dades raonablement fiables.
- **medium:** reorder necessari però stockout no immediat (dies > 14), o dies ≤ 14 amb confidence low. Certa incertesa o horitzó menys crític.
- **low:** reorder suggerit amb baixa confiança o horitzó menys urgent (dies > 14 i confidence low).

### Ordenació

1. **severity** (high → medium → low).  
2. **daysUntilStockout** ascendent (més imminent primer).  
3. **reorderUnits** descendent (desempat).

Es filtra candidats amb reorderUnits ≤ 0. Es respecta el `limit` sobre el resultat final.

### Relació entre reorder candidates i reorder alerts

- **Candidates** (`getReorderCandidates`): llista de productes que necessiten recompra, amb mètriques i confidence. Font única de veritat.
- **Alerts** (`getReorderAlerts`): mateixos candidats transformats en alertes amb severity i message, per consum en capes d’alerting (futura barra global, agregador, etc.). No hi ha alertes sense base al motor D19.
