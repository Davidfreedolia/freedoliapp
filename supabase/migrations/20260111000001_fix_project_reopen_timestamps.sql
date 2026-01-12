-- =========================================================
-- FIX: Clear closed_at/archived_at when reopening project
-- =========================================================
-- When a project status changes to 'draft' or 'active',
-- we must clear closed_at and archived_at timestamps.
--
-- This migration updates the projects_before_ins_upd trigger
-- to clear these fields when status returns to draft/active.
-- =========================================================

begin;

-- Update trigger function to clear timestamps on reopen
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

    -- Si passen a draft/active, netegem timestamps de tancament
    if new.status in ('draft', 'active') then
      new.closed_at := null;
      new.archived_at := null;
    end if;

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

commit;
