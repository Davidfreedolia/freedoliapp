-- FASE 4.3.D — Task lifecycle semantics cleanup
-- Simplify tasks.status contract to two states: 'open' and 'done'.
-- Snooze semantics remain: status = 'open' with future due_date.

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- 1) Normalize any legacy snoozed rows to open (defensive; there should be none in practice)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'status'
  ) THEN
    UPDATE public.tasks
    SET status = 'open'
    WHERE status = 'snoozed';
  END IF;

  -- 2) Drop existing CHECK constraint(s) on tasks.status and replace with open/done only
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'status'
  ) THEN
    FOR v_constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
        AND t.relname = 'tasks'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'  -- narrow to status-related checks
    LOOP
      EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constraint_name);
    END LOOP;

    -- Add a single canonical CHECK constraint for status
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('open', 'done'));
  END IF;
END $$;

-- 3) Align origin-dedupe index with new lifecycle contract: only 'open' is considered active
DROP INDEX IF EXISTS public.idx_tasks_origin_open;

CREATE INDEX IF NOT EXISTS idx_tasks_origin_open
  ON public.tasks(org_id, source, source_ref_type, source_ref_id)
  WHERE source_ref_type IS NOT NULL
    AND source_ref_id IS NOT NULL
    AND status = 'open';

