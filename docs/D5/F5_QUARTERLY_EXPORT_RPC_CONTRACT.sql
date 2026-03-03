-- F5 — Quarterly Export RPC Contract
-- RPCs: pnl_quarterly, cashflow_quarterly, ledger_export_quarterly, ledger_reconciliation_quarterly

-- ============================================
-- 1) Signatures
-- ============================================

-- P&L (devengament) trimestral per type (company scope)
CREATE OR REPLACE FUNCTION public.pnl_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_pnl numeric(18,2),
  period_status text
);

-- Cashflow (caixa) trimestral per type (company scope)
CREATE OR REPLACE FUNCTION public.cashflow_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_cash numeric(18,2),
  period_status text
);

-- Ledger detall trimestral (company scope, per export)
CREATE OR REPLACE FUNCTION public.ledger_export_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  id uuid,
  occurred_at date,
  cash_at date,
  type public.financial_event_type,
  status public.financial_status,
  amount_original numeric(18,2),
  currency_original text,
  rate_pnl numeric(18,8),
  amount_base_pnl numeric(18,2),
  rate_cash numeric(18,8),
  amount_base_cash numeric(18,2),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz,
  period_status text
);

-- Reconciliation trimestral (sanity checks per reference_type)
CREATE OR REPLACE FUNCTION public.ledger_reconciliation_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  reference_type text,
  rows bigint,
  total_base_pnl numeric(18,2),
  total_base_cash numeric(18,2),
  rows_in_base_ccy bigint,
  period_status text
);

-- ============================================
-- 2) Exemples d'ús
-- ============================================

-- P&L Q1 2026
SELECT * FROM public.pnl_quarterly(2026, 1);

-- Cashflow Q1 2026
SELECT * FROM public.cashflow_quarterly(2026, 1);

-- Ledger detall export Q1 2026
SELECT * FROM public.ledger_export_quarterly(2026, 1);

-- Reconciliation Q1 2026
SELECT * FROM public.ledger_reconciliation_quarterly(2026, 1);

-- ============================================
-- 3) Contracte de columnes
-- ============================================

-- 3.1 pnl_quarterly
-- Una fila per tipus de moviment (type) dins del trimestre:
-- - type            :: financial_event_type  ('income','expense','transfer','adjustment')
-- - total_base_pnl  :: numeric(18,2)        (SUM(amount_base_pnl) per type)
-- - period_status   :: text                 ('open' o 'locked' segons accounting_periods)

-- 3.2 cashflow_quarterly
-- Una fila per tipus de moviment (type) dins del trimestre (basat en cash_at):
-- - type             :: financial_event_type
-- - total_base_cash  :: numeric(18,2)       (SUM(amount_base_cash) per type, només cash_at NOT NULL)
-- - period_status    :: text

-- 3.3 ledger_export_quarterly
-- Una fila per línia del ledger (company scope) dins del trimestre (segons occurred_at OR cash_at):
-- - id                :: uuid
-- - occurred_at       :: date
-- - cash_at           :: date
-- - type              :: financial_event_type
-- - status            :: financial_status    ('draft','posted','locked')
-- - amount_original   :: numeric(18,2)
-- - currency_original :: text
-- - rate_pnl          :: numeric(18,8)
-- - amount_base_pnl   :: numeric(18,2)
-- - rate_cash         :: numeric(18,8)
-- - amount_base_cash  :: numeric(18,2)
-- - reference_type    :: text
-- - reference_id      :: uuid
-- - note              :: text
-- - created_at        :: timestamptz
-- - period_status     :: text

-- 3.4 ledger_reconciliation_quarterly
-- Una fila per reference_type (amb 'UNSPECIFIED' per NULL):
-- - reference_type   :: text
-- - rows             :: bigint             (# files al ledger base per referència)
-- - total_base_pnl   :: numeric(18,2)     (SUM(amount_base_pnl))
-- - total_base_cash  :: numeric(18,2)     (SUM(amount_base_cash) on cash_at NOT NULL)
-- - rows_in_base_ccy :: bigint            (# files on currency_original = org_settings.base_currency)
-- - period_status    :: text

