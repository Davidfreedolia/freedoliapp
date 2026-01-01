-- ============================================
-- DEMO SEED SETUP: Add is_demo column to tables
-- ============================================
-- Script IDEMPOTENT: Adds is_demo column if it doesn't exist
-- This allows marking demo data for safe deletion

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- GTIN Pool
ALTER TABLE gtin_pool ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Sticky Notes
ALTER TABLE sticky_notes ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Product Identifiers (optional, for direct marking)
-- Note: Can also be deleted via project_id, but adding for clarity
ALTER TABLE product_identifiers ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Supplier Quotes (optional, for direct marking)
-- Note: Can also be deleted via project_id, but adding for clarity
ALTER TABLE supplier_quotes ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Purchase Orders (optional, for direct marking)
-- Note: Can also be deleted via project_id, but adding for clarity
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- Tasks (optional, for direct marking)
-- Note: Can also be deleted via entity_id, but adding for clarity
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- PO Shipments (optional, for direct marking)
-- Note: Can also be deleted via purchase_order_id, but adding for clarity
ALTER TABLE po_shipments ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

-- PO Amazon Readiness (optional, for direct marking)
-- Note: Can also be deleted via purchase_order_id, but adding for clarity
ALTER TABLE po_amazon_readiness ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false NOT NULL;

