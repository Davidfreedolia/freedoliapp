-- PAS M4: Tracking de mostres (carrier + tracking + url + dates)
ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS carrier text NULL,
  ADD COLUMN IF NOT EXISTS tracking_number text NULL,
  ADD COLUMN IF NOT EXISTS tracking_url text NULL,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_sample_requests_tracking_number
  ON supplier_sample_requests (tracking_number);
