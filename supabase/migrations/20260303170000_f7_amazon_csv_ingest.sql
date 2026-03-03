-- F7.1 — Amazon CSV Ingest (DB Contract Only)

-----------------------------
-- 1) Table: amazon_import_jobs
-----------------------------

CREATE TABLE IF NOT EXISTS public.amazon_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_sha256 text NOT NULL,
  marketplace text NOT NULL,
  report_type text NOT NULL,
  period_start date NULL,
  period_end date NULL,
  status text NOT NULL DEFAULT 'uploaded' CHECK (
    status IN ('uploaded','parsing','parsed','posting','done','failed')
  ),
  total_rows int NULL,
  parsed_rows int NULL,
  error text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amazon_import_jobs_org_file_sha256_uniq
    UNIQUE (org_id, file_sha256)
);

-- RLS

ALTER TABLE public.amazon_import_jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: finance viewer (owner/admin/accountant) for that org
CREATE POLICY amazon_import_jobs_select_finance_viewer
  ON public.amazon_import_jobs
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

-- INSERT: finance viewer
CREATE POLICY amazon_import_jobs_insert_finance_viewer
  ON public.amazon_import_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_finance_viewer(org_id));

-- No UPDATE/DELETE policies for authenticated (service role only)

REVOKE ALL ON TABLE public.amazon_import_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.amazon_import_jobs FROM anon;
REVOKE ALL ON TABLE public.amazon_import_jobs FROM authenticated;

-- updated_at trigger

CREATE OR REPLACE FUNCTION public.set_amazon_import_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS amazon_import_jobs_set_updated_at
  ON public.amazon_import_jobs;

CREATE TRIGGER amazon_import_jobs_set_updated_at
BEFORE UPDATE ON public.amazon_import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_amazon_import_jobs_updated_at();


-----------------------------
-- 2) Table: amazon_raw_rows (staging immutable)
-----------------------------

CREATE TABLE IF NOT EXISTS public.amazon_raw_rows (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.amazon_import_jobs(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  row_number int NOT NULL,
  raw_data jsonb NOT NULL,
  unique_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amazon_raw_rows_org_unique_key_uniq
    UNIQUE (org_id, unique_key)
);

ALTER TABLE public.amazon_raw_rows ENABLE ROW LEVEL SECURITY;

-- SELECT: finance viewer (per org_id)
CREATE POLICY amazon_raw_rows_select_finance_viewer
  ON public.amazon_raw_rows
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

-- No INSERT/UPDATE/DELETE policies for authenticated (service role only)

REVOKE ALL ON TABLE public.amazon_raw_rows FROM PUBLIC;
REVOKE ALL ON TABLE public.amazon_raw_rows FROM anon;
REVOKE ALL ON TABLE public.amazon_raw_rows FROM authenticated;


-----------------------------
-- 3) Table: amazon_financial_events (normalized)
-----------------------------

CREATE TABLE IF NOT EXISTS public.amazon_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.amazon_import_jobs(id) ON DELETE CASCADE,
  settlement_id text NULL,
  transaction_id text NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL,
  reference text NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amazon_financial_events_unique_event
    UNIQUE (org_id, settlement_id, transaction_id, event_type)
);

ALTER TABLE public.amazon_financial_events ENABLE ROW LEVEL SECURITY;

-- SELECT: finance viewer (per org_id)
CREATE POLICY amazon_financial_events_select_finance_viewer
  ON public.amazon_financial_events
  FOR SELECT
  TO authenticated
  USING (public.is_org_finance_viewer(org_id));

-- No INSERT/UPDATE/DELETE policies for authenticated (service role only)

REVOKE ALL ON TABLE public.amazon_financial_events FROM PUBLIC;
REVOKE ALL ON TABLE public.amazon_financial_events FROM anon;
REVOKE ALL ON TABLE public.amazon_financial_events FROM authenticated;

