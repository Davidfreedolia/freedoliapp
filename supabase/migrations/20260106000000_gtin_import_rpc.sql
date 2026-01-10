-- ============================================
-- GTIN Import RPC Function
-- ============================================
-- Aquest script crea una funció RPC per importar GTINs sense errors 409
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- 1. Afegir columna deleted_at si no existeix
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='gtin_pool' AND column_name='deleted_at') THEN
    ALTER TABLE gtin_pool ADD COLUMN deleted_at timestamp with time zone;
    RAISE NOTICE 'Columna deleted_at afegida a gtin_pool';
  ELSE
    RAISE NOTICE 'Columna deleted_at ja existeix a gtin_pool';
  END IF;
END $$;

-- 2. Crear índex únic en (user_id, is_demo, gtin_code) si no existeix
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_gtin_pool_unique_user_demo_code'
  ) THEN
    CREATE UNIQUE INDEX idx_gtin_pool_unique_user_demo_code 
    ON gtin_pool(user_id, is_demo, gtin_code) 
    WHERE deleted_at IS NULL;
    RAISE NOTICE 'Índex únic creat: idx_gtin_pool_unique_user_demo_code';
  ELSE
    RAISE NOTICE 'Índex únic ja existeix: idx_gtin_pool_unique_user_demo_code';
  END IF;
END $$;

-- 3. Crear funció RPC import_gtins
CREATE OR REPLACE FUNCTION public.import_gtins(
  p_codes text[],
  p_gtin_type text,
  p_notes text DEFAULT NULL,
  p_is_demo boolean DEFAULT false
)
RETURNS TABLE(
  inserted_count integer,
  restored_count integer,
  skipped_count integer,
  error_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_code text;
  v_inserted integer := 0;
  v_restored integer := 0;
  v_skipped integer := 0;
  v_error integer := 0;
  v_existing record;
BEGIN
  -- Obtenir user_id del context d'autenticació
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Validar p_gtin_type
  IF p_gtin_type NOT IN ('EAN', 'UPC', 'GTIN_EXEMPT') THEN
    RAISE EXCEPTION 'Invalid gtin_type: %', p_gtin_type;
  END IF;

  -- Processar cada codi
  FOREACH v_code IN ARRAY p_codes
  LOOP
    BEGIN
      -- Buscar si ja existeix
      SELECT * INTO v_existing
      FROM gtin_pool
      WHERE user_id = v_user_id
        AND is_demo = p_is_demo
        AND gtin_code = v_code;

      IF v_existing IS NULL THEN
        -- No existeix: inserir nou
        INSERT INTO gtin_pool (
          user_id,
          gtin_code,
          gtin_type,
          notes,
          is_demo,
          assigned_to_project_id,
          deleted_at
        ) VALUES (
          v_user_id,
          v_code,
          p_gtin_type,
          p_notes,
          p_is_demo,
          NULL,
          NULL
        );
        v_inserted := v_inserted + 1;

      ELSIF v_existing.deleted_at IS NOT NULL THEN
        -- Existeix però està eliminat (soft-deleted)
        IF v_existing.assigned_to_project_id IS NULL THEN
          -- No està assignat: restaurar (eliminar soft-delete)
          UPDATE gtin_pool
          SET deleted_at = NULL,
              gtin_type = COALESCE(p_gtin_type, v_existing.gtin_type),
              notes = COALESCE(p_notes, v_existing.notes),
              updated_at = now()
          WHERE id = v_existing.id;
          v_restored := v_restored + 1;
        ELSE
          -- Està assignat: no modificar (mantenir bloquejat)
          v_skipped := v_skipped + 1;
        END IF;

      ELSIF v_existing.assigned_to_project_id IS NOT NULL THEN
        -- Existeix i està assignat: no modificar (mantenir bloquejat)
        v_skipped := v_skipped + 1;

      ELSE
        -- Existeix, no està eliminat, i no està assignat: actualitzar notes/type si cal
        UPDATE gtin_pool
        SET gtin_type = COALESCE(p_gtin_type, v_existing.gtin_type),
            notes = COALESCE(p_notes, v_existing.notes),
            updated_at = now()
        WHERE id = v_existing.id;
        v_skipped := v_skipped + 1; -- Ja existia, no és nou ni restaurat
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Capturar qualsevol error i continuar amb el següent codi
      v_error := v_error + 1;
      RAISE WARNING 'Error processant GTIN %: %', v_code, SQLERRM;
    END;
  END LOOP;

  -- Retornar estadístiques
  RETURN QUERY SELECT v_inserted, v_restored, v_skipped, v_error;
END;
$$;

-- 4. Atorgar permisos
GRANT EXECUTE ON FUNCTION public.import_gtins TO authenticated;

-- 5. Comentaris
COMMENT ON FUNCTION public.import_gtins IS 
'Importa GTINs al pool. Insereix nous, restaura eliminats (si no estan assignats), i ignora assignats. Mai llança 409.';
