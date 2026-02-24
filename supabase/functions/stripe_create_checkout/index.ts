// S8.2 — Create Stripe Checkout Session (subscription) for an org. TEST MODE.
// Auth: JWT required; user must be owner/admin of org.

import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_ID_CORE = Deno.env.get("STRIPE_PRICE_ID_CORE")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("authorization") ?? "";
  console.log("AUTH HEADER PRESENT:", Boolean(authHeader));
  console.log("AUTH HEADER PREFIX:", authHeader?.slice(0, 20) ?? "NONE");
  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ code: 401, message: "Invalid JWT" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
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
    .maybeSingle();

  if (memErr || !membership) {
    return new Response(JSON.stringify({ code: 403, message: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const role = (membership.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return new Response(JSON.stringify({ code: 403, message: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from("orgs")
    .select("id, stripe_customer_id, plan_id")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    return jsonResponse({ error: "Org not found" }, 400);
  }

  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { org_id: orgId },
    });
    customerId = customer.id;
    await supabaseAdmin.from("orgs").update({ stripe_customer_id: customerId }).eq("id", orgId);
  }

  const priceId = org.plan_id === "core" ? STRIPE_PRICE_ID_CORE : STRIPE_PRICE_ID_CORE;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_BASE_URL}/settings?billing=success`,
    cancel_url: `${APP_BASE_URL}/settings?billing=cancel`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { org_id: orgId } },
  });

  return jsonResponse({ url: session.url }, 200);
});
