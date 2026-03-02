# FREEDOLIAPP — FASE 4 — Tracking (17TRACK) — Arquitectura Canònica (GLOBAL)

## Context
- F0 (Finances), F1 (Profit Amazon), F2 (SaaS Readiness), F3 (Business Alerts V1) completades i en producció.
- F3 estable: alert_definitions + alerts, dedupe per (org_id, dedupe_key), RLS Model C, RPCs acknowledge/resolve/mute, campana global + drawer.

## Objectiu F4 (sense codi / sense migracions en aquesta definició)
Definir arquitectura logística + contracte 17TRACK, idempotència, multi-tenant i integració amb Alertes (F3), preparada per shipments fins a:
- magatzem propi (3PL/warehouse)
- Amazon FBA (FC)
- qualsevol país (NO EU-only)

## Model de dades canònic (jerarquia)
Purchase Order (PO) → Shipments → Shipment Legs → Packages → Tracking Events

### Shipments
Un PO pot tenir múltiples shipments (split shipments).
Shipment és global, country-agnostic.

Camps conceptuals clau:
- origin_country (ISO-3166-1 alpha-2)
- destination_country (ISO-3166-1 alpha-2)
- destination_type: warehouse | amazon_fba
- destination_warehouse_id (nullable)
- destination_amazon_fc_code (nullable)
- destination_amazon_shipment_id (nullable, preparat per futur SP-API)
- destination_amazon_marketplace (nullable, preparat per global marketplaces)
- status: draft | in_transit | customs | delivered | exception | cancelled
- eta_estimated / eta_last_calculated

### Shipment Legs
Permet trams (pickup/main/customs/last_mile) amb ordre (sequence_number).
No obliga tracking per leg, però modela trajectes reals (fabricant→port→destí→Amazon FC).

### Packages
Cada package té (normalment) 1 tracking number.
- carrier_name
- tracking_number
- last_tracking_sync_at
- last_tracking_status
- delivered_at

Nota V1: casos de multi-tracking es representen com múltiples packages (simplictat robusta).

### Tracking Events (append-only)
Històric immutable d’esdeveniments:
- event_time, location, status_code, status_description
- raw_payload (jsonb)
- source='17track'
No s’edita mai; només INSERT.

## Contracte 17TRACK (estratègia)
- Polling first (no webhooks a V1).
- Batch polling.
- Només sync packages “actius” (in_transit/customs/exception).
- No sync si delivered + 7 dies (o regla equivalent).
- Permetre “manual sync” des de UI.

## Idempotència (dedupe events)
Evitar duplicats d’events 17TRACK:
Clau lògica recomanada:
(package_id, event_time, status_code, location)
Inserció idempotent: INSERT ON CONFLICT DO NOTHING.

## Multi-tenant / RLS
Tot sota org_id, coherència amb RLS Model C (owner_only/admin_owner) ja aplicat a F3.
No es dupliquen patrons: mateixes guardes i convencions de FREEDOLIAPP.

## Integració amb Alertes (F3)
Alertes automàtiques basades en tracking:
- SHIPMENT_STALLED (sense updates 72h)
- SHIPMENT_EXCEPTION
- SHIPMENT_DELAYED (ETA superada i no delivered)
- SHIPMENT_DELIVERED
- AMAZON_FBA_DELIVERED (alias quan destination_type=amazon_fba)

Dedupe_key recomanada:
- shipment:{shipment_id}:status:{new_status}
(o per package si cal granularitat: package:{package_id}:state:{state})

## Ordre d’implementació (fasejable)
- F4.1 Logistics Core Schema (shipments, legs, packages, events + RLS + indexos)
- F4.2 17TRACK Sync Base (polling batch + manual sync)
- F4.3 Alerts Integration (definitions + triggers/whitelist)
- F4.4 UI (Shipments tab dins PO + timeline + packages + tracking feed)

## Decisions (sí / no)
Sí:
- Model global (cap EU-only)
- Destí polimòrfic (warehouse vs amazon_fba)
- Events immutables + idempotència
- Integració nativa amb F3

No:
- No tracking directe a PO
- No webhooks primer
- No mutar events
- No “últim estat” sense històric

