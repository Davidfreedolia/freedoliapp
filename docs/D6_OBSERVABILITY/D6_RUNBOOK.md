# D6 — Runbook (Si passa X, fes Y)

## Backlog (QUEUE_BACKLOG fail)

**Si passa**: Alert "Ops: quarterly queue backlog" — massa jobs en cua (queued) per l’org.

**Fes**:
1. Consultar quants jobs queden en `queued`:  
   `SELECT COUNT(*), org_id FROM quarterly_export_jobs WHERE status = 'queued' GROUP BY org_id;`
2. Comprovar que el **quarter-pack-worker** s’està executant (cron cada 5 min): revisar logs o `ops_events` per `WORKER_TICK` recent.
3. Si el worker corre i la cua no baixa: augmentar `max_queued` a la config del check o escalar el processament (més workers / més freqüència).
4. Si hi ha jobs `running` més de `stuck_minutes` (15): investigar si `generate-quarter-pack` s’ha penjat; mirar `ops_events` (JOB_STARTED sense JOB_DONE).

**Query ràpida**:
```sql
SELECT id, org_id, year, quarter, status, created_at
FROM quarterly_export_jobs
WHERE status IN ('queued', 'running')
ORDER BY created_at ASC;
```

---

## Worker heartbeat missing (WORKER_HEARTBEAT fail)

**Si passa**: No s’ha vist cap `WORKER_TICK` en els últims N minuts (config: max_minutes_since_tick = 10).

**Fes**:
1. Comprovar que la Edge Function **quarter-pack-worker** està programada (Supabase Dashboard → Edge Functions → Cron / Triggers).
2. Comprovar que **ops-health-runner** s’executa (el heartbeat és del worker de quarter-pack, no del health runner). Revisar `ops_events`: `WHERE source = 'worker' AND event_type = 'WORKER_TICK' ORDER BY created_at DESC LIMIT 1`.
3. Revisar logs del worker (Supabase logs) per errors de connexió o timeout.
4. Si el cron no dispara: revisar configuració del cron (p. ex. `*/5 * * * *` per cada 5 min).

**Query ràpida**:
```sql
SELECT created_at, event_type, meta
FROM ops_events
WHERE source = 'worker' AND event_type = 'WORKER_TICK'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Spike failures (JOB_FAILURE_SPIKE fail)

**Si passa**: Massa jobs `failed` en les últimes 24 hores per l’org (per defecte > 5).

**Fes**:
1. Llistar jobs fallits:  
   `SELECT id, org_id, year, quarter, error, created_at FROM quarterly_export_jobs WHERE status = 'failed' AND created_at >= now() - interval '24 hours' ORDER BY created_at DESC;`
2. Revisar el camp `error` dels jobs per veure el motiu (ex: `missing_exchange_rate`, timeout, etc.).
3. Consultar `ops_events` per `event_type = 'JOB_FAILED'` i `meta->>'error'` per patrons.
4. Si el problema és tipus de canvi: assegurar que `exchange_rates_daily` té dades per les dates necessàries (RATES_FRESHNESS).
5. Si és recurrent: ajustar `max_failed_24h` temporalment o corregir la causa (rates, mida del ledger, etc.).

**Query ràpida**:
```sql
SELECT id, org_id, year, quarter, error, created_at
FROM quarterly_export_jobs
WHERE status = 'failed' AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## Missing rates (RATES_FRESHNESS fail)

**Si passa**: La data màxima a `exchange_rates_daily` és més antiga que `max_days_old` (per defecte 2 dies).

**Fes**:
1. Comprovar la data més recent:  
   `SELECT MAX(rate_date) AS latest FROM exchange_rates_daily;`
2. Executar o revisar el procés que omple `exchange_rates_daily` (sync ECB / Frankfurter o manual).
3. Inserir rates per les dates faltants (via RPC o script amb service role).
4. Opcional: augmentar temporalment `max_days_old` si el proveïdor de rates té retard (cap setmana, etc.).

**Query ràpida**:
```sql
SELECT rate_date, base_currency, currency, rate_to_base
FROM exchange_rates_daily
ORDER BY rate_date DESC
LIMIT 20;
```

---

## Locked pack missing (LOCKED_PACK_MISSING fail)

**Si passa**: Després de tancar un trimestre (accounting_period status = 'locked'), no hi ha cap job `done` amb `period_status = 'locked'` per aquella org (o la lògica espera almenys un pack generat).

**Fes**:
1. Comprovar períodes locked:  
   `SELECT org_id, year, quarter, status, locked_at FROM accounting_periods WHERE status = 'locked' ORDER BY locked_at DESC;`
2. Comprovar jobs done locked:  
   `SELECT id, org_id, year, quarter, period_status, status, file_path FROM quarterly_export_jobs WHERE period_status = 'locked' AND status = 'done';`
3. Si el trigger ha encuat el job però encara no s’ha processat: esperar el worker o comprovar cua (`queued`).
4. Si el job ha fallat: revisar JOB_FAILED a ops_events i el camp `error` del job; corregir (rates, etc.) i, si cal, tornar a sol·licitar pack (request_quarter_pack per al trimestre locked) o re-executar el worker.

**Query ràpida**:
```sql
SELECT ap.org_id, ap.year, ap.quarter, ap.locked_at,
       (SELECT COUNT(*) FROM quarterly_export_jobs qj
        WHERE qj.org_id = ap.org_id AND qj.year = ap.year AND qj.quarter = ap.quarter
          AND qj.period_status = 'locked' AND qj.status = 'done') AS done_packs
FROM accounting_periods ap
WHERE ap.status = 'locked'
ORDER BY ap.locked_at DESC;
```

---

## Queries ràpides per diagnosticar (resum)

| Situació | Query |
|----------|--------|
| Últims esdeveniments ops | `SELECT * FROM ops_events ORDER BY created_at DESC LIMIT 50;` |
| Últims health runs | `SELECT * FROM ops_health_runs ORDER BY created_at DESC LIMIT 20;` |
| Runs fallits per check | `SELECT check_id, status, message, created_at FROM ops_health_runs WHERE status = 'fail' ORDER BY created_at DESC;` |
| Jobs en cua/executant | `SELECT id, org_id, year, quarter, status FROM quarterly_export_jobs WHERE status IN ('queued','running');` |
| Jobs fallits 24h | `SELECT id, org_id, error, created_at FROM quarterly_export_jobs WHERE status = 'failed' AND created_at >= now() - interval '24 hours';` |
