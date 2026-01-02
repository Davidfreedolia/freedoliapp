-- ============================================
-- ADD is_demo TO FINANCE TABLES
-- ============================================
-- Aquest script afegeix la columna is_demo a expenses, incomes i recurring_expenses
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

DO $$ 
BEGIN
  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='expenses' AND column_name='is_demo') THEN
      ALTER TABLE expenses ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a expenses';
    END IF;
  END IF;

  -- Incomes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='incomes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='incomes' AND column_name='is_demo') THEN
      ALTER TABLE incomes ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a incomes';
    END IF;
  END IF;

  -- Recurring Expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='recurring_expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='recurring_expenses' AND column_name='is_demo') THEN
      ALTER TABLE recurring_expenses ADD COLUMN is_demo boolean DEFAULT false;
      RAISE NOTICE 'Columna is_demo afegida a recurring_expenses';
    END IF;
  END IF;
END $$;


