-- D8.2 — Billing (ORG-level)

create table if not exists public.org_billing (
    org_id uuid primary key references public.orgs(id) on delete cascade,

    stripe_customer_id text,
    stripe_subscription_id text,

    plan text not null check (plan in ('growth','pro','agency')) default 'growth',

    status text not null check (status in ('trialing','active','past_due','canceled')),

    trial_started_at timestamptz,
    trial_ends_at timestamptz,

    current_period_end_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.org_billing enable row level security;

-- Policies (idempotent)
drop policy if exists "org_billing_select_own" on public.org_billing;
create policy "org_billing_select_own"
on public.org_billing
for select
using (
    org_id in (
        select org_id from public.org_memberships
        where user_id = auth.uid()
    )
);

-- prevent manual inserts from client
create policy "org_billing_no_insert"
on public.org_billing
for insert
with check (false);

drop policy if exists "org_billing_no_update" on public.org_billing;
create policy "org_billing_no_update"
on public.org_billing
for update
using (false);

drop policy if exists "org_billing_no_delete" on public.org_billing;
create policy "org_billing_no_delete"
on public.org_billing
for delete
using (false);
