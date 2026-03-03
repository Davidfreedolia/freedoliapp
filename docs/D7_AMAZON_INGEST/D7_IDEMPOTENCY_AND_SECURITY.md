# D7 — Idempotència i Seguretat

## Idempotència

### Jobs i fitxers

- **amazon_import_jobs**: UNIQUE (org_id, file_sha256). El mateix fitxer no crea un segon job; el worker SP-API crea un job per report_id (hash).
- **amazon_raw_rows**: UNIQUE (org_id, unique_key); insert amb ON CONFLICT DO NOTHING / ignore.
- **amazon_financial_events**: UNIQUE (org_id, settlement_id, transaction_id, event_type). Upsert ignoreDuplicates; settlement_id/transaction_id sintètics si falten.

### Ledger

- post_amazon_job_to_ledger / post_amazon_job_to_ledger_backend: idempotència per reference_type=AMAZON_EVENT i reference_id=amazon_financial_events.id.

### SP-API reports

- **spapi_reports**: UNIQUE (org_id, report_id). **Retry**: failed_attempts i last_attempt_at; després de 5 intents fallits giveup.

## Seguretat

### Token LWA (refresh)

- Emmagatzemat a spapi_connections.lwa_refresh_token_enc (bytea) xifrat amb pgp_sym_encrypt(plain, current_setting('app.encryption_key')).
- app.encryption_key al runtime (Supabase Vault); mai al codi.
- Mai exposat a clients. get_spapi_connection_safe no inclou el token. Només get_spapi_connection_for_worker (service_role) desxifra.

### RPCs només service_role

- finalize_amazon_parse, post_amazon_job_to_ledger_backend, get_spapi_connection_for_worker, upsert_spapi_connection_from_backend, spapi_worker_try_lock, spapi_worker_unlock. REVOKE PUBLIC, authenticated; GRANT EXECUTE TO service_role.

### RLS

- amazon_import_jobs, amazon_raw_rows, amazon_financial_events: SELECT (i INSERT a jobs) per is_org_finance_viewer(org_id); UPDATE/INSERT a raw_rows i events només via service.
- spapi_connections: sense SELECT directe per authenticated; accés via RPC safe o backend.
- spapi_reports, spapi_report_runs: SELECT finance viewer; INSERT/UPDATE/DELETE només service_role.

### Edge / secrets

- LWA: LWA_CLIENT_ID, LWA_CLIENT_SECRET, LWA_TOKEN_URL; OAuth state: OAUTH_STATE_SECRET. Redirect app: SPAPI_APP_BASE_URL. Tot via Deno.env.get; cap secret hardcodejat.
