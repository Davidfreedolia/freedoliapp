# D16 — Inventory Intelligence

**Status:** Slice 1 (detectStockoutRisk) + Slice 2 (getStockoutAlerts) + Slice 3 (Stockout alerts UI) + Slice 4 (Global stockout alert strip)  
**Objectiu:** Detectar risc de stockout per ASIN (dies de stock per sota d’un llindar).

---

## 1. Slice 1 — Detecció de risc de stockout

### Fitxer i funció

- **Fitxer:** `src/lib/inventory/detectStockoutRisk.js`
- **Funció:** `detectStockoutRisk(supabase, orgId, options)` — retorna una alerta si els dies de stock estimats per a un ASIN són inferiors a 30.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `asin` (obligatori per retornar alerta), `lookbackDays` (default 30). |

### Comportament

1. **Vendes mitjanes diàries per ASIN:** es calcula la mitjana d’unitats venudes per dia a partir de **v_product_units_sold_day** (camp `orders_count` com a proxy d’unitats per product_id i rang de dates). El rang és els últims `lookbackDays` dies. *Nota: la vista `v_product_econ_day` no exposa unitats, només ingressos; per tant la font de “vendes” en unitats és `v_product_units_sold_day`.*
2. **Stock actual:** es llegeix de la taula **inventory** (suma de `total_units` per `project_id` i, si existeix, filtrat per `org_id`). El `project_id` s’obté de `product_identifiers` a partir de `(org_id, asin)`.
3. **Càlcul:**  
   - `dailySales` = mitjana d’unitats venudes per dia (total `orders_count` / lookbackDays).  
   - `daysOfStock` = `currentStock / dailySales` (si `dailySales <= 0` no es retorna alerta).
4. **Alerta:** si `daysOfStock < 30`, es retorna `{ asin, currentStock, dailySales, daysOfStock }`. En cas contrari es retorna `null`. Si no es passa `asin` o no es troba product_id, es retorna `null`.

### Regles

- No duplicar càlculs de vendes; es reutilitza la vista existent `v_product_units_sold_day`.
- Tot filtrat per `org_id` (product_identifiers, v_product_units_sold_day, inventory quan hi ha org_id).
- No es crea UI en aquest slice.

---

## 2. Workspace stockout alerts (Slice 2)

### Fitxer i funció

- **Fitxer:** `src/lib/inventory/getStockoutAlerts.js`
- **Funció:** `getStockoutAlerts(supabase, orgId, options)` — llista d’alertes de stockout per tots els ASIN del workspace, ordenada per urgència.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `lookbackDays` (default 30). |

### Comportament

1. **ASINs del workspace:** es llegeix `product_identifiers` filtrat per `org_id` i `asin IS NOT NULL`; es retorna llista d’ASIN únics.
2. **Per cada ASIN** es crida **només** `detectStockoutRisk(supabase, orgId, { asin, lookbackDays })`. No es recalculen vendes ni es duplica la lògica de detecció.
3. Es mantenen només els resultats no null (risc detectat).
4. **Retorn:** llista `[{ asin, currentStock, dailySales, daysOfStock }]` ordenada per **daysOfStock ASC** (el més urgent primer). Si no hi ha alertes, es retorna `[]`.

### Regles

- No recalcular vendes; no duplicar lògica de `detectStockoutRisk()`.
- Tot filtrat per `org_id`.
- No es crea UI en aquest slice.

---

## 3. Stockout alerts UI (Slice 3)

### Ubicació

- **Pàgina:** `src/pages/Profit.jsx` (ruta `/app/profit`)
- **Secció:** "Stockout risk", col·locada entre "Margin alerts" i "Profit trend".

### Comportament

1. **Font de dades:** la secció utilitza **només** `getStockoutAlerts(supabase, orgId, { lookbackDays: 30 })`; no es recalculen vendes al frontend.
2. **Inputs:** `lookbackDays = 30` (fix).
3. **Taula:** columnes ASIN, Current Stock, Daily Sales, Days of Stock; ordenada per **daysOfStock ASC** (ja provista per l’API).
4. **Format:** Current Stock → enter; Daily Sales → decimal; Days of Stock → nombre amb 1 decimal.
5. **Sense alertes:** es mostra el missatge "No stockout risk detected."
6. **UX:** icona d’avís (AlertTriangle), color amber/coral (`--stockout-alert-amber`, #f59e0b), disseny compacte (padding 8px 12px, tipografia 13px).

### Regles

- Tot ha de venir de `getStockoutAlerts()`; cap càlcul de vendes al frontend.

---

## 4. Global stockout alert strip (Slice 4)

### Component i ubicació

- **Component:** `src/components/inventory/StockoutAlertStrip.jsx`
- **Ubicació al layout:** dins `App.jsx`, just després de `MarginCompressionAlertStrip` i abans de l’`ErrorBoundary` que embolcalla les rutes; visible a tot `/app/*`.

### Font de dades

- **Única font:** `getStockoutAlerts(supabase, activeOrgId, { lookbackDays: 30 })`. No es recalculen vendes ni es duplica la lògica de `detectStockoutRisk` / `getStockoutAlerts`.

### Comportament

- Carrega les alertes en muntar el component i es recarrega quan canvia `activeOrgId`.
- Si `alerts.length === 0`, el component no renderitza res (retorna `null`).

### UX

- **Missatge:** si hi ha 1 producte → "⚠ Product may stock out soon"; si n’hi ha més d’un → "⚠ X products may stock out soon" (X = nombre d’alertes).
- **Estil:** franja compacta (padding 8px 16px), icona `AlertTriangle`, color **amber** (`#f59e0b`), fons amber molt suau, `border-bottom` amber; mateix patró que `MarginCompressionAlertStrip` però amb paleta amber coherent amb les alertes d’inventari.
- **CTA:** botó "View details" que navega a `/app/profit`.

### Regles

- Tot ha de venir de `getStockoutAlerts()` (i per tant de `detectStockoutRisk` al backend); no recalcular vendes ni duplicar lògica al frontend.
