# D6 — Health Checks (Taules, configs, nous checks)

## Taules

### ops_health_checks

| Columna | Tipus | Descripció |
|---------|--------|------------|
| id | text PK | Identificador únic (ex: QUEUE_BACKLOG) |
| name | text | Nom per a humans |
| severity | text | 'warn' \| 'error' \| 'critical' |
| is_enabled | boolean | default true |
| config | jsonb | Paràmetres del check (max_queued, max_minutes_since_tick, etc.) |
| created_at, updated_at | timestamptz | |

### ops_health_runs

| Columna | Tipus | Descripció |
|---------|--------|------------|
| id | uuid PK | |
| check_id | text FK | ops_health_checks(id) |
| org_id | uuid NULL | NULL per checks globals (worker, rates) |
| status | text | 'pass' \| 'fail' |
| message | text | Missatge descriptiu |
| meta | jsonb | Dades del resultat (counts, timestamps) |
| created_at | timestamptz | |

## Seed checks i configs

| id | name | severity | config |
|----|------|----------|--------|
| QUEUE_BACKLOG | Quarterly pack queue backlog | warn | max_queued: 10, max_running: 10, stuck_minutes: 15 |
| WORKER_HEARTBEAT | Quarterly worker heartbeat | error | max_minutes_since_tick: 10 |
| JOB_FAILURE_SPIKE | Quarterly job failure spike | error | max_failed_24h: 5 |
| RATES_FRESHNESS | Exchange rates freshness | warn | max_days_old: 2 |
| LOCKED_PACK_MISSING | Locked pack missing after grace window | critical | grace_minutes: 15 |

## Com afegir un check nou

1. **Inserir a `ops_health_checks`** (migració o SQL):

```sql
INSERT INTO public.ops_health_checks (id, name, severity, config)
VALUES (
  'MY_CHECK_ID',
  'My check name',
  'warn',  -- o 'error', 'critical'
  '{"max_count": 5}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  severity = EXCLUDED.severity,
  config = EXCLUDED.config;
```

2. **Afegir la lògica dins `run_ops_health_checks()`** (migració amb CREATE OR REPLACE):

- Llegir `config` des de `ops_health_checks` per `id = 'MY_CHECK_ID'` i `is_enabled = true`.
- Calcular `v_pass` (boolean) i `v_message` (text).
- Fer `INSERT` a `ops_health_runs` amb check_id, org_id (si escau), status, message, meta.
- Si `NOT v_pass`, crear alerta (alert_definitions OPS_HEALTH + dedupe_key `ops:MY_CHECK_ID:{org_id}:{date}`) i opcionalment log a ops_events (HEALTH_CHECK_FAIL).

## Com interpretar pass/fail

- **pass**: El check ha passat; no es crea alerta. El run queda registrat per històric.
- **fail**: S’ha superat el llindar (config). Es registra el run amb status 'fail' i es crea/actualitza una alerta amb dedupe per (org, check, data) per evitar spam. Acció: consultar el runbook (D6_RUNBOOK.md) segons el check_id.
