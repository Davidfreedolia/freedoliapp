# FREEDOLIAPP — CONTACT ENTITY MODEL

## Purpose

FREEDOLIAPP ja conté un mòdul de **Proveïdors**.  
Tanmateix, la realitat operativa dels negocis Amazon FBA exigeix gestionar múltiples tipus de partners externs, com ara:

- proveïdors
- transitaris (freight forwarders)
- magatzems
- empreses d’inspecció
- partners logístics
- agents
- gestories / agents de duanes

Per evitar fragmentació i models paral·lels, FREEDOLIAPP evolucionarà cap a un **model unificat de Contactes**.

L’objectiu d’aquest document és definir el **model canònic futur** de contactes perquè el sistema pugui evolucionar de forma coherent sense trencar el que ja existeix.

---

## Core concept

En lloc de tenir taules separades com:

- `suppliers`  
- `forwarders`  
- `warehouses`

el sistema passarà a tenir una única entitat canònica:

- `contacts`

Cada registre de `contacts` representarà un **partner extern** i estarà classificat per **tipus**.  
Els mòduls existents (Proveïdors, Forwarders, Magatzems, etc.) passaran a ser **vistes / filtres** sobre aquest únic model de dades.

---

## Contact types (initial set)

Tipus inicials previstos per a `contacts.type`:

- `supplier`
- `freight_forwarder`
- `warehouse`
- `manufacturer`
- `agent`
- `inspector`
- `logistics_partner`
- `customs_broker`
- `other`

Aquesta llista és extensible: es podran afegir nous tipus en futures versions sense canviar la naturalesa canònica de `contacts`.

---

## Canonical contact structure (proposed)

Taula canònica proposada:

`contacts`

**Camps proposats:**

- `id`
- `org_id`
- `name`
- `type`
- `company`
- `contact_person`
- `email`
- `phone`
- `country`
- `city`
- `address`
- `website`
- `whatsapp`
- `wechat`
- `vat_number`
- `notes`
- `tags`
- `created_at`
- `updated_at`

Aquesta estructura és **intencionadament flexible**:

- permet representar tant un proveïdor individual com una empresa logística
- permet guardar múltiples canals de contacte (email, telèfon, WhatsApp, WeChat)
- permet etiquetar (`tags`) per casos d’ús futurs (per exemple: “estratègic”, “risc alt”, “Xina”, “3PL”)

---

## Relationships

Les entitats de negoci actuals i futures referenciaran `contacts` via claus foranes.

Exemples de relacions proposades:

- `projects.supplier_id` → `contacts.id`
- `purchase_orders.supplier_id` → `contacts.id`
- `shipments.forwarder_id` → `contacts.id`
- `warehouse_entries.warehouse_id` → `contacts.id`

En tots els casos:

- el camp FK apunta sempre a `contacts.id`
- el tipus de contacte (`contacts.type`) determina el rol funcional (proveïdor, transitari, magatzem, etc.)

Això garanteix que **cada partner extern té un únic registre canònic** encara que sigui referenciat des de múltiples fluxos (projectes, comandes, enviaments, magatzem).

---

## UI concept

La UI de V1 evolucionarà gradualment cap a una visió de **Contactes unificada**.

### Navegació

Al Sidebar, a llarg termini, hi haurà una secció:

- `Contacts`

### Vistes

Les vistes de la pàgina de Contactes podran oferir filtres i pestanyes com:

- **All contacts**
- **Suppliers**
- **Forwarders**
- **Warehouses**
- **Agents**

Aquests seran **filtres sobre la mateixa entitat** (`contacts`) i **no** entitats separades:

- “Suppliers” = `contacts` on `type = 'supplier'`
- “Forwarders” = `contacts` on `type = 'freight_forwarder'`
- “Warehouses” = `contacts` on `type = 'warehouse'`

Aquest enfocament evita duplicar UI i lògica per a cada tipus de partner.

---

## Migration strategy

L’estat actual de FREEDOLIAPP inclou un mòdul de **Suppliers** separat.  
La direcció futura és:

- `suppliers` → `contacts` on `type = 'supplier'`

Principis de migració:

- **cap migració en la fase V1 immediata**: la migració es planificarà després d’estabilitzar V1;
- quan es faci:
  - es maparà cada registre existent de `suppliers` a un registre de `contacts` amb `type = 'supplier'`;
  - es revisaran les claus foranes perquè apuntin a `contacts.id` en lloc de `suppliers.id`;
  - s’assegurarà que no es perden dades de contacte (emails, telèfons, notes).

En una fase posterior, altres taules especialitzades (`forwarders`, `warehouses`, etc.) podran seguir el mateix patró fins que `contacts` esdevingui la **font única de veritat** per a partners externs.

---

## Roadmap status

Aquesta funcionalitat està:

- **Planificada però NO implementada**.

Estat en el roadmap:

- forma part del **backlog post-V1** com a línia estratègica per:
  - reduir duplicació de models,
  - millorar consistència de dades de contactes,
  - facilitar integracions amb tercers.

La implementació només s’ha de començar després de:

- estabilització de V1,
- proves internes completes,
- primers onboarding de clients reals.

---

## Important rule

El model de dades canònic de FREEDOLIAPP **no s’ha d’adaptar als sistemes externs**.

- Connectors, imports i migracions han de **mapar** les dades externes cap al model de `contacts`.
- No s’han de dissenyar estructures noves només per encaixar amb un ERP, CRM o full de càlcul extern.

La regla és:

> Els sistemes externs s’adapten al model canònic de FREEDOLIAPP.  
> FREEDOLIAPP no muta el seu model canònic per cada integració.

Això garanteix que el model de `contacts` es manté estable en el temps i pot servir com a base per:

- reporting coherent,
- automatitzacions,
- integracions futures,
- funcionalitats avançades de relació amb partners.

