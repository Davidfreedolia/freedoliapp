# D14 — Margin Compression Engine (Margin Alerts)

**Status:** Slice 1 (detectMarginCompression) + Slice 2 (getMarginCompressionAlerts) + Slice 3 (Margin alerts UI) + Slice 4 (Global margin alert strip)  
**Objectiu:** Detectar automàticament compressió de marge per ASIN (o a nivell workspace), agregar alertes per workspace, mostrar-les a la pàgina Profit i a la shell global de l’app.

---

## 1. Slice 1 — Detecció de compressió de marge

### Fitxer i funció

- **Fitxer:** `src/lib/profit/detectMarginCompression.js`
- **Funció:** `detectMarginCompression(supabase, orgId, options)` — indica si el marge mitjà recent ha caigut respecte al marge mitjà del període de lookback.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `asin` (opcional), `lookbackDays` (default 30), `recentDays` (default 7). |

### Comportament

1. **Font de dades:** es crida **només** `getProfitTimeseries(supabase, orgId, { dateFrom, dateTo, asin })` amb `dateFrom` = avui − lookbackDays i `dateTo` = avui. No es dupliquen fórmules.
2. **Mètriques:** sobre la sèrie retornada (profit per dia amb `margin`):
   - **averageMarginLookback:** mitjana del camp `margin` sobre tots els dies del rang.
   - **averageMarginRecent:** mitjana del camp `margin` sobre els últims `recentDays` dies.
3. **Diferència:** `marginDrop = averageMarginLookback - averageMarginRecent`.
4. **Alerta:** si `marginDrop >= 0.05`, es retorna `{ asin, averageMarginLookback, averageMarginRecent, marginDrop }` (si no s’ha passat `asin`, el camp `asin` és `null`). En cas contrari es retorna `null`.

### Regles

- No duplicar fórmules; tot passa per `getProfitTimeseries()`.
- No es crea UI en aquest slice.

---

## 2. Workspace margin compression aggregation (Slice 2)

### Fitxer i funció

- **Fitxer:** `src/lib/profit/getMarginCompressionAlerts.js`
- **Funció:** `getMarginCompressionAlerts(supabase, orgId, options)` — llista d’alertes de compressió de marge per tots els ASIN del workspace, ordenada per severitat.

### Paràmetres

| Paràmetre | Tipus | Descripció |
|-----------|--------|-------------|
| `supabase` | SupabaseClient | Client Supabase (sessió autenticada, RLS per org). |
| `orgId` | string (uuid) | ID de l'organització (multi-tenant). |
| `options` | object | Opcional. `lookbackDays` (default 30), `recentDays` (default 7), `marketplace`. |

### Comportament

1. **ASINs del workspace:** es llegeix `product_identifiers` filtrat per `org_id` i `asin IS NOT NULL`; es retorna llista d’ASIN únics.
2. **Per cada ASIN** es crida **només** `detectMarginCompression(supabase, orgId, { asin, lookbackDays, recentDays, marketplace })`. No es recalculen marges fora d’aquesta funció.
3. Es mantenen només les alertes no null (compressió detectada).
4. **Retorn:** llista `[{ asin, averageMarginLookback, averageMarginRecent, marginDrop }]` ordenada per **marginDrop DESC** (major severitat primer). Si no hi ha alertes, es retorna `[]`.

### Regles

- No duplicar fórmules; no recalcular marges fora de `detectMarginCompression()`.
- Tot filtrat per `org_id`.
- No es crea UI en aquest slice.

---

## 3. Margin alerts UI (Slice 3)

### Ubicació

- **Pàgina:** `src/pages/Profit.jsx` (ruta `/app/profit`)
- **Secció:** "Margin alerts", col·locada sobre la secció "Profit trend".

### Comportament

1. **Font de dades:** la secció utilitza **només** `getMarginCompressionAlerts(supabase, orgId, options)`; no es recalculen marges al frontend.
2. **Inputs:** `lookbackDays = 30`, `recentDays = 7`, `marketplace` (opcional, rep el valor del filtre marketplace de la pàgina).
3. **Llista (si hi ha alertes):** taula amb columnes ASIN, Margin last 30 days, Margin last 7 days, Margin drop; ordenada per **marginDrop DESC** (ja provista per l’API).
4. **Format:** Margin i Margin drop en percentatge (locale ca-ES).
5. **Sense alertes:** es mostra el missatge "No margin compression detected."
6. **UX:** icona d’avís (AlertTriangle), color coral/alerta (`--margin-alert-coral`, #e07a5f), disseny compacte (padding reduït, tipografia 13–14px).

### Regles

- Tot ha de venir de `getMarginCompressionAlerts()`; cap càlcul de marges al frontend.

---

## 4. Global margin alert strip (Slice 4)

### Component i ubicació

- **Component:** `src/components/profit/MarginCompressionAlertStrip.jsx`
- **Layout:** integrat al layout global de l’app (a `App.jsx`, dins del `main`, just després de `TopNavbar`); visible a totes les rutes `/app/*`.

### Comportament

1. **Font de dades:** el component utilitza **només** `getMarginCompressionAlerts(supabase, activeOrgId, options)`; no es recalculen marges ni es duplica lògica de `detectMarginCompression` al frontend.
2. **Inputs:** `lookbackDays = 30`, `recentDays = 7`; `marketplace` no s’envia (no hi ha context global de marketplace a la shell).
3. **Visibilitat:** la franja es renderitza **només si hi ha alertes** (length > 0); en cas contrari no es mostra res.
4. **Text:** "Margin dropped on X products", on X és el nombre d’alertes retornades (singular "1 product" si X = 1).
5. **Estil:** franja compacta d’alerta (icona AlertTriangle, color coral `--margin-alert-coral`, fons suau, vora inferior).
6. **CTA:** botó "View details" que navega a `/app/profit`.

### Regles

- No recalcular marges al frontend; no duplicar lògica de `detectMarginCompression`; tot ha de venir de `getMarginCompressionAlerts()`.
- No modificar motors de billing, usage ni profit; només consumir l’API existent.
