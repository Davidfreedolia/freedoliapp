-- D8.2 — Plan limits enforcement (seats + spapi connections)
-- Triggers BEFORE INSERT; only allow when trialing/active; block past_due/canceled.

-- 1) get_plan_limits(p_plan) -> seats_limit, spapi_limit
create or replace function public.get_plan_limits(p_plan text)
returns table(seats_limit int, spapi_limit int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    case p_plan
      when 'growth' then 1
      when 'pro' then 5
      when 'agency' then 15
      else 1
    end,
    case p_plan
      when 'growth' then 1
      when 'pro' then 3
      when 'agency' then 10
      else 1
    end;
end;
$$;

-- 2) get_org_billing_state(p_org_id) -> plan, status (default growth/trialing if no row)
create or replace function public.get_org_billing_state(p_org_id uuid)
returns table(plan text, status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce(ob.plan, 'growth'),
    coalesce(ob.status, 'trialing')
  from public.org_billing ob
  where ob.org_id = p_org_id
  limit 1;
  if not found then
    return query select 'growth'::text, 'trialing'::text;
  end if;
end;
$$;

-- Helper: enforce seat limit on org_memberships INSERT
create or replace function public.enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_seats_limit int;
  v_seats_actual int;
begin
  select g.plan, g.status into v_plan, v_status
  from public.get_org_billing_state(new.org_id) g;

  if v_status in ('past_due', 'canceled') then
    raise exception 'BILLING_INACTIVE';
  end if;

  select l.seats_limit into v_seats_limit
  from public.get_plan_limits(v_plan) l;

  select count(*)::int into v_seats_actual
  from public.org_memberships
  where org_id = new.org_id;

  if v_seats_actual >= v_seats_limit then
    raise exception 'SEAT_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

-- Helper: enforce spapi limit on spapi_connections INSERT
create or replace function public.enforce_spapi_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_spapi_limit int;
  v_spapi_actual int;
begin
  select g.plan, g.status into v_plan, v_status
  from public.get_org_billing_state(new.org_id) g;

  if v_status in ('past_due', 'canceled') then
    raise exception 'BILLING_INACTIVE';
  end if;

  select l.spapi_limit into v_spapi_limit
  from public.get_plan_limits(v_plan) l;

  select count(*)::int into v_spapi_actual
  from public.spapi_connections
  where org_id = new.org_id;

  if v_spapi_actual >= v_spapi_limit then
    raise exception 'SPAPI_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

-- 3) Trigger BEFORE INSERT on org_memberships
drop trigger if exists trg_enforce_seat_limit on public.org_memberships;
create trigger trg_enforce_seat_limit
  before insert on public.org_memberships
  for each row
  execute function public.enforce_seat_limit();

-- 4) Trigger BEFORE INSERT on spapi_connections
drop trigger if exists trg_enforce_spapi_limit on public.spapi_connections;
create trigger trg_enforce_spapi_limit
  before insert on public.spapi_connections
  for each row
  execute function public.enforce_spapi_limit();
