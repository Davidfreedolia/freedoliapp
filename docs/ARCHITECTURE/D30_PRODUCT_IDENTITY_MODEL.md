# D30 — Product Identity Model

Status: Draft

---

## 1 Core Principle

Freedoliapp separates product identity into three layers:

- **product**
- **variant**
- **bundle**

---

## 2 Product

Represents the global product concept.

Examples:

- Garlic Press
- Velvet Hangers
- Storage Bag

Fields discussed conceptually:

- product_id
- name
- brand
- category

---

## 3 Variant

Represents sellable variations.

Examples:

- color
- size
- material
- pack size

Variants may have:

- GTIN / EAN
- SKU
- marketplace identifiers

---

## 4 Bundle

Represents combinations of variants.

Examples:

- 3-pack bundle
- kitchen kit
- Amazon bundle

Bundles may:

- reference multiple variants
- be assembled by supplier
- be assembled by warehouse
- be assembled by forwarder

---

## 5 Marketplace Mapping

Define how variants map to:

- Amazon ASIN
- Shopify product variants
- eBay listings
- other channels

---

## 6 Architecture Rules

- Product identity must remain platform-agnostic
- Marketplaces attach identifiers but do not define identity
- Bundles are compositions, not new base products

---

## 7 Future compatibility

This model must support:

- multi-channel commerce
- bundles and kits
- assembly operations
- supplier diversity

---

## 8 Canonical Entities

### Product

Represents the global product concept independent of marketplace.

Example:

Garlic Press

Typical conceptual fields:

- product_id
- org_id
- name
- brand
- category
- description

Rules:

- product identity is marketplace-agnostic
- a product may have multiple variants
- a product may participate in bundles

---

### Variant

Represents a sellable variation of a product.

Examples:

- color variant
- size variant
- material variant
- pack-size variant

Typical conceptual fields:

- variant_id
- product_id
- sku
- gtin / ean
- attributes (color, size, etc)

Rules:

- variants inherit the product identity
- GTIN/EAN normally belongs to variants
- variants are the unit tracked in inventory

---

### Bundle

Represents a composition of variants.

Examples:

- 3 pack garlic press set
- kitchen kit
- Amazon bundle

Typical conceptual fields:

- bundle_id
- name
- bundle_type (kit / pack / assembly)

Bundles are defined as:

bundle → multiple bundle components

Each component references a variant.

---

### Bundle Components

Conceptual structure:

bundle_component

Fields:

- bundle_id
- variant_id
- quantity

Rules:

- bundles do not create new product identity
- bundles reference existing variants
- bundles may be assembled by supplier or warehouse

---

## 9 Marketplace Identity Layer

Marketplaces attach their own identifiers to variants.

Examples:

Amazon:

- ASIN

Shopify:

- product_variant_id

eBay:

- listing_id

Rule:

Marketplace identifiers must map to variants, not products.

---

## 10 Architecture Constraints

1. Product identity must remain marketplace-independent.
2. Variants represent the true sellable unit.
3. Inventory tracking must operate at variant level.
4. Bundles must reference variants and never duplicate product definitions.

---

## 11 Future Schema Evolution

This document will guide future phases:

- D30.3 — Product Identity Schema Migration
- D31 — Inventory Ledger Architecture

---
