# D11 — Billing Engine (Arquitectura)

**Status:** estable  
**Última revisió:** D11.7 — Feature Gating Engine

---

## 1️⃣ Overview

El Billing Engine de FREEDOLIAPP governa l’accés a funcionalitats i límits per organització. La **font única de veritat** per a què pot fer una org és la taula **`billing_org_entitlements`**.

- **Stripe** s’utilitza per cobrament i subscripcions; no s’ha de fer gating directe per `plan_code` ni per API Stripe.
- **Checkout** crea/actualitza subscripcions; el **webhook** actualitza `billing_subscriptions` i **`billing_org_entitlements`**.
- Tota lògica de feature gating i límits llegeix **només** `billing_org_entitlements`.

---

## 2️⃣ Stripe Checkout Flow

1. Usuari a **Configuració → Billing** (o equivalent) clica “Upgrade” / “Gestionar facturació”.
2. Frontend invoca Edge Function **`stripe_create_checkout`** (o `stripe_create_checkout_session`) amb `org_id`.
3. La funció:
   - Verifica que l’usuari pertany a l’org (membership).
   - Crea o reutilitza **Stripe Customer** (via `billing_customers`).
   - Crea una **Stripe Checkout Session** amb el price_id del pla.
4. Es redirigeix l’usuari a la URL de Checkout de Stripe.
5. Després del pagament, Stripe envia esdeveniments al webhook; la sessió no actualitza directament la base de dades.

---

## 3️⃣ Stripe Webhook Flow

1. **Endpoint:** Edge Function `stripe_webhook`.
2. **Seguretat:** `verify_jwt = false`; verificació amb **Stripe-Signature** i `STRIPE_WEBHOOK_SECRET`.
3. Esdeveniments rellevants (ex.: `customer.subscription.created/updated/deleted`, `invoice.paid`) es processen per:
   - Actualitzar **`billing_subscriptions`** (status, period_end, stripe_subscription_id, etc.).
   - Actualitzar **`billing_org_entitlements`** per l’org afectada: `billing_status`, `is_active`, `seat_limit`, **`features_jsonb`**.
4. El contingut de `features_jsonb` i `seat_limit` ve determinat per la lògica del webhook (mapeig pla → features i límits).

---

## 4️⃣ billing_subscriptions

- **Rol:** emmagatzemar l’estat de la subscripció Stripe per org.
- **Camps rellevants:** `org_id`, `stripe_subscription_id`, `status`, `access_status`, `current_period_start/end`, `trial_ends_at`, `grace_until`.
- **Polítiques:** SELECT per membres de l’org; INSERT/UPDATE/DELETE només des del backend (Edge Functions / service role).
- **No s’utilitza** per gating directe a l’app; només per alimentar `billing_org_entitlements` i per la UI de billing.

---

## 5️⃣ billing_org_entitlements

- **Rol:** **font única de veritat** per a què pot fer una org (features i límits).
- **Camps rellevants:**
  - `org_id` (unique)
  - `billing_status` (ex.: active, restricted)
  - `is_active` (boolean): si l’org té accés de billing actiu
  - `seat_limit`: màxim de membres (team.seats)
  - **`features_jsonb`**: objecte amb features i límits (ex. `amazon_ingest.enabled`, `projects.max`, `team.seats`).
- **Actualització:** només des del webhook (o jobs backend); cap write des del client.
- **Lectura:** frontend i Edge Functions poden llegir (RLS permet SELECT per membres de l’org) per fer gating.

---

## 6️⃣ Feature Gating Architecture

- **Cap:** `src/lib/billing/entitlements.js` amb helpers canònics.
- **Flux:** abans d’executar una acció protegida (crear projecte, afegir membre, executar ingest Amazon, obrir analytics, cridar profit engine):
  1. Obtenir entitlements: `getOrgEntitlements(supabase, orgId)`.
  2. Comprovar org activa: `assertOrgActive(entitlements)`.
  3. Per features: `assertOrgFeature(entitlements, featureCode)` o `hasOrgFeature(entitlements, featureCode)`.
  4. Per límits: `assertOrgWithinLimit(entitlements, featureCode, currentValue)`.
- **Backend (Edge):** la funció `spapi-settlement-worker` comprova `amazon_ingest.enabled` abans de processar; retorna 403 si no hi ha entitlement o feature desactivada.

---

## 7️⃣ features_jsonb structure

Exemple (conceptual):

```json
{
  "amazon_ingest": { "enabled": true },
  "profit_engine": { "enabled": true },
  "analytics": { "enabled": true },
  "projects.max": { "limit": 5 },
  "team.seats": { "limit": 1 }
}
```

- **Features booleanes:** clau (ex. `amazon_ingest`, `profit_engine`, `analytics`) amb `enabled: true/false`.
- **Límits numèrics:** clau (ex. `projects.max`, `team.seats`) amb `limit: N`.
- Els helpers `hasOrgFeature` i `getOrgFeatureLimit` llegeixen aquestes claus.

---

## 8️⃣ Billing lifecycle states

- **active:** org amb subscripció vàlida (o dins trial/grace); `is_active = true`.
- **restricted / past_due:** accés limitat; el webhook pot posar `is_active = false` o ajustar `features_jsonb`.
- **canceled:** subscripció cancel·lada; entitlements es poden posar a restricted i desactivar features.

El comportament exacte (trial_ends_at, grace_until, etc.) es defineix a la lògica del webhook i a les polítiques de producte.

---

## 9️⃣ Feature gating helpers

Definits a `src/lib/billing/entitlements.js`:

| Funció | Descripció |
|--------|------------|
| `getOrgEntitlements(supabase, orgId)` | Retorna la fila d’entitlements de l’org; llança si error o sense fila. |
| `hasOrgFeature(entitlements, featureCode)` | Retorna true si la feature existeix i `enabled === true`. |
| `getOrgFeatureLimit(entitlements, featureCode)` | Retorna `feature.limit` o null. |
| `assertOrgActive(entitlements)` | Llança `org_billing_inactive` (403) si no és actiu. |
| `assertOrgFeature(entitlements, featureCode)` | Llança `feature_not_available` (403) si la feature no està habilitada. |
| `assertOrgWithinLimit(entitlements, featureCode, currentValue)` | Llança `plan_limit_reached` (403) si `currentValue >= limit`. |

---

## 🔟 Limits enforcement

- **projects.max:** abans de crear un projecte, es compta el nombre de projectes de l’org i es crida `assertOrgWithinLimit(entitlements, "projects.max", projectCount)`. Implementat a `createProject` (supabase.js) i payload amb `org_id` des de NewProjectModal.
- **team.seats:** abans d’afegir un membre a l’org, es compta el nombre de membres i es crida `assertOrgWithinLimit(entitlements, "team.seats", memberCount)`. Implementat a Settings (handleAddMember).

Errors canònics retornats als usuaris: `org_billing_inactive`, `feature_not_available`, `plan_limit_reached` (amb status 403 on s’exposa).
