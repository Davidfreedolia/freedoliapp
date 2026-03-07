# D17 — Cashflow Forecast Engine (Pre-Design)

**Status:** pre-design (documentació; sense implementació)  
**Objectiu:** Definir el motor de forecast de cashflow per sellers Amazon abans d’implementar-lo.

---

## 1. Objectiu del motor

El Cashflow Engine ha de respondre a la pregunta crítica d’un seller:

**"Quants diners tindré en els pròxims dies?"**

El sistema ha de calcular un forecast simple però fiable del cash disponible.

Ha de permetre veure:

- Cash actual
- Payouts Amazon previstos
- Compres d’inventari
- Despeses operatives

---

## 2. Inputs principals

El motor utilitza aquestes fonts de dades.

### Amazon revenue

**Font:** `v_product_econ_day`

**Camps utilitzats:**  
`gross_sales`  
`refunds`  
`amazon_fees`

---

### Ads spend

**Font:**  
Ads cost events (si existeix dins econ tables)

---

### Inventory purchases

**Font:**  
`purchase_orders`  
`shipments`

**Camps:**  
`po_total_cost`  
`payment_date` (si existeix)

Si no existeix `payment_date` es pot estimar.

---

### Amazon payouts

**Font:**  
Settlements / payout events

Si encara no existeixen:  
Es pot estimar amb una regla simple: **Amazon paga aproximadament cada 14 dies.**

---

## 3. Output del motor

El motor generarà una sèrie temporal.

**Format:**  
`date`  
`cashBalance`

**Exemple:**

| date       | cashBalance |
|------------|-------------|
| 2026-03-10 | 12.540 €    |
| 2026-03-11 | 12.320 €    |
| 2026-03-12 | 11.980 €    |

---

## 4. API del motor

Crear una funció:

```text
getCashflowForecast(supabase, orgId, options)
```

**options:**  
- `forecastDays` (default 30)

**Return:**

```text
[
  { date, cashBalance }
]
```

---

## 5. Càlcul simplificat

Per cada dia:

```text
cash(t) =
  cash(t-1)
  + expected revenue
  - ads spend
  - purchase orders
  - other expenses
```

---

## 6. MVP Rules

Per la primera versió:

- forecast de 30 dies
- no models complexos
- no AI
- càlcul determinista
- simple moving averages si cal

---

## 7. UI prevista

Aquest motor alimentarà:

### Home Dashboard

**Widget:** Cash Snapshot

### Cashflow Page

**Ruta futura:** `/app/cash`

**Amb:** Cashflow chart

---

## 8. Widget Home v1

**Widget:** `kpi_cash_snapshot`

**Mostrarà:**  
- Cash today  
- Cash in 30 days  

Si encara no hi ha engine real:  
**placeholder** "Cash engine coming soon"

---

## 9. Dependències

**Requereix:**  
- `v_product_econ_day`  
- `purchase_orders`  
- `shipments`  

**Opcional:**  
- settlement data

---

## 10. Roadmap rules

Aquest motor és **prerequisite** per:

- **D18** — Reorder Intelligence  
- **D19** — Seller Decision Engine  

---

## 11. Expected result

El seller podrà veure immediatament:

- si tindrà problemes de liquiditat
- quan rebrà diners d’Amazon
- si pot comprar més stock

Aquest és un dels motors més importants del producte.
