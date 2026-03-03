# FREEDOLIAPP — FASE 6 — Observability (Overview)

## Objectiu F6

Proveir un sistema d’observabilitat operativa per al pipeline financer (quarterly pack, worker, health checks) i per a esdeveniments estructurats que permetin diagnosticar i actuar davant de fallades o degradacions.

## Components

| Component | Descripció |
|-----------|------------|
| **ops_events** | Taula append-only d’esdeveniments operatius (job started/done/failed, worker tick, health run). |
| **ops_health_checks** | Definició dels checks (id, name, severity, config). Seed: QUEUE_BACKLOG, WORKER_HEARTBEAT, JOB_FAILURE_SPIKE, RATES_FRESHNESS, LOCKED_PACK_MISSING. |
| **ops_health_runs** | Resultats de cada execució (check_id, org_id, status pass/fail, message, meta). |
| **Runner RPC** | `run_ops_health_checks()` — SECURITY DEFINER; valida finance viewer; per cada check enabled calcula pass/fail, insereix run, i si fail crea alerta (F3) + log a ops_events. |
| **Scheduled Edge** | `ops-health-runner` — Edge function invocada cada 5 min; crida `run_ops_health_checks()` amb service role; registra HEALTH_RUN_STARTED / HEALTH_RUN_DONE / HEALTH_RUN_FAILED a ops_events. |

## Definition of Done (F6)

- [x] Taula `ops_events` creada amb RLS (SELECT finance viewer / global admins; INSERT només service role).
- [x] Edge `generate-quarter-pack` i `quarter-pack-worker` instrumentats amb `logOpsEvent` (JOB_*, WORKER_*).
- [x] Taules `ops_health_checks` i `ops_health_runs` amb RLS i seed de 5 checks.
- [x] RPC `run_ops_health_checks()` implementat; en fail crea alerta amb dedupe `ops:{check}:{org}:{date}`.
- [x] Edge `ops-health-runner` desplegada i programada (cron */5 * * * *).
- [x] Documentació D6 (overview, ops_events, health checks, alerts ops, runbook).

## Què entra a F6

- Logging estructurat d’esdeveniments (job, worker, health run).
- Health checks definits a DB amb config JSON.
- Execució periòdica dels checks i registre a `ops_health_runs`.
- Integració amb alertes (F3): checks en fail disparen alertes amb patró de dedupe.
- Runbook: “si passa X, fes Y” i queries de diagnòstic.

## Què NO entra a F6

- UI per visualitzar ops_events o health runs (futur).
- Métriques exportades a sistemes externs (Prometheus, etc.).
- Logs d’aplicació frontend (només backend/edge).
- Nous tipus de checks més enllà dels 5 inicials (es poden afegir via migració).
