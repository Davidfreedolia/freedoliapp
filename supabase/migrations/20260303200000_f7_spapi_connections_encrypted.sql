-- F7.5 — SP-API Central App: connexions amb refresh token xifrat (pgcrypto)
-- La clau app.encryption_key es configura al runtime (Supabase Vault / session variable).

-----------------------------
-- A) Extensions
-----------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-----------------------------
-- B) Taula spapi_connections
-----------------------------

CREATE TABLE IF NOT EXISTS public.spapi_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  region text NOT NULL CHECK (region IN ('EU','NA','FE')),
  seller_id text NOT NULL,
  marketplace_ids text[] NOT NULL DEFAULT '{}'::text[],
  lwa_client_id text NOT NULL,
  lwa_refresh_token_enc bytea NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  last_sync_at timestamptz NULL,
  last_error text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spapi_connections_org_seller_region_uniq UNIQUE (org_id, seller_id, region)
);

-----------------------------
-- C) View safe (sense token) per UI / consultes
-----------------------------

CREATE OR REPLACE VIEW public.spapi_connections_safe AS
SELECT
  id,
  org_id,
  region,
  seller_id,
  marketplace_ids,
  lwa_client_id,
  status,
  last_sync_at,
  last_error,
  created_by,
  created_at,
  updated_at
FROM public.spapi_connections;

-----------------------------
-- D) RLS: taula sense SELECT per authenticated (només via RPC / view amb RLS)
-----------------------------

ALTER TABLE public.spapi_connections ENABLE ROW LEVEL SECURITY;

-- No policy SELECT/INSERT/UPDATE/DELETE per authenticated a la taula:
-- l’accés es fa via RPC (SECURITY DEFINER) i opcionalment via view amb policy.

REVOKE ALL ON TABLE public.spapi_connections FROM PUBLIC;
REVOKE ALL ON TABLE public.spapi_connections FROM anon;
REVOKE ALL ON TABLE public.spapi_connections FROM authenticated;

-- View: només owner/admin (i accountant només lectura) poden veure files de la seva org
GRANT SELECT ON TABLE public.spapi_connections_safe TO authenticated;

DROP POLICY IF EXISTS "spapi_connections_safe_select_org_admin" ON public.spapi_connections_safe;
-- Views no tenen RLS per defecte; cal policy a la taula subjacent si la view la selecciona.
-- Com que la view selecciona de spapi_connections i no hi ha policy SELECT a spapi_connections
-- per authenticated, els usuaris no podran fer SELECT directe a spapi_connections.
-- Per permetre SELECT a la view, PostgreSQL aplica RLS de la taula subjacent quan es consulta la view.
-- Per tant, cap usuari authenticated podrà llegir ni la taula ni la view (perquè la taula no té policy SELECT).
-- Conclusió: exposem només via RPC get_spapi_connection_safe / list.

-- Revocar SELECT a la view per no exposar res sense passar per RPC (opcional, si vols que la UI només usi RPC)
REVOKE SELECT ON TABLE public.spapi_connections_safe FROM authenticated;

-----------------------------
-- E) RPCs (accés segur sense token)
-----------------------------

-- Upsert: xifra el token amb app.encryption_key (configurat al runtime)
CREATE OR REPLACE FUNCTION public.upsert_spapi_connection(
  p_region text,
  p_seller_id text,
  p_marketplace_ids text[],
  p_lwa_client_id text,
  p_lwa_refresh_token_plain text
)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  region text,
  seller_id text,
  marketplace_ids text[],
  lwa_client_id text,
  status text,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_enc_key text;
  v_enc bytea;
  v_row public.spapi_connections%ROWTYPE;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;
  IF NOT public.is_org_owner_or_admin(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  v_enc_key := current_setting('app.encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'encryption_key_not_configured';
  END IF;

  v_enc := pgp_sym_encrypt(p_lwa_refresh_token_plain, v_enc_key);

  INSERT INTO public.spapi_connections (
    org_id, region, seller_id, marketplace_ids, lwa_client_id,
    lwa_refresh_token_enc, status, created_by
  ) VALUES (
    v_org_id,
    p_region,
    p_seller_id,
    COALESCE(p_marketplace_ids, '{}'::text[]),
    p_lwa_client_id,
    v_enc,
    'active',
    auth.uid()
  )
  ON CONFLICT (org_id, seller_id, region) DO UPDATE SET
    marketplace_ids = EXCLUDED.marketplace_ids,
    lwa_client_id = EXCLUDED.lwa_client_id,
    lwa_refresh_token_enc = EXCLUDED.lwa_refresh_token_enc,
    status = 'active',
    last_error = NULL,
    updated_at = now();

  SELECT c.id, c.org_id, c.region, c.seller_id, c.marketplace_ids, c.lwa_client_id,
         c.status, c.last_sync_at, c.last_error, c.created_at, c.updated_at
  INTO id, org_id, region, seller_id, marketplace_ids, lwa_client_id,
       status, last_sync_at, last_error, created_at, updated_at
  FROM public.spapi_connections c
  WHERE c.org_id = v_org_id AND c.seller_id = p_seller_id AND c.region = p_region
  LIMIT 1;

  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_spapi_connection(text, text, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_spapi_connection(text, text, text[], text, text) TO authenticated;

-- List safe: retorna totes les connexions de l’org (sense token)
CREATE OR REPLACE FUNCTION public.get_spapi_connection_safe()
RETURNS TABLE (
  id uuid,
  org_id uuid,
  region text,
  seller_id text,
  marketplace_ids text[],
  lwa_client_id text,
  status text,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := public.get_current_org_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'no_active_org';
  END IF;
  IF NOT public.is_org_owner_or_admin(v_org_id) AND NOT public.is_org_accountant(v_org_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.org_id,
    c.region,
    c.seller_id,
    c.marketplace_ids,
    c.lwa_client_id,
    c.status,
    c.last_sync_at,
    c.last_error,
    c.created_by,
    c.created_at,
    c.updated_at
  FROM public.spapi_connections c
  WHERE c.org_id = v_org_id
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spapi_connection_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spapi_connection_safe() TO authenticated;

-----------------------------
-- F) Trigger updated_at
-----------------------------

CREATE OR REPLACE FUNCTION public.set_spapi_connections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spapi_connections_set_updated_at ON public.spapi_connections;
CREATE TRIGGER spapi_connections_set_updated_at
  BEFORE UPDATE ON public.spapi_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_spapi_connections_updated_at();
