// D8.2 — Stripe Checkout Session (subscription). Uses org_billing; trial_end aligned to trial_ends_at.

import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("APP_BASE_URL") || "https://freedoliapp.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PRICE_IDS: Record<string, string> = {
  growth: Deno.env.get("STRIPE_PRICE_GROWTH") || "",
  pro: Deno.env.get("STRIPE_PRICE_PRO") || "",
  agency: Deno.env.get("STRIPE_PRICE_AGENCY") || "",
};

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

  let body: { org_id?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orgId = body?.org_id;
  const plan = body?.plan;
  if (!orgId || typeof orgId !== "string") {
    return jsonResponse({ error: "org_id required" }, 400);
  }
  const planNorm = plan && ["growth", "pro", "agency"].includes(plan) ? plan : "growth";

  const priceId = PRICE_IDS[planNorm];
  if (!priceId) {
    return jsonResponse({ error: "Plan price not configured" }, 500);
  }

  const { data: membership, error: memErr } = await supabaseAdmin
    .from("org_memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
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
    .select("stripe_customer_id, status, trial_ends_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (billingErr) {
    return jsonResponse({ error: "Billing lookup failed" }, 500);
  }

  let customerId = billing?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { org_id: orgId },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("org_billing")
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("org_id", orgId);
  }

  const now = Math.floor(Date.now() / 1000);
  const trialEndsAt = billing?.trial_ends_at ? Math.floor(new Date(billing.trial_ends_at).getTime() / 1000) : null;
  const useTrial = billing?.status === "trialing" && trialEndsAt != null && trialEndsAt > now;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE_URL}/app/settings/billing?stripe=success`,
    cancel_url: `${SITE_URL}/app/settings/billing?stripe=cancel`,
    subscription_data: {
      metadata: { org_id: orgId, plan: planNorm },
      ...(useTrial && trialEndsAt ? { trial_end: trialEndsAt } : {}),
    },
    metadata: { org_id: orgId, plan: planNorm },
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  return jsonResponse({ url: session.url }, 200);
});
