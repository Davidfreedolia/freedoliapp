// D8.2 — Stripe Billing Portal session. Uses org_billing.stripe_customer_id.

import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("APP_BASE_URL") || "https://freedoliapp.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }
  const userId = userData.user.id;

  let body: { org_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orgId = body?.org_id;
  if (!orgId || typeof orgId !== "string") {
    return jsonResponse({ error: "org_id required" }, 400);
  }

  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (memErr || !membership) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const role = (membership.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data: billing, error: billingErr } = await supabaseAdmin
    .from("org_billing")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (billingErr || !billing?.stripe_customer_id) {
    return jsonResponse({ error: "NO_CUSTOMER" }, 400);
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${SITE_URL}/app/settings/billing`,
  });

  return jsonResponse({ url: portal.url }, 200);
});
