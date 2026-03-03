-- F7.6 — RPC per al callback OAuth (service role): guardar connexió des de l’Edge sense context d’usuari.

CREATE OR REPLACE FUNCTION public.upsert_spapi_connection_from_backend(
  p_org_id uuid,
  p_created_by uuid,
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
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enc_key text;
  v_enc bytea;
BEGIN
  v_enc_key := current_setting('app.encryption_key', true);
  IF v_enc_key IS NULL OR v_enc_key = '' THEN
    RAISE EXCEPTION 'encryption_key_not_configured';
  END IF;

  v_enc := pgp_sym_encrypt(p_lwa_refresh_token_plain, v_enc_key);

  INSERT INTO public.spapi_connections (
    org_id, region, seller_id, marketplace_ids, lwa_client_id,
    lwa_refresh_token_enc, status, created_by
  ) VALUES (
    p_org_id,
    p_region,
    p_seller_id,
    COALESCE(p_marketplace_ids, '{}'::text[]),
    p_lwa_client_id,
    v_enc,
    'active',
    p_created_by
  )
  ON CONFLICT (org_id, seller_id, region) DO UPDATE SET
    marketplace_ids = EXCLUDED.marketplace_ids,
    lwa_client_id = EXCLUDED.lwa_client_id,
    lwa_refresh_token_enc = EXCLUDED.lwa_refresh_token_enc,
    status = 'active',
    last_error = NULL,
    updated_at = now();

  RETURN QUERY
  SELECT c.id, c.org_id, c.region, c.seller_id, c.status
  FROM public.spapi_connections c
  WHERE c.org_id = p_org_id AND c.seller_id = p_seller_id AND c.region = p_region
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_spapi_connection_from_backend(uuid, uuid, text, text, text[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_spapi_connection_from_backend(uuid, uuid, text, text, text[], text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_spapi_connection_from_backend(uuid, uuid, text, text, text[], text, text) TO service_role;
