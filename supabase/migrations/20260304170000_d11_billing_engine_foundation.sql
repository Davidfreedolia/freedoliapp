-- =============================================================================
-- D11 — Billing Engine Foundation (canonical)
-- Multi-tenant (org_id). RLS: read for org members; write only via webhook/service role.
-- =============================================================================

-- =========================================================
-- EXTENSIONS
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'billing_subscription_status'
  ) then
    create type public.billing_subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired'
    );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'billing_access_status'
  ) then
    create type public.billing_access_status as enum (
      'trialing',
      'active',
      'grace',
      'past_due',
      'canceled',
      'restricted'
    );
  end if;
end$$;

-- =========================================================
-- UPDATED_AT HELPER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- BILLING PLANS
-- =========================================================

create table if not exists public.billing_plans (

  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,

  is_active boolean not null default true,

  monthly_price numeric(12,2),
  yearly_price numeric(12,2),
  currency text not null default 'EUR',

  stripe_product_id text,
  stripe_price_monthly_id text unique,
  stripe_price_yearly_id text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

create index if not exists idx_billing_plans_active
on public.billing_plans (is_active);

-- =========================================================
-- BILLING PLAN FEATURES
-- =========================================================

create table if not exists public.billing_plan_features (

  id uuid primary key default gen_random_uuid(),

  plan_id uuid not null
  references public.billing_plans(id)
  on delete cascade,

  feature_code text not null,
  enabled boolean not null default true,
  limit_value integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id, feature_code)

);

create index if not exists idx_billing_plan_features_plan_id
on public.billing_plan_features(plan_id);

create index if not exists idx_billing_plan_features_feature_code
on public.billing_plan_features(feature_code);

-- =========================================================
-- BILLING CUSTOMERS
-- =========================================================

create table if not exists public.billing_customers (

  id uuid primary key default gen_random_uuid(),

  org_id uuid not null
  references public.orgs(id)
  on delete cascade,

  stripe_customer_id text not null unique,

  email text,
  full_name text,

  is_default boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

create index if not exists idx_billing_customers_org_id
on public.billing_customers(org_id);

create index if not exists idx_billing_customers_stripe_customer_id
on public.billing_customers(stripe_customer_id);

-- només un customer default per org
create unique index if not exists uq_billing_customers_org_default_true
on public.billing_customers(org_id)
where is_default = true;

-- =========================================================
-- BILLING SUBSCRIPTIONS
-- =========================================================

create table if not exists public.billing_subscriptions (

  id uuid primary key default gen_random_uuid(),

  org_id uuid not null
  references public.orgs(id)
  on delete cascade,

  billing_customer_id uuid not null
  references public.billing_customers(id)
  on delete cascade,

  plan_id uuid
  references public.billing_plans(id)
  on delete set null,

  stripe_subscription_id text not null unique,
  stripe_price_id text,
  stripe_product_id text,

  status public.billing_subscription_status not null,
  access_status public.billing_access_status not null default 'restricted',

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,

  trial_ends_at timestamptz,
  grace_until timestamptz,

  raw_event jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

create index if not exists idx_billing_subscriptions_org_id
on public.billing_subscriptions(org_id);

create index if not exists idx_billing_subscriptions_status
on public.billing_subscriptions(status);

-- =========================================================
-- BILLING ENTITLEMENTS (SNAPSHOT)
-- =========================================================

create table if not exists public.billing_org_entitlements (

  id uuid primary key default gen_random_uuid(),

  org_id uuid not null unique
  references public.orgs(id)
  on delete cascade,

  plan_id uuid
  references public.billing_plans(id)
  on delete set null,

  subscription_id uuid
  references public.billing_subscriptions(id)
  on delete set null,

  billing_status public.billing_access_status not null default 'restricted',

  seat_limit integer not null default 1,

  features_jsonb jsonb not null default '{}'::jsonb,

  grace_until timestamptz,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

-- =========================================================
-- BILLING INVOICES
-- =========================================================

create table if not exists public.billing_invoices (

  id uuid primary key default gen_random_uuid(),

  org_id uuid not null
  references public.orgs(id)
  on delete cascade,

  subscription_id uuid
  references public.billing_subscriptions(id)
  on delete set null,

  stripe_invoice_id text not null unique,

  status text,

  amount_due bigint,
  amount_paid bigint,
  currency text,

  hosted_invoice_url text,
  invoice_pdf_url text,

  period_start timestamptz,
  period_end timestamptz,

  paid_at timestamptz,

  raw_event jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

-- =========================================================
-- WEBHOOK EVENTS (IDEMPOTENCY)
-- =========================================================

create table if not exists public.billing_webhook_events (

  id uuid primary key default gen_random_uuid(),

  stripe_event_id text not null unique,
  event_type text not null,

  processed boolean not null default false,
  processed_at timestamptz,

  payload jsonb not null,

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()

);

-- =========================================================
-- RLS
-- =========================================================

alter table public.billing_plans enable row level security;
alter table public.billing_plan_features enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_org_entitlements enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_webhook_events enable row level security;

-- billing_plans: read for authenticated (to show plans); no client write
drop policy if exists "billing_plans_select" on public.billing_plans;
create policy "billing_plans_select" on public.billing_plans for select to authenticated using (is_active = true);
drop policy if exists "billing_plans_no_insert" on public.billing_plans;
create policy "billing_plans_no_insert" on public.billing_plans for insert with check (false);
drop policy if exists "billing_plans_no_update" on public.billing_plans;
create policy "billing_plans_no_update" on public.billing_plans for update using (false);
drop policy if exists "billing_plans_no_delete" on public.billing_plans;
create policy "billing_plans_no_delete" on public.billing_plans for delete using (false);

-- billing_plan_features: read for authenticated; no client write
drop policy if exists "billing_plan_features_select" on public.billing_plan_features;
create policy "billing_plan_features_select" on public.billing_plan_features for select to authenticated using (true);
drop policy if exists "billing_plan_features_no_insert" on public.billing_plan_features;
create policy "billing_plan_features_no_insert" on public.billing_plan_features for insert with check (false);
drop policy if exists "billing_plan_features_no_update" on public.billing_plan_features;
create policy "billing_plan_features_no_update" on public.billing_plan_features for update using (false);
drop policy if exists "billing_plan_features_no_delete" on public.billing_plan_features;
create policy "billing_plan_features_no_delete" on public.billing_plan_features for delete using (false);

-- billing_customers: read for org members; no client write
drop policy if exists "billing_customers_select" on public.billing_customers;
create policy "billing_customers_select" on public.billing_customers for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid()));
drop policy if exists "billing_customers_no_insert" on public.billing_customers;
create policy "billing_customers_no_insert" on public.billing_customers for insert with check (false);
drop policy if exists "billing_customers_no_update" on public.billing_customers;
create policy "billing_customers_no_update" on public.billing_customers for update using (false);
drop policy if exists "billing_customers_no_delete" on public.billing_customers;
create policy "billing_customers_no_delete" on public.billing_customers for delete using (false);

-- billing_subscriptions: read for org members; no client write
drop policy if exists "billing_subscriptions_select" on public.billing_subscriptions;
create policy "billing_subscriptions_select" on public.billing_subscriptions for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid()));
drop policy if exists "billing_subscriptions_no_insert" on public.billing_subscriptions;
create policy "billing_subscriptions_no_insert" on public.billing_subscriptions for insert with check (false);
drop policy if exists "billing_subscriptions_no_update" on public.billing_subscriptions;
create policy "billing_subscriptions_no_update" on public.billing_subscriptions for update using (false);
drop policy if exists "billing_subscriptions_no_delete" on public.billing_subscriptions;
create policy "billing_subscriptions_no_delete" on public.billing_subscriptions for delete using (false);

-- billing_org_entitlements: read for org members; no client write
drop policy if exists "billing_org_entitlements_select" on public.billing_org_entitlements;
create policy "billing_org_entitlements_select" on public.billing_org_entitlements for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid()));
drop policy if exists "billing_org_entitlements_no_insert" on public.billing_org_entitlements;
create policy "billing_org_entitlements_no_insert" on public.billing_org_entitlements for insert with check (false);
drop policy if exists "billing_org_entitlements_no_update" on public.billing_org_entitlements;
create policy "billing_org_entitlements_no_update" on public.billing_org_entitlements for update using (false);
drop policy if exists "billing_org_entitlements_no_delete" on public.billing_org_entitlements;
create policy "billing_org_entitlements_no_delete" on public.billing_org_entitlements for delete using (false);

-- billing_invoices: read for org members; no client write
drop policy if exists "billing_invoices_select" on public.billing_invoices;
create policy "billing_invoices_select" on public.billing_invoices for select
  using (org_id in (select org_id from public.org_memberships where user_id = auth.uid()));
drop policy if exists "billing_invoices_no_insert" on public.billing_invoices;
create policy "billing_invoices_no_insert" on public.billing_invoices for insert with check (false);
drop policy if exists "billing_invoices_no_update" on public.billing_invoices;
create policy "billing_invoices_no_update" on public.billing_invoices for update using (false);
drop policy if exists "billing_invoices_no_delete" on public.billing_invoices;
create policy "billing_invoices_no_delete" on public.billing_invoices for delete using (false);

-- billing_webhook_events: no client access (idempotency; only service role)
drop policy if exists "billing_webhook_events_no_select" on public.billing_webhook_events;
create policy "billing_webhook_events_no_select" on public.billing_webhook_events for select using (false);
drop policy if exists "billing_webhook_events_no_insert" on public.billing_webhook_events;
create policy "billing_webhook_events_no_insert" on public.billing_webhook_events for insert with check (false);
drop policy if exists "billing_webhook_events_no_update" on public.billing_webhook_events;
create policy "billing_webhook_events_no_update" on public.billing_webhook_events for update using (false);
drop policy if exists "billing_webhook_events_no_delete" on public.billing_webhook_events;
create policy "billing_webhook_events_no_delete" on public.billing_webhook_events for delete using (false);
