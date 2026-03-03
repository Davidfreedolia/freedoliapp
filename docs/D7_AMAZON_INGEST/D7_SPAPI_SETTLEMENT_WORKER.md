# D7 — SP-API Settlement Worker

## Funció i schedule

- **Edge function**: `spapi-settlement-worker`.
- **Cron**: cada 10 minuts (configurar al Dashboard: `*/10 * * * *` o equivalent).
- **Propòsit**: Per cada connexió SP-API activa i “due”, descobreix informes de settlement, els baixa, parseja el CSV i els publica al ledger reutilitzant el pipeline CSV (amazon_import_jobs, amazon_financial_events, post_amazon_job_to_ledger_backend).

## Lock global (advisory)

- Al inici: `spapi_worker_try_lock()` → `pg_try_advisory_lock(hashtext('spapi_settlement_worker'))`.
- Si retorna `false`: log `SPAPI_WORKER_SKIPPED_LOCKED` (info), return 200 `{ skipped: true, reason: "already running" }`.
- Al final (finally): si es va adquirir el lock, `spapi_worker_unlock()`.
- Evita dues instàncies del worker executant al mateix temps.

## Connexions processades

- Es processen només connexions amb `status = 'active'` **i** (`next_sync_due_at` IS NULL **o** `next_sync_due_at` <= now()).
- La query fa servir l’índex `(status, next_sync_due_at)`.

## Flux per connexió

1. Obtenir access_token LWA (refresh_token desxifrat via `get_spapi_connection_for_worker`).
2. **Discover**: GetReports (SP-API) tipus `GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2`; upsert a `spapi_reports` amb `status='discovered'`.
3. Per cada report amb `status` IN (`discovered`, `failed`) (i que no hagi donat giveup):
   - **Giveup**: Si `status='failed'` i `failed_attempts >= 5` → skip i log `SPAPI_REPORT_GIVEUP` (severity critical).
   - Actualitzar `last_attempt_at`.
   - **Download**: getReportDocument → URL → download (GZIP si cal) → `status='downloaded'`.
   - **Parse**: Papa.parse (delimiter tab), crear/recuperar `amazon_import_job` (per `file_sha256` derivat de `report_id`), insert raw_rows i financial_events, `finalize_amazon_parse` → `status='parsed'`.
   - **Post**: `post_amazon_job_to_ledger_backend` → `status='posted'`, `failed_attempts=0`.
4. En **èxit** de la connexió: `backoff_minutes=0`, `next_sync_due_at = now() + 10 minutes`, `last_sync_at`, `last_error=null`.
5. En **error** de la connexió: `backoff_minutes = least(greatest(5, backoff_minutes*2), 1440)`, `next_sync_due_at = now() + backoff_minutes`, log `SPAPI_BACKOFF_SET`.

## Taules involucrades

- **spapi_reports**: `status` (discovered → downloaded → parsed → posted | failed), `failed_attempts`, `last_attempt_at`, `last_error`.
- **spapi_report_runs**: un registre per etapa (discover/download/parse/post) amb stage, status (started/done/failed), message, meta.
- **amazon_import_jobs**: creats o reutilitzats per report (idempotència per `org_id` + `file_sha256`).

## Retry i giveup per report

- En cada intent: `last_attempt_at = now()`.
- En fallada: `failed_attempts += 1`, `status='failed'`, `last_error`; log `SPAPI_REPORT_FAILED` (meta `failed_attempts`).
- Quan `failed_attempts >= 5` i `status='failed'`: no es torna a intentar; log `SPAPI_REPORT_GIVEUP` (critical).

## Ops events (worker)

- `SPAPI_WORKER_TICK`, `SPAPI_WORKER_DONE`, `SPAPI_WORKER_SKIPPED_LOCKED`, `SPAPI_WORKER_ERROR`
- `SPAPI_DISCOVER_STARTED`, `SPAPI_DISCOVER_DONE`
- `SPAPI_BACKOFF_SET`
- `SPAPI_REPORT_FAILED`, `SPAPI_REPORT_GIVEUP`

## RPCs (worker)

- `get_spapi_connection_for_worker(p_connection_id)` — service_role; retorna connexió amb refresh_token desxifrat.
- `post_amazon_job_to_ledger_backend(p_org_id, p_job_id)` — service_role; post al ledger.
- `spapi_worker_try_lock()` / `spapi_worker_unlock()` — service_role; advisory lock.
