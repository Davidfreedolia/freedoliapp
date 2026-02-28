-- ============================================
-- S1.4b — product_identifiers PURGE LEGACY
-- ============================================
-- Elimina is_demo, relaxa user_id (nullable, no default), elimina índexs/UNIQUE per user_id.
-- RLS només org-based. Sense refactors fora d'aquesta taula.
-- ============================================

-- A1) is_demo — DROP COLUMN si existeix
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_identifiers' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE public.product_identifiers DROP COLUMN is_demo;
  END IF;
END $$;

-- A2) user_id — NO esborrar columna. Eliminar UNIQUE/INDEX que depenguin de user_id; fer user_id nullable sense default.
-- Drop índexs coneguts que referencien user_id (o user_id+is_demo)
DROP INDEX IF EXISTS public.idx_product_identifiers_user_id;
DROP INDEX IF EXISTS public.idx_product_identifiers_user_demo;

-- Eliminar qualsevol altre UNIQUE que contingui exactament (user_id, project_id) — ja fet a S1.4; per si queda algun residual
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'product_identifiers'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum))
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped
      ) = ARRAY['user_id', 'project_id']
  LOOP
    EXECUTE format('ALTER TABLE public.product_identifiers DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;

-- user_id: nullable, sense default (safe si la columna existeix)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_identifiers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.product_identifiers ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE public.product_identifiers ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- A3) RLS — només policy org-based; eliminar policies user-based residuals
DROP POLICY IF EXISTS "Users can manage own product identifiers" ON public.product_identifiers;
-- Assegurar que la policy org-based existeix (idempotent)
DROP POLICY IF EXISTS "Org members can manage product identifiers" ON public.product_identifiers;
CREATE POLICY "Org members can manage product identifiers" ON public.product_identifiers
  FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- A4) Verificacions
DO $$
DECLARE
  null_count bigint;
  reg oid;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.product_identifiers WHERE org_id IS NULL;
  IF null_count > 0 THEN
    RAISE WARNING 'S1.4b: product_identifiers té % files amb org_id NULL (esperat 0)', null_count;
  END IF;
  reg := to_regclass('public.product_identifiers');
  IF reg IS NULL THEN
    RAISE WARNING 'S1.4b: to_regclass(product_identifiers) retorna NULL';
  END IF;
END $$;
-- Policies actuals (inspecció manual):
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_identifiers';
