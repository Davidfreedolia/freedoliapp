-- FASE 4.2 — tasks: expand source values and add source linkage (source_ref_type, source_ref_id).
-- Preserves existing data; does not touch project_tasks.

-- 1) Add new columns (nullable for backfill)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'source_ref_type') THEN
    ALTER TABLE public.tasks ADD COLUMN source_ref_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'source_ref_id') THEN
    ALTER TABLE public.tasks ADD COLUMN source_ref_id text;
  END IF;
END $$;

-- 2) Expand source CHECK to allow alert, decision, gate (keep manual, sticky_note)
DO $$
BEGIN
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_source_check
    CHECK (source IN ('manual', 'sticky_note', 'alert', 'decision', 'gate'));
EXCEPTION
  WHEN undefined_object THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_source_check
      CHECK (source IN ('manual', 'sticky_note', 'alert', 'decision', 'gate'));
END $$;

-- 3) Expand entity_type CHECK to allow 'org' for alert/gate context (navigable org context)
DO $$
BEGIN
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_entity_type_check;
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_entity_type_check
    CHECK (entity_type IN ('project', 'purchase_order', 'supplier', 'shipment', 'org'));
EXCEPTION
  WHEN undefined_object THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_entity_type_check
      CHECK (entity_type IN ('project', 'purchase_order', 'supplier', 'shipment', 'org'));
END $$;

-- 4) Index for dedupe by origin (org_id + source + source_ref_type + source_ref_id) for open/snoozed tasks
CREATE INDEX IF NOT EXISTS idx_tasks_origin_open
  ON public.tasks(org_id, source, source_ref_type, source_ref_id)
  WHERE source_ref_type IS NOT NULL AND source_ref_id IS NOT NULL AND status IN ('open', 'snoozed');
