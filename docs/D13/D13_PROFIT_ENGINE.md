# D13 — Profit Engine (Precheck)

**Status:** precheck + Slice 1 (motor de càlcul pur) + Slice 2 (getAsinProfitData) + Slice 3 (getWorkspaceProfit) + Slice 4 (Profit UI) + Slice 5 (getProfitTimeseries) + Slice 6 (Profit trend visualization)  
**Objectiu:** Verificar la infraestructura financera i oferir el motor base de càlcul de profit per ASIN.

---

## 1. Current financial sources

### 1.1 Font d’ingressos Amazon

| Element | Existeix | Notes |
|--------|----------|--------|
| **amazon_financial_events** | Sí | Taula normalitzada: `org_id`, `job_id`, `settlement_id`, `transaction_id`, `event_type`, `event_date`, `amount`, `currency`, `reference`, `meta`. Constraint únic `(org_id, settlement_id, transaction_id, event_type)`. |
| **amazon_import_jobs** | Sí | Jobs d’import (CSV o SP-API). Idempotència per `org_id` + `file_sha256`. |
| **amazon_raw_rows** | Sí | Staging immutable per fila del CSV; `raw_data` jsonb. |
| **amazon_settlement_lines** | No | No hi ha taula amb aquest nom. El flux de settlement (SP-API o CSV) es materialitza en **amazon_financial_events** i, via `post_amazon_job_to_ledger_backend`, en **financial_ledger**. |

**Conclusió:** La font d’ingressos Amazon per al motor de profit és **amazon_financial_events** (i, en segon terme, **financial_ledger** un cop fet el post). No existeix una taula separada “amazon_settlement_lines”; el concepte equivalent és la combinació job → raw_rows → financial_events → ledger.

### 1.2 Taula de costos

| Element | Existeix | Notes |
|--------|----------|--------|
| **expenses** | Sí | Taula org-scoped (`org_id`), amb RLS. Costos generals de l’org/projecte. |
| **incomes** | Sí | Taula org-scoped; ingressos no necessàriament Amazon. |
| **product_costs** | No (taula) | No hi ha taula `product_costs`. |
| **cogs** | Views / placeholder | **v_product_cost_pool**: view que ha de donar unitats i cost per producte; actualment és **placeholder** (0 rows fins que existeixi un model de “receipts” o cost pool). **v_product_cogs_day** (F10.2 patch): retorna `cogs_amount` / `unit_cost_wac` com a **NULL** perquè no hi ha WAC real. El càlcul COGS (units_sold × unit_cost_wac) està preparat però sense dades de cost pool. |

**Conclusió:** Hi ha **expenses** i **incomes** com a fonts de costos/ingressos generals. Per a costos **per producte** (COGS, WAC) la infraestructura són views; la font de dades (cost pool / receipts) **no existeix encara** com a taula operativa.

### 1.3 Ads cost

| Element | Existeix | Notes |
|--------|----------|--------|
| **amazon_ads_spend** | No | No hi ha taula dedicada d’ad spend. |
| **Equivalent** | Parcial | **v_ledger_norm** deriva `econ_type = 'ads'` quan el ledger prové d’un **amazon_financial_event** amb `event_type` que contingui ‘ad’ o ‘sponsored’. Per tant, els ads només es reflecteixen si **ja venen al settlement/CSV** i es classifiquen així. No hi ha integració amb Amazon Advertising API ni taula pròpia d’ads. |

**Conclusió:** No hi ha font dedicada **amazon_ads_spend**. Els ads al profit engine provenen únicament dels events Amazon que arriben via settlement/CSV i es mapen a ‘ads’ a **v_ledger_norm**.

### 1.4 Ledger financer

| Element | Existeix | Notes |
|--------|----------|--------|
| **financial_ledger** | Sí | Taula principal: `id`, `org_id`, `scope`, `project_id`, `type` (financial_event_type), `status`, `occurred_at`, `amount_base_pnl`, `amount_base_cash`, `reference_type`, `reference_id`, etc. RLS per scope (company/project). |
| **ledger_entries** | No (nom) | El llibre de registre és **financial_ledger**; no hi ha taula anomenada `ledger_entries`. |
| **ledger_product_allocations** | Sí | Enllaça `ledger_entry_id` (financial_ledger.id) → `product_id` (project_id), amb weight, method, confidence. |
| **v_ledger_norm** | Sí | View que normalitza ledger + amazon_financial_events i exposa `econ_type` (revenue, refund, amazon_fee, ads, cogs, freight, duties, other). |

**Conclusió:** El **ledger financer** existeix com a **financial_ledger**. Les entrades es creen des d’Amazon via `post_amazon_job_to_ledger_backend` (reference_type = 'AMAZON_EVENT', reference_id = amazon_financial_events.id). La capa d’allocació i les vistes de profit (v_product_econ_day, v_product_profit_day, etc.) ja estan definides sobre aquest model.

---

## 2. Missing data sources

- **Amazon ads dedicat:** cap taula ni integració amb Amazon Advertising API; només ads que vinguin al settlement/CSV i es classifiquin com a ‘ads’ a v_ledger_norm.
- **Cost pool / COGS per producte:** cap taula operativa d’“inventory_receipts”, “shipment cost” o equivalent que alimenti **v_product_cost_pool**; per tant, WAC i COGS per producte queden sense font real (views en placeholder o NULL).
- **Unitats venudes:** **amazon_financial_events** no té camp `quantity`; les vistes poden usar nombre d’events com a proxy, però no “units sold” reals sense una font amb quantitats (p. ex. orders/order_items amb quantity).

Resum: el **motor de càlcul** (ledger → allocation → econ_type → profit per producte) està preparat; els **buits** són fonamentalment de **dades** (ads dedicat, cost pool, unitats).

---

## 3. Profit calculation strategy

- **Font de veritat:** **financial_ledger** (book of record). Les entrades Amazon provenen de **amazon_financial_events** via `post_amazon_job_to_ledger_backend`.
- **Allocation:** **ledger_product_allocations** assigna entrades del ledger a productes (project_id); l’RPC **rpc_profit_auto_allocate_by_identifier** fa el matching per ASIN (amazon_financial_events.meta + product_identifiers).
- **Normalització:** **v_ledger_norm** exposa cada entrada amb `econ_type` (revenue, refund, amazon_fee, ads, cogs, freight, duties, other) segons `financial_ledger.type` i, quan aplica, `amazon_financial_events.event_type`.
- **Agregació per producte/dia:** **v_product_econ_day** agrega per (org_id, product_id, d) a partir de v_ledger_norm i les allocacions.
- **Profit per producte/dia:** **v_product_profit_day** uneix econ + COGS (quan hi hagi cost pool) i calcula net_revenue, contribution_margin; actualment COGS és 0/NULL per falta de cost pool.
- **Coverage:** **v_profit_allocation_coverage** informa de quines entrades del ledger estan allocades o no.

La **estratègia** és coherent amb un Profit Truth Engine: una sola font (ledger), capa d’allocació, vistes de normalització i profit. El que falta per fer el càlcul “complet” són les **fonts de dades** que omplin ads i COGS/unitats, no canvis d’arquitectura del motor.

---

## 4. Resum precheck

| Àmbit | Estat | Acció suggerida (futur) |
|-------|--------|--------------------------|
| Font ingressos Amazon | Present (amazon_financial_events + ledger) | Cap; flux existent. |
| Costos generals | Present (expenses, incomes) | Cap. |
| COGS / cost pool per producte | Absent (views placeholder) | Definir taula/model de cost pool o receipts i alimentar v_product_cost_pool. |
| Ads | Absent (només via settlement si hi és) | Opcional: taula o API Amazon Ads. |
| Ledger | Present (financial_ledger + allocations + v_ledger_norm) | Cap. |

**Conclusió:** La infraestructura financera **permet** construir el Profit Truth Engine sobre el que ja hi ha. El motor de càlcul i les vistes estan alineats amb aquest objectiu. Els passos següents serien omplir les fonts que falten (cost pool, opcionalment ads dedicat i unitats) sense crear taules noves en aquest precheck.

---

## 5. Profit calculation model (Slice 1)

### Fitxer i funció

- **Fitxer:** `src/lib/profit/profitEngine.js`
- **Funció:** `calculateAsinProfit(params)` — **funció pura**, sense accés a base de dades.

### Inputs

| Camp | Tipus | Descripció |
|------|--------|------------|
| `revenue` | number | Ingressos (vendes). |
| `amazonFees` | number | Comissions / fees Amazon. |
| `adsCost` | number | Cost d’ads. |
| `refunds` | number | Devolucions. |
| `cogs` | number | Cost of goods sold. |
| `shipping` | number | Cost d’enviament. |

Tots opcionals; es tracten com a 0 si no es passen o no són numèrics.

### Sortida

Retorna un objecte amb els mateixos camps d’entrada més:

| Camp | Fórmula |
|------|--------|
| `netProfit` | `revenue - amazonFees - adsCost - refunds - cogs - shipping` |
| `margin` | `netProfit / revenue`; si `revenue === 0` → `0`. |
| `roi` | `netProfit / cogs`; si `cogs === 0` → `0`. |

### Edge cases

- **revenue = 0** → `margin = 0` (evitar divisió per zero).
- **cogs = 0** → `roi = 0`.

### Ús

El caller ha d’obtenir `revenue`, `amazonFees`, `adsCost`, `refunds`, `cogs`, `shipping` des de les fonts de dades (ledger, views, API); aquest mòdul només calcula.

---

## 6. Asin profit data aggregation (Slice 2)

### Fitxer i funció

- **Fitxer:** `src/lib/profit/getAsinProfitData.js`
- **Funció:** `getAsinProfitData(supabase, orgId, asin, options)` — agrega dades reals per ASIN i retorna el resultat de `calculateAsinProfit()`.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `asin` | string | ASIN del producte. |
| `options` | object | Opcional. `dateFrom`, `dateTo` (YYYY-MM-DD), `marketplace`. |

### Flux

1. **Resolució product_id:** es consulta `product_identifiers` per `(org_id, asin)` i s'obté `project_id` (product_id). Si no hi ha fila, es retorna el mateix objecte amb tots els imports a 0 i el resultat de `calculateAsinProfit({})`.
2. **Agregació econ:** es llegeix `v_product_econ_day` per `(org_id, product_id, d)` amb `d` entre `dateFrom` i `dateTo`. Es sumen `gross_sales` → revenue; `refunds`, `amazon_fees`, `ads`, `freight`, `duties`, `other_costs` es passen com a costos (valors absoluts) → refunds, amazonFees, adsCost, shipping (freight + duties + other_costs).
3. **COGS:** es llegeix `v_product_profit_day` per les mateixes claus i es suma el camp `cogs`. Actualment la vista retorna 0/NULL (veure "Current assumptions / missing sources").
4. **Càlcul:** es crida **només** `calculateAsinProfit({ revenue, amazonFees, adsCost, refunds, cogs, shipping })` i es retorna l'objecte amb `asin`, `marketplace`, `dateFrom`, `dateTo` i tots els camps del resultat (revenue, amazonFees, adsCost, refunds, cogs, shipping, netProfit, margin, roi).

### Fonts reals utilitzades

| Camp sortida | Font | Notes |
|--------------|------|--------|
| revenue | v_product_econ_day.gross_sales | Suma per product_id i rang de dates. |
| amazonFees | v_product_econ_day.amazon_fees | Suma (valor absolut). |
| adsCost | v_product_econ_day.ads | Suma (valor absolut). |
| refunds | v_product_econ_day.refunds | Suma (valor absolut). |
| cogs | v_product_profit_day.cogs | Suma; actualment 0 si no hi ha cost pool. |
| shipping | v_product_econ_day.freight + duties + other_costs | Suma (valors absoluts). |

Tot respecta `org_id`; no es creen taules ni UI.

---

## 7. Workspace profit aggregation (Slice 3)

### Fitxer i funció

- **Fitxer:** `src/lib/profit/getWorkspaceProfit.js`
- **Funció:** `getWorkspaceProfit(supabase, orgId, options)` — calcula profit per tots els ASIN del workspace per poder ordenar productes.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `dateFrom`, `dateTo` (YYYY-MM-DD), `marketplace`. |

### Comportament

1. **Obtenir tots els ASIN del workspace:** es consulta `product_identifiers` amb `WHERE org_id = orgId` i `asin IS NOT NULL`; es retorna llista d’ASIN únics.
2. **Per cada ASIN** es crida **només** `getAsinProfitData(supabase, orgId, asin, options)` (sense duplicar càlculs ni fórmules).
3. **Retorn:** llista d’objectes `{ asin, revenue, netProfit, margin, roi }`.
4. **Ordenació per defecte:** `netProfit` DESC.

### Regles

- No duplicar càlculs ni replicar fórmules; sempre reutilitzar `getAsinProfitData()`.
- Tot filtrat per `org_id`.
- No es crea UI en aquest slice.

---

## 8. Profit UI (Slice 4)

### Pàgina i ruta

- **Pàgina:** `src/pages/Profit.jsx`
- **Ruta:** `/app/profit`

### Comportament

1. **Font de dades:** la pàgina utilitza **només** `getWorkspaceProfit(supabase, orgId, options)`; no es recalcula profit al frontend ni es dupliquen fórmules.
2. **Inputs:** `dateFrom`, `dateTo` (rang de dates), `marketplace` (opcional). Valors per defecte: últims 30 dies.
3. **Taula:** columnes ASIN, Revenue, Net Profit, Margin, ROI (ordenació inicial: netProfit DESC, ja provista pel motor).
4. **Format numèric:** Revenue i Net Profit → moneda (EUR, locale ca-ES); Margin i ROI → percentatge.
5. **UX:** estat de càrrega (loading), estat d’error amb botó “Tornar a intentar”.
6. **Gating:** la pàgina comprova el feature `profit_engine`; si no està al pla es mostra missatge d’upgrade (sense UI de càlcul).

### Regles

- Tot ha de venir de `getWorkspaceProfit()`; cap càlcul ni fórmula al frontend.
- Accés a la pàgina des del menú lateral (sidebar) i ruta `/app/profit`.

---

## 9. Profit timeseries (Slice 5)

### Fitxer i funció

- **Fitxer:** `src/lib/profit/getProfitTimeseries.js`
- **Funció:** `getProfitTimeseries(supabase, orgId, options)` — calcula profit per dia per poder mostrar tendència temporal.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `asin` (opcional), `dateFrom`, `dateTo` (YYYY-MM-DD), `marketplace` (opcional). |

### Comportament

1. **Fonts:** es llegeixen dades de `v_product_econ_day` i `v_product_profit_day` (filtre per `org_id`, rang de dates; si `options.asin` és present, es resol `product_id` via `product_identifiers` i es filtra per aquest producte).
2. **Agregació per dia:** es sumen per camp `d` (dia): revenue (gross_sales), amazonFees, adsCost, refunds, cogs (de v_product_profit_day), shipping (freight + duties + other_costs); costos en valor absolut.
3. **Càlcul per dia:** per cada dia del rang `[dateFrom, dateTo]` es crida **només** `calculateAsinProfit({ revenue, amazonFees, adsCost, refunds, cogs, shipping })` (no es dupliquen fórmules).
4. **Retorn:** array d’objectes `{ date, revenue, netProfit, margin, roi }`, ordenat per **date ASC**.

### Regles

- No duplicar fórmules; sempre utilitzar `calculateAsinProfit()`.
- Tot filtrat per `org_id`.
- Si es passa `asin` i no es troba product_id, es retorna array buit.
- No es crea UI en aquest slice.

---

## 10. Profit trend visualization (Slice 6)

### Ubicació

- **Pàgina:** `src/pages/Profit.jsx`
- **Secció:** “Profit trend”, sota la barra de filtres i sobre la taula de profit per ASIN.

### Comportament

1. **Font de dades:** la secció utilitza **només** `getProfitTimeseries(supabase, orgId, options)`; no es recalcula profit al frontend ni es dupliquen fórmules.
2. **Inputs:** els mateixos que la pàgina: `dateFrom`, `dateTo`, `marketplace`; si en el futur hi ha ASIN seleccionat, es passa `options.asin` i el gràfic filtra per aquell producte.
3. **Gràfic:** Net Profit per dia. Eix X: `date`; eix Y: `netProfit`. Biblioteca: Recharts (LineChart), ja utilitzada al projecte.
4. **UX:** estat de càrrega (loading), estat d’error amb botó “Tornar a intentar”; si no hi ha dades, missatge “Sense dades de tendència per al rang de dates”.

### Regles

- Tot ha de venir de `getProfitTimeseries()`; cap càlcul ni fórmula al frontend.
- El botó “Actualitzar” de la pàgina actualitza taula i tendència.

---

## 11. Current assumptions / missing sources

- **COGS:** La vista `v_product_profit_day` (i `v_product_cogs_day`) no té font de cost pool operativa; `cogs` és 0 o NULL. Es retorna **0** en `cogs` fins que existeixi inventari/receipts o cost pool.
- **v_ledger_norm (patch):** Després del patch F10.2, `v_ledger_norm` només exposa `econ_type` 'revenue' i 'other' (derivat del `type` del ledger: income → revenue, la resta → other). Per tant, **refunds**, **amazon_fees**, **ads**, **freight**, **duties** a `v_product_econ_day` poden ser 0 fins que es torni a mapar chart-of-accounts / event_type a econ_type. En aquest cas es retornen **0** en aquests camps i queda documentat aquí.
- **Ads dedicat:** No hi ha taula ni API d'Amazon Advertising; només es reflecteixen ads que vinguin al settlement i es classifiquin a ledger.
- **marketplace:** El paràmetre `options.marketplace` es repassa a la sortida; la agregació actual no filtra per marketplace (v_product_econ_day és per product_id i dia). Un filtre per marketplace es podria afegir en una fase posterior si les vistes exposen marketplace.
