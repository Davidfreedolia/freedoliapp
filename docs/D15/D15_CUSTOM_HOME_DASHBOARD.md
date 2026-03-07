# D15 — Custom Home Dashboard (Pre-Design)

**Status:** pre-design (arquitectura i documentació; sense implementació)  
**Objectiu:** Definir l’arquitectura d’un dashboard inicial personalitzable per usuari, sense implementar encara drag & drop ni UI final.

---

## 1. Objectiu de producte

- **Dashboard inicial personalitzable per usuari:** la pantalla d’inici (home) després d’iniciar sessió ha de poder adaptar-se a les preferències de cada usuari.
- **No per org:** la personalització és a nivell d’usuari (qui veu què), no d’organització; cada usuari pot tenir el seu propi layout dins del context del seu workspace.
- **Orientat a mostrar els widgets més rellevants en obrir l’app:** l’objectiu és que, en obrir l’aplicació, l’usuari vegi ràpidament la informació que més li interessa (profit, alertes, stock, comandes, etc.) sense haver de navegar a pàgines separades.

---

## 2. Principis

- **Default dashboard obligatori:** sempre hi ha un dashboard per defecte (layout predefinit) que s’utilitza quan l’usuari no té preferències guardades o en cas d’error; no es permet un “dashboard buit”.
- **Personalització governada:** el que l’usuari pot fer és reordenar, amagar o mostrar widgets del catàleg permès; no es poden afegir widgets arbitraris ni codi personalitzat.
- **Widgets reutilitzables:** cada widget és un component o conjunt de dades que ja pot existir en altres pàgines (profit, alertes, etc.); el dashboard només els composa i els mostra en un layout.
- **Preferències persistides:** les preferències de layout (ordre, visibilitat, mida, filtres opcionals) es guarden per usuari (i opcionalment per org/workspace) i es carreguen en obrir el dashboard.
- **Zero lògica de negoci dins del layout:** el layout només decideix què mostrar i on; tota la lògica de càlcul, APIs i regles de negoci roman als motors i serveis existents (D13, D14, etc.).

---

## 3. Model de dades proposat

### Taula: `user_dashboard_preferences`

| Columna      | Tipus     | Descripció |
|-------------|-----------|------------|
| `user_id`   | uuid      | Usuari propietari de la preferència (FK a auth.users o equivalent). |
| `org_id`    | uuid      | Organització (workspace) per al qual s’aplica aquest layout; permet un layout per usuari per org. |
| `dashboard_key` | text  | Clau del dashboard (p. ex. `home`, `executive`); per defecte `home`. |
| `layout_json`   | jsonb | Estructura que descriu l’ordre, visibilitat, mida i filtres opcionals de cada widget (veure contracte). |
| `updated_at`    | timestamptz | Data d’última actualització de la preferència. |

- **Clau única:** `(user_id, org_id, dashboard_key)` perquè un usuari tingui una sola preferència de “home” per org.
- **RLS:** l’usuari només pot llegir i escriure les seves pròpies files (`auth.uid() = user_id`).

---

## 4. Contracte de `layout_json`

Estructura proposada (sense implementar):

- **Array (o objecte amb llista) d’entrades de widget,** cada una amb:
  - **`widget_id`:** identificador del widget dins del catàleg (p. ex. `profit_trend`, `margin_alerts`).
  - **`visible`:** boolean; si el widget es mostra al dashboard.
  - **`order`:** número (integer) per ordenar els widgets; menor = més amunt / esquerra segons el layout.
  - **`size`:** hint de mida (p. ex. `small`, `medium`, `large`) o dimensions mínimes per a layout responsive.
  - **`filters` (opcional):** objecte amb filtres opcionals que el widget accepta (p. ex. rang de dates, marketplace); depèn del widget.

Exemple conceptual (no vinculant per a la implementació):

```json
{
  "widgets": [
    { "widget_id": "profit_trend", "visible": true, "order": 0, "size": "medium" },
    { "widget_id": "margin_alerts", "visible": true, "order": 1, "size": "small" },
    { "widget_id": "top_profitable_asins", "visible": true, "order": 2, "size": "medium", "filters": { "limit": 5 } }
  ]
}
```

El format definitiu es tancarà en la fase d’implementació (Slice 1).

---

## 5. Catàleg inicial de widgets candidats

| Widget ID                 | Descripció breu | Font de dades / pàgina existent |
|---------------------------|------------------|----------------------------------|
| `profit_trend`            | Tendència de profit (per dia) | getProfitTimeseries(); pàgina Profit. |
| `top_profitable_asins`    | Llistat dels ASIN més rendibles | getWorkspaceProfit(); ordenat per netProfit. |
| `margin_alerts`           | Alertes de compressió de marge | getMarginCompressionAlerts(); pàgina Profit. |
| `stock_risk`              | Risc d’estoc (productes sota mínim o out-of-stock) | Motors / dades d’inventari existents. |
| `reorder_candidates`      | Productes candidats a recomanar | Lògica de reorder existent o futura. |
| `cash_snapshot`           | Resum de caixa (ingressos / despeses recent) | Dades de Finances / ledger. |
| `shipments_in_progress`   | Enviaments en curs | Dades de comandes / logistics. |
| `billing_usage_alerts`    | Alertes de facturació i ús (limits, pla) | D12 / billing / entitlements. |

Aquest catàleg és orientatiu; la disponibilitat real dependrà dels motors i de la prioritat de cada slice.

---

## 6. Fases d’implementació

- **Slice 1 — Prefs + load/save:** Taula `user_dashboard_preferences`, API o servei per carregar i desar `layout_json` per `(user_id, org_id, dashboard_key)`; cap UI de reordenació encara.
- **Slice 2 — Widget renderer:** Component o pàgina que, donat un `layout_json` i el catàleg de widgets, renderitza els widgets visibles en l’ordre indicat (layout fix o simple grid); cada widget delegat als motors existents.
- **Slice 3 — Reorder UI:** Interfície per canviar ordre, visibilitat i mida dels widgets (llista o drag & drop simple); persisteix canvis a `user_dashboard_preferences`.
- **Slice 4 — Role presets (opcional):** Presets de layout per rol (p. ex. “Executive”, “Ops”) que l’usuari pot aplicar com a punt de partida.
- **Slice 5 — Smart dashboard suggestions (opcional):** Suggeriments de layout o widgets rellevants segons activitat o rol; no obligatori per al MVP.

---

## 7. Regles

- **No implementar encara:** aquest document és només pre-disseny; no es creen taules, ni APIs ni components nous en aquesta fase.
- **No tocar motors existents:** D13, D14, D12, Finances, etc. queden com estan; el dashboard només els consumirà.
- **Només arquitectura i documentació:** l’únic deliverable és el document D15 amb l’arquitectura clara del dashboard personalitzable.

---

## Home Dashboard v1 — Functional + UI Definition

### 1. Objectiu de la Home

La Home ha de respondre en menys de 10 segons a:

- Estic guanyant diners o no?
- Tinc algun problema urgent?
- Quins productes he de vigilar?
- Què he de fer avui?

### 2. Principis UX

- pantalla clara, no saturada
- prioritat a informació accionable
- primer alertes, després rendiment, després context
- cap widget decoratiu
- tots els widgets han de portar a una vista de detall real
- desktop-first, responsive net, sense invents

### 3. Layout canònic de la Home v1

Definir aquest ordre de dalt a baix:

#### Fila 0 — Global alert strips

- Margin compression alert strip
- Workspace limit alert
- futurs alerts globals reutilitzables

#### Fila 1 — KPI row

4 cards principals:

- Net Profit (30d)
- Revenue (30d)
- Margin (30d)
- Cash Snapshot (placeholder si encara no existeix engine real, marcat com planned)

#### Fila 2 — Actionable widgets

2 columnes:

- Margin Alerts
- Stockout Risk

#### Fila 3 — Performance widgets

2 columnes:

- Profit Trend
- Top / Worst ASINs

#### Fila 4 — Operational widgets

2 columnes:

- Shipments in progress
- Billing / Usage / Plan status

#### Fila 5 — Projects / sourcing

1 bloc ample:

- Active projects / pending actions

### 4. Widgets aprovats per Home v1

Llistar com a catàleg inicial aprovat:

- `global_margin_alert_strip`
- `workspace_limit_alert`
- `kpi_net_profit_30d`
- `kpi_revenue_30d`
- `kpi_margin_30d`
- `kpi_cash_snapshot`
- `widget_margin_alerts`
- `widget_stockout_risk`
- `widget_profit_trend`
- `widget_top_asins`
- `widget_shipments_status`
- `widget_billing_usage`
- `widget_active_projects`

### 5. Widgets NO aprovats encara

Llistar explícitament:

- drag & drop
- widgets lliures il·limitats
- configurador avançat
- AI recommendations
- custom chart builder
- role presets dinàmics

### 6. Regles visuals

Definir:

- grid net de cards
- cards amb mateixa alçada per fila quan tingui sentit
- header de widget amb títol + CTA de detall
- empty states curts i útils
- loading skeletons coherents
- ús dels colors d’alerta:
  - coral = margin / warning financer
  - amber = stock / inventory risk
  - turquoise/petrol = rendiment i navegació
- zero soroll visual

### 7. Navegació

Cada widget ha d’enllaçar a la seva vista real:

- Margin alerts → `/app/profit`
- Stockout risk → `/app/profit` o futura vista inventory
- Profit trend → `/app/profit`
- Top ASINs → `/app/profit`
- Billing usage → `/app/billing`
- Active projects → `/app/projects`

### 8. Dependències reals

Marcar què ja existeix i què encara és planned:

**Existeix:**

- Profit Engine
- Margin Alerts
- Stockout Risk
- Billing / Usage
- Projects
- Shipments (si ja hi ha base real)

**Planned:**

- Cashflow Engine
- Reorder Intelligence
- Seller Decision Engine
- Dashboard personalization

### 9. Regla de roadmap

La Home v1 s’implementarà només amb widgets suportats per motors ja existents o clarament marcats com planned placeholder.

No s’inventarà cap widget sense engine real al darrere.

### 10. Resultat esperat

La Home ha de quedar definida com:

- moderna
- clara
- accionable
- útil per un seller en menys de 10 segons
- base de la futura personalització de dashboard
