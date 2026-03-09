-- =============================================================================
-- D29.3 — Global Supply Network schema (data contract from D29.2)
-- Tables: supply_origins, supply_destinations, supply_routes, supplier_origin_links
-- No seed data, no RPCs. RLS follows project tenant pattern.
-- =============================================================================

-- =========================================================
-- 1. supply_origins
-- =========================================================
create table if not exists public.supply_origins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  country_code text,
  city text,
  type text not null,
  created_at timestamptz not null default now(),
  constraint chk_supply_origins_type check (type in ('factory', 'supplier_warehouse', 'consolidation'))
);

create index if not exists idx_supply_origins_org_id on public.supply_origins(org_id);

-- =========================================================
-- 2. supply_destinations
-- =========================================================
create table if not exists public.supply_destinations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  type text not null,
  country_code text,
  created_at timestamptz not null default now(),
  constraint chk_supply_destinations_type check (type in ('fba', '3pl', 'warehouse'))
);

create index if not exists idx_supply_destinations_org_id on public.supply_destinations(org_id);

-- =========================================================
-- 3. supply_routes
-- =========================================================
create table if not exists public.supply_routes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  origin_id uuid not null references public.supply_origins(id) on delete cascade,
  destination_id uuid not null references public.supply_destinations(id) on delete cascade,
  transport_mode text not null,
  lead_time_days integer,
  min_lead_time_days integer,
  max_lead_time_days integer,
  cost_estimate numeric,
  reliability_score numeric,
  created_at timestamptz not null default now(),
  constraint chk_supply_routes_transport_mode check (transport_mode in ('sea', 'air', 'truck', 'mixed')),
  constraint chk_supply_routes_lead_time check (lead_time_days is null or lead_time_days >= 0),
  constraint chk_supply_routes_min_lead_time check (min_lead_time_days is null or min_lead_time_days >= 0),
  constraint chk_supply_routes_max_lead_time check (max_lead_time_days is null or max_lead_time_days >= 0)
);

create index if not exists idx_supply_routes_org_id on public.supply_routes(org_id);
create index if not exists idx_supply_routes_origin_id on public.supply_routes(origin_id);
create index if not exists idx_supply_routes_destination_id on public.supply_routes(destination_id);

-- =========================================================
-- 4. supplier_origin_links
-- =========================================================
create table if not exists public.supplier_origin_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  origin_id uuid not null references public.supply_origins(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_supplier_origin_links_org_supplier_origin unique (org_id, supplier_id, origin_id)
);

create index if not exists idx_supplier_origin_links_org_id on public.supplier_origin_links(org_id);
create index if not exists idx_supplier_origin_links_supplier_id on public.supplier_origin_links(supplier_id);

-- =========================================================
-- RLS — same pattern as suppliers / projects (tenant + billing)
-- =========================================================

alter table public.supply_origins enable row level security;
alter table public.supply_destinations enable row level security;
alter table public.supply_routes enable row level security;
alter table public.supplier_origin_links enable row level security;

-- supply_origins
create policy "Org members can select supply_origins" on public.supply_origins
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert supply_origins" on public.supply_origins
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update supply_origins" on public.supply_origins
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete supply_origins" on public.supply_origins
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- supply_destinations
create policy "Org members can select supply_destinations" on public.supply_destinations
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert supply_destinations" on public.supply_destinations
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update supply_destinations" on public.supply_destinations
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete supply_destinations" on public.supply_destinations
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- supply_routes
create policy "Org members can select supply_routes" on public.supply_routes
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert supply_routes" on public.supply_routes
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update supply_routes" on public.supply_routes
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete supply_routes" on public.supply_routes
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- supplier_origin_links
create policy "Org members can select supplier_origin_links" on public.supplier_origin_links
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert supplier_origin_links" on public.supplier_origin_links
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update supplier_origin_links" on public.supplier_origin_links
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete supplier_origin_links" on public.supplier_origin_links
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
