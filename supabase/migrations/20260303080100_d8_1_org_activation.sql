-- D8.1 — Activation Wizard (ORG level)
-- Table: org_activation
-- 1 row per org
-- Amazon optional activation path

create table if not exists public.org_activation (
    org_id uuid primary key references public.orgs(id) on delete cascade,
    activation_completed_at timestamptz not null default now(),
    activation_path text not null check (activation_path in ('amazon','setup')),
    created_at timestamptz not null default now()
);

-- Index not needed (PK covers org_id)

-- RLS
alter table public.org_activation enable row level security;

-- Policies (idempotent: drop if exists so re-run is safe)
drop policy if exists "org_activation_select_own" on public.org_activation;
create policy "org_activation_select_own"
on public.org_activation
for select
using (
    org_id in (
        select org_id from public.org_memberships
        where user_id = auth.uid()
    )
);

drop policy if exists "org_activation_insert_own" on public.org_activation;
create policy "org_activation_insert_own"
on public.org_activation
for insert
with check (
    org_id in (
        select org_id from public.org_memberships
        where user_id = auth.uid()
    )
);

drop policy if exists "org_activation_no_update" on public.org_activation;
create policy "org_activation_no_update"
on public.org_activation
for update
using (false);

drop policy if exists "org_activation_no_delete" on public.org_activation;
create policy "org_activation_no_delete"
on public.org_activation
for delete
using (false);

