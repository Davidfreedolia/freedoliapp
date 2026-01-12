-- ============================================
-- FIX FINANCE_CATEGORIES RLS POLICIES
-- ============================================
-- Asegura que las políticas RLS permitan crear categorías correctamente
-- Script IDEMPOTENT: Se puede ejecutar múltiples veces sin errores

DO $$
BEGIN
  -- Verificar que la tabla existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='finance_categories') THEN
    
    -- Habilitar RLS si no está habilitado
    ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
    
    -- Eliminar políticas existentes para recrearlas correctamente
    DROP POLICY IF EXISTS "Users can view own categories" ON finance_categories;
    DROP POLICY IF EXISTS "Users can insert own categories" ON finance_categories;
    DROP POLICY IF EXISTS "Users can update own categories" ON finance_categories;
    DROP POLICY IF EXISTS "Users can delete own categories" ON finance_categories;
    DROP POLICY IF EXISTS "Users can manage own finance categories" ON finance_categories;
    
    -- Crear políticas específicas para cada operación
    -- SELECT: usuarios pueden ver sus propias categorías y las del sistema
    CREATE POLICY "Users can view own categories" ON finance_categories
      FOR SELECT 
      USING (
        auth.uid() = user_id 
        OR is_system = true
      );
    
    -- INSERT: usuarios pueden crear categorías propias
    CREATE POLICY "Users can insert own categories" ON finance_categories
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    
    -- UPDATE: usuarios pueden actualizar sus propias categorías (no del sistema)
    CREATE POLICY "Users can update own categories" ON finance_categories
      FOR UPDATE 
      USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL))
      WITH CHECK (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));
    
    -- DELETE: usuarios pueden eliminar sus propias categorías (no del sistema)
    CREATE POLICY "Users can delete own categories" ON finance_categories
      FOR DELETE 
      USING (auth.uid() = user_id AND (is_system = false OR is_system IS NULL));
    
    RAISE NOTICE 'Políticas RLS actualizadas para finance_categories';
  ELSE
    RAISE NOTICE 'Tabla finance_categories no existe, saltando actualización de políticas';
  END IF;
END $$;
