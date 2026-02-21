-- Link sample request -> Purchase Order (sample PO)
ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS po_id uuid NULL;

-- Sample choice / selection state
ALTER TABLE supplier_sample_requests
  ADD COLUMN IF NOT EXISTS choice_status text NOT NULL DEFAULT 'NONE'
  CHECK (choice_status IN ('NONE', 'SHORTLIST', 'WINNER'));

-- (Opcional però recomanat) garantir 1 WINNER per projecte
-- Si vols això, ho fem després amb index + trigger; ara NO.
