-- ============================================
-- ADD demo_mode TO company_settings
-- ============================================
-- Aquest script afegeix la columna demo_mode a company_settings
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='company_settings' AND column_name='demo_mode') THEN
    ALTER TABLE company_settings ADD COLUMN demo_mode boolean DEFAULT false;
    RAISE NOTICE 'Columna demo_mode afegida a company_settings';
  ELSE
    RAISE NOTICE 'Columna demo_mode ja existeix a company_settings';
  END IF;
END $$;

