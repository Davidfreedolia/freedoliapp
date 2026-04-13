/**
 * SP-API OAuth init: returns state (signed) and consent URL for the chosen region.
 * Called by frontend with Auth + body { org_id, user_id, region, marketplace_ids }.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createState } from "../_shared/spapiState.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

const LWA_CLIENT_ID = Deno.env.get("LWA_CLIENT_ID");
const LWA_REDIRECT_URI = Deno.env.get("LWA_REDIRECT_URI");
const LWA_CLIENT_SECRET = Deno.env.get("LWA_CLIENT_SECRET");
const OAUTH_STATE_SECRET = Deno.env.get("OAUTH_STATE_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CONSENT_BY_REGION: Record<string, string> = {
  EU: "https://sellercentral-europe.amazon.com/apps/authorize/consent",
  NA: "https://sellercentral.amazon.com/apps/authorize/consent",
  FE: "https://sellercentral-japan.amazon.com/apps/authorize/consent",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  // Validar JWT real (no nomes comprovar que existeix l'header)
  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid or expired JWT" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }
  const verifiedUserId = userData.user.id;

  if (!LWA_CLIENT_ID || !LWA_REDIRECT_URI || !LWA_CLIENT_SECRET || !OAUTH_STATE_SECRET) {
    return new Response(JSON.stringify({ error: "SP-API OAuth not configured" }), {
      status: 503,
      headers: jsonHeaders,
    });
  }

  let body: { org_id?: string; user_id?: string; region?: string; marketplace_ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const orgId = body.org_id;
  const userId = body.user_id;
  const region = (body.region || "EU").toUpperCase();
  const marketplaceIds = Array.isArray(body.marketplace_ids) ? body.marketplace_ids : [];

  if (!orgId || !userId) {
    return new Response(JSON.stringify({ error: "org_id and user_id required" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  // Evitar que un usuari suplanti un altre passant un user_id diferent al JWT
  if (userId !== verifiedUserId) {
    return new Response(JSON.stringify({ error: "user_id mismatch with JWT" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  const consentBase = CONSENT_BY_REGION[region] || CONSENT_BY_REGION.EU;
  const payload = {
    org_id: orgId,
    user_id: userId,
    region,
    marketplace_ids: marketplaceIds,
    exp: Math.floor(Date.now() / 1000) + 600,
  };

  const state = await createState(payload, OAUTH_STATE_SECRET);
  const consentUrl = `${consentBase}?application_id=${encodeURIComponent(LWA_CLIENT_ID)}&state=${encodeURIComponent(state)}`;

  return new Response(
    JSON.stringify({
      state,
      consent_url: consentUrl,
      redirect_uri: LWA_REDIRECT_URI,
    }),
    { status: 200, headers: jsonHeaders }
  );
});
