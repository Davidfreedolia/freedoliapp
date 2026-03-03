-- D8.2 — Auto-start trial when org activation completes

-- function
create or replace function public.start_trial_on_org_activation()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.org_billing (
    org_id,
    plan,
    status,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.org_id,
    coalesce((select plan from public.org_billing where org_id = new.org_id), 'growth'),
    'trialing',
    now(),
    now() + interval '14 days'
  )
  on conflict (org_id) do nothing;

  return new;
end;
$$;

-- trigger
drop trigger if exists trg_start_trial_on_org_activation on public.org_activation;

create trigger trg_start_trial_on_org_activation
after insert on public.org_activation
for each row
execute function public.start_trial_on_org_activation();
