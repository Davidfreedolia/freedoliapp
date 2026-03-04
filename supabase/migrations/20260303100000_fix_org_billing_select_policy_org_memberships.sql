-- Fix: org_billing SELECT policy must use org_memberships (not memberships)

alter table public.org_billing enable row level security;

drop policy if exists "org_billing_select_own" on public.org_billing;

create policy "org_billing_select_own"
on public.org_billing
for select
using (
  org_id in (
    select org_id
    from public.org_memberships
    where user_id = auth.uid()
  )
);

-- Backfill: ensure every activated org has org_billing row
insert into public.org_billing (
  org_id, plan, status, trial_started_at, trial_ends_at
)
select
  a.org_id,
  'growth',
  'trialing',
  now(),
  now() + interval '14 days'
from public.org_activation a
left join public.org_billing b on b.org_id = a.org_id
where b.org_id is null;

