-- PAS: supplier_id optional + supplier_name_raw fallback
-- IMPORTANT: this was already executed manually in Supabase SQL Editor.
-- This migration is added to keep the repo canonical.

ALTER TABLE supplier_quotes
  ADD COLUMN IF NOT EXISTS supplier_name_raw text NULL;

ALTER TABLE supplier_quotes
  ALTER COLUMN supplier_id DROP NOT NULL;

-- Optional: keep simple index for lookups by raw name if needed later
-- (safe, but not required; leave commented)
-- CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier_name_raw
--   ON supplier_quotes (supplier_name_raw);
