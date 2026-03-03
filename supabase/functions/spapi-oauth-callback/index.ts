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

const SPAPI_BASE_BY_REGION: Record<string, string> = {
  EU: "https://sellingpartnerapi-eu.amazon.com",
  NA: "https://sellingpartnerapi-na.amazon.com",
  FE: "https://sellingpartnerapi-fe.amazon.com",
};

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

    const tokenData = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
    const refreshToken = tokenData.refresh_token;
    const accessToken = tokenData.access_token;
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

    await logOpsEvent({
      org_id: orgId,
      source: "edge",
      event_type: "SPAPI_SELLER_RESOLVE_STARTED",
      severity: "info",
      message: "Resolving seller_id after OAuth",
      meta: { region },
    });

    let resolvedSellerId: string | null = sellingPartnerId?.trim() || (payload.selling_partner_id as string)?.trim() || null;

    if (!resolvedSellerId && accessToken) {
      const spapiBase = SPAPI_BASE_BY_REGION[region] || SPAPI_BASE_BY_REGION.EU;
      const whoamiUrl = `${spapiBase}/sellers/v1/marketplaceParticipations`;
      try {
        const whoamiRes = await fetch(whoamiUrl, {
          headers: { "x-amz-access-token": accessToken },
        });
        if (whoamiRes.ok) {
          const whoamiJson = (await whoamiRes.json()) as { payload?: Array<{ seller?: { sellerId?: string }; marketplace?: { id?: string } }> };
          const payloadList = whoamiJson?.payload;
          if (Array.isArray(payloadList) && payloadList.length > 0) {
            const first = payloadList[0];
            const sid = (first as { seller?: { sellerId?: string } }).seller?.sellerId;
            if (sid) resolvedSellerId = sid;
          }
        }
      } catch (_) {
        // ignore; resolvedSellerId stays null
      }
    }

    const finalSellerId = resolvedSellerId || "PENDING";
    const status = resolvedSellerId ? "active" : "inactive";
    const lastError = resolvedSellerId ? null : "seller_id_resolution_failed";

    if (resolvedSellerId) {
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_SELLER_RESOLVE_DONE",
        severity: "info",
        message: "Seller id resolved",
        meta: { seller_id: resolvedSellerId, region },
      });
    } else {
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_SELLER_RESOLVE_FAILED",
        severity: "warn",
        message: "Could not resolve seller_id",
        meta: { region },
      });
      await logOpsEvent({
        org_id: orgId,
        source: "edge",
        event_type: "SPAPI_OAUTH_FAILED",
        severity: "warn",
        message: "Seller id resolution failed",
        meta: { reason: "seller_id_resolution_failed" },
      });
    }

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("upsert_spapi_connection_from_backend", {
      p_org_id: orgId,
      p_created_by: userId,
      p_region: region,
      p_seller_id: finalSellerId,
      p_marketplace_ids: marketplaceIds,
      p_lwa_client_id: LWA_CLIENT_ID,
      p_lwa_refresh_token_plain: refreshToken,
      p_status: status,
      p_last_error: lastError,
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
      meta: { seller_id: finalSellerId, status, region },
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
