# D6 — Alertes Ops (Mapping checks → alertes)

## Mapping checks → alert types

Totes les alertes generades pels health checks fan servir la **mateixa** definició d’alerta:

- **alert_definitions.code**: `OPS_HEALTH`
- **category**: `ops`
- **default_severity**: `high`
- **default_visibility_scope**: `admin_owner`

El **títol** i el **missatge** varien segons el check que ha fallat:

| check_id | title (exemple) | severity a alerts |
|----------|------------------|--------------------|
| QUEUE_BACKLOG | Ops: quarterly queue backlog | high |
| WORKER_HEARTBEAT | Ops: quarterly worker heartbeat | critical |
| JOB_FAILURE_SPIKE | Ops: quarterly job failure spike | error (payload) |
| RATES_FRESHNESS | Ops: exchange rates freshness | warn |
| LOCKED_PACK_MISSING | Ops: locked period pack missing | critical |

## Patró dedupe key

Per evitar múltiples alertes obertes pel mateix problema el mateix dia:

- **Format**: `ops:{check_id}:{org_id}:{YYYY-MM-DD}`
- **Exemple**: `ops:WORKER_HEARTBEAT:a1b2c3d4-...:2026-02-28`

El RPC `run_ops_health_checks()` fa `INSERT ... ON CONFLICT (org_id, dedupe_key) WHERE status IN ('open','acknowledged') DO UPDATE SET last_seen_at = now()`, de manera que només hi ha una alerta oberta per (org, check, dia); es refresca `last_seen_at` si el check segueix fallant.

## Severitat

- **check severity** (ops_health_checks): defineix la gravetat operativa del check (warn/error/critical).
- **alert severity** (alerts): es pot mapear des del check (ex: WORKER_HEARTBEAT → critical, RATES_FRESHNESS → warn) per prioritzar a la campana global i al drawer d’alertes (F3).
