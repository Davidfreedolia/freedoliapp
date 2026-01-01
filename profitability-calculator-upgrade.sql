-- ============================================
-- QUICK PROFITABILITY CALCULATOR UPGRADE (1.5)
-- ============================================
-- Afegeix fixed_costs i millora ROI calculations
-- Script IDEMPOTENT: Es pot executar múltiples vegades sense errors

-- ============================================
-- 1. AFEGIR CAMP FIXED_COSTS
-- ============================================

ALTER TABLE project_profitability_basic 
ADD COLUMN IF NOT EXISTS fixed_costs numeric NOT NULL DEFAULT 0;

-- ============================================
-- NOTES
-- ============================================
-- fixed_costs: Costos fixos que s'apliquen al càlcul de break-even
-- break_even_units = ceil(fixed_costs / net_profit) si net_profit > 0
--
-- ROI calculations:
-- - roi_product = net_profit / (cogs + shipping + other_costs) * 100
-- - roi_total = net_profit / (cogs + shipping + other_costs + ppc + fba_fee + referral_fee) * 100






