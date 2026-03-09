# D29 — Global Supply Network Model

Status: DRAFT

## 1 Objective

Define how FREEDOLIAPP supports global commerce across multiple regions while allowing sellers to diversify supply sources.

The system must support:

- selling in multiple regions
- sourcing products from different regions
- fulfilling orders from different locations

This model prepares the system for future supply chain disruptions and regional trade changes.

---

## 2 Core concept

Commerce operations involve three independent layers:

Sell  
Source  
Fulfill

Each layer may operate in different regions.

---

## 3 Sell layer

Represents where the product is sold.

Examples:

- Amazon EU
- Amazon US
- Shopify EU
- Shopify US
- eBay marketplace

Sales channels generate:

- orders
- revenue
- returns
- customer data

---

## 4 Source layer

Represents where the product is produced or purchased.

Examples:

- Chinese manufacturer
- EU manufacturer
- US manufacturer
- Alibaba suppliers
- regional distributors

Source data includes:

- product cost
- MOQ
- lead times
- purchase orders

---

## 5 Fulfillment layer

Represents where the product is shipped from.

Examples:

- Amazon FBA warehouses
- third-party logistics (3PL)
- regional warehouses
- dropshipping suppliers

Fulfillment nodes manage:

- inventory
- shipping operations
- delivery time

---

## 6 Regional independence

Each layer may operate in a different region.

Example scenario:

Product supply  
Manufacturer: China

Fulfillment  
Warehouse: Germany

Sales channel  
Amazon EU

Another scenario:

Product supply  
Manufacturer: Poland

Fulfillment  
3PL Texas

Sales channel  
Amazon US

---

## 7 Canonical integration

All operational data must normalize into canonical entities:

- suppliers
- purchase_orders
- inventory
- inventory_movements
- sales
- ledger

Engines operate only on canonical data.

---

## 8 System advantage

This model allows:

- regional supply diversification
- near-shoring strategies
- multi-market sales
- resilience against trade disruptions

---

## 9 UX implication

Users should be able to:

- connect sales channels
- register supply sources
- define fulfillment nodes

Without being exposed to unnecessary complexity.

The system may group these concepts under simple UI flows.

---

## 10 Definition of done

- global supply architecture documented
- sell/source/fulfill model defined
- regional flexibility defined
- no code changes

---

## 11 Current implementation status

- D29.1 model conceptual documentat
- D29.2 data contract documentat
- D29.3 schema migration implementada
- estructures base de supply network creades
- cap engine modificat encara
- cap frontend nou encara

---

## 12 Implemented schema scope

La implementació actual cobreix només la capa estructural base de:

- `supply_origins`
- `supply_destinations`
- `supply_routes`
- `supplier_origin_links`

Aquesta capa prepara el sistema per:

- lead times per ruta
- orígens múltiples
- destinacions múltiples
- relació supplier → origin

Sense activar encara càlculs nous als engines.

---
