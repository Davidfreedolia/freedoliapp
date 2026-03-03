# FREEDOLIAPP — FASE 7 — Amazon Ingest (CSV + SP-API Settlement)

## Objectiu

Integrar dades financeres d’Amazon a la base de dades i al ledger (F5) mitjançant:

1. **CSV manual**: pujada de fitxers settlement (drag & drop), parse i post al ledger.
2. **SP-API**: OAuth per connexió central app, worker programat que descobreix, baixa, parseja i publica informes de settlement automàticament.

## Components

| Component | Descripció |
|-----------|------------|
| **Taules** | `amazon_import_jobs`, `amazon_raw_rows`, `amazon_financial_events`, `spapi_connections`, `spapi_reports`, `spapi_report_runs` |
| **RPCs** | `create_amazon_import_job`, `start_amazon_import`, `finalize_amazon_parse`, `post_amazon_job_to_ledger` / `post_amazon_job_to_ledger_backend`, `upsert_spapi_connection` / `upsert_spapi_connection_from_backend`, `get_spapi_connection_safe`, `get_spapi_connection_for_worker`, `spapi_worker_try_lock` / `spapi_worker_unlock` |
| **Edge** | `amazon-csv-parse`, `spapi-oauth-init`, `spapi-oauth-callback`, `spapi-settlement-worker` |
| **Storage** | Bucket privat `amazon-imports` (path `org/{org_id}/amazon/imports/*`) |
| **Cron** | `spapi-settlement-worker`: cada 10 minuts |

## Fluxos

- **CSV**: UI → `create_amazon_import_job` → upload a Storage → “Process” → `amazon-csv-parse` (llegeix per `storage_path`) → staging + events → `finalize_amazon_parse` → (opcional/automàtic) `post_amazon_job_to_ledger`.
- **SP-API**: UI “Connect Amazon” → `spapi-oauth-init` → redirect LWA → callback → `spapi-oauth-callback` → `upsert_spapi_connection_from_backend`. Worker (cron): lock → connexions actives amb `next_sync_due_at` → discover reports → download → parse → post (reutilitzant pipeline CSV).

## Seguretat

- Token LWA: emmagatzemat xifrat a `spapi_connections.lwa_refresh_token_enc` (pgcrypto). Mai exposat a clients.
- RPCs sensibles (`finalize_amazon_parse`, `post_amazon_job_to_ledger_backend`, `get_spapi_connection_for_worker`, `upsert_spapi_connection_from_backend`, lock/unlock): només `service_role`.
- RLS: finance viewer (owner/admin/accountant) per SELECT a jobs, raw_rows, events, reports, runs; INSERT/UPDATE a taules d’ingest només via service_role o RPCs autoritzats.

## Robustesa

- **Backoff per connexió**: en error, `backoff_minutes` (5 → 1440 min), `next_sync_due_at`; en èxit es reseteja.
- **Retry per report**: `failed_attempts`, `last_attempt_at`; després de 5 intents fallits es fa giveup (skip + ops event crític).
- **Lock global**: `pg_try_advisory_lock('spapi_settlement_worker')`; si no s’obté, skip i 200 “skipped: already running”.

## Documentació detallada

- [D7_CSV_INGEST.md](./D7_CSV_INGEST.md) — Pipeline CSV (jobs, raw, events, RPCs, Edge).
- [D7_SPAPI_OAUTH.md](./D7_SPAPI_OAUTH.md) — OAuth LWA, callback, desar connexió.
- [D7_SPAPI_SETTLEMENT_WORKER.md](./D7_SPAPI_SETTLEMENT_WORKER.md) — Worker, discover/download/parse/post, cron, backoff, lock.
- [D7_IDEMPOTENCY_AND_SECURITY.md](./D7_IDEMPOTENCY_AND_SECURITY.md) — Idempotència, RLS, tokens, RPCs.
- [D7_RUNBOOK.md](./D7_RUNBOOK.md) — Diagnòstic, ops_events, queries, “si passa X, fes Y”.

## Definition of Done (F7)

- [x] CSV: upload, parse, post al ledger; jobs i events amb RLS.
- [x] SP-API: OAuth connect, token xifrat, worker settlement amb backoff i retry limit.
- [x] Lock advisory per evitar runs concurrents del worker.
- [x] Ops events i documentació (runbook + arquitectura).
