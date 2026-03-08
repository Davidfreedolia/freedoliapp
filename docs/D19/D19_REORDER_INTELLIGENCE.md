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

### Output contract

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
    daysUntilStockout: number
  }
]
```

### Limitacions actuals

- **Lead time:** no s’integra lead time per producte/supplier; es fa servir un fallback global (default 30 dies). Es pot estendre amb supplier_quotes o dades de PO si es defineix.
- **POs obertes:** es sumen totes les POs del projecte; no es filtra per estat (open/ordered/received). Si el schema permet filtrar per estat, es pot afegir.
- **Cash awareness:** el motor no crida getCashflowForecast; no retorna cashStatus ni estimatedOrderCost. La UI o un adapter superior pot combinar getReorderCandidates + getCashflowForecast.
- **MOQ / qty per carton:** no aplicat; reorderUnits és el resultat brut arrodonit.
