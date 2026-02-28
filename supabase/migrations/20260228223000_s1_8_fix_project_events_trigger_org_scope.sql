-- ============================================
-- S1.8 — Fix project_events: no dependre de projects.is_demo + org-scoped
-- ============================================
-- - Trigger deixa de llegir projects.is_demo (columna eliminada a S1.5).
-- - Omple org_id des de projects; enforce NOT NULL + RLS org-based.
-- - Preparat per purgar is_demo de project_events en una fase posterior.
-- ============================================

-- B1) Assegura org_id existeix a project_events (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_events' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.project_events ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Reescriu la funció del trigger: sense is_demo, set org_id des de projects
CREATE OR REPLACE FUNCTION public.project_events_before_ins_upd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_org uuid;
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT p.user_id, p.org_id INTO v_user, v_org
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    IF v_user IS NULL THEN
      RAISE EXCEPTION 'project_events: invalid project_id %', NEW.project_id;
    END IF;

    NEW.user_id := v_user;
    IF NEW.org_id IS NULL AND v_org IS NOT NULL THEN
      NEW.org_id := v_org;
    END IF;
  END IF;

  IF tg_op = 'INSERT' THEN
    NEW.created_at := coalesce(NEW.created_at, now());
    NEW.updated_at := now();
  ELSE
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- B3) Backfill org_id
UPDATE public.project_events e
SET org_id = p.org_id
FROM public.projects p
WHERE e.project_id = p.id
  AND e.org_id IS NULL
  AND p.org_id IS NOT NULL;

-- Fallback: org des de org_memberships per user_id
UPDATE public.project_events pe
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = pe.user_id ORDER BY om.created_at LIMIT 1)
WHERE pe.org_id IS NULL AND pe.user_id IS NOT NULL;

-- B4) Enforce org_id NOT NULL + índex (només si no queden NULLs)
DO $$
DECLARE
  null_count bigint;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM public.project_events WHERE org_id IS NULL' INTO null_count;
  IF null_count > 0 THEN
    RAISE WARNING 'S1.8: project_events té % files amb org_id NULL; no es pot fer NOT NULL encara', null_count;
  ELSE
    ALTER TABLE public.project_events ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_events_org_id ON public.project_events(org_id);

-- B5) RLS — eliminar policies user-based, crear policy org-based
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own project events" ON public.project_events;
DROP POLICY IF EXISTS "Users can insert own project events (project open)" ON public.project_events;
DROP POLICY IF EXISTS "Users can update own project events (project open)" ON public.project_events;
DROP POLICY IF EXISTS "Users can delete own project events (project open)" ON public.project_events;

CREATE POLICY "Org members can manage project events"
ON public.project_events
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
