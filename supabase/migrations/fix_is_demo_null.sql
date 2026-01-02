-- Fix NULL is_demo values: set to false (real data) for all existing records
-- This ensures demo mode separation works correctly

UPDATE projects SET is_demo = false WHERE is_demo IS NULL;
UPDATE purchase_orders SET is_demo = false WHERE is_demo IS NULL;
UPDATE suppliers SET is_demo = false WHERE is_demo IS NULL;
UPDATE expenses SET is_demo = false WHERE is_demo IS NULL;
UPDATE incomes SET is_demo = false WHERE is_demo IS NULL;
UPDATE tasks SET is_demo = false WHERE is_demo IS NULL;
UPDATE sticky_notes SET is_demo = false WHERE is_demo IS NULL;
UPDATE recurring_expenses SET is_demo = false WHERE is_demo IS NULL;
UPDATE payments SET is_demo = false WHERE is_demo IS NULL;
UPDATE warehouses SET is_demo = false WHERE is_demo IS NULL;
UPDATE supplier_quotes SET is_demo = false WHERE is_demo IS NULL;
UPDATE supplier_price_estimates SET is_demo = false WHERE is_demo IS NULL;
UPDATE product_identifiers SET is_demo = false WHERE is_demo IS NULL;
UPDATE gtin_pool SET is_demo = false WHERE is_demo IS NULL;
UPDATE documents SET is_demo = false WHERE is_demo IS NULL;

-- Ensure NOT NULL constraint (optional, but recommended)
-- ALTER TABLE projects ALTER COLUMN is_demo SET NOT NULL;
-- ALTER TABLE purchase_orders ALTER COLUMN is_demo SET NOT NULL;
-- (Apply to all tables if needed)

