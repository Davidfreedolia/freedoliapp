-- ============================================
-- S1.20 — gtin_pool org-scoped (contract change: user+is_demo → org_id)
-- ============================================

-- B1) Afegir org_id (si no existeix)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gtin_pool' AND column_name = 'org_id') THEN
    ALTER TABLE public.gtin_pool ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill org_id via org_memberships(user_id)
UPDATE public.gtin_pool gp
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = gp.user_id ORDER BY om.created_at LIMIT 1)
WHERE gp.org_id IS NULL AND gp.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  v_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO v_nulls FROM public.gtin_pool WHERE org_id IS NULL;
  IF v_nulls > 0 THEN
    RAISE WARNING 'S1.20: gtin_pool té % files amb org_id NULL', v_nulls;
  ELSE
    ALTER TABLE public.gtin_pool ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gtin_pool_org_id ON public.gtin_pool(org_id);

-- B4) Eliminar is_demo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gtin_pool' AND column_name = 'is_demo') THEN
    ALTER TABLE public.gtin_pool DROP COLUMN is_demo;
  END IF;
END $$;

-- B4/B5) Eliminar UNIQUE(user_id, is_demo, gtin_code) i UNIQUE(user_id, gtin_code); crear UNIQUE(org_id, gtin_code)
DROP INDEX IF EXISTS public.idx_gtin_pool_unique_user_demo_code;

DO $$
DECLARE
  r text;
BEGIN
  FOR r IN (
    SELECT c.conname::text
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'gtin_pool' AND c.contype = 'u'
  )
  LOOP
    EXECUTE format('ALTER TABLE public.gtin_pool DROP CONSTRAINT IF EXISTS %I', r);
  END LOOP;
END $$;

-- Constraint per nom comú (bootstrap: UNIQUE(user_id, gtin_code))
ALTER TABLE public.gtin_pool DROP CONSTRAINT IF EXISTS gtin_pool_user_id_gtin_code_key;

-- Índex únic per (org_id, gtin_code) quan no està soft-deleted
CREATE UNIQUE INDEX IF NOT EXISTS idx_gtin_pool_org_gtin_code
ON public.gtin_pool(org_id, gtin_code)
WHERE deleted_at IS NULL;

-- B6) Reescriure RPC import_gtins (sense p_is_demo; amb p_org_id; ON CONFLICT implícit via lògica)
CREATE OR REPLACE FUNCTION public.import_gtins(
  p_codes text[],
  p_gtin_type text,
  p_notes text DEFAULT NULL,
  p_org_id uuid DEFAULT NULL
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
  v_org_id uuid;
  v_code text;
  v_inserted integer := 0;
  v_restored integer := 0;
  v_skipped integer := 0;
  v_error integer := 0;
  v_existing record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- org_id obligatori: passar des del client (activeOrgId)
  v_org_id := p_org_id;
  IF v_org_id IS NULL THEN
    -- Fallback: primera org de l'usuari
    SELECT om.org_id INTO v_org_id
    FROM public.org_memberships om
    WHERE om.user_id = v_user_id
    ORDER BY om.created_at
    LIMIT 1;
  END IF;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Org context required (p_org_id or org_membership)';
  END IF;

  IF p_gtin_type IS NOT NULL AND p_gtin_type NOT IN ('EAN', 'UPC', 'GTIN_EXEMPT') THEN
    RAISE EXCEPTION 'Invalid gtin_type: %', p_gtin_type;
  END IF;

  FOREACH v_code IN ARRAY p_codes
  LOOP
    BEGIN
      SELECT * INTO v_existing
      FROM public.gtin_pool
      WHERE org_id = v_org_id
        AND gtin_code = v_code;

      IF v_existing IS NULL THEN
        INSERT INTO public.gtin_pool (
          user_id,
          org_id,
          gtin_code,
          gtin_type,
          notes,
          assigned_to_project_id,
          deleted_at
        ) VALUES (
          v_user_id,
          v_org_id,
          v_code,
          COALESCE(p_gtin_type, 'EAN'),
          p_notes,
          NULL,
          NULL
        );
        v_inserted := v_inserted + 1;

      ELSIF v_existing.deleted_at IS NOT NULL THEN
        IF v_existing.assigned_to_project_id IS NULL THEN
          UPDATE public.gtin_pool
          SET deleted_at = NULL,
              gtin_type = COALESCE(p_gtin_type, v_existing.gtin_type),
              notes = COALESCE(p_notes, v_existing.notes),
              updated_at = now()
          WHERE id = v_existing.id;
          v_restored := v_restored + 1;
        ELSE
          v_skipped := v_skipped + 1;
        END IF;

      ELSIF v_existing.assigned_to_project_id IS NOT NULL THEN
        v_skipped := v_skipped + 1;

      ELSE
        UPDATE public.gtin_pool
        SET gtin_type = COALESCE(p_gtin_type, v_existing.gtin_type),
            notes = COALESCE(p_notes, v_existing.notes),
            updated_at = now()
        WHERE id = v_existing.id;
        v_skipped := v_skipped + 1;
      END IF;

    EXCEPTION WHEN unique_violation THEN
      v_skipped := v_skipped + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error := v_error + 1;
      RAISE WARNING 'Error processant GTIN %: %', v_code, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_restored, v_skipped, v_error;
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_gtins(text[], text, text, uuid) TO authenticated;
COMMENT ON FUNCTION public.import_gtins IS 'Importa GTINs al pool per org. Paràmetres: p_codes, p_gtin_type, p_notes, p_org_id. Org-scoped (S1.20).';

-- B7) RLS
ALTER TABLE public.gtin_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own gtin pool" ON public.gtin_pool;
DROP POLICY IF EXISTS "Users can insert own gtin pool" ON public.gtin_pool;

CREATE POLICY "Org members can manage gtin_pool"
ON public.gtin_pool
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
