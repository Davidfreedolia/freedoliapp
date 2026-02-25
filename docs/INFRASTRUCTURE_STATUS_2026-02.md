# Infrastructure Status — Feb 2026

## Domain
- Primary: https://freedoliapp.com
- www → 308 redirect to apex
- SSL: Ready
- DNS: Cloudflare (DNS only)
- Vercel: Production linked

## Supabase
Project ID: edjwsrkcxcktnbbskpjy
Region: eu-west-1

### Edge Functions deployed:
- stripe_webhook
- stripe_create_checkout
- stripe_create_portal

JWT verification at gateway: OFF  
JWT validation handled manually inside functions.

### Required Secrets:
- STRIPE_SECRET_KEY (test)
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_CORE
- APP_BASE_URL
- SUPABASE_ANON_KEY
