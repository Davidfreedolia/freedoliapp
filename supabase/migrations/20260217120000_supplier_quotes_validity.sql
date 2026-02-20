-- PAS 26: validity_status + validity_notes a supplier_quotes (PASSA / NO PASSA / CANDAU)
ALTER TABLE supplier_quotes
  ADD COLUMN IF NOT EXISTS validity_status text NOT NULL DEFAULT 'LOCK'
    CHECK (validity_status IN ('PASS', 'FAIL', 'LOCK'));

ALTER TABLE supplier_quotes
  ADD COLUMN IF NOT EXISTS validity_notes text NULL;
