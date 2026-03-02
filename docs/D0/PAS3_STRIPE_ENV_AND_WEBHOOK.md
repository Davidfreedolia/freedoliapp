# PAS 3 — Stripe serverless: env vars i webhook (CBA)

## Variables d'entorn (serverless / Vercel)

| Variable | Obligat | Descripció |
|----------|---------|------------|
| `STRIPE_SECRET_KEY` | Sí (checkout/portal/webhook) | Clau secreta Stripe (sk_...) |
| `STRIPE_WEBHOOK_SECRET` | Sí (webhook) | Secret del webhook (whsec_...) |
| `APP_URL` | Sí (checkout/portal) | URL base de l'app (ex: https://freedoliapp.com) |
| `SUPABASE_URL` | Sí | URL del projecte Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Service role key (només serverless; mai al frontend) |
| `SUPABASE_ANON_KEY` | Sí (checkout/portal) | Anon key per verificar JWT |
| `STRIPE_PRICE_ID` | Opcional | Price ID per defecte (ex: price_xxx); si no, s'envia `price_id` al body |

## Endpoints

- **POST** `/api/stripe/create-checkout-session` — Auth: Bearer JWT; body: `{ org_id, price_id?, quantity?, trial_days? }`. Retorna `{ url }`.
- **POST** `/api/stripe/create-portal-session` — Auth: Bearer JWT; body: `{ org_id }`. Requereix `orgs.stripe_customer_id`; retorna `{ url }`.
- **POST** `/api/stripe/webhook` — Signature Stripe; sense JWT. Idempotència per `event.id`.

## Provar el webhook amb Stripe CLI

1. Instal·lar [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Login: `stripe login`
3. Forward esdeveniments al endpoint local (o a una URL de prova):
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```
   O a un deploy:
   ```bash
   stripe listen --forward-to https://el-teu-domini.com/api/stripe/webhook
   ```
4. El CLI mostra un **webhook signing secret** temporal (whsec_...). Configura'l a `STRIPE_WEBHOOK_SECRET` per l'entorn.
5. Disparar un event de prova:
   ```bash
   stripe trigger checkout.session.completed
   ```
   o
   ```bash
   stripe trigger customer.subscription.updated
   ```
6. Comprovar que el webhook retorna 200 i que `orgs` (i opcionalment `stripe_webhook_events`) s'actualitzen segons l'event.

## Raw body (Vercel)

Per verificar la signatura, el webhook necessita el **cos en brut** de la petició. Si el body arriba parsejat (objecte JSON), la verificació pot fallar. En entorns on Vercel parseja el body per defecte, cal configurar la ruta per rebre el raw body (p. ex. desactivar body parser per aquest endpoint si la plataforma ho permet).
