-- PAS 33: una sola cotització marcada com a "Escollida" (lògica a codi, sense unique DB)
ALTER TABLE supplier_quotes
  ADD COLUMN IF NOT EXISTS is_selected boolean NOT NULL DEFAULT false;
