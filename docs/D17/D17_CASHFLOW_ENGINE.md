# D17 — Cashflow Forecast Engine (Pre-Design)

**Status:** pre-design + Slice 1 (core engine) + Slice 2 (inventory purchases impact) + Slice 3 (Cashflow UI)  
**Objectiu:** Definir i implementar el motor de forecast de cashflow per sellers Amazon.

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

---

## Slice 1 — Core engine implementation

### Fitxer i funció

- **Fitxer:** `src/lib/finance/getCashflowForecast.js`
- **Funció:** `getCashflowForecast(supabase, orgId, options)` — retorna una sèrie temporal `[{ date, cashBalance }]` ordenada per date ASC.

### Paràmetres

- **options.forecastDays** (default 30): nombre de dies a forecast.

### Fonts de dades

- **v_product_econ_day** (filtrat per `org_id`): camps `gross_sales`, `refunds`, `amazon_fees`, `ads`. Agregació per dia: **dailyNetRevenue** = gross_sales − refunds − amazon_fees − ads (costos en valor absolut).

### Lògica MVP

1. Llegir dades dels **últims 30 dies** (lookback) de `v_product_econ_day` per l’org.
2. Calcular **averageDailyNetRevenue** = suma(dailyNetRevenue) / 30.
3. **Cash inicial:** placeholder `startingCash = 0` fins a tenir cash ledger real.
4. Per cada dia des de avui fins a avui + forecastDays: `cash(t) = cash(t-1) + averageDailyNetRevenue`.
5. Retorn: array `[{ date, cashBalance }]` ordenat per date ASC.

### Regles

- Tot filtrat per `org_id`.
- No duplicar càlculs de les taules econ; ús directe de la vista.
- Sense UI; només motor.

---

## Slice 2 — Inventory purchases impact

### Font triada

- **purchase_orders** (filtrat per `org_id`): representa la sortida de caixa per compres d’inventari. Camp de cost: **total_amount**. No s’utilitza `shipments` en aquest slice; la font única és `purchase_orders`.

### Lògica de payment date (fallback MVP)

Assignació del dia d’outflow per cada PO (sortida de caixa):

1. **payment_date** — si existeix a la fila (actualment `purchase_orders` no té aquest camp).
2. **expected_payment_date** — si existeix (tampoc present a la taula actual).
3. **order_date** — data de la comanda (proxy de “quan s’espera el pagament”).
4. **created_at** — data de creació de la PO (fallback).

A la base de dades actual, `purchase_orders` només té `order_date` i `created_at`; per tant s’usa **order_date** i, si és null, **created_at** (només la part date, YYYY-MM-DD).

### Agregació

- Es construeix **dailyInventoryOutflowByDay**: map `date (YYYY-MM-DD) → suma(total_amount)` per a totes les PO l’outflow de les quals cau dins del rang de forecast [avui, avui + forecastDays]. Tot filtrat per `org_id`.

### Integració al forecast

- Es manté: `cash(t) = cash(t-1) + averageDailyNetRevenue`.
- S’afegeix: **− inventoryOutflow(t)** on `inventoryOutflow(t)` és la suma d’outflow d’inventari per al dia `t` (valor de **dailyInventoryOutflowByDay** per a aquesta data, o 0 si no n’hi ha).
- **Fórmula final:** `cash(t) = cash(t-1) + averageDailyNetRevenue − inventoryOutflow(t)`.
- El contracte d’output no canvia: `[{ date, cashBalance }]` ordenat per date ASC.

### Regles

- No crear UI; no tocar altres motors; no inventar models complexos.
- Fallback de dates documentat i consistent.

---

## Slice 3 — Cashflow UI

### Pàgina i ruta

- **Pàgina:** `src/pages/Cashflow.jsx`
- **Ruta:** `/app/cash`

### Font de dades

- Única font: `getCashflowForecast(supabase, activeOrgId, { forecastDays: 30 })`.
- No es recalcula res al frontend; tot ve del motor.

### KPIs (superior)

- **Cash today:** valor de `cashBalance` del primer punt de la sèrie (avui).
- **Cash in 30 days:** valor de `cashBalance` de l’últim punt (dins de 30 dies).

### Gràfic principal

- **Tipus:** línia (Recharts, mateixa biblioteca que la pàgina Profit).
- **Eix X:** `date`
- **Eix Y:** `cashBalance`
- Gràfic net, sense soroll.

### UX

- **Loading:** estat de càrrega mentre es resol `getCashflowForecast`.
- **Error:** missatge d’error i botó “Tornar a intentar”.
- **Empty:** missatge quan no hi ha dades (sèrie buida).

### Format

- Moneda: EUR.
- Números llegibles (format moneda consistent amb la resta de l’app).

### Navegació

- Entrada al Sidebar: “Cashflow” (path `/app/cash`), icona coherent (Wallet).
- Traduccions: clau `sidebar.cashflow` a ca, es, en.

### Regles estrictes

- NO duplicar càlculs al frontend.
- NO afegir models nous.
- Tot ve de `getCashflowForecast()`.
- UI simple i clara.
