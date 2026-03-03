# D7 — SP-API OAuth (Connexió Central App)

## Objectiu

Permetre a una org connectar el compte Amazon (Seller Central) via OAuth LWA i desar el refresh token de forma segura perquè el worker pugui obtenir informes de settlement sense interacció de l'usuari.

## Taula: spapi_connections

- **Columnes**: id, org_id, region (EU|NA|FE), seller_id, marketplace_ids, lwa_client_id, lwa_refresh_token_enc (bytea xifrat), status (active|inactive|revoked), last_sync_at, last_error, next_sync_due_at, backoff_minutes, created_by, created_at, updated_at.
- **Unique**: (org_id, seller_id, region).
- **Seguretat**: El token mai es retorna al client; només es desxifra dins get_spapi_connection_for_worker (service_role).

## RPCs OAuth / Connexió

- **upsert_spapi_connection(...)** — authenticated (owner/admin). Versió client; no s'usa al flux OAuth actual.
- **upsert_spapi_connection_from_backend(...)** — service_role. Des de l'Edge callback: xifra el token i fa INSERT/UPDATE a spapi_connections.
- **get_spapi_connection_safe()** — authenticated (finance viewer). Retorna llista de connexions de l'org sense token (per UI).
- **get_spapi_connection_for_worker(p_connection_id)** — service_role. Retorna connexió amb lwa_refresh_token_plain desxifrat.

## Edge: spapi-oauth-init

- **Mètode**: POST, JWT autenticat. **Body**: org_id, user_id, region, marketplace_ids.
- **Flow**: Genera state (JWT signat amb OAUTH_STATE_SECRET), construeix URL de consent LWA, retorna state, consent_url, redirect_uri.
- **Secrets**: OAUTH_STATE_SECRET, LWA_CLIENT_ID.

## Edge: spapi-oauth-callback

- **Mètode**: GET (redirect des d'Amazon). **Query**: state, spapi_oauth_code, opcional selling_partner_id.
- **Flow**: Verifica state → intercanvi code per refresh_token/access_token (LWA) → resol seller_id (query o SP-API getMarketplaceParticipations) → upsert_spapi_connection_from_backend → log SPAPI_OAUTH_CONNECTED / FAILED, SPAPI_SELLER_RESOLVE_* → redirect a l'app via SPAPI_APP_BASE_URL.

## Flux UI

1. Usuari clica Connect Amazon (SP-API).
2. Frontend crida spapi-oauth-init, guarda state i redirect_uri a sessionStorage, redirigeix a consent_url.
3. Amazon redirigeix a Log-in URI (pàgina app) amb params; la pàgina reenvia a l'Edge callback.
4. Callback desa la connexió i redirigeix a l'app; UI mostra llista via get_spapi_connection_safe() i toasts.

## Observability

- Events: SPAPI_OAUTH_CONNECTED, SPAPI_OAUTH_FAILED, SPAPI_SELLER_RESOLVE_STARTED / DONE / FAILED. Si seller_id no es resol: connexió seller_id=PENDING, status=inactive, last_error=seller_id_resolution_failed.
