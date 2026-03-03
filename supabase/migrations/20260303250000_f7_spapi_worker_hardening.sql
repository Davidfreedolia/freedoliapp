-- F7 — SP-API worker hardening: backoff per connection + retry limits per report

-----------------------------
-- A) spapi_connections
-----------------------------

ALTER TABLE public.spapi_connections
  ADD COLUMN IF NOT EXISTS next_sync_due_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS backoff_minutes int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_spapi_connections_status_next_sync
  ON public.spapi_connections (status, next_sync_due_at);

-----------------------------
-- B) spapi_reports
-----------------------------

ALTER TABLE public.spapi_reports
  ADD COLUMN IF NOT EXISTS failed_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NULL;
