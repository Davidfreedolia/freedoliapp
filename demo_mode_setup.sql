-- ============================================
-- DEMO MODE SETUP: Add demo_mode flag to company_settings
-- ============================================
-- Script IDEMPOTENT: Adds demo_mode column if it doesn't exist

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS demo_mode boolean DEFAULT true NOT NULL;

-- Set demo_mode to true by default for all existing users
UPDATE company_settings SET demo_mode = true WHERE demo_mode IS NULL;


