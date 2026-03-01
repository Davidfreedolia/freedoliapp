-- ============================================
-- S1.13 — tasks + sticky_notes org-scoped, drop is_demo
-- ============================================

-- B1) Assegura org_id existeix (S1.2 ja el pot haver afegit)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'org_id') THEN
    ALTER TABLE public.tasks ADD COLUMN org_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sticky_notes' AND column_name = 'org_id') THEN
    ALTER TABLE public.sticky_notes ADD COLUMN org_id uuid;
  END IF;
END $$;

-- B2) Backfill: project_id primer (tasks via project_id si existeix; sticky_notes té project_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'project_id') THEN
    UPDATE public.tasks t
    SET org_id = p.org_id
    FROM public.projects p
    WHERE t.project_id = p.id AND p.org_id IS NOT NULL AND t.org_id IS NULL;
  END IF;
END $$;

UPDATE public.sticky_notes sn
SET org_id = p.org_id
FROM public.projects p
WHERE sn.project_id = p.id AND p.org_id IS NOT NULL AND sn.org_id IS NULL;

-- tasks: entity_id pot ser project_id (camp comú); si la taula té entity_id i no project_id, backfill via project
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'entity_id') THEN
    UPDATE public.tasks t
    SET org_id = p.org_id
    FROM public.projects p
    WHERE t.entity_id = p.id AND t.entity_type = 'project' AND p.org_id IS NOT NULL AND t.org_id IS NULL;
  END IF;
END $$;

-- Fallback: user_id -> org_memberships
UPDATE public.tasks t
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = t.user_id ORDER BY om.created_at LIMIT 1)
WHERE t.org_id IS NULL AND t.user_id IS NOT NULL;

UPDATE public.sticky_notes sn
SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = sn.user_id ORDER BY om.created_at LIMIT 1)
WHERE sn.org_id IS NULL AND sn.user_id IS NOT NULL;

-- B3) NOT NULL condicional + index
DO $$
DECLARE
  t_nulls bigint;
  s_nulls bigint;
BEGIN
  SELECT COUNT(*) INTO t_nulls FROM public.tasks WHERE org_id IS NULL;
  SELECT COUNT(*) INTO s_nulls FROM public.sticky_notes WHERE org_id IS NULL;
  IF t_nulls > 0 THEN
    RAISE WARNING 'S1.13: tasks té % files amb org_id NULL', t_nulls;
  ELSE
    ALTER TABLE public.tasks ALTER COLUMN org_id SET NOT NULL;
  END IF;
  IF s_nulls > 0 THEN
    RAISE WARNING 'S1.13: sticky_notes té % files amb org_id NULL', s_nulls;
  ELSE
    ALTER TABLE public.sticky_notes ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_org_id ON public.sticky_notes(org_id);

-- B4) DROP is_demo (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'is_demo') THEN
    ALTER TABLE public.tasks DROP COLUMN is_demo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sticky_notes' AND column_name = 'is_demo') THEN
    ALTER TABLE public.sticky_notes DROP COLUMN is_demo;
  END IF;
END $$;

-- B5) RLS — drop user-based, create org-based
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can manage own sticky notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can view own sticky notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can insert own sticky notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can update own sticky notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can delete own sticky notes" ON public.sticky_notes;

CREATE POLICY "Org members can manage tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "Org members can manage sticky notes"
ON public.sticky_notes
FOR ALL
TO authenticated
USING (public.is_org_member(org_id))
WITH CHECK (public.is_org_member(org_id));
