# D11.2 — Feature Gating Engine

**Status:** estable  
**D11.7 — Billing Feature Gating Engine**

---

## Principi: single source of truth

La **única font de veritat** per a si una org pot usar una funcionalitat o respectar un límit és la taula **`billing_org_entitlements`**.

- **No** es fa gating per:
  - Stripe directament (API o plan_code).
  - Taula `billing_subscriptions` (només s’usa per alimentar entitlements).
  - Checks escampats per codi (plan name, flags a la DB no canònics).
- **Sí:** tot el gating es basa en:
  - `getOrgEntitlements(supabase, orgId)` → una sola lectura per acció (o per pàgina).
  - Helpers que llegeixen `features_jsonb` i `is_active` d’aquesta fila.

Això permet canviar plans i features des del webhook sense tocar frontend ni altres Edge Functions.

---

## Helper API

Mòdul: **`src/lib/billing/entitlements.js`**.

### Obtenir entitlements

```js
import { getOrgEntitlements } from '../lib/billing/entitlements'

const entitlements = await getOrgEntitlements(supabase, orgId)
```

- Llança `billing_entitlements_lookup_failed` si hi ha error de query.
- Llança `billing_entitlements_missing` si no hi ha fila per l’org.

### Comprovar feature (boolean)

```js
import { hasOrgFeature, assertOrgFeature } from '../lib/billing/entitlements'

if (!hasOrgFeature(entitlements, 'analytics')) {
  // mostrar "no disponible" o redirigir
  return
}

// o amb assert (llança si no té la feature):
assertOrgFeature(entitlements, 'profit_engine')
```

### Llegir límit numèric

```js
import { getOrgFeatureLimit, assertOrgWithinLimit } from '../lib/billing/entitlements'

const limit = getOrgFeatureLimit(entitlements, 'projects.max')  // 5 o null
const memberCount = 3
assertOrgWithinLimit(entitlements, 'team.seats', memberCount)  // llança si memberCount >= limit
```

### Comprovar org activa

```js
import { assertOrgActive } from '../lib/billing/entitlements'

assertOrgActive(entitlements)  // llança org_billing_inactive (403) si !is_active
```

---

## Errors canònics

| Error (message) | Significat | Status |
|-----------------|------------|--------|
| `billing_entitlements_lookup_failed` | Error de base de dades en llegir entitlements | 500 (o el que capturi l’app) |
| `billing_entitlements_missing` | No existeix fila d’entitlements per l’org | - |
| `org_billing_inactive` | L’org no té billing actiu (`is_active = false`) | 403 |
| `feature_not_available` | La feature no està habilitada per l’org | 403 |
| `plan_limit_reached` | S’ha assolit el límit del pla (projectes, seats, etc.) | 403 |

Els helpers `assert*` assignen `err.status = 403` als errors 403 perquè el frontend o l’API puguin respondre amb HTTP 403.

---

## Exemples d’ús

### 1. Bloquejar pàgina Analytics

```js
const entitlements = await getOrgEntitlements(supabase, activeOrgId)
if (!hasOrgFeature(entitlements, 'analytics')) {
  setAnalyticsBlocked(true)  // mostrar "no disponible al teu pla"
  return
}
// carregar dades...
```

### 2. Abans de crear projecte

```js
const entitlements = await getOrgEntitlements(supabase, orgId)
assertOrgActive(entitlements)
const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
assertOrgWithinLimit(entitlements, 'projects.max', count ?? 0)
// insert project...
```

### 3. Abans d’afegir membre (team.seats)

```js
const entitlements = await getOrgEntitlements(supabase, org.id)
assertOrgWithinLimit(entitlements, 'team.seats', seatsUsed)
await supabase.from('org_memberships').insert({ org_id: org.id, user_id: uid, role: 'member' })
```

### 4. Edge Function (Amazon ingest)

A `spapi-settlement-worker`, abans de processar una connexió:

- Llegir `billing_org_entitlements` per `org_id`.
- Comprovar `is_active`.
- Comprovar `features_jsonb.amazon_ingest.enabled === true`.
- Si falla: retornar 403 amb `{ error: 'feature_not_available' }` o `org_billing_inactive`.

### 5. Profit engine (recompute)

Abans de cridar `rpc_profit_recompute_org`:

```js
const entitlements = await getOrgEntitlements(supabase, activeOrgId)
assertOrgFeature(entitlements, 'profit_engine')
await supabase.rpc('rpc_profit_recompute_org', { ... })
```

---

## Resum

- **Font única:** `billing_org_entitlements`.
- **Helpers:** `getOrgEntitlements`, `hasOrgFeature`, `getOrgFeatureLimit`, `assertOrgActive`, `assertOrgFeature`, `assertOrgWithinLimit`.
- **Errors:** `billing_entitlements_*`, `org_billing_inactive`, `feature_not_available`, `plan_limit_reached`.
- **Llocs on s’aplica:** crear projecte, afegir membre, Amazon ingest (UI + Edge), analytics (pàgina), profit engine (recompute).
