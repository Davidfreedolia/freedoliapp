# D7 — CSV Ingest (Amazon Settlement)

## Taules

### amazon_import_jobs

Propòsit: un job per fitxer CSV (manual o worker SP-API). Columnes: id, org_id, file_name, file_sha256, marketplace, report_type, status (uploaded, parsing, parsed, posting, done, failed), total_rows, parsed_rows, error, created_by, created_at, updated_at. Unique (org_id, file_sha256). RLS: SELECT/INSERT is_org_finance_viewer; UPDATE service.

### amazon_raw_rows (staging)

Una fila per línia CSV, raw_data jsonb, unique_key. Unique (org_id, unique_key). RLS: SELECT finance viewer; INSERT service.

### amazon_financial_events (normalitzat)

Events extrets del CSV. Unique (org_id, settlement_id, transaction_id, event_type). RLS: SELECT finance viewer; INSERT service.

## RPCs

- create_amazon_import_job (auth, finance viewer): crea job uploaded, retorna job_id.
- start_amazon_import (auth): job a parsing, log IMPORT_STARTED.
- finalize_amazon_parse (service_role): job a parsed, log IMPORT_PARSED.
- post_amazon_job_to_ledger (auth): events a financial_ledger, idempotència AMAZON_EVENT.
- post_amazon_job_to_ledger_backend (service_role): mateix per worker.

## Edge amazon-csv-parse

Input: job_id, storage_path. Llegeix bucket amazon-imports, parse, raw_rows + financial_events, finalize_amazon_parse, opcional post.

## Storage

Bucket amazon-imports, path org/{org_id}/amazon/imports/*. Finance viewer pujar; service llegir.

## UI

Amazon Imports: drag and drop CSV, SHA256, create_amazon_import_job, upload, Process crida amazon-csv-parse, polling.
