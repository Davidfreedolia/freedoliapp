-- ============================================
-- SETUP AUTENTICACIÓ SUPABASE AUTH + RLS (V3)
-- ============================================
-- IMPORTANT: AQUEST ÉS EL FITXER SQL (.sql)
-- NO COPIEU EL FITXER .md (markdown)
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors
-- Executar aquest script al SQL Editor de Supabase
-- Pas a pas: Dashboard > SQL Editor > New Query > Pega aquest codi > Run

-- ============================================
-- 1. AFEGIR COLUMNA user_id SI NO EXISTEIX
-- ============================================

-- Projects
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='user_id') THEN
    ALTER TABLE projects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Suppliers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='suppliers' AND column_name='user_id') THEN
    ALTER TABLE suppliers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Purchase Orders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='purchase_orders' AND column_name='user_id') THEN
    ALTER TABLE purchase_orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Documents
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='documents' AND column_name='user_id') THEN
    ALTER TABLE documents ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Payments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='payments' AND column_name='user_id') THEN
    ALTER TABLE payments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Warehouses
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='warehouses' AND column_name='user_id') THEN
    ALTER TABLE warehouses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Company Settings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='company_settings' AND column_name='user_id') THEN
    ALTER TABLE company_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Briefings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='briefings' AND column_name='user_id') THEN
    ALTER TABLE briefings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Expenses
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='expenses' AND column_name='user_id') THEN
    ALTER TABLE expenses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Incomes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='incomes' AND column_name='user_id') THEN
    ALTER TABLE incomes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Signatures
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='signatures' AND column_name='user_id') THEN
    ALTER TABLE signatures ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 2. MIGRACIÓ: ASSIGNAR user_id NULL AL PRIMER USUARI
-- ============================================
-- Això assigna totes les files sense user_id al primer usuari creat a auth.users

DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Obtenir el primer usuari (més antic)
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  -- Si no hi ha usuaris, llançar error
  IF first_user_id IS NULL THEN
    RAISE EXCEPTION 'No hi ha usuaris a auth.users. Crea almenys un usuari primer.';
  END IF;
  
  -- Assignar user_id a totes les files NULL
  UPDATE projects SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE suppliers SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE purchase_orders SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE documents SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE payments SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE warehouses SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE company_settings SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE briefings SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE expenses SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE incomes SET user_id = first_user_id WHERE user_id IS NULL;
  UPDATE signatures SET user_id = first_user_id WHERE user_id IS NULL;
  
  RAISE NOTICE 'Migració completada: totes les files sense user_id han estat assignades al primer usuari (%)', first_user_id;
END $$;

-- ============================================
-- 3. APLICAR DEFAULT auth.uid() I NOT NULL
-- ============================================

-- Projects
ALTER TABLE projects 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Suppliers
ALTER TABLE suppliers 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Purchase Orders
ALTER TABLE purchase_orders 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Documents
ALTER TABLE documents 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Payments
ALTER TABLE payments 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Warehouses
ALTER TABLE warehouses 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Company Settings
ALTER TABLE company_settings 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Briefings
ALTER TABLE briefings 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Expenses
ALTER TABLE expenses 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Incomes
ALTER TABLE incomes 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Signatures
ALTER TABLE signatures 
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- 4. CREAR ÍNDEXS (IDEMPOTENT)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signatures(user_id);

-- ============================================
-- 5. HABILITAR RLS (IDEMPOTENT)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREAR/ACTUALITZAR POLÍTIQUES RLS
-- ============================================

-- Projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Suppliers
DROP POLICY IF EXISTS "Users can view own suppliers" ON suppliers;
CREATE POLICY "Users can view own suppliers" ON suppliers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own suppliers" ON suppliers;
CREATE POLICY "Users can insert own suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own suppliers" ON suppliers;
CREATE POLICY "Users can update own suppliers" ON suppliers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own suppliers" ON suppliers;
CREATE POLICY "Users can delete own suppliers" ON suppliers
  FOR DELETE USING (auth.uid() = user_id);

-- Purchase Orders
DROP POLICY IF EXISTS "Users can view own purchase_orders" ON purchase_orders;
CREATE POLICY "Users can view own purchase_orders" ON purchase_orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purchase_orders" ON purchase_orders;
CREATE POLICY "Users can insert own purchase_orders" ON purchase_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own purchase_orders" ON purchase_orders;
CREATE POLICY "Users can update own purchase_orders" ON purchase_orders
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own purchase_orders" ON purchase_orders;
CREATE POLICY "Users can delete own purchase_orders" ON purchase_orders
  FOR DELETE USING (auth.uid() = user_id);

-- Documents
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- Payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payments" ON payments;
CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON payments;
CREATE POLICY "Users can update own payments" ON payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payments" ON payments;
CREATE POLICY "Users can delete own payments" ON payments
  FOR DELETE USING (auth.uid() = user_id);

-- Warehouses
DROP POLICY IF EXISTS "Users can view own warehouses" ON warehouses;
CREATE POLICY "Users can view own warehouses" ON warehouses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own warehouses" ON warehouses;
CREATE POLICY "Users can insert own warehouses" ON warehouses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own warehouses" ON warehouses;
CREATE POLICY "Users can update own warehouses" ON warehouses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own warehouses" ON warehouses;
CREATE POLICY "Users can delete own warehouses" ON warehouses
  FOR DELETE USING (auth.uid() = user_id);

-- Company Settings
DROP POLICY IF EXISTS "Users can view own company_settings" ON company_settings;
CREATE POLICY "Users can view own company_settings" ON company_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own company_settings" ON company_settings;
CREATE POLICY "Users can insert own company_settings" ON company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own company_settings" ON company_settings;
CREATE POLICY "Users can update own company_settings" ON company_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own company_settings" ON company_settings;
CREATE POLICY "Users can delete own company_settings" ON company_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Briefings
DROP POLICY IF EXISTS "Users can view own briefings" ON briefings;
CREATE POLICY "Users can view own briefings" ON briefings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own briefings" ON briefings;
CREATE POLICY "Users can insert own briefings" ON briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own briefings" ON briefings;
CREATE POLICY "Users can update own briefings" ON briefings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own briefings" ON briefings;
CREATE POLICY "Users can delete own briefings" ON briefings
  FOR DELETE USING (auth.uid() = user_id);

-- Expenses
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Incomes
DROP POLICY IF EXISTS "Users can view own incomes" ON incomes;
CREATE POLICY "Users can view own incomes" ON incomes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own incomes" ON incomes;
CREATE POLICY "Users can insert own incomes" ON incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own incomes" ON incomes;
CREATE POLICY "Users can update own incomes" ON incomes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own incomes" ON incomes;
CREATE POLICY "Users can delete own incomes" ON incomes
  FOR DELETE USING (auth.uid() = user_id);

-- Signatures
DROP POLICY IF EXISTS "Users can view own signatures" ON signatures;
CREATE POLICY "Users can view own signatures" ON signatures
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own signatures" ON signatures;
CREATE POLICY "Users can insert own signatures" ON signatures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own signatures" ON signatures;
CREATE POLICY "Users can update own signatures" ON signatures
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own signatures" ON signatures;
CREATE POLICY "Users can delete own signatures" ON signatures
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FI DEL SCRIPT
-- ============================================
-- Aquest script és IDEMPOTENT: es pot executar múltiples vegades sense errors.

