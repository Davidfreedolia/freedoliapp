# D5 — Finance Overview (F5.0–F5.10)

## 1. Objectiu de la Fase 5

- Definir un **model financer SaaS-ready** per org (`org_id`), amb:
  - **Moneda base per org** (`org_settings.base_currency`).
  - **Ledger multimoneda** (`financial_ledger`) amb *devengament* (P&L) i *caixa*.
  - **Tipus de canvi diaris** (`exchange_rates_daily`) agnòstics de proveïdor (Frankfurter/ECB, overrides manuals).
  - **Tancament trimestral** amb `accounting_periods` i *quarter lock*.
  - **Pipeline d’export** trimestral (P&L, Cashflow, Ledger, Reconciliation) → ZIP a Storage `exports`.
  - **Automatització**: lock → enqueue job → worker → pack a Storage + signed URL.

## 2. Esquema principal (resum)

- `org_settings`
  - `org_id` PK → `orgs(id)` (ON DELETE CASCADE)
  - `base_currency` `text` NOT NULL DEFAULT `'EUR'`, `CHECK` ISO (len=3, uppercase).
  - `created_at`, `updated_at` + trigger `set_org_settings_updated_at`.
  - RLS Model C: membres de l’org; insert/update només owner/admin.

- `exchange_rates_daily`
  - `id` `bigserial` PK.
  - `base_currency` `text` NOT NULL DEFAULT `'EUR'`.
  - `currency` `text` NOT NULL.
  - `rate_date` `date` NOT NULL.
  - `rate_to_base` `numeric(18,8)` NOT NULL `CHECK (rate_to_base > 0)`.
  - `source` `text` NOT NULL DEFAULT `'ecb'` `CHECK (source in ('ecb','manual_override'))`.
  - `created_at` `timestamptz`.
  - `UNIQUE (rate_date, base_currency, currency)`.
  - `CHECK` ISO per `currency` i `base_currency`.
  - Indexos: `(rate_date)`, `(currency)`.
  - RLS: `SELECT` per `authenticated`; `INSERT/UPDATE` només via service role / RPC.

- `accounting_periods`
  - `org_id` + `year` + `quarter` (1–4) + `status` (`'open'|'locked'`).
  - `locked_at`, `locked_by`, `created_at`, `updated_at`.
  - PK `(org_id, year, quarter)`.
  - RLS: `SELECT` org members; `INSERT/UPDATE` owner/admin.
  - Trigger `set_accounting_periods_updated_at`.

- `financial_ledger`
  - `id` `uuid` PK, `org_id` `uuid` FK → `orgs`.
  - `scope` `financial_scope` (`'company'|'project'`).
  - `project_id` nullable FK → `projects`.
  - `type` `financial_event_type` (`'income','expense','transfer','adjustment'`).
  - `status` `financial_status` (`'draft','posted','locked'`).
  - Dates: `occurred_at` (devengament), `cash_at` (caixa).
  - Imports:
    - `amount_original`, `currency_original`.
    - `rate_pnl`, `amount_base_pnl`.
    - `rate_cash`, `amount_base_cash`.
  - Refs: `reference_type`, `reference_id`, `created_by`, `posted_by`, `locked_by`.
  - Meta: `note`, `created_at`, `updated_at`.
  - `CHECK` coherència scope/project:
    - `scope='company'` → `project_id IS NULL`.
    - `scope='project'` → `project_id IS NOT NULL`.
  - `UNIQUE (org_id, reference_type, reference_id, type)` (idempotència) + índex parcial.
  - Indexos: `(org_id, occurred_at)`, `(org_id, cash_at)`, `(org_id, scope)`, `(project_id)`.
  - RLS:
    - `SELECT`:  
      - `scope='company'` → `is_org_owner_or_admin`.  
      - `scope='project'` → `is_org_member`.
    - Sense `INSERT/UPDATE/DELETE` per clients (només service role / RPCs).
  - Trigger `financial_ledger_period_lock_guard` (bloqueja updates/deletes en períodes `locked`).

- `quarterly_export_jobs`
  - `id` `uuid` PK.
  - `org_id`, `year`, `quarter`, `period_status`, `base_currency`.
  - Estat: `status` (`'queued','running','done','failed'`).
  - `file_path`, `checksum`, `error`, `created_by`, `created_at`, `updated_at`.
  - `UNIQUE (org_id, year, quarter, period_status, base_currency)`.
  - RLS: `SELECT`/`INSERT` només finance viewer (`is_org_finance_viewer`); sense UPDATE per clients.
  - Trigger `set_quarterly_export_jobs_updated_at`.

## 3. Helpers i RPCs clau

- Helpers:
  - `is_org_member(org_id)` (existent).
  - `is_org_owner_or_admin(org_id)` (existent).
  - `is_org_accountant(org_id)` (nou, rol `accountant` a `org_memberships`).
  - `is_org_finance_viewer(org_id)` = owner OR admin OR accountant.
  - `get_current_org_id()` → primer `org_id` de l’usuari (via `org_memberships`).

- RPCs trimestrals (F5.6):
  - `pnl_quarterly(year, quarter)` → P&L devengament per `type`.
  - `cashflow_quarterly(year, quarter)` → cashflow per `type`.
  - `ledger_export_quarterly(year, quarter)` → detall del ledger.
  - `ledger_reconciliation_quarterly(year, quarter)` → totals per `reference_type` + checks.
  - Tots retornen `period_status` (open/locked) segons `accounting_periods` o `'open'` per defecte.

- RPCs pack:
  - `request_quarter_pack(year, quarter)` → (job_id, period_status, base_currency).
  - `get_quarter_pack_job(job_id)` → estat, file_path, errors.
  - `list_quarter_pack_jobs(limit)` → últims jobs de la org (finance viewer).
  - `get_quarter_pack_signed_url(job_id, expires_in)` → signed URL + file_path (només jobs `done`).

- Helper tipus de canvi:
  - `get_exchange_rate_to_base(p_date, p_currency, p_base)`:
    - 1r: rate exacta (`rate_date = p_date`).
    - 2n: rate màxima `<= p_date`.
    - Si no hi ha res → `missing_exchange_rate`.

## 4. Export pipeline

1. **Quarter lock** (`accounting_periods.status='locked'`)  
   - Trigger AFTER UPDATE → `enqueue_quarter_pack(org_id, year, quarter)`.
   - `enqueue_quarter_pack`:
     - Llegeix `base_currency` des de `org_settings`.
     - Si hi ha ja un `quarterly_export_job` `status='done'` per (`org_id, year, quarter, 'locked', base_currency`) → **no engega nou job**.
     - Si no, crea job `status='queued'` (`period_status='locked'`).

2. **Worker (quarter-pack-worker)**  
   - Cada ~5 minuts:
     - Selecciona fins a 5 jobs `status='queued'`.
     - Per cada job:
       - Crida Edge `generate-quarter-pack?job_id=...` amb service role.
       - Si falla → marca `failed` + `error`.

3. **Edge generate-quarter-pack**  
   - Marca job `running`.
   - Executa RPCs:
     - `pnl_quarterly`
     - `cashflow_quarterly`
     - `ledger_export_quarterly`
     - `ledger_reconciliation_quarterly`
   - Hardening rates:
     - Si algun `ledger` row té `rate_pnl` o `rate_cash` nul/0:
       - Intenta recalcular via `get_exchange_rate_to_base` (per `occurred_at` i `cash_at`).
       - Si no troba rate → job `failed` amb error `missing_exchange_rate`.
   - Crea CSVs:
     - `*_pnl.csv`
     - `*_cashflow.csv`
     - `*_reconciliation.csv`
     - Ledger:
       - Si `rows <= 50000` → `*_ledger.csv`.
       - Si `rows > 50000` → `*_ledger_part1.csv`, `*_ledger_part2.csv`, …
   - Munta ZIP amb JSZip.
   - Puja al bucket privat `exports` a un path canònic:
     - `org_{org_id}_Y{year}_Q{quarter}.zip` (estructura per carpetes).
   - Genera signed URL (7 dies) per ús intern.
   - Actualitza job `status='done'`, `file_path`, `checksum`.

4. **UI (FinanceExports)**  
   - No forma part del backend, però consumeix:
     - `request_quarter_pack`
     - `list_quarter_pack_jobs`
     - `get_quarter_pack_signed_url`
   - Llistra jobs, polling per `queued/running` i permet `Download`.

## 5. Guardrails clau

- **Base currency**:
  - `org_settings_base_currency_guard`:
    - Si hi ha qualsevol `financial_ledger` `status IN ('posted','locked')` per una org → **prohibeix canviar `base_currency`** (`base_currency_locked`).
  - Evita desquadres retroactius als informes.

- **Period lock**:
  - `financial_ledger_period_lock_guard`:
    - No permet `UPDATE`/`DELETE` de línies dins d’un període `locked`.
    - Únic camí per ajustar és via nous moviments (adjustments) en períodes oberts.

- **Export idempotent / no spam**:
  - `quarterly_export_jobs` té `UNIQUE (org_id, year, quarter, period_status, base_currency)`.
  - `enqueue_quarter_pack` no re-queuea si hi ha ja `status='done'` per el període `locked`.

- **Access control**:
  - Totes les RPCs trimestrals i d’export requereixen:
    - Org activa (`get_current_org_id`).
    - `is_org_finance_viewer(org_id)` (`owner/admin/accountant`).
  - Els job details i signed URLs també passen per aquest helper.

## 6. Definition of Done (F5.0–F5.10)

- Moneda base per org definida i bloquejable un cop hi ha ledger `posted/locked`.
- Ledger multimoneda amb separació clara devengament/caixa + RLS SaaS-ready.
- Modes P&L / Cashflow / Ledger Export / Reconciliation disponibles via RPCs trimestrals.
- Period lock amb:
  - Bloqueig d’edició de ledger.
  - Enqueue automàtic de pack `locked`.
- Worker i Edge funcionals:
  - Jobs passen `queued → running → done/failed`.
  - Packs grans amb ledger >50k línies es trossegen en múltiples CSV.
  - Tractament robust d’errors de tipus de canvi (`missing_exchange_rate`).
- UI mínima per exports trimestrals implementada i integrada amb la resta de la app.

