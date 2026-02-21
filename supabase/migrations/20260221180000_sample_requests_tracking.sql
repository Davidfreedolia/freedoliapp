-- PAS M4: tracking per mostres
ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS tracking_number text NULL;

ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS tracking_carrier text NULL;

ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS tracking_url text NULL;

-- (Opcional, però recomanat)
CREATE INDEX IF NOT EXISTS idx_supplier_sample_requests_tracking
  ON supplier_sample_requests(project_id, tracking_number);
