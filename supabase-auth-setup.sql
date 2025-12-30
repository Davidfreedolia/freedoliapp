-- ============================================
-- SETUP AUTENTICACIÓ SUPABASE AUTH + RLS
-- ============================================
-- Executar aquest script al SQL Editor de Supabase
-- Pas a pas: Dashboard > SQL Editor > New Query > Pega aquest codi > Run

-- ============================================
-- 1. AFEGIR user_id A TOTES LES TAULES
-- ============================================

-- Projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Purchase Orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Warehouses
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Company Settings (ara per usuari)
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Briefings
ALTER TABLE briefings 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Inventory
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Inventory Movements
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Incomes
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Signatures
ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- 2. CREAR ÍNDEXS PER MILLORAR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_briefings_user_id ON briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signatures(user_id);

-- ============================================
-- 3. HABILITAR RLS A TOTES LES TAULES
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREAR POLÍTIQUES RLS
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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own briefings" ON briefings;
CREATE POLICY "Users can delete own briefings" ON briefings
  FOR DELETE USING (auth.uid() = user_id);

-- Inventory
DROP POLICY IF EXISTS "Users can view own inventory" ON inventory;
CREATE POLICY "Users can view own inventory" ON inventory
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory" ON inventory;
CREATE POLICY "Users can insert own inventory" ON inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory" ON inventory;
CREATE POLICY "Users can update own inventory" ON inventory
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inventory" ON inventory;
CREATE POLICY "Users can delete own inventory" ON inventory
  FOR DELETE USING (auth.uid() = user_id);

-- Inventory Movements
DROP POLICY IF EXISTS "Users can view own inventory_movements" ON inventory_movements;
CREATE POLICY "Users can view own inventory_movements" ON inventory_movements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own inventory_movements" ON inventory_movements;
CREATE POLICY "Users can insert own inventory_movements" ON inventory_movements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inventory_movements" ON inventory_movements;
CREATE POLICY "Users can update own inventory_movements" ON inventory_movements
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inventory_movements" ON inventory_movements;
CREATE POLICY "Users can delete own inventory_movements" ON inventory_movements
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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

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
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own signatures" ON signatures;
CREATE POLICY "Users can delete own signatures" ON signatures
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. ACTUALITZAR REGISTRES EXISTENTS (OPCIONAL)
-- ============================================
-- IMPORTANT: Això assigna tots els registres existents al primer usuari que es registri
-- Si tens dades existents, hauràs d'assignar-los manualment després de crear usuaris
-- O eliminar aquestes dades i començar de nou

-- Comentat per defecte - descomenta només si vols assignar dades existents a un usuari específic
/*
-- Canvia 'tu-email@example.com' pel teu email d'usuari de Supabase Auth
UPDATE projects SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE suppliers SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE purchase_orders SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE documents SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE payments SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE warehouses SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE company_settings SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE briefings SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE inventory SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE inventory_movements SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE expenses SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE incomes SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE signatures SET user_id = (SELECT id FROM auth.users WHERE email = 'tu-email@example.com' LIMIT 1) WHERE user_id IS NULL;
*/

-- ============================================
-- FI DEL SCRIPT
-- ============================================
-- Després d'executar aquest script:
-- 1. Configura Auth a Supabase Dashboard (veure SUPABASE_AUTH_SETUP.md)
-- 2. Actualitza el codi per incloure user_id en tots els INSERTs
-- 3. Prova l'autenticació en local

