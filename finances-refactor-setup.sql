-- ============================================
-- FINANCES REFACTOR SETUP
-- ============================================
-- Sistema de finances per comptables: Ledger únic, categories editables, views guardades
-- Amazon-first, sense doble partida completa

-- ============================================
-- 1. TAULA FINANCE_CATEGORIES (categories editables)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  parent_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
  color text DEFAULT '#6b7280',
  icon text,
  is_system boolean DEFAULT false, -- Categories del sistema no es poden eliminar
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_user_type ON finance_categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent ON finance_categories(parent_id);

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own categories" ON finance_categories;
CREATE POLICY "Users can view own categories" ON finance_categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON finance_categories;
CREATE POLICY "Users can insert own categories" ON finance_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON finance_categories;
CREATE POLICY "Users can update own categories" ON finance_categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON finance_categories;
CREATE POLICY "Users can delete own categories" ON finance_categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- ============================================
-- 2. TAULA FINANCE_VIEWS (vistes guardades)
-- ============================================
CREATE TABLE IF NOT EXISTS finance_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb DEFAULT '{}', -- {project_id, category_id, date_from, date_to, search, etc}
  columns jsonb DEFAULT '[]', -- Columnes visibles
  sort_by text DEFAULT 'date',
  sort_order text DEFAULT 'desc',
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_finance_views_user ON finance_views(user_id);

ALTER TABLE finance_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own views" ON finance_views;
CREATE POLICY "Users can view own views" ON finance_views
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own views" ON finance_views;
CREATE POLICY "Users can insert own views" ON finance_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own views" ON finance_views;
CREATE POLICY "Users can update own views" ON finance_views
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own views" ON finance_views;
CREATE POLICY "Users can delete own views" ON finance_views
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. AFEGIR category_id A EXPENSES I INCOMES
-- ============================================
-- Si ja existeix, no farà res
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL;

ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL;

-- Índexs per millorar consultes
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON incomes(category_id);

-- ============================================
-- 4. INSERTAR CATEGORIES PER DEFECTE (Amazon-first)
-- ============================================
-- Categories d'ingressos (Amazon-first)
INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Amazon Sales',
  'income',
  '#22c55e',
  'Package',
  true,
  1,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'income' AND name = 'Amazon Sales' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Amazon Reimbursements',
  'income',
  '#3b82f6',
  'DollarSign',
  true,
  2,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'income' AND name = 'Amazon Reimbursements' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Refunds',
  'income',
  '#f59e0b',
  'ArrowLeft',
  true,
  3,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'income' AND name = 'Refunds' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Other Income',
  'income',
  '#6b7280',
  'TrendingUp',
  true,
  4,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'income' AND name = 'Other Income' AND user_id = auth.uid()
);

-- Categories de despeses (Amazon-first)
INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Product Purchase (PO)',
  'expense',
  '#4f46e5',
  'ShoppingCart',
  true,
  1,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Product Purchase (PO)' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Shipping & Logistics',
  'expense',
  '#06b6d4',
  'Truck',
  true,
  2,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Shipping & Logistics' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Amazon Fees',
  'expense',
  '#ef4444',
  'Package',
  true,
  3,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Amazon Fees' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'PPC Advertising',
  'expense',
  '#ec4899',
  'Megaphone',
  true,
  4,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'PPC Advertising' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Samples & Testing',
  'expense',
  '#8b5cf6',
  'Package',
  true,
  5,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Samples & Testing' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Software & Tools',
  'expense',
  '#3b82f6',
  'Monitor',
  true,
  6,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Software & Tools' AND user_id = auth.uid()
);

INSERT INTO finance_categories (name, type, color, icon, is_system, sort_order, user_id)
SELECT 
  'Other Expenses',
  'expense',
  '#6b7280',
  'Receipt',
  true,
  7,
  auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories 
  WHERE type = 'expense' AND name = 'Other Expenses' AND user_id = auth.uid()
);





