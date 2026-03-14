-- =============================================================================
-- S1.3 — custom_cities: migrate from user_id to org_id (multi-tenant)
-- =============================================================================
-- Adds org_id, backfills from org_memberships, enforces NOT NULL + FK + index.
-- RLS switched to org-based. Trigger sets org_id on INSERT when missing (app
-- sends only { country, city }). Legacy user_id kept for now (app/RLS still use it).
-- =============================================================================

-- 1) Add column (nullable initially)
ALTER TABLE public.custom_cities
  ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2) Backfill: user_id → org_memberships → org_id (one org per user, arbitrary)
UPDATE public.custom_cities c
SET org_id = (
  SELECT m.org_id
  FROM public.org_memberships m
  WHERE m.user_id = c.user_id
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE c.org_id IS NULL
  AND c.user_id IS NOT NULL;

-- 3) Validate: ensure no rows remain with org_id NULL (optional cleanup)
-- Rows with user_id not in any org will keep org_id NULL; we enforce NOT NULL only if safe.
DO $$
DECLARE
  null_count bigint;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM public.custom_cities WHERE org_id IS NULL' INTO null_count;
  IF null_count > 0 THEN
    RAISE WARNING 'S1.3 custom_cities: % row(s) have org_id NULL (user not in any org). NOT NULL not applied.', null_count;
  ELSE
    ALTER TABLE public.custom_cities
      ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

-- 4) FK (only if column exists and we don't already have the constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_custom_cities_org'
      AND conrelid = 'public.custom_cities'::regclass
  ) THEN
    ALTER TABLE public.custom_cities
      ADD CONSTRAINT fk_custom_cities_org
      FOREIGN KEY (org_id)
      REFERENCES public.orgs(id)
      ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE WARNING 'S1.3: fk_custom_cities_org skipped (orphan rows exist). Fix backfill and re-run.';
END $$;

-- 5) Index
CREATE INDEX IF NOT EXISTS idx_custom_cities_org_id
  ON public.custom_cities(org_id);

-- 6) RLS: drop legacy user-based policy, add org-based
ALTER TABLE public.custom_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own custom cities" ON public.custom_cities;

CREATE POLICY "Org members can select custom_cities"
  ON public.custom_cities FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "Org members can insert custom_cities"
  ON public.custom_cities FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can update custom_cities"
  ON public.custom_cities FOR UPDATE TO authenticated
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can delete custom_cities"
  ON public.custom_cities FOR DELETE TO authenticated
  USING (public.is_org_member(org_id));

-- 7) Trigger: set org_id on INSERT when missing (app sends only { country, city })
CREATE OR REPLACE FUNCTION public.custom_cities_set_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT m.org_id INTO v_org_id
  FROM public.org_memberships m
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at ASC
  LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    NEW.org_id := v_org_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_custom_cities_set_org_id ON public.custom_cities;
CREATE TRIGGER tr_custom_cities_set_org_id
  BEFORE INSERT ON public.custom_cities
  FOR EACH ROW
  EXECUTE FUNCTION public.custom_cities_set_org_id();

-- 8) user_id: NOT removed (still used by table default and legacy RLS; app does not send it explicitly).
--    To remove in a later migration: update app to send org_id on insert, then DROP COLUMN user_id and adjust UNIQUE.

COMMENT ON COLUMN public.custom_cities.org_id IS 'S1.3: tenant scope; backfilled from org_memberships by user_id.';
