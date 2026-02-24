-- 20260222124500_s1_7_1_health_runs_backfill_fallback.sql
-- HOTFIX: backfill org_id for legacy health_runs rows that have neither project_id nor user_id.
-- Strategy:
-- 1) Ensure org_id column exists
-- 2) Backfill by project_id -> projects.org_id (if possible)
-- 3) Backfill by user-ish columns -> org_memberships.org_id (user_id / created_by / owner_id if present)
-- 4) If still NULL:
--    - If exactly 1 org exists: assign all remaining NULL rows to that org (safe for single-tenant DB)
--    - Else: FAIL with count (we refuse to guess in multi-org DB)

DO $$
DECLARE
  c bigint;
  orgs_count bigint;
  fallback_org uuid;
  r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='health_runs'
  ) THEN
    RETURN;
  END IF;

  -- Ensure org_id exists
  EXECUTE 'ALTER TABLE public.health_runs ADD COLUMN IF NOT EXISTS org_id uuid';

  -- 1) Backfill via project_id -> projects.org_id (if columns exist)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_runs' AND column_name='project_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='org_id'
  ) THEN
    UPDATE public.health_runs hr
    SET org_id = p.org_id
    FROM public.projects p
    WHERE hr.project_id = p.id
      AND hr.org_id IS NULL
      AND p.org_id IS NOT NULL;
  END IF;

  -- 2) Backfill via user_id (if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_runs' AND column_name='user_id'
  ) THEN
    UPDATE public.health_runs hr
    SET org_id = (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = hr.user_id
      ORDER BY om.created_at ASC
      LIMIT 1
    )
    WHERE hr.org_id IS NULL
      AND hr.user_id IS NOT NULL;
  END IF;

  -- 3) Backfill via created_by (if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_runs' AND column_name='created_by'
  ) THEN
    UPDATE public.health_runs hr
    SET org_id = (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = hr.created_by
      ORDER BY om.created_at ASC
      LIMIT 1
    )
    WHERE hr.org_id IS NULL
      AND hr.created_by IS NOT NULL;
  END IF;

  -- 4) Backfill via owner_id (if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='health_runs' AND column_name='owner_id'
  ) THEN
    UPDATE public.health_runs hr
    SET org_id = (
      SELECT om.org_id
      FROM public.org_memberships om
      WHERE om.user_id = hr.owner_id
      ORDER BY om.created_at ASC
      LIMIT 1
    )
    WHERE hr.org_id IS NULL
      AND hr.owner_id IS NOT NULL;
  END IF;

  -- Remaining NULL?
  SELECT COUNT(*) INTO c
  FROM public.health_runs
  WHERE org_id IS NULL;

  IF c > 0 THEN
    SELECT COUNT(*) INTO orgs_count FROM public.orgs;

    IF orgs_count = 1 THEN
      SELECT id INTO fallback_org
      FROM public.orgs
      ORDER BY created_at ASC
      LIMIT 1;

      UPDATE public.health_runs
      SET org_id = fallback_org
      WHERE org_id IS NULL;

      -- Recheck
      SELECT COUNT(*) INTO c
      FROM public.health_runs
      WHERE org_id IS NULL;

      IF c > 0 THEN
        RAISE EXCEPTION 'S1.7.1: still % NULL org_id after single-org fallback', c;
      END IF;
    ELSE
      RAISE EXCEPTION 'S1.7.1: health_runs has % NULL org_id and there are % orgs. Refusing to guess.', c, orgs_count;
    END IF;
  END IF;

  -- If previous S1.7 already applied constraints/policies, this file doesn't touch them.
  -- It only guarantees org_id is filled for all legacy rows.
END $$;
