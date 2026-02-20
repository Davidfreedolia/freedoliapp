-- PAS 47: ANAR A MOSTRES (multi-select per cotitzacions en PASSA)
ALTER TABLE supplier_quotes
  ADD COLUMN IF NOT EXISTS go_samples boolean NOT NULL DEFAULT false;
