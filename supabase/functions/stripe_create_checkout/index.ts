// S8.2 — Create Stripe Checkout Session (subscription) for an org. TEST MODE.
// Auth: JWT required; user must be owner/admin of org.

import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_PRICE_ID_CORE = Deno.env.get("STRIPE_PRICE_ID_CORE")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

async function assertOwnerOrAdmin(orgId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("org_memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === "owner" || data.role === "admin";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

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

  if (!(await assertOwnerOrAdmin(orgId, userId))) {
    return jsonResponse({ error: "Forbidden: owner or admin required" }, 403);
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
