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

-- Note: Other tables (tasks, purchase_orders, supplier_quotes, etc.) don't need is_demo
-- because they are linked to projects via foreign keys, so they can be deleted
-- by cascading from projects or by filtering by project_id IN (SELECT id FROM projects WHERE is_demo = true)

