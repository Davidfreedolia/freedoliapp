-- ============================================
-- REAL MODE SAFETY MIGRATION
-- ============================================
-- This migration ensures complete separation between demo and real data:
-- 1. Ensures all tables have is_demo NOT NULL DEFAULT false
-- 2. Fixes SKU uniqueness to be scoped by (user_id, is_demo, sku)
-- 3. Adds performance indexes
-- 4. Ensures RLS policies are correct
-- Script IDEMPOTENT: Safe to run multiple times

DO $$ 
BEGIN
  -- ============================================
  -- PART A: ADD is_demo COLUMN WHERE MISSING
  -- ============================================
  
  -- Projects
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='projects' AND column_name='is_demo') THEN
      ALTER TABLE projects ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a projects';
    END IF;
  END IF;

  -- Purchase Orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_orders' AND column_name='is_demo') THEN
      ALTER TABLE purchase_orders ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a purchase_orders';
    END IF;
  END IF;

  -- Suppliers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='suppliers' AND column_name='is_demo') THEN
      ALTER TABLE suppliers ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a suppliers';
    END IF;
  END IF;

  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expenses' AND column_name='is_demo') THEN
      ALTER TABLE expenses ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a expenses';
    END IF;
  END IF;

  -- Incomes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incomes' AND column_name='is_demo') THEN
      ALTER TABLE incomes ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a incomes';
    END IF;
  END IF;

  -- Tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='is_demo') THEN
      ALTER TABLE tasks ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a tasks';
    END IF;
  END IF;

  -- Sticky Notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sticky_notes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sticky_notes' AND column_name='is_demo') THEN
      ALTER TABLE sticky_notes ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a sticky_notes';
    END IF;
  END IF;

  -- Recurring Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recurring_expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recurring_expenses' AND column_name='is_demo') THEN
      ALTER TABLE recurring_expenses ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a recurring_expenses';
    END IF;
  END IF;

  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payments' AND column_name='is_demo') THEN
      ALTER TABLE payments ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a payments';
    END IF;
  END IF;

  -- Warehouses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='warehouses' AND column_name='is_demo') THEN
      ALTER TABLE warehouses ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a warehouses';
    END IF;
  END IF;

  -- Supplier Quotes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='supplier_quotes' AND column_name='is_demo') THEN
      ALTER TABLE supplier_quotes ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a supplier_quotes';
    END IF;
  END IF;

  -- Supplier Price Estimates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_price_estimates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='supplier_price_estimates' AND column_name='is_demo') THEN
      ALTER TABLE supplier_price_estimates ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a supplier_price_estimates';
    END IF;
  END IF;

  -- Product Identifiers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_identifiers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='product_identifiers' AND column_name='is_demo') THEN
      ALTER TABLE product_identifiers ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a product_identifiers';
    END IF;
  END IF;

  -- GTIN Pool
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='gtin_pool') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='gtin_pool' AND column_name='is_demo') THEN
      ALTER TABLE gtin_pool ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a gtin_pool';
    END IF;
  END IF;

  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='documents' AND column_name='is_demo') THEN
      ALTER TABLE documents ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a documents';
    END IF;
  END IF;

  -- Audit Log (optional, but good to have)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_log') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='audit_log' AND column_name='is_demo') THEN
      ALTER TABLE audit_log ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a audit_log';
    END IF;
  END IF;

  -- Dashboard Preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dashboard_preferences') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='dashboard_preferences' AND column_name='is_demo') THEN
      ALTER TABLE dashboard_preferences ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a dashboard_preferences';
    END IF;
  END IF;

  -- PO Amazon Readiness
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_amazon_readiness') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='po_amazon_readiness' AND column_name='is_demo') THEN
      ALTER TABLE po_amazon_readiness ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a po_amazon_readiness';
    END IF;
  END IF;

  -- PO Shipments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_shipments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='po_shipments' AND column_name='is_demo') THEN
      ALTER TABLE po_shipments ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a po_shipments';
    END IF;
  END IF;

  -- Logistics Flow
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='logistics_flow') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='logistics_flow' AND column_name='is_demo') THEN
      ALTER TABLE logistics_flow ADD COLUMN is_demo boolean DEFAULT false NOT NULL;
      RAISE NOTICE 'Columna is_demo afegida a logistics_flow';
    END IF;
  END IF;

END $$;

-- ============================================
-- PART B: UPDATE NULL is_demo VALUES TO false
-- ============================================
-- Only update if table exists and column exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='is_demo') THEN
    UPDATE projects SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='purchase_orders') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='is_demo') THEN
    UPDATE purchase_orders SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='suppliers') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='is_demo') THEN
    UPDATE suppliers SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='is_demo') THEN
    UPDATE expenses SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='is_demo') THEN
    UPDATE incomes SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='tasks') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='is_demo') THEN
    UPDATE tasks SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sticky_notes') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticky_notes' AND column_name='is_demo') THEN
    UPDATE sticky_notes SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recurring_expenses') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recurring_expenses' AND column_name='is_demo') THEN
    UPDATE recurring_expenses SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payments') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='is_demo') THEN
    UPDATE payments SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='warehouses') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='is_demo') THEN
    UPDATE warehouses SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_quotes') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_quotes' AND column_name='is_demo') THEN
    UPDATE supplier_quotes SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='supplier_price_estimates') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_price_estimates' AND column_name='is_demo') THEN
    UPDATE supplier_price_estimates SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='product_identifiers') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_identifiers' AND column_name='is_demo') THEN
    UPDATE product_identifiers SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='gtin_pool') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gtin_pool' AND column_name='is_demo') THEN
    UPDATE gtin_pool SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='documents') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_demo') THEN
    UPDATE documents SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_log') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_log' AND column_name='is_demo') THEN
    UPDATE audit_log SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='dashboard_preferences') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dashboard_preferences' AND column_name='is_demo') THEN
    UPDATE dashboard_preferences SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_amazon_readiness') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_amazon_readiness' AND column_name='is_demo') THEN
    UPDATE po_amazon_readiness SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='po_shipments') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='po_shipments' AND column_name='is_demo') THEN
    UPDATE po_shipments SET is_demo = false WHERE is_demo IS NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='logistics_flow') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_flow' AND column_name='is_demo') THEN
    UPDATE logistics_flow SET is_demo = false WHERE is_demo IS NULL;
  END IF;
END $$;

-- ============================================
-- PART C: ENSURE is_demo IS NOT NULL
-- ============================================
DO $$ 
BEGIN
  -- Projects
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='projects' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE projects ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE projects ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on projects';
  END IF;

  -- Purchase Orders
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='purchase_orders' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE purchase_orders ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE purchase_orders ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on purchase_orders';
  END IF;

  -- Suppliers
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='suppliers' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE suppliers ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE suppliers ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on suppliers';
  END IF;

  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='expenses' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE expenses ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE expenses ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on expenses';
  END IF;

  -- Incomes
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='incomes' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE incomes ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE incomes ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on incomes';
  END IF;

  -- Tasks
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='tasks' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE tasks ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE tasks ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on tasks';
  END IF;

  -- Sticky Notes
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='sticky_notes' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE sticky_notes ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE sticky_notes ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on sticky_notes';
  END IF;

  -- Recurring Expenses
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='recurring_expenses' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE recurring_expenses ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE recurring_expenses ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on recurring_expenses';
  END IF;

  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='payments' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE payments ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE payments ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on payments';
  END IF;

  -- Warehouses
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='warehouses' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE warehouses ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE warehouses ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on warehouses';
  END IF;

  -- Supplier Quotes
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='supplier_quotes' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE supplier_quotes ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE supplier_quotes ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on supplier_quotes';
  END IF;

  -- Supplier Price Estimates
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='supplier_price_estimates' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE supplier_price_estimates ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE supplier_price_estimates ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on supplier_price_estimates';
  END IF;

  -- Product Identifiers
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='product_identifiers' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE product_identifiers ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE product_identifiers ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on product_identifiers';
  END IF;

  -- GTIN Pool
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='gtin_pool' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE gtin_pool ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE gtin_pool ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on gtin_pool';
  END IF;

  -- Documents
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='documents' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE documents ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE documents ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on documents';
  END IF;

  -- Audit Log
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='audit_log' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE audit_log ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE audit_log ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on audit_log';
  END IF;

  -- Dashboard Preferences
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='dashboard_preferences' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE dashboard_preferences ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE dashboard_preferences ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on dashboard_preferences';
  END IF;

  -- PO Amazon Readiness
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='po_amazon_readiness' AND column_name='is_demo' AND is_nullable='YES') THEN
    ALTER TABLE po_amazon_readiness ALTER COLUMN is_demo SET NOT NULL;
    ALTER TABLE po_amazon_readiness ALTER COLUMN is_demo SET DEFAULT false;
    RAISE NOTICE 'is_demo set to NOT NULL on po_amazon_readiness';
  END IF;

END $$;

-- ============================================
-- PART D: FIX SKU UNIQUENESS CONSTRAINT
-- ============================================
-- Drop existing global SKU constraint if it exists
DO $$ 
BEGIN
  -- Check if there's a constraint on sku alone (not scoped by user_id, is_demo)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%sku%' 
    AND conrelid = 'projects'::regclass
    AND array_length(conkey, 1) = 1
  ) THEN
    -- Find and drop the constraint
    DECLARE
      constraint_name text;
    BEGIN
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'projects'::regclass
      AND conname LIKE '%sku%'
      AND array_length(conkey, 1) = 1
      LIMIT 1;
      
      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE projects DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped old SKU constraint: %', constraint_name;
      END IF;
    END;
  END IF;
END $$;

-- Create scoped uniqueness constraint: (user_id, is_demo, sku)
-- Use DROP IF EXISTS first, then CREATE to ensure clean state
DO $$ 
BEGIN
  -- Drop index if it exists (to handle any previous partial creation)
  DROP INDEX IF EXISTS idx_projects_sku_scoped;
  RAISE NOTICE 'Dropped existing idx_projects_sku_scoped if it existed';
  
  -- Create the index (will fail silently if already exists due to DROP above)
  BEGIN
    CREATE UNIQUE INDEX idx_projects_sku_scoped ON projects(user_id, is_demo, sku) 
    WHERE sku IS NOT NULL;
    RAISE NOTICE 'Created scoped SKU uniqueness constraint';
  EXCEPTION
    WHEN duplicate_table THEN
      RAISE NOTICE 'Index idx_projects_sku_scoped already exists (unexpected), skipping';
    WHEN OTHERS THEN
      -- If error code is 42P07 (duplicate relation), it's OK
      IF SQLSTATE = '42P07' THEN
        RAISE NOTICE 'Index idx_projects_sku_scoped already exists, skipping';
      ELSE
        RAISE NOTICE 'Error creating index idx_projects_sku_scoped: %', SQLERRM;
      END IF;
  END;
END $$;

-- ============================================
-- PART E: ADD PERFORMANCE INDEXES
-- ============================================
-- Indexes for (user_id, is_demo) queries
CREATE INDEX IF NOT EXISTS idx_projects_user_demo ON projects(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_projects_user_demo_created ON projects(user_id, is_demo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_demo ON purchase_orders(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_demo ON suppliers(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_expenses_user_demo ON expenses(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_incomes_user_demo ON incomes(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_tasks_user_demo ON tasks(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_demo ON recurring_expenses(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_payments_user_demo ON payments(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_gtin_pool_user_demo ON gtin_pool(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_gtin_pool_user_demo_code ON gtin_pool(user_id, is_demo, gtin_code);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_user_demo ON product_identifiers(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_documents_user_demo ON documents(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_po_shipments_user_demo ON po_shipments(user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_logistics_flow_user_demo ON logistics_flow(user_id, is_demo);

-- ============================================
-- PART F: FIX RLS POLICIES
-- ============================================
-- Ensure proper INSERT policies for all tables

DO $$ 
BEGIN
  -- gtin_pool INSERT policy
  DROP POLICY IF EXISTS "Users can insert own gtin pool" ON gtin_pool;
  CREATE POLICY "Users can insert own gtin pool" ON gtin_pool
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE 'Fixed gtin_pool INSERT policy';

  -- sticky_notes INSERT policy
  DROP POLICY IF EXISTS "Users can insert own sticky notes" ON sticky_notes;
  CREATE POLICY "Users can insert own sticky notes" ON sticky_notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE 'Fixed sticky_notes INSERT policy';

  -- recurring_expenses SELECT policy (ensure it allows filtering by is_demo)
  DROP POLICY IF EXISTS "Users can view own recurring expenses" ON recurring_expenses;
  CREATE POLICY "Users can view own recurring expenses" ON recurring_expenses
    FOR SELECT
    USING (auth.uid() = user_id);
  RAISE NOTICE 'Fixed recurring_expenses SELECT policy';

  -- recurring_expenses INSERT policy
  DROP POLICY IF EXISTS "Users can insert own recurring expenses" ON recurring_expenses;
  CREATE POLICY "Users can insert own recurring expenses" ON recurring_expenses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE 'Fixed recurring_expenses INSERT policy';

END $$;

