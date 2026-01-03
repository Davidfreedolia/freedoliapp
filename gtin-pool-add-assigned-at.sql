-- ============================================
-- ADD assigned_at TO gtin_pool
-- ============================================
-- Aquest script afegeix el camp assigned_at a gtin_pool
-- per registrar quan es va assignar un GTIN a un projecte

-- Afegir camp assigned_at
ALTER TABLE gtin_pool 
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Actualitzar assigned_at per GTINs ja assignats (opcional)
UPDATE gtin_pool 
SET assigned_at = updated_at 
WHERE status = 'assigned' AND assigned_at IS NULL;








