begin;

-- =========================================================
-- D11.2 — BILLING ORG OVERRIDES
-- Per-org overrides for plan, status, limits and features.
-- Idempotent: safe to apply even if table/policies already exist.
-- =========================================================

create table if not exists public.billing_org_overrides (

  id uuid primary key default gen_random_uuid(),

  org_id uuid not null
  references public.orgs(id)
  on delete cascade,

  override_mode text not null,

  plan_id uuid
  references public.billing_plans(id)
  on delete set null,

  billing_status_override public.billing_access_status,

  seat_limit_override integer,

  features_override jsonb,

  starts_at timestamptz default now(),
  ends_at timestamptz,

  reason text,

  created_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_overrides_org
on public.billing_org_overrides(org_id);

create index if not exists idx_billing_overrides_active
on public.billing_org_overrides(org_id, starts_at, ends_at);

-- =========================================================
-- RLS
-- =========================================================

alter table public.billing_org_overrides enable row level security;

-- lectura només per membres de la org
drop policy if exists "billing_overrides_select_same_org" on public.billing_org_overrides;
create policy "billing_overrides_select_same_org"
on public.billing_org_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.org_memberships om
    where om.org_id = billing_org_overrides.org_id
    and om.user_id = auth.uid()
  )
);

-- bloquejar escriptura des del client
drop policy if exists "billing_overrides_no_client_write" on public.billing_org_overrides;
create policy "billing_overrides_no_client_write"
on public.billing_org_overrides
for insert
to authenticated
with check (false);

drop policy if exists "billing_overrides_no_client_update" on public.billing_org_overrides;
create policy "billing_overrides_no_client_update"
on public.billing_org_overrides
for update
to authenticated
using (false);

drop policy if exists "billing_overrides_no_client_delete" on public.billing_org_overrides;
create policy "billing_overrides_no_client_delete"
on public.billing_org_overrides
for delete
to authenticated
using (false);

commit;

