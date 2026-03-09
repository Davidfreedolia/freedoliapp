# D31 — Inventory Ledger Architecture

Status: Draft

---

## 1 Core Principle

Inventory must be derived from movements, not stored as a mutable number.

Stock state must be computed from a ledger of movements.

---

## 2 Inventory Movements

Define the canonical movement record.

Examples of movement types:

- sale
- purchase_receipt
- transfer_out
- transfer_in
- assembly
- disassembly
- adjustment
- return

Each movement records:

- variant_id
- quantity_delta
- source
- reference_type
- reference_id
- timestamp

---

## 3 Ledger Model

Inventory state is derived as:

sum(quantity_delta)

over all movements for a variant.

---

## 4 Snapshots

To avoid heavy recomputation the system may store periodic snapshots.

Example:

inventory_snapshot_daily

Snapshots accelerate queries but do not replace the ledger.

---

## 5 Inventory State

Operational inventory queries should read from:

ledger + snapshots

not directly from external systems.

---

## 6 External Systems

External systems (Amazon, Shopify, warehouses) generate events.

These events create inventory movements.

External systems never define the canonical inventory state.

---

## 7 Architecture Rules

- inventory is append-only
- movements must be idempotent
- movements must be traceable to references
- stock state is derived, never manually overwritten

---

## 8 Future Compatibility

This model must support:

- bundles
- assemblies
- multi-warehouse
- multi-channel sales
- supply network lead times

---

## 9 Canonical Movement Entity

### inventory_movement

Conceptual structure:

Fields:

- movement_id
- org_id
- variant_id
- quantity_delta
- movement_type
- reference_type
- reference_id
- source_system
- created_at

Rules:

- `quantity_delta` may be positive or negative
- each movement must reference a variant
- movements must always be traceable to an origin event

---

## 10 Movement Types

Define the canonical movement types:

- sale
- purchase_receipt
- transfer_out
- transfer_in
- assembly
- disassembly
- adjustment
- return

Rules:

- sales always generate negative deltas
- purchase receipts generate positive deltas
- transfers must generate paired movements
- assemblies consume components and create bundles

---

## 11 Reference Layer

Each movement must be linked to a reference.

Examples:

- purchase_order
- shipment
- marketplace_order
- warehouse_operation
- manual_adjustment

Fields:

- reference_type
- reference_id

Purpose:

Traceability of inventory changes.

---

## 12 Source System

Define the origin of the event that generated the movement.

Examples:

- amazon
- shopify
- warehouse
- supplier
- system

Purpose:

Allow reconciliation and debugging.

---

## 13 Ledger Derivation

Inventory state is derived as:

sum(quantity_delta)

grouped by:

variant_id

and optionally by location in future phases.

---

## 14 Snapshot Layer

Define the concept of snapshots:

inventory_snapshot

Snapshots contain:

- variant_id
- quantity
- snapshot_date

Rules:

- snapshots accelerate queries
- snapshots never replace the ledger
- snapshots must be rebuildable from movements

---

## 15 Architecture Guarantees

The inventory system must guarantee:

- append-only movement log
- deterministic state derivation
- traceability of all stock changes
- compatibility with bundles and assemblies

---

## 16 Future Phases

This contract will guide:

- D31.3 — Inventory Ledger Schema
- D32 — Connector Strategy integration

---

## Inventory Ledger Schema Proposal

### inventory_movements

Define conceptual schema.

Fields:

- movement_id
- org_id
- variant_id
- quantity_delta
- movement_type
- reference_type
- reference_id
- source_system
- created_at

Constraints:

- quantity_delta cannot be zero
- movement_type must be one of the defined canonical types

Indexes:

- org_id
- variant_id
- created_at

---

### Movement Types

Canonical types:

- sale
- purchase_receipt
- transfer_out
- transfer_in
- assembly
- disassembly
- adjustment
- return

---

### Reference Layer

reference_type examples:

- purchase_order
- shipment
- marketplace_order
- warehouse_operation
- manual_adjustment

---

### Snapshot Table

Define conceptual structure:

inventory_snapshots

Fields:

- snapshot_id
- org_id
- variant_id
- quantity
- snapshot_date

Purpose:

Accelerate inventory queries without replacing the ledger.

---

### Architecture Rule

Inventory state must always be derivable from the movement ledger.

Snapshots are optimization only.

---

### Future phases

This schema will guide:

- D31.4 — Inventory Ledger Migration
- D32 — Decision Engine Architecture

---

## Current implementation status

- D31.1 architecture documented
- D31.2 data contract documented
- D31.3 schema proposal documented
- D31.4 migration implemented
- `inventory_snapshots` creada
- `inventory_movements` preservada i alineada de forma no destructiva
- cap engine modificat encara
- cap frontend modificat encara

---

## Implemented schema scope

### inventory_snapshots

- **Finalitat:** capa d’optimització per accelerar consultes d’inventari sense substituir el ledger.
- **Camps principals:** id, org_id, variant_id, quantity, snapshot_date, created_at.
- **Unicitat:** (org_id, variant_id, snapshot_date).
- **Ús:** capa d’optimització; l’estat es pot reconstruir des dels moviments.
- **No substitueix el ledger:** el ledger de moviments continua sent la font de veritat.

### inventory_movements

- La taula existent es manté com a font canònica de moviments.
- No s’ha recreat ni destruït.
- Només s’ha alineat si era segur (sense canvis destructius en aquesta fase).
- Queda preparada per derivació futura de l’estat d’inventari quan el model variant/ledger complet estigui desplegat.

---

## Architecture rule now enforced

- L’estat d’inventari s’ha de derivar del ledger.
- `inventory_snapshots` accelera consultes però no substitueix el ledger.
- Els sistemes externs no defineixen l’estat canònic d’inventari.
- Aquesta fase prepara futures integracions amb engines i decision layer.

---

## Definition of done

- architecture
- data contract
- schema proposal
- migration
- documentation updated

---
