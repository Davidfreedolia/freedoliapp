# D6 — Ops Events (Esquema i ús)

## Esquema `ops_events`

| Columna | Tipus | Descripció |
|---------|--------|------------|
| id | uuid | PK, default gen_random_uuid() |
| org_id | uuid NULL | FK orgs(id); NULL si esdeveniment global |
| source | text | 'edge' \| 'worker' \| 'rpc' \| 'db' \| 'system' |
| event_type | text | Tipus lògic (JOB_STARTED, WORKER_TICK, …) |
| severity | text | 'info' \| 'warn' \| 'error' \| 'critical' |
| entity_type | text NULL | Ex: 'quarterly_export_job', 'ops_health' |
| entity_id | uuid NULL | ID de l’entitat si aplica |
| message | text | Missatge humà |
| meta | jsonb NULL | Dades extra (duration_ms, rows, etc.) |
| created_at | timestamptz | default now() |

## Sources i event_types

### source = 'edge'

| event_type | Severity | Descripció |
|------------|----------|------------|
| JOB_STARTED | info | generate-quarter-pack ha començat un job |
| JOB_DONE | info | Job completat; meta: duration_ms, rows_ledger, file_path, checksum |
| JOB_FAILED | error | Job ha fallat; meta: error, duration_ms |

### source = 'worker'

| event_type | Severity | Descripció |
|------------|----------|------------|
| WORKER_TICK | info | quarter-pack-worker ha fet un tick; meta: queued_found, batch_size |
| WORKER_BATCH_DONE | info | Batch processat; meta: processed, done, failed |
| WORKER_BATCH_FAILED | error | Error global del worker; meta: error |
| HEALTH_RUN_STARTED | info | ops-health-runner ha començat |
| HEALTH_RUN_DONE | info | Health run acabat; meta: duration_ms |
| HEALTH_RUN_FAILED | error | Health run ha fallat; meta: error |

### source = 'rpc' / 'db' / 'system'

Reservats per a futurs esdeveniments (ex: HEALTH_CHECK_PASS / HEALTH_CHECK_FAIL emesos des del RPC run_ops_health_checks).

## Exemples de queries útils

```sql
-- Últims 50 esdeveniments de l’org (canvia el uuid)
SELECT id, source, event_type, severity, message, meta, created_at
FROM public.ops_events
WHERE org_id = '...'
ORDER BY created_at DESC
LIMIT 50;

-- Només errors i critical
SELECT id, org_id, source, event_type, severity, message, meta, created_at
FROM public.ops_events
WHERE severity IN ('error', 'critical')
ORDER BY created_at DESC
LIMIT 100;

-- Últim tick del worker (heartbeat)
SELECT created_at, meta
FROM public.ops_events
WHERE source = 'worker' AND event_type = 'WORKER_TICK'
ORDER BY created_at DESC
LIMIT 1;

-- Jobs fallits recents (des de l’edge)
SELECT created_at, entity_id, message, meta
FROM public.ops_events
WHERE source = 'edge' AND event_type = 'JOB_FAILED'
ORDER BY created_at DESC
LIMIT 20;

-- Health runs (inici/fi/error)
SELECT created_at, event_type, message, meta
FROM public.ops_events
WHERE source = 'worker'
  AND event_type IN ('HEALTH_RUN_STARTED', 'HEALTH_RUN_DONE', 'HEALTH_RUN_FAILED')
ORDER BY created_at DESC
LIMIT 30;
```
