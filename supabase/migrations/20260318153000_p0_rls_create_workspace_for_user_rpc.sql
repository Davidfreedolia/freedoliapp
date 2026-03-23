-- P0.ACCESS.2 / P0.RLS — Ensure RPC exists in remote
-- Create org + owner membership atomically under SECURITY DEFINER to avoid orgs RLS read-after-write failures.

CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
  p_name text,
  p_user_id uuid,
  p_user_email text DEFAULT NULL
)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  v_name := NULLIF(trim(p_name), '');
  IF v_name IS NULL THEN
    v_name := 'Workspace';
  END IF;

  INSERT INTO public.orgs (name, created_by)
  VALUES (v_name, p_user_id)
  RETURNING orgs.id, orgs.name
  INTO id, name;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (id, p_user_id, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  RETURN;
END;
$$;

