-- =============================================================================
-- Alert System — Base schema (FASE 3 Business Alerts V1)
-- Taules: alert_definitions, alerts. Indexos i RLS activat. Sense policies ni motor.
-- =============================================================================

-- 1) Taula alert_definitions
CREATE TABLE IF NOT EXISTS public.alert_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  category text,
  default_severity text,
  default_visibility_scope text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_definitions_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.alert_definitions IS 'FASE 3: Definició de tipus d’alerta (F2, O1, S1, O2, etc.)';

-- 2) Taula alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  alert_definition_id uuid NOT NULL REFERENCES public.alert_definitions(id) ON DELETE CASCADE,
  entity_type text,
  entity_id uuid,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  visibility_scope text NOT NULL CHECK (visibility_scope IN ('owner_only', 'admin_owner')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved', 'muted')),
  title text NOT NULL,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.alerts IS 'FASE 3: Alertes per org; dedupe_key + status open/ack per únic parcial';

-- 3) Índexs
CREATE INDEX IF NOT EXISTS idx_alerts_org_status
  ON public.alerts(org_id, status);

CREATE INDEX IF NOT EXISTS idx_alerts_org_severity
  ON public.alerts(org_id, severity);

-- Únic parcial: una sola alerta open/ack per (org_id, dedupe_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedupe_key_open_ack
  ON public.alerts(org_id, dedupe_key)
  WHERE status IN ('open', 'acknowledged');

-- 4) RLS activat només a alerts (sense policies encara)
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
