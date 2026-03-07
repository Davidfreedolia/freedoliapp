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
