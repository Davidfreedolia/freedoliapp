# D5 — Quarterly Export Pipeline (RPCs, Jobs, Edge, Worker)

## 1. Objectiu

Descriure el pipeline complet per generar **packs trimestrals** de finances:

- Fonts: `financial_ledger` + `accounting_periods` + `org_settings` + `exchange_rates_daily`.
- Exposició: RPCs de lectura (P&L, Cashflow, Ledger detall, Reconciliation).
- Distribució: ZIP amb 4+ fitxers CSV per trimestre, guardat a Storage `exports` amb signed URL.

## 2. RPCs trimestrals (lectura)

### 2.1 `pnl_quarterly`

```sql
CREATE FUNCTION public.pnl_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_pnl numeric(18,2),
  period_status text
);
```

Resum:

- Select sobre `financial_ledger`:
  - `scope = 'company'`
  - `status IN ('posted','locked')`
  - `occurred_at` dins del trimestre.
- Group by `type`.
- `period_status`:
  - s’obté de `accounting_periods` (si hi ha fila).
  - `'open'` per defecte si no existeix.

### 2.2 `cashflow_quarterly`

```sql
CREATE FUNCTION public.cashflow_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  type public.financial_event_type,
  total_base_cash numeric(18,2),
  period_status text
);
```

- Igual que P&L però:
  - Es basa en `cash_at` (no `occurred_at`).
  - Filtra `cash_at IS NOT NULL`.

### 2.3 `ledger_export_quarterly`

```sql
CREATE FUNCTION public.ledger_export_quarterly(p_year int, p_quarter int)
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
```

- Inclou totes les columnes necessàries per export detallat.
- Inclou línies:
  - amb `occurred_at` dins del trimestre **o**
  - amb `cash_at` dins del trimestre.

### 2.4 `ledger_reconciliation_quarterly`

```sql
CREATE FUNCTION public.ledger_reconciliation_quarterly(p_year int, p_quarter int)
RETURNS TABLE (
  reference_type text,
  rows bigint,
  total_base_pnl numeric(18,2),
  total_base_cash numeric(18,2),
  rows_in_base_ccy bigint,
  period_status text
);
```

- CTE `base`:
  - `scope = 'company'`, `status IN ('posted','locked')`.
  - `occurred_at` dins del trimestre.
- Agregació per `reference_type` (amb `'UNSPECIFIED'` per NULL).
- `rows_in_base_ccy` compta files on `currency_original = org_settings.base_currency`.

## 3. Jobs i RPCs de job

### 3.1 Taula `quarterly_export_jobs`

Veure `D5_OVERVIEW`. Camps clau:

- `org_id`, `year`, `quarter`, `period_status`, `base_currency`.
- `status` (`queued`,`running`,`done`,`failed`).
- `file_path`, `checksum`, `error`.

### 3.2 `request_quarter_pack`

```sql
CREATE FUNCTION public.request_quarter_pack(p_year int, p_quarter int)
RETURNS TABLE (job_id uuid, period_status text, base_currency text);
```

Resum:

- Deriva `v_org_id` via `get_current_org_id()`.
- Valida `is_org_finance_viewer(v_org_id)`.
- Llegeix `base_currency` de `org_settings`.
- Mira `accounting_periods`:
  - si existeix → `period_status = ap.status`.
  - sinó → `'open'`.
- UPSERT a `quarterly_export_jobs`:
  - `ON CONFLICT (org_id, year, quarter, period_status, base_currency)`:
    - reseteja `status = 'queued'` + neteja `file_path/checksum/error`.
- Retorna `job_id`, `period_status`, `base_currency`.

### 3.3 `get_quarter_pack_job`

```sql
CREATE FUNCTION public.get_quarter_pack_job(p_job_id uuid)
RETURNS TABLE (
  status text,
  file_path text,
  checksum text,
  error text,
  period_status text,
  base_currency text
);
```

- Troba el job, valida `is_org_finance_viewer(org_id)`.
- Retorna estat actual del job.

### 3.4 `list_quarter_pack_jobs`

```sql
CREATE FUNCTION public.list_quarter_pack_jobs(p_limit int DEFAULT 20)
RETURNS SETOF public.quarterly_export_jobs;
```

- Deriva `org_id` actual.
- Valida finance viewer.
- Retorna jobs de la org, `ORDER BY created_at DESC LIMIT p_limit`.

### 3.5 `get_quarter_pack_signed_url`

```sql
CREATE FUNCTION public.get_quarter_pack_signed_url(
  p_job_id uuid,
  p_expires_in int DEFAULT 604800
) RETURNS TABLE (signed_url text, file_path text);
```

- Valida org + finance viewer.
- Requereix `status='done'` i `file_path` no nul.
- Genera signed URL de Storage (bucket `exports`) per `file_path`.

## 4. Edge Function: generate-quarter-pack

Arxiu: `supabase/functions/generate-quarter-pack/index.ts`

### 4.1 Flux

1. Marca job com `running` i neteja `error`.
2. Crea clients Supabase admin (`service role`).
3. Crida les 4 RPCs trimestrals (`pnl_*`, `cashflow_*`, `ledger_export_*`, `reconciliation_*`).
4. **Hardening de tipus de canvi**:
   - Revisa `ledgerRows`:
     - si algun `rate_pnl<=0` o `rate_cash<=0` (quan hi ha `cash_at`), intenta recalcular:
       - `get_exchange_rate_to_base(occurred_at, currency_original, base_currency)`.
       - `get_exchange_rate_to_base(cash_at, currency_original, base_currency)` per `rate_cash`.
       - recalcula `amount_base_pnl` / `amount_base_cash` quan falten.
     - si encara manca rate → llança error `missing_exchange_rate`.
5. Construeix CSVs:
   - P&L: `type,total_base_pnl,period_status`.
   - Cashflow: `type,total_base_cash,period_status`.
   - Ledger:
     - si `rows <= 50000` → `..._ledger.csv`.
     - si `rows > 50000` → `..._ledger_part1.csv`, `..._ledger_part2.csv`, …
   - Reconciliation: `reference_type,rows,total_base_pnl,total_base_cash,rows_in_base_ccy,period_status`.
6. Munta ZIP amb JSZip.
7. Puja a `storage.from('exports')` amb `upsert: true`.
8. Genera signed URL (7 dies) i actualitza:
   - `status='done'`, `file_path`, `checksum`.

### 4.2 Gestió d’errors

- Si qualsevol pas falla:
  - Edge respon `500` amb `error`.
  - A F5.10, també intenta marcar el job com `failed` amb `error` descrit.

## 5. Worker: quarter-pack-worker

Arxiu: `supabase/functions/quarter-pack-worker/index.ts`

### 5.1 Funció

- Pensat per ser cridat via **cron Supabase** cada ~5 minuts.

Flux:

1. Cerca fins a `MAX_JOBS_PER_RUN=5` jobs `status='queued'` per `created_at ASC`.
2. Per cada job:
   - Fa `POST` a `functions/v1/generate-quarter-pack?job_id=...` amb `Authorization: Bearer SERVICE_ROLE`.
3. Si la crida a generate falla:
   - Marca el job `failed` amb `error` (`generate-quarter-pack failed: ...`).

## 6. UI: FinanceExports (no cron)

Pàgina `src/pages/FinanceExports.jsx`:

- Selector `year` + `quarter`.
- Botó **Generate quarterly pack** → `request_quarter_pack`.
- Taula de jobs → `list_quarter_pack_jobs`.
- Polling cada 5s si hi ha `queued/running`.
- Botó **Download** → `get_quarter_pack_signed_url` → obre URL en nova pestanya.

## 7. Guardrails

- **Accés**:
  - Totes les RPCs d’export comproven:
    - `org_id` actual.
    - `is_org_finance_viewer(org_id)`.
- **Idempotència**:
  - Clau única de `quarterly_export_jobs` + comportament d’`enqueue_quarter_pack`.
- **Escalabilitat**:
  - Divisió del ledger en chunks de 50k files per evitar CSVs gegants.
- **Integritat de dades**:
  - Exports no s’executen sense tipus de canvi vàlids (`missing_exchange_rate` → job `failed`).

