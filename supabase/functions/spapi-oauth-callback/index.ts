/**
 * SP-API OAuth callback: GET with state, selling_partner_id, spapi_oauth_code.
 * Exchanges code for refresh token, saves via upsert_spapi_connection_from_backend, redirects to app.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyState } from "../_shared/spapiState.ts";
import { logOpsEvent } from "../_shared/opsEvents.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LWA_CLIENT_ID = Deno.env.get("LWA_CLIENT_ID");
const LWA_CLIENT_SECRET = Deno.env.get("LWA_CLIENT_SECRET");
const LWA_REDIRECT_URI = Deno.env.get("LWA_REDIRECT_URI");
const OAUTH_STATE_SECRET = Deno.env.get("OAUTH_STATE_SECRET");
const LWA_TOKEN_URL = Deno.env.get("LWA_TOKEN_URL") || "https://api.amazon.com/auth/o2/token";
const SPAPI_APP_BASE_URL = Deno.env.get("SPAPI_APP_BASE_URL") || "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function redirectToApp(success: boolean, errorMessage?: string) {
  const path = "/app/finances/amazon-imports";
  const base = SPAPI_APP_BASE_URL ? SPAPI_APP_BASE_URL.replace(/\/$/, "") + path : path;
  const q = success ? "?spapi=success" : `?spapi=error${errorMessage ? "&message=" + encodeURIComponent(errorMessage) : ""}`;
  const final = base + q;
  return new Response(null, {
    status: 302,
    headers: { Location: final },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const sellingPartnerId = url.searchParams.get("selling_partner_id");
  const code = url.searchParams.get("spapi_oauth_code") || url.searchParams.get("code");

  if (!state || !code) {
    await logOpsEvent({
      org_id: null,
      source: "edge",
      event_type: "SPAPI_OAUTH_CALLBACK_FAILED",
      severity: "warn",
      message: "Missing state or code",
      meta: { has_state: !!state, has_code: !!code },
    });
    return redirectToApp(false, "missing_params");
  }

  if (!LWA_CLIENT_ID || !LWA_CLIENT_SECRET || !LWA_REDIRECT_URI || !OAUTH_STATE_SECRET) {
    await logOpsEvent({
      org_id: null,
      source: "edge",
      event_type: "SPAPI_OAUTH_CALLBACK_FAILED",
      severity: "error",
      message: "OAuth not configured",
    });
    return redirectToApp(false, "config_error");
  }

  const payload = await verifyState(state, OAUTH_STATE_SECRET);
  if (!payload || (payload.exp as number) < Math.floor(Date.now() / 1000)) {
    await logOpsEvent({
      org_id: (payload?.org_id as string) ?? null,
      source: "edge",
      event_type: "SPAPI_OAUTH_FAILED",
      severity: "warn",
      message: "Invalid or expired state",
      meta: { reason: "invalid_state" },
    });
    return redirectToApp(false, "invalid_state");
  }

  const orgId = payload.org_id as string;
  const userId = payload.user_id as string;
  const region = (payload.region as string) || "EU";
  const marketplaceIds = (payload.marketplace_ids as string[]) || [];
  const sellerId = sellingPartnerId || (payload.selling_partner_id as string) || "PENDING_SELLER_ID";

  try {
    const tokenRes = await fetch(LWA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LWA_REDIRECT_URI,
        client_id: LWA_CLIENT_ID,
        client_secret: LWA_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_OAUTH_TOKEN_EXCHANGE_FAILED",
        severity: "error",
        message: "LWA token exchange failed",
        meta: { status: tokenRes.status, body: errText.slice(0, 200) },
      });
      return redirectToApp(false, "token_exchange_failed");
    }

    const tokenData = (await tokenRes.json()) as { refresh_token?: string };
    const refreshToken = tokenData.refresh_token;
    if (!refreshToken) {
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_OAUTH_CALLBACK_FAILED",
        severity: "error",
        message: "No refresh_token in LWA response",
      });
      return redirectToApp(false, "no_refresh_token");
    }

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("upsert_spapi_connection_from_backend", {
      p_org_id: orgId,
      p_created_by: userId,
      p_region: region,
      p_seller_id: sellerId,
      p_marketplace_ids: marketplaceIds,
      p_lwa_client_id: LWA_CLIENT_ID,
      p_lwa_refresh_token_plain: refreshToken,
    });

    if (rpcErr) {
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_OAUTH_DB_FAILED",
        severity: "error",
        message: "upsert_spapi_connection_from_backend failed",
        meta: { error: rpcErr.message },
      });
      return redirectToApp(false, rpcErr.message);
    }

    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "SPAPI_OAUTH_CONNECTED",
      severity: "info",
      entity_type: "spapi_connection",
      entity_id: Array.isArray(rpcData)?.[0]?.id ?? null,
      message: "SP-API connection saved",
      meta: { seller_id: sellerId, region },
    });

    return redirectToApp(true);
  } catch (e) {
    const msg = (e as Error).message;
    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "SPAPI_OAUTH_CALLBACK_FAILED",
      severity: "error",
      message: msg,
    });
    return redirectToApp(false, msg);
  }
});
