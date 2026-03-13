-- =============================================================================
-- V1 Lifecycle Events — minimal table for project lifecycle → decisions/automations
-- =============================================================================
-- Single table: lifecycle_events. No triggers, no cron. App writes on phase change,
-- PO create, shipment status change. Decisions/automations read via getRecentLifecycleEvents.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  phase_id smallint,
  event_source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT chk_lifecycle_events_event_type CHECK (event_type IN (
    'project_phase_changed',
    'purchase_order_created',
    'shipment_in_transit',
    'shipment_delivered',
    'inventory_low_stock'
  )),
  CONSTRAINT chk_lifecycle_events_phase_id CHECK (phase_id IS NULL OR (phase_id >= 1 AND phase_id <= 7))
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_project_created
  ON public.lifecycle_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_org_created
  ON public.lifecycle_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_event_type
  ON public.lifecycle_events(event_type);

COMMENT ON TABLE public.lifecycle_events IS 'V1 foundation: lifecycle events for project → decisions/automations. App writes; no UI.';

ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can select lifecycle_events" ON public.lifecycle_events;
CREATE POLICY "Org members can select lifecycle_events"
  ON public.lifecycle_events FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Org members can insert lifecycle_events" ON public.lifecycle_events;
CREATE POLICY "Org members can insert lifecycle_events"
  ON public.lifecycle_events FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(org_id));
