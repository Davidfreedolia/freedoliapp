-- =============================================================================
-- D32.4 — Decision Engine schema (D32.1–D32.3)
-- =============================================================================
-- This migration introduces the persistent structure for the Decision Engine.
-- It prepares the system to store operational decisions generated from engines
-- such as:
--   - reorder
--   - inventory intelligence
--   - cashflow
--   - profit analysis
-- No seed data. No engine integration yet. RLS follows canonical tenant pattern.
-- =============================================================================

-- =========================================================
-- 1. decisions
-- =========================================================
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  decision_type text not null,
  priority_score numeric,
  title text,
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint chk_decisions_status check (status in ('open', 'acknowledged', 'resolved', 'dismissed'))
);

create index if not exists idx_decisions_org_id on public.decisions(org_id);
create index if not exists idx_decisions_status on public.decisions(status);
create index if not exists idx_decisions_priority_score on public.decisions(priority_score);
create index if not exists idx_decisions_created_at on public.decisions(created_at);

-- =========================================================
-- 2. decision_context
-- =========================================================
create table if not exists public.decision_context (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_context_decision_id on public.decision_context(decision_id);

-- =========================================================
-- 3. decision_sources
-- =========================================================
create table if not exists public.decision_sources (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  source_engine text not null,
  source_reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_sources_decision_id on public.decision_sources(decision_id);
create index if not exists idx_decision_sources_source_engine on public.decision_sources(source_engine);

-- =========================================================
-- 4. decision_events
-- =========================================================
create table if not exists public.decision_events (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions(id) on delete cascade,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_decision_events_decision_id on public.decision_events(decision_id);
create index if not exists idx_decision_events_created_at on public.decision_events(created_at);

-- =========================================================
-- RLS — decisions (canonical tenant + billing)
-- =========================================================
alter table public.decisions enable row level security;

create policy "Org members can select decisions" on public.decisions
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert decisions" on public.decisions
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update decisions" on public.decisions
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete decisions" on public.decisions
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- =========================================================
-- RLS — decision_context (inherit via parent decision)
-- =========================================================
alter table public.decision_context enable row level security;

create policy "Org members can select decision_context" on public.decision_context
  for select to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and (public.org_billing_allows_access(d.org_id) or public.is_org_owner_or_admin(d.org_id))));
create policy "Org members can insert decision_context" on public.decision_context
  for insert to authenticated
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can update decision_context" on public.decision_context
  for update to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)))
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can delete decision_context" on public.decision_context
  for delete to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));

-- =========================================================
-- RLS — decision_sources (inherit via parent decision)
-- =========================================================
alter table public.decision_sources enable row level security;

create policy "Org members can select decision_sources" on public.decision_sources
  for select to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and (public.org_billing_allows_access(d.org_id) or public.is_org_owner_or_admin(d.org_id))));
create policy "Org members can insert decision_sources" on public.decision_sources
  for insert to authenticated
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can update decision_sources" on public.decision_sources
  for update to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)))
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can delete decision_sources" on public.decision_sources
  for delete to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));

-- =========================================================
-- RLS — decision_events (inherit via parent decision)
-- =========================================================
alter table public.decision_events enable row level security;

create policy "Org members can select decision_events" on public.decision_events
  for select to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and (public.org_billing_allows_access(d.org_id) or public.is_org_owner_or_admin(d.org_id))));
create policy "Org members can insert decision_events" on public.decision_events
  for insert to authenticated
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can update decision_events" on public.decision_events
  for update to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)))
  with check (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
create policy "Org members can delete decision_events" on public.decision_events
  for delete to authenticated
  using (exists (select 1 from public.decisions d where d.id = decision_id and public.is_org_member(d.org_id) and public.org_billing_allows_access(d.org_id)));
