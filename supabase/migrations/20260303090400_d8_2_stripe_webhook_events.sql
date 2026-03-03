-- D8.2 — Idempotency for Stripe webhook: skip duplicate event_id

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No client access; only service role used by Edge
create policy "stripe_webhook_events_no_select"
  on public.stripe_webhook_events for select using (false);
create policy "stripe_webhook_events_no_insert"
  on public.stripe_webhook_events for insert with check (false);
create policy "stripe_webhook_events_no_update"
  on public.stripe_webhook_events for update using (false);
create policy "stripe_webhook_events_no_delete"
  on public.stripe_webhook_events for delete using (false);
