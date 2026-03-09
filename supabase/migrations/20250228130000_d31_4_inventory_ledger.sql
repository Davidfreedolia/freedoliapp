-- =============================================================================
-- D31.4 — Inventory Ledger schema (D31.1–D31.3)
-- =============================================================================
-- This migration:
--   - Introduces inventory_snapshots for ledger-derived inventory query acceleration.
--   - Preserves existing inventory_movements; no destructive changes.
--   - Prepares the system for future ledger-based inventory derivation.
--
-- Current inventory_movements (existing table) has:
--   org_id, warehouse_id, direction (IN/OUT), quantity, created_at, updated_at.
-- It does NOT yet implement the full D31 contract:
--   - No variant_id (current model is warehouse-scoped).
--   - No quantity_delta / movement_type / reference_type / reference_id / source_system.
-- Future phases may extend inventory_movements or add a variant-level ledger when
-- the product/variant model (D30) is in place. This migration does not alter it.
-- =============================================================================

-- =========================================================
-- 1. inventory_snapshots
-- =========================================================
create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  variant_id uuid not null,
  quantity numeric not null,
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  constraint uq_inventory_snapshots_org_variant_date unique (org_id, variant_id, snapshot_date)
);

create index if not exists idx_inventory_snapshots_org_id on public.inventory_snapshots(org_id);
create index if not exists idx_inventory_snapshots_variant_id on public.inventory_snapshots(variant_id);
-- unique constraint already provides index on (org_id, variant_id, snapshot_date)

-- =========================================================
-- RLS — canonical tenant + billing pattern
-- =========================================================
alter table public.inventory_snapshots enable row level security;

create policy "Org members can select inventory_snapshots" on public.inventory_snapshots
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert inventory_snapshots" on public.inventory_snapshots
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update inventory_snapshots" on public.inventory_snapshots
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete inventory_snapshots" on public.inventory_snapshots
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
