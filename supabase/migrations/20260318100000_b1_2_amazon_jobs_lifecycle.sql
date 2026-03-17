-- B1.2 — Amazon ingest job lifecycle closeout
-- Enrich amazon_import_jobs with lifecycle fields and normalize status domain.

ALTER TABLE public.amazon_import_jobs
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz NULL;

-- Optional: keep existing status values but document recommended domain in comments:
-- 'uploaded' | 'parsing' | 'posting' | 'done' | 'failed'

COMMENT ON COLUMN public.amazon_import_jobs.attempt_count IS 'Number of ingest attempts for this job (incremented by worker).';
COMMENT ON COLUMN public.amazon_import_jobs.last_error IS 'Last error message (truncated) for this job, if any.';
COMMENT ON COLUMN public.amazon_import_jobs.started_at IS 'Timestamp when the current/last processing attempt started.';
COMMENT ON COLUMN public.amazon_import_jobs.finished_at IS 'Timestamp when the job reached a terminal state (done/failed).';

