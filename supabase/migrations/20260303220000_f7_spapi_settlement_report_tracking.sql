-- F7.7.1 — SP-API Settlement report tracking (discover → download → parse → post)

-----------------------------
-- A) Taula spapi_reports
-----------------------------

CREATE TABLE IF NOT EXISTS public.spapi_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.spapi_connections(id) ON DELETE CASCADE,
  region text NOT NULL CHECK (region IN ('EU','NA','FE')),
  marketplace_id text NULL,
  report_type text NOT NULL,
  report_id text NOT NULL,
  document_id text NULL,
  data_start_time timestamptz NULL,
  data_end_time timestamptz NULL,
  processing_status text NULL,
  created_time timestamptz NULL,
  retrieved_at timestamptz NULL,
  status text NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered','downloaded','parsed','posted','failed')),
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spapi_reports_org_report_id_uniq UNIQUE (org_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_spapi_reports_org_id ON public.spapi_reports (org_id);
CREATE INDEX IF NOT EXISTS idx_spapi_reports_connection_id ON public.spapi_reports (connection_id);
CREATE INDEX IF NOT EXISTS idx_spapi_reports_status ON public.spapi_reports (status);
CREATE INDEX IF NOT EXISTS idx_spapi_reports_created_at ON public.spapi_reports (created_at DESC);

ALTER TABLE public.spapi_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spapi_reports_select_finance ON public.spapi_reports;
CREATE POLICY spapi_reports_select_finance ON public.spapi_reports
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

REVOKE INSERT, UPDATE, DELETE ON public.spapi_reports FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_spapi_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spapi_reports_set_updated_at ON public.spapi_reports;
CREATE TRIGGER spapi_reports_set_updated_at
  BEFORE UPDATE ON public.spapi_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_spapi_reports_updated_at();

-----------------------------
-- B) Taula spapi_report_runs
-----------------------------

CREATE TABLE IF NOT EXISTS public.spapi_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.spapi_reports(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('discover','download','parse','post')),
  status text NOT NULL CHECK (status IN ('started','done','failed')),
  message text NOT NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spapi_report_runs_org_created ON public.spapi_report_runs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spapi_report_runs_report_created ON public.spapi_report_runs (report_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spapi_report_runs_status_created ON public.spapi_report_runs (status, created_at DESC);

ALTER TABLE public.spapi_report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spapi_report_runs_select_finance ON public.spapi_report_runs;
CREATE POLICY spapi_report_runs_select_finance ON public.spapi_report_runs
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

REVOKE INSERT, UPDATE, DELETE ON public.spapi_report_runs FROM anon, authenticated;
