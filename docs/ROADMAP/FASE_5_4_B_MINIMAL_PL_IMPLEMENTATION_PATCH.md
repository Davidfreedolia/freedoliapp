# FASE 5.4.B — MINIMAL P&L IMPLEMENTATION PATCH

## 1. Purpose

Aquest subbloc aplica un **patch mínim d’honestedat de UI** a la vista de profit actual, sense tocar el motor de càlcul, el ledger, les vistes SQL ni els helpers. L’objectiu és evitar que l’usuari interpreti la vista de profit com un **P&L comptable complet** quan, segons FASE 5.2, COGS i part dels costos operatius continuen parcialment implementats o a 0.

## 2. Scope implementat

- **Pàgina `/app/profit` (`src/pages/Profit.jsx`)**
  - S’ha actualitzat el títol i descripció del `Header`:
    - Abans:
      - Title: `Profit`
      - Sense descripció específica.
    - Ara:
      - Title: `Profit (V1)`
      - Descripció:  
        `Vista de profit per producte i workspace basada en ledger V1. Alguns costos (COGS i despeses operatives completes) poden no estar totalment inclosos encara.`

- **No s’han tocat**:
  - Helpers `getWorkspaceProfit`, `getProfitTimeseries`, `getAsinProfitData`, `getMarginCompressionAlerts`.
  - Vistes `v_product_econ_day`, `v_product_profit_day`, `v_ledger_norm`.
  - `financial_ledger`, `org_settings`, `exchange_rates_daily`.
  - Cap altre component de Home o widgets (`HomeTopAsins`, `HomeProfitTrend`, `MarginCompressionAlertStrip`, `HomeAlertsPanel`) perquè el naming actual és prou neutre i no promet un P&L complet.

## 3. Relació amb el contracte P&L (FASE 5.2)

- El contracte P&L canònic continua sent:
  - `financial_ledger.amount_base_pnl` en `org_settings.base_currency` amb FX de `exchange_rates_daily`.
  - Read models: `v_ledger_norm`, `v_product_econ_day`, `v_product_profit_day`.
- 5.4.B **no** canvia aquest contracte ni el codi que el consumeix; només:
  - fa explícit a la UI que la vista actual és una **V1 basada en ledger**,
  - indica que **COGS i alguns costos operatius no estan completament inclosos**.

## 4. Limitacions i deute controlat que es mantenen

- **COGS i gross profit**:
  - Continuem amb COGS efectivament a 0 mentre el cost pool i WAC no estiguin completament wired.
  - Gross profit clàssic (revenue − COGS) no es mostra explícitament a la UI.
- **Operating expenses**:
  - No hi ha separació explícita d’“operating expenses” a les vistes; moltes despeses acaben a `other` o similars.
- **UX de Home i widgets**:
  - `HomeTopAsins`, `HomeProfitTrend` i alertes de marge segueixen mostrant profit/marge basats en el mateix model; el naming és prou neutre (Top ASINs, Profit trend) i no s’ha considerat necessari afegir més descàrrega en aquesta fase.

## 5. Fora d’abast

- No s’ha:
  - modificat cap SQL, view o migration.
  - tocat cashflow (`getCashflowForecast`, `Cashflow.jsx`).
  - tocat Finances legacy (`Finances.jsx`, `expenses`, `incomes`, `payments`).
  - canviat el comportament de cap helper de profit o de les vistes de truth engine.

