/* =========================================================
   BLOCK 3 — PROJECTES (DB + RLS) — Supabase/Postgres SQL
   Objectiu: status/code + timeline segura (project_events)
   NO toca BLOCK 1/2/4 (només afegeix coses).
   ========================================================= */

begin;

-- 0) Helpers
create extension if not exists pgcrypto;

/* =========================================================
   1) PROJECT CODE SEQUENCING (per usuari)
   ========================================================= */

create table if not exists public.user_counters (
  user_id uuid primary key,
  project_next integer not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function public.next_project_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if p_user_id is null then
    raise exception 'next_project_code: user_id cannot be null';
  end if;

  -- Lock row per user; create if missing
  insert into public.user_counters (user_id, project_next)
  values (p_user_id, 1)
  on conflict (user_id) do nothing;

  select project_next
    into v_next
    from public.user_counters
   where user_id = p_user_id
   for update;

  update public.user_counters
     set project_next = project_next + 1,
         updated_at = now()
   where user_id = p_user_id;

  return 'PRJ-' || lpad(v_next::text, 6, '0');
end;
$$;

revoke all on function public.next_project_code(uuid) from public;
grant execute on function public.next_project_code(uuid) to authenticated;

/* =========================================================
   2) PROJECTS: status + code + dates (defensiu)
   ========================================================= */

-- Afegim camps si falten (defensiu; no peta si ja existeixen)
alter table public.projects
  add column if not exists code text,
  add column if not exists status text,
  add column if not exists start_date date,
  add column if not exists target_live_date date,
  add column if not exists closed_at timestamptz,
  add column if not exists archived_at timestamptz;

-- Default status si era null (no assumeixo NOT NULL fins que la teva data estigui neta)
update public.projects
   set status = 'draft'
 where status is null;

-- Constraint d'estats (validació dura, però sense trencar dades existents)
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'projects_status_check'
       and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_status_check
      check (status in ('draft','active','closed','archived'));
  end if;
end $$;

-- Índexos/uniques recomanats (assumeix que projects té user_id)
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema='public' and table_name='projects' and column_name='user_id'
  ) then
    -- code únic per usuari (permet null mentre migrem)
    if not exists (
      select 1 from pg_indexes where schemaname='public' and indexname='projects_user_code_ux'
    ) then
      create unique index projects_user_code_ux
        on public.projects(user_id, code)
        where code is not null;
    end if;

    -- sku únic per usuari (si ja tens un altre unique, aquest no sobra; però evita duplicats futurs)
    if not exists (
      select 1 from pg_indexes where schemaname='public' and indexname='projects_user_sku_ux'
    ) then
      create unique index projects_user_sku_ux
        on public.projects(user_id, sku)
        where sku is not null;
    end if;
  end if;
end $$;

-- Trigger: auto-code + updated_at
create or replace function public.projects_before_ins_upd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := 'draft';
    end if;

    -- Auto-code si no el passa la UI
    if new.code is null then
      -- requereix que la UI posi user_id (com ja feu a la resta)
      new.code := public.next_project_code(new.user_id);
    end if;

    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  else
    new.updated_at := now();

    -- Si passen a closed/archived, segellem timestamps si no hi són
    if new.status = 'closed' and new.closed_at is null then
      new.closed_at := now();
    end if;
    if new.status = 'archived' and new.archived_at is null then
      new.archived_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_projects_before_ins_upd on public.projects;
create trigger trg_projects_before_ins_upd
before insert or update on public.projects
for each row execute function public.projects_before_ins_upd();

/* =========================================================
   3) PROJECT EVENTS (timeline / calendar source of truth)
   ========================================================= */

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null default 'milestone',
  title text not null,
  event_date date not null,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_events_user_date_idx
  on public.project_events(user_id, event_date);

create index if not exists project_events_project_date_idx
  on public.project_events(project_id, event_date);

-- Trigger: enforce user_id + is_demo from project, and updated_at
create or replace function public.project_events_before_ins_upd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_demo boolean;
  v_status text;
begin
  -- Pull from parent project to prevent leaks / mismatches
  select p.user_id, coalesce(p.is_demo,false), p.status
    into v_user, v_demo, v_status
    from public.projects p
   where p.id = new.project_id;

  if v_user is null then
    raise exception 'project_events: invalid project_id %', new.project_id;
  end if;

  -- Lock down linkage (no inventar user_id / is_demo des del client)
  new.user_id := v_user;
  new.is_demo := v_demo;

  -- updated_at
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
  else
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_events_before_ins_upd on public.project_events;
create trigger trg_project_events_before_ins_upd
before insert or update on public.project_events
for each row execute function public.project_events_before_ins_upd();

/* =========================================================
   4) RLS — PROJECT EVENTS (sense policies obertes)
   ========================================================= */

alter table public.project_events enable row level security;

-- SELECT: només el propietari
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_events' and policyname='Users can view own project events'
  ) then
    create policy "Users can view own project events"
      on public.project_events
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- INSERT: només si el projecte és teu i NO està closed/archived
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_events' and policyname='Users can insert own project events (project open)'
  ) then
    create policy "Users can insert own project events (project open)"
      on public.project_events
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and exists (
          select 1
            from public.projects p
           where p.id = project_id
             and p.user_id = auth.uid()
             and p.status in ('draft','active')
        )
      );
  end if;
end $$;

-- UPDATE: només si és teu i el projecte segueix obert
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_events' and policyname='Users can update own project events (project open)'
  ) then
    create policy "Users can update own project events (project open)"
      on public.project_events
      for update
      to authenticated
      using (
        auth.uid() = user_id
        and exists (
          select 1
            from public.projects p
           where p.id = project_id
             and p.user_id = auth.uid()
             and p.status in ('draft','active')
        )
      )
      with check (
        auth.uid() = user_id
        and exists (
          select 1
            from public.projects p
           where p.id = project_id
             and p.user_id = auth.uid()
             and p.status in ('draft','active')
        )
      );
  end if;
end $$;

-- DELETE: només si és teu i projecte obert
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='project_events' and policyname='Users can delete own project events (project open)'
  ) then
    create policy "Users can delete own project events (project open)"
      on public.project_events
      for delete
      to authenticated
      using (
        auth.uid() = user_id
        and exists (
          select 1
            from public.projects p
           where p.id = project_id
             and p.user_id = auth.uid()
             and p.status in ('draft','active')
        )
      );
  end if;
end $$;

commit;

/* =========================================================
   QUICK SANITY CHECKS (executa després, manualment)
   =========================================================
   -- 1) No hi ha policies "Allow all" a project_events:
   select policyname, cmd, qual, with_check
     from pg_policies
    where schemaname='public' and tablename='project_events';

   -- 2) Projects status invalid?
   select id, status from public.projects
    where status not in ('draft','active','closed','archived');

   -- 3) Projects sense code (haurien de ser només legacy):
   select id, user_id, sku, name
     from public.projects
    where code is null
    order by created_at desc;
*/
