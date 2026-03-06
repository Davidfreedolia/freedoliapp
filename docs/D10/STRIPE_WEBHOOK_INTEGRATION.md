# FREEDOLIAPP — STRIPE WEBHOOK INTEGRATION

**Status:** ACTIVE  
**Date:** 2026-03-04  
**Owner:** Freedoliapp Backend

---

## 1. OBJECTIU

Integrar Stripe amb Freedoliapp SaaS mitjançant Webhooks perquè els events de billing activin la lògica d'organització, plans i subscripcions.

**Arquitectura:**

```
Stripe
   │
   │ Webhook Events
   ▼
Supabase Edge Function
stripe_webhook
   │
   │ Stripe-Signature verification
   ▼
Freedoliapp Billing Logic
   │
   ├ create workspace
   ├ assign plan
   ├ update subscription state
   └ billing enforcement
```

---

## 2. ENDPOINT

**Webhook URL**

```
https://edjwsrkcxcktnbbskpjy.functions.supabase.co/stripe_webhook
```

**Supabase Function:**

`supabase/functions/stripe_webhook`

---

## 3. SEGURETAT

JWT desactivat per aquesta funció:

**Fitxer:** `supabase/config.toml`

```toml
[functions.stripe_webhook]
verify_jwt = false
```

**Motiu:** Stripe no envia header `Authorization`.

La seguretat es basa en:

- **Stripe-Signature** + **STRIPE_WEBHOOK_SECRET**

---

## 4. SIGNATURE VERIFICATION

Supabase Edge Runtime (Deno) requereix verificació asíncrona.

**Codi correcte:**

```ts
const rawBody = await req.text();

const sig =
  req.headers.get("stripe-signature") ??
  req.headers.get("Stripe-Signature");

event = await stripe.webhooks.constructEventAsync(
  rawBody,
  sig,
  STRIPE_WEBHOOK_SECRET
);
```

**Important:** NO parsejar JSON abans de la verificació.

---

## 5. SECRET

**Secret utilitzat:** `STRIPE_WEBHOOK_SECRET`

**Configuració:**

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 6. EVENTS CONFIGURATS A STRIPE

**Webhook endpoint:** Freedoliapp Stripe Webhook

**Events principals:**

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

---

## 7. TEST

**Test via Stripe:** Webhook → Entregas de eventos → Reenviar

**Resposta esperada:**

- **200**
- `{ "received": true }`

---

## 8. PROBLEMES RESOLTS

### Error 401 Missing Authorization

**Causa:** Supabase exigia JWT.

**Solució:** `verify_jwt = false` a `config.toml` + deploy amb `--no-verify-jwt`.

### Error: SubtleCryptoProvider cannot be used in a synchronous context

**Causa:** `constructEvent()` incompatible amb Edge runtime.

**Solució:** `constructEventAsync()`.

---

## 9. ESTAT

**Stripe Webhook:** FUNCIONANT

**Status:** PRODUCTION READY
