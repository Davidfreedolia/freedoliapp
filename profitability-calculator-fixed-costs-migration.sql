-- ============================================
-- MIGRATION: Add fixed_costs to project_profitability_basic
-- ============================================
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- Afegir camp fixed_costs
ALTER TABLE project_profitability_basic 
ADD COLUMN IF NOT EXISTS fixed_costs numeric NOT NULL DEFAULT 0;

