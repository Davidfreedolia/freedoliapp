-- 20260222113000_marketplaces_global_readonly.sql

ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='marketplaces'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.marketplaces', r.policyname);
  END LOOP;
END $$;

CREATE POLICY marketplaces_select_authenticated
ON public.marketplaces
FOR SELECT
TO authenticated
USING (true);