# F4.2 — Cron: 17TRACK Tracking Sync

Schedule the Edge Function `tracking-sync` to run **every 15 minutes**.

## Supabase Dashboard

1. **Project** → **Database** → **Cron Jobs** (or **Integrations** → **Cron**).
2. Create a new cron job:
   - **Name**: `tracking-sync`
   - **Schedule**: `*/15 * * * *` (every 15 min)
   - **Endpoint**: `POST https://<project-ref>.supabase.co/functions/v1/tracking-sync`
   - **Headers**: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Alternatively use **pg_cron** + **pg_net** (if enabled) to call the function from SQL.

## Environment

Set `TRACKING_17TRACK_TOKEN` in the Edge Function secrets (Dashboard → Project Settings → Edge Functions → Secrets).
