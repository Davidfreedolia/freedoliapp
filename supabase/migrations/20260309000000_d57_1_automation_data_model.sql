-- =============================================================================
-- D57.1 — Automation Data Model + RLS
-- =============================================================================
-- Implements the database layer for Decision Automation (D57).
-- Tables: automation_rules, automation_proposals, automation_approvals,
--         automation_executions, automation_events.
-- RLS: strict org_id-based multi-tenant. No execution logic, no triggers,
--      no cron, no edge functions. Architecture: docs/ARCHITECTURE/D57_DECISION_AUTOMATION.md
-- =============================================================================

-- =========================================================
-- 1. automation_rules
-- =========================================================
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  action_type text not null,
  is_enabled boolean not null default true,
  automation_level smallint not null default 0,
  approval_mode text not null default 'single',
  risk_threshold_max numeric,
  max_units_per_execution numeric,
  max_value_per_execution numeric,
  max_daily_exposure numeric,
  require_fresh_context boolean not null default true,
  allow_auto_execute boolean not null default false,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint chk_automation_rules_level check (automation_level >= 0 and automation_level <= 3),
  constraint chk_automation_rules_approval_mode check (approval_mode in (
    'none', 'single', 'dual', 'role_constrained', 'conditional'
  )),
  constraint chk_automation_rules_units check (max_units_per_execution is null or max_units_per_execution >= 0),
  constraint chk_automation_rules_value check (max_value_per_execution is null or max_value_per_execution >= 0),
  constraint chk_automation_rules_exposure check (max_daily_exposure is null or max_daily_exposure >= 0),
  constraint chk_automation_rules_validity check (valid_to is null or valid_to >= valid_from)
);

create index if not exists idx_automation_rules_org_id on public.automation_rules(org_id);
create index if not exists idx_automation_rules_action_type on public.automation_rules(action_type);
create index if not exists idx_automation_rules_org_action on public.automation_rules(org_id, action_type);

-- =========================================================
-- 2. automation_proposals
-- =========================================================
create table if not exists public.automation_proposals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  decision_id uuid not null references public.decisions(id) on delete restrict,
  decision_event_id uuid,
  action_type text not null,
  source_entity_type text,
  source_entity_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  proposal_status text not null default 'drafted',
  automation_level smallint not null default 0,
  approval_mode text not null default 'single',
  risk_score numeric,
  risk_band text,
  payload_json jsonb,
  context_snapshot_json jsonb,
  context_hash text,
  idempotency_key text,
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by_system boolean not null default true,
  constraint chk_automation_proposals_status check (proposal_status in (
    'drafted', 'pending_approval', 'approved', 'rejected', 'invalidated',
    'expired', 'queued_for_execution', 'executed', 'execution_failed'
  )),
  constraint chk_automation_proposals_level check (automation_level >= 0 and automation_level <= 3),
  constraint chk_automation_proposals_approval_mode check (approval_mode in (
    'none', 'single', 'dual', 'role_constrained', 'conditional'
  )),
  constraint chk_automation_proposals_risk_band check (risk_band is null or risk_band in (
    'low', 'medium', 'high', 'critical'
  )),
  constraint chk_automation_proposals_validity check (expires_at is null or expires_at >= valid_from)
);

create index if not exists idx_automation_proposals_org_id on public.automation_proposals(org_id);
create index if not exists idx_automation_proposals_decision_id on public.automation_proposals(decision_id);
create index if not exists idx_automation_proposals_proposal_status on public.automation_proposals(proposal_status);
create index if not exists idx_automation_proposals_action_type on public.automation_proposals(action_type);
create index if not exists idx_automation_proposals_expires_at on public.automation_proposals(expires_at);
create unique index if not exists idx_automation_proposals_idempotency
  on public.automation_proposals(org_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists automation_proposals_org_status_action_created_idx
  on public.automation_proposals (
    org_id,
    proposal_status,
    action_type,
    created_at desc
  );

-- =========================================================
-- 3. automation_approvals
-- =========================================================
create table if not exists public.automation_approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  proposal_id uuid not null references public.automation_proposals(id) on delete cascade,
  approval_step smallint not null default 1,
  required_role text,
  approval_status text not null default 'pending',
  acted_at timestamptz,
  acted_by uuid references auth.users(id) on delete set null,
  comment text,
  created_at timestamptz not null default now(),
  constraint chk_automation_approvals_status check (approval_status in (
    'pending', 'approved', 'rejected', 'expired', 'skipped'
  ))
);

create index if not exists idx_automation_approvals_org_id on public.automation_approvals(org_id);
create index if not exists idx_automation_approvals_proposal_id on public.automation_approvals(proposal_id);
create index if not exists idx_automation_approvals_status on public.automation_approvals(approval_status);

-- =========================================================
-- 4. automation_executions
-- =========================================================
create table if not exists public.automation_executions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  proposal_id uuid not null references public.automation_proposals(id) on delete restrict,
  decision_id uuid not null references public.decisions(id) on delete restrict,
  action_type text not null,
  execution_status text not null default 'queued',
  execution_mode text not null default 'manual_trigger',
  payload_json jsonb,
  result_json jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  executed_by uuid references auth.users(id) on delete set null,
  executed_by_system boolean not null default false,
  rollback_state text,
  rollback_reference text,
  created_at timestamptz not null default now(),
  constraint chk_automation_executions_status check (execution_status in (
    'queued', 'running', 'succeeded', 'failed', 'partially_succeeded', 'canceled', 'rolled_back'
  )),
  constraint chk_automation_executions_mode check (execution_mode in (
    'manual_trigger', 'approved_trigger', 'automatic_trigger'
  )),
  constraint chk_automation_executions_rollback_state check (rollback_state is null or rollback_state in (
    'not_applicable', 'possible', 'manual_only', 'blocked'
  ))
);

create index if not exists idx_automation_executions_org_id on public.automation_executions(org_id);
create index if not exists idx_automation_executions_proposal_id on public.automation_executions(proposal_id);
create index if not exists idx_automation_executions_decision_id on public.automation_executions(decision_id);
create index if not exists idx_automation_executions_status on public.automation_executions(execution_status);
create index if not exists idx_automation_executions_created_at on public.automation_executions(created_at);

-- =========================================================
-- 5. automation_events (append-only audit)
-- =========================================================
create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  proposal_id uuid not null references public.automation_proposals(id) on delete cascade,
  execution_id uuid references public.automation_executions(id) on delete set null,
  decision_id uuid,
  event_type text not null,
  event_payload_json jsonb,
  created_at timestamptz not null default now(),
  actor_type text not null default 'system',
  actor_id uuid references auth.users(id) on delete set null,
  constraint chk_automation_events_actor_type check (actor_type in ('system', 'user'))
);

create index if not exists idx_automation_events_org_id on public.automation_events(org_id);
create index if not exists idx_automation_events_proposal_id on public.automation_events(proposal_id);
create index if not exists idx_automation_events_execution_id on public.automation_events(execution_id)
  where execution_id is not null;
create index if not exists idx_automation_events_decision_id on public.automation_events(decision_id)
  where decision_id is not null;
create index if not exists idx_automation_events_event_type on public.automation_events(event_type);
create index if not exists idx_automation_events_created_at on public.automation_events(created_at);

-- =========================================================
-- RLS — automation_rules
-- =========================================================
alter table public.automation_rules enable row level security;

create policy "Org members can select automation_rules" on public.automation_rules
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert automation_rules" on public.automation_rules
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update automation_rules" on public.automation_rules
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete automation_rules" on public.automation_rules
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- =========================================================
-- RLS — automation_proposals
-- =========================================================
alter table public.automation_proposals enable row level security;

create policy "Org members can select automation_proposals" on public.automation_proposals
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert automation_proposals" on public.automation_proposals
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update automation_proposals" on public.automation_proposals
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete automation_proposals" on public.automation_proposals
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- =========================================================
-- RLS — automation_approvals
-- =========================================================
alter table public.automation_approvals enable row level security;

create policy "Org members can select automation_approvals" on public.automation_approvals
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert automation_approvals" on public.automation_approvals
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update automation_approvals" on public.automation_approvals
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete automation_approvals" on public.automation_approvals
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- =========================================================
-- RLS — automation_executions
-- =========================================================
alter table public.automation_executions enable row level security;

create policy "Org members can select automation_executions" on public.automation_executions
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert automation_executions" on public.automation_executions
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can update automation_executions" on public.automation_executions
  for update to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id))
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
create policy "Org members can delete automation_executions" on public.automation_executions
  for delete to authenticated
  using (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));

-- =========================================================
-- RLS — automation_events (append-only: SELECT + INSERT only)
-- =========================================================
alter table public.automation_events enable row level security;

create policy "Org members can select automation_events" on public.automation_events
  for select to authenticated
  using (public.is_org_member(org_id) and (public.org_billing_allows_access(org_id) or public.is_org_owner_or_admin(org_id)));
create policy "Org members can insert automation_events" on public.automation_events
  for insert to authenticated
  with check (public.is_org_member(org_id) and public.org_billing_allows_access(org_id));
-- No UPDATE or DELETE policies: append-only audit stream.
