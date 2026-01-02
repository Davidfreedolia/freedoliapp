-- ============================================
-- FIX NULL is_demo VALUES
-- ============================================
-- Aquest script:
-- 1. Afegeix la columna is_demo a les taules que no la tenen
-- 2. Actualitza els valors NULL a false (dades reals)
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

DO $$ 
BEGIN
  -- Afegir columna is_demo a les taules que no la tenen
  
  -- Projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='is_demo') THEN
      ALTER TABLE projects ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a projects';
    END IF;
  END IF;

  -- Purchase Orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_orders' AND column_name='is_demo') THEN
      ALTER TABLE purchase_orders ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a purchase_orders';
    END IF;
  END IF;

  -- Suppliers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='suppliers' AND column_name='is_demo') THEN
      ALTER TABLE suppliers ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a suppliers';
    END IF;
  END IF;

  -- Expenses (ja pot existir per add_is_demo_to_finances.sql)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expenses' AND column_name='is_demo') THEN
      ALTER TABLE expenses ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a expenses';
    END IF;
  END IF;

  -- Incomes (ja pot existir per add_is_demo_to_finances.sql)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incomes' AND column_name='is_demo') THEN
      ALTER TABLE incomes ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a incomes';
    END IF;
  END IF;

  -- Tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='is_demo') THEN
      ALTER TABLE tasks ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a tasks';
    END IF;
  END IF;

  -- Sticky Notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sticky_notes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sticky_notes' AND column_name='is_demo') THEN
      ALTER TABLE sticky_notes ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a sticky_notes';
    END IF;
  END IF;

  -- Recurring Expenses (ja pot existir per add_is_demo_to_finances.sql)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recurring_expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recurring_expenses' AND column_name='is_demo') THEN
      ALTER TABLE recurring_expenses ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a recurring_expenses';
    END IF;
  END IF;

  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='is_demo') THEN
      ALTER TABLE payments ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a payments';
    END IF;
  END IF;

  -- Warehouses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='is_demo') THEN
      ALTER TABLE warehouses ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a warehouses';
    END IF;
  END IF;

  -- Supplier Quotes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='supplier_quotes' AND column_name='is_demo') THEN
      ALTER TABLE supplier_quotes ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a supplier_quotes';
    END IF;
  END IF;

  -- Supplier Price Estimates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_price_estimates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='supplier_price_estimates' AND column_name='is_demo') THEN
      ALTER TABLE supplier_price_estimates ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a supplier_price_estimates';
    END IF;
  END IF;

  -- Product Identifiers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_identifiers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='product_identifiers' AND column_name='is_demo') THEN
      ALTER TABLE product_identifiers ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a product_identifiers';
    END IF;
  END IF;

  -- GTIN Pool
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='gtin_pool') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='gtin_pool' AND column_name='is_demo') THEN
      ALTER TABLE gtin_pool ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a gtin_pool';
    END IF;
  END IF;

  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documents' AND column_name='is_demo') THEN
      ALTER TABLE documents ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a documents';
    END IF;
  END IF;

END $$;

-- Ara actualitzar els valors NULL a false (només si la columna existeix)
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

