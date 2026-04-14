-- ============================================
-- F1 — Motor de recerca intel·ligent: taules
-- tool_connections / supplier_search_cache / research_reports
-- ============================================

-- 1) Connexions a eines externes (Helium 10, Jungle Scout, etc.)
CREATE TABLE IF NOT EXISTS public.tool_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  auth_type text NOT NULL DEFAULT 'api_key',
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_connections_org_tool
  ON public.tool_connections(org_id, tool_name);

ALTER TABLE public.tool_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tool_connections_org_members" ON public.tool_connections;
CREATE POLICY "tool_connections_org_members"
  ON public.tool_connections
  FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()));

-- 2) Cache de cerques de proveïdors (TTL 24h aplicat a la query)
CREATE TABLE IF NOT EXISTS public.supplier_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text NOT NULL,
  source text NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  searched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_cache_keywords
  ON public.supplier_search_cache(keywords, source, searched_at DESC);

-- Cache és global (no personal), però només escrit/llegit per service role
-- via Edge Functions. Activem RLS i deneguem per default (només service role).
ALTER TABLE public.supplier_search_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_search_cache_readonly_auth" ON public.supplier_search_cache;
CREATE POLICY "supplier_search_cache_readonly_auth"
  ON public.supplier_search_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Informes de recerca (viability reports)
CREATE TABLE IF NOT EXISTS public.research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  input_asin text,
  input_description text,
  marketplace text NOT NULL,
  sources_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  viability_score int,
  recommendation text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_reports_org_created
  ON public.research_reports(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_reports_project
  ON public.research_reports(project_id);

ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_reports_org_members" ON public.research_reports;
CREATE POLICY "research_reports_org_members"
  ON public.research_reports
  FOR ALL
  TO authenticated
  USING (org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()));

-- Trigger d'updated_at per tool_connections
CREATE OR REPLACE FUNCTION public._tool_connections_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tool_connections_updated_at ON public.tool_connections;
CREATE TRIGGER trg_tool_connections_updated_at
  BEFORE UPDATE ON public.tool_connections
  FOR EACH ROW
  EXECUTE FUNCTION public._tool_connections_touch_updated_at();
