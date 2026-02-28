-- ============================================
-- S1.4 — product_identifiers ORG-SCOPED
-- ============================================
-- Assegura org_id, trigger de seguretat, backfill, NOT NULL, UNIQUE(org_id, project_id), RLS org-based.
-- No s'elimina la columna user_id (fase controlada).
-- ============================================

-- A1) Assegura org_id present (si no hi és)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_identifiers' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.product_identifiers ADD COLUMN org_id uuid;
  END IF;
END $$;

-- A2) Trigger de seguretat: setear org_id des de projects si ve NULL (per inserts legacy)
CREATE OR REPLACE FUNCTION public.set_product_identifiers_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT org_id INTO NEW.org_id
    FROM public.projects
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_identifiers_set_org_id ON public.product_identifiers;
CREATE TRIGGER trg_product_identifiers_set_org_id
  BEFORE INSERT OR UPDATE OF project_id, org_id
  ON public.product_identifiers
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_product_identifiers_org_id();

-- A3) Backfill final de NULLs
UPDATE public.product_identifiers pi
SET org_id = p.org_id
FROM public.projects p
WHERE pi.project_id = p.id
  AND pi.org_id IS NULL
  AND p.org_id IS NOT NULL;

-- A4) Enforce contracte
ALTER TABLE public.product_identifiers ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_identifiers_org_id ON public.product_identifiers(org_id);

-- A5) Canvia unicitat: drop UNIQUE(user_id, project_id) i crea UNIQUE(org_id, project_id)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
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
    ) = ARRAY['user_id', 'project_id'];
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.product_identifiers DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.product_identifiers
  ADD CONSTRAINT product_identifiers_org_project_key UNIQUE (org_id, project_id);

-- A6) RLS (org-based). No s'elimina user_id.
DROP POLICY IF EXISTS "Users can manage own product identifiers" ON public.product_identifiers;
CREATE POLICY "Org members can manage product identifiers" ON public.product_identifiers
  FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));
