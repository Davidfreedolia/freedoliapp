-- F6.1 — Ops Events (Structured Operational Log)

-----------------------------
-- 1) Table: ops_events
-----------------------------

CREATE TABLE IF NOT EXISTS public.ops_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('edge','worker','rpc','db','system')),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','error','critical')),
  entity_type text NULL,
  entity_id uuid NULL,
  message text NOT NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-----------------------------
-- 2) Indexes
-----------------------------

CREATE INDEX IF NOT EXISTS idx_ops_events_org_created_at_desc
  ON public.ops_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_events_severity
  ON public.ops_events(severity);

CREATE INDEX IF NOT EXISTS idx_ops_events_event_type
  ON public.ops_events(event_type);

CREATE INDEX IF NOT EXISTS idx_ops_events_entity_type_id
  ON public.ops_events(entity_type, entity_id);

-----------------------------
-- 3) RLS
-----------------------------

ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - org-specific events (org_id NOT NULL): finance viewer (owner/admin/accountant) for that org
-- - global events (org_id IS NULL): any owner/admin of at least one org
CREATE POLICY "ops_events_select_finance_and_global_admins"
  ON public.ops_events
  FOR SELECT
  TO authenticated
  USING (
    (
      org_id IS NOT NULL
      AND public.is_org_finance_viewer(org_id)
    ) OR (
      org_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.org_memberships om
        WHERE om.user_id = auth.uid()
          AND om.role IN ('owner','admin')
      )
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users:
-- writes are reserved for service role / backend only.

REVOKE ALL ON TABLE public.ops_events FROM PUBLIC;
REVOKE ALL ON TABLE public.ops_events FROM anon;
REVOKE ALL ON TABLE public.ops_events FROM authenticated;

