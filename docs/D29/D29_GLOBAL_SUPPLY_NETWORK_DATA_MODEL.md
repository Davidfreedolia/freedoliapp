# D29.2 — Global Supply Network Data Model

Status: Draft  
Owner: Architecture

---

## 1 Context

D29.1 ha definit el model conceptual de la **Global Supply Network** de FREEDOLIAPP.

Aquesta fase defineix **només el contracte de dades** necessari per suportar:

- múltiples proveïdors
- múltiples llocs de producció
- múltiples rutes logístiques
- lead times per ruta

⚠️ Aquesta fase és DOCUMENTACIÓ i CONTRACTE.  
⚠️ NO crear migracions encara.  
⚠️ NO modificar codi existent.

---

## 2 Objectiu

Definir el model de dades que permetrà representar:

supplier → origin → route → destination

i permetre que els engines (reorder, forecast, planning) utilitzin aquesta informació.

---

## 3 Entitats principals

### supply_origins

Representa llocs d'origen de producte.

Exemples:

- factory
- supplier warehouse
- consolidation warehouse

Camps mínims:

- id
- org_id
- name
- country_code
- city
- type (factory / supplier_warehouse / consolidation)
- created_at

---

### supply_destinations

Representa destinacions logístiques.

Exemples:

- FBA warehouse
- 3PL
- internal warehouse

Camps:

- id
- org_id
- name
- type (fba / 3pl / warehouse)
- country_code
- created_at

---

### supply_routes

Defineix rutes logístiques entre origen i destinació.

Exemple:

factory China → FBA USA

Camps:

- id
- org_id
- origin_id
- destination_id
- transport_mode (sea / air / truck / mixed)
- lead_time_days
- min_lead_time_days
- max_lead_time_days
- cost_estimate
- reliability_score
- created_at

---

### supplier_origin_links

Relaciona proveïdors amb llocs d'origen.

Camps:

- id
- org_id
- supplier_id
- origin_id
- created_at

---

## 4 Exemples de rutes

| Origen        | Destinació | transport_mode | lead_time_days |
|---------------|------------|----------------|----------------|
| Factory CN    | FBA DE     | sea            | 35             |
| Factory CN    | FBA US     | sea            | 45             |
| Factory CN    | FBA US     | air            | 7              |
| Warehouse PL  | 3PL DE     | truck          | 3              |
| Consolidation | FBA UK     | mixed          | 14             |

---

## 5 Relació amb sistema existent

Aquest model **NO substitueix**:

- suppliers
- purchase_orders
- shipments

Només afegeix **context logístic estructurat**.

Els engines podran utilitzar:

supply_routes.lead_time_days

per calcular:

- reorder timing
- demand during lead time
- supply planning

---

## 6 Integració amb engines existents

- **Reorder engine:** pot consultar `supply_routes` per obtenir `lead_time_days` (i opcionalment `min_lead_time_days` / `max_lead_time_days`) per a cada parell origen–destinació i ajustar reorder points i lead-time demand.
- **Forecast / planning:** poden considerar `transport_mode`, `lead_time_days` i `reliability_score` per a planificació de subministrament i dates estimades.
- **Canonical:** suppliers, purchase_orders i inventory segueixen sent la font de veritat operativa; la supply network aporta la capa de configuració (orígens, destinacions, rutes) per interpretar aquestes dades.

---

## 7 Regla d'arquitectura

La supply network és **configuració estructural**, no operativa.

No ha de generar moviments d'inventari.

Només descriu **com circula el producte**.

---

## 8 Current implementation status

- taules creades
- FKs amb `org_id`
- indexos principals creats
- constraints bàsiques creades
- RLS aplicada seguint patró canònic del projecte

---

## 9 Implemented Contract

### supply_origins

- **Finalitat:** representar llocs d'origen de producte (fàbrica, magatzem proveïdor, consolidació).
- **Camps principals:** id, org_id, name, country_code, city, type, created_at.
- **type** restringit a: `factory`, `supplier_warehouse`, `consolidation`.

### supply_destinations

- **Finalitat:** representar destinacions logístiques (FBA, 3PL, magatzem propi).
- **Camps principals:** id, org_id, name, type, country_code, created_at.
- **type** restringit a: `fba`, `3pl`, `warehouse`.

### supply_routes

- **Finalitat:** definir rutes logístiques entre origen i destinació amb lead time i mode de transport.
- **Camps principals:** id, org_id, origin_id, destination_id, transport_mode, lead_time_days, min_lead_time_days, max_lead_time_days, cost_estimate, reliability_score, created_at.
- **transport_mode** restringit a: `sea`, `air`, `truck`, `mixed`.
- **Camps de lead time:** lead_time_days, min_lead_time_days, max_lead_time_days.

### supplier_origin_links

- **Finalitat:** relacionar proveïdors amb llocs d'origen.
- **Relació:** supplier → origin (un supplier pot tenir diversos orígens; un origin pot estar lligat a diversos suppliers).
- **Unicitat:** (org_id, supplier_id, origin_id) per evitar duplicats.

---

## 10 Architecture rule now enforced

D29 ja introdueix una capa estructural per descriure la xarxa de subministrament, però:

- no genera moviments d'inventari
- no substitueix shipments
- no substitueix purchase_orders
- no modifica engines existents

---

## 11 Definition of done

- model conceptual
- data contract
- schema base
- documentació actualitzada

---
