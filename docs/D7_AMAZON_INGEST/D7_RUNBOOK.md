# D7 — Runbook (Amazon Ingest)

## Si passa X, fes Y

### El worker no processa connexions

- **Comprova**: Connexions amb `status='active'` i (`next_sync_due_at` IS NULL o <= now()).
- **Query**: `SELECT id, org_id, region, seller_id, status, next_sync_due_at, backoff_minutes, last_error FROM spapi_connections WHERE status = 'active';`
- **Si totes tenen `next_sync_due_at` en el futur**: S’ha aplicat backoff per errors; esperar o posar `next_sync_due_at = NULL`, `backoff_minutes = 0` per tornar a intentar.
- **Si no hi ha connexions actives**: Revisar OAuth i `last_error`; connexions `inactive` poden tenir `seller_id_resolution_failed` — revisar callback i SP-API getMarketplaceParticipations.

### Molts "skipped: already running"

- **Causa**: Una instància del worker ja té el lock; una segona invocació (p.ex. cron overlap) retorna 200 skipped.
- **Event**: `SPAPI_WORKER_SKIPPED_LOCKED` (info).
- **Acció**: Normal si el cron corre cada 10 min i l’execució dura menys. Si el worker es penja sense alliberar el lock, el lock es allibera quan la sessió PostgreSQL es tanca (per tant en acabar la invocació Edge). No cal fer res tret que hi hagi un bug (no unlock en finally).

### Reports aturats en "failed"

- **Comprova**: `SELECT id, org_id, report_id, status, failed_attempts, last_attempt_at, last_error FROM spapi_reports WHERE status = 'failed' ORDER BY last_attempt_at DESC;`
- **Si `failed_attempts >= 5`**: Giveup; es loga `SPAPI_REPORT_GIVEUP` (critical). Revisar `last_error`; si cal, resetejar manualment `failed_attempts = 0` (i opcionalment `status = 'discovered'`) per tornar a intentar, i corregir la causa (p.ex. document_id, format CSV, quota SP-API).

### Backoff massiu (connexions no es tornen a intentar)

- **Query**: `SELECT id, org_id, seller_id, backoff_minutes, next_sync_due_at, last_error FROM spapi_connections WHERE status = 'active' AND next_sync_due_at > now();`
- **Event**: `SPAPI_BACKOFF_SET` (warn) amb `backoff_minutes`.
- **Acció**: Revisar `last_error` (LWA token, SP-API 429/5xx). Per forçar reintent: `UPDATE spapi_connections SET backoff_minutes = 0, next_sync_due_at = NULL WHERE id = ...;`

### Jobs CSV en "parsing" o "posting" aturats

- **Causa**: Edge `amazon-csv-parse` o post ha fallat sense actualitzar status.
- **Query**: `SELECT id, org_id, file_name, status, error, updated_at FROM amazon_import_jobs WHERE status IN ('parsing','posting') AND updated_at < now() - interval '1 hour';`
- **Acció**: Revisar logs de l’Edge; si cal, posar `status = 'failed'` i `error = 'manual_reset'` i tornar a processar (nou job o re-crida a amazon-csv-parse segons contracte).

### OAuth: connexió "inactive" o seller_id PENDING

- **Query**: `SELECT id, org_id, seller_id, status, last_error FROM spapi_connections WHERE status = 'inactive' OR seller_id = 'PENDING';`
- **Causa típica**: `seller_id_resolution_failed` — el callback no ha pogut obtenir el seller_id (ni de la URL ni de getMarketplaceParticipations).
- **Acció**: Revisar que l’app LWA té permisos SP-API Sellers; revisar logs del callback (SPAPI_SELLER_RESOLVE_*). L’usuari pot tornar a connectar (nou OAuth).

---

## Queries de diagnòstic

### Últims ops_events SP-API

```sql
SELECT id, org_id, source, event_type, severity, message, meta, created_at
FROM ops_events
WHERE event_type LIKE 'SPAPI_%'
ORDER BY created_at DESC
LIMIT 50;
```

### Últims runs per report

```sql
SELECT r.id, r.org_id, r.report_id, r.stage, r.status, r.message, r.created_at
FROM spapi_report_runs r
ORDER BY r.created_at DESC
LIMIT 30;
```

### Connexions i próxima sync

```sql
SELECT id, org_id, region, seller_id, status, last_sync_at, next_sync_due_at, backoff_minutes, last_error
FROM spapi_connections
ORDER BY next_sync_due_at NULLS FIRST;
```

### Reports per status

```sql
SELECT status, count(*) FROM spapi_reports GROUP BY status ORDER BY 1;
```

### Jobs Amazon (últims)

```sql
SELECT id, org_id, file_name, status, total_rows, parsed_rows, error, created_at
FROM amazon_import_jobs
ORDER BY created_at DESC
LIMIT 20;
```
