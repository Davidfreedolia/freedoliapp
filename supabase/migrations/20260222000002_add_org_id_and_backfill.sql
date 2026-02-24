-- ============================================
-- MULTI-TENANT PAS 2: add org_id (nullable) + backfill
-- ============================================
-- Add column to key tables; backfill one org per existing user, assign all their rows.

-- Add org_id nullable (no FK yet to allow backfill)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.supplier_quotes ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.supplier_sample_requests ADD COLUMN IF NOT EXISTS org_id uuid;

-- Backfill: one org per distinct user that has data, then set org_id on all their rows
DO $$
DECLARE
  u_id uuid;
  o_id uuid;
  org_name text;
BEGIN
  FOR u_id IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.company_settings WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.projects WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.purchase_orders WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.suppliers WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.supplier_quotes WHERE user_id IS NOT NULL
      UNION
      SELECT user_id FROM public.supplier_sample_requests WHERE user_id IS NOT NULL
    ) u
  LOOP
    SELECT id INTO o_id FROM public.orgs WHERE created_by = u_id ORDER BY created_at DESC LIMIT 1;

    IF o_id IS NULL THEN
      org_name := 'Workspace ' || COALESCE(
        (SELECT left(email::text, 40) FROM auth.users WHERE id = u_id LIMIT 1),
        u_id::text
      );
      INSERT INTO public.orgs (name, created_by)
      VALUES (org_name, u_id)
      RETURNING id INTO o_id;
    END IF;

    IF o_id IS NOT NULL THEN
      INSERT INTO public.org_memberships (org_id, user_id, role)
      VALUES (o_id, u_id, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING;

      UPDATE public.company_settings SET org_id = o_id WHERE user_id = u_id;
      UPDATE public.projects SET org_id = o_id WHERE user_id = u_id;
      UPDATE public.purchase_orders SET org_id = o_id WHERE user_id = u_id;
      UPDATE public.suppliers SET org_id = o_id WHERE user_id = u_id;
      UPDATE public.supplier_quotes SET org_id = o_id WHERE user_id = u_id;
    END IF;
  END LOOP;

  -- supplier_sample_requests: set org_id from project
  UPDATE public.supplier_sample_requests ss
  SET org_id = p.org_id
  FROM public.projects p
  WHERE ss.project_id = p.id AND p.org_id IS NOT NULL AND ss.org_id IS NULL;

  -- supplier_sample_requests: any remaining NULL get org from user's membership
  UPDATE public.supplier_sample_requests ss
  SET org_id = (SELECT om.org_id FROM public.org_memberships om WHERE om.user_id = ss.user_id LIMIT 1)
  WHERE ss.org_id IS NULL;
END;
$$;
