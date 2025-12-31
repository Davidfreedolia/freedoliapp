-- ============================================
-- MANUFACTURER PACK TRACKING
-- ============================================
-- Afegeix camps per seguiment del Manufacturer Pack a po_amazon_readiness
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. AFEGIR CAMPS A PO_AMAZON_READINESS
-- ============================================

-- Camp per versio del pack generat (s'incrementa cada cop que es genera)
ALTER TABLE po_amazon_readiness 
ADD COLUMN IF NOT EXISTS manufacturer_pack_version int NULL DEFAULT 0;

-- Camp per data quan s'ha enviat el pack al fabricant
ALTER TABLE po_amazon_readiness 
ADD COLUMN IF NOT EXISTS manufacturer_pack_sent_at timestamp with time zone NULL;

-- Camp per data quan s'ha generat per darrera vegada el pack
ALTER TABLE po_amazon_readiness 
ADD COLUMN IF NOT EXISTS manufacturer_pack_generated_at timestamp with time zone NULL;

-- ============================================
-- 2. INDEXS PER MILLORAR CONSULTES
-- ============================================

-- Index per buscar POs esperant fabricant (generat pero no enviat)
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_waiting_manufacturer 
ON po_amazon_readiness(user_id, manufacturer_pack_generated_at DESC)
WHERE manufacturer_pack_generated_at IS NOT NULL 
  AND manufacturer_pack_sent_at IS NULL;

-- Index per buscar POs enviades al fabricant
CREATE INDEX IF NOT EXISTS idx_po_amazon_readiness_sent_to_manufacturer 
ON po_amazon_readiness(user_id, manufacturer_pack_sent_at DESC)
WHERE manufacturer_pack_sent_at IS NOT NULL;
