import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || Deno.env.get("APP_BASE_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type Interval = "monthly" | "yearly";

interface RequestBody {
  org_id?: string;
  plan_code?: string;
  interval?: Interval | string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!APP_URL) {
    console.error("APP_URL env not set");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const accessToken = bearerMatch?.[1]?.trim();
  if (!accessToken) {
    return jsonResponse({ error: "Missing or invalid Authorization header (expected: Bearer <token>)" }, 401);
  }

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }
  const userId = userData.user.id as string;

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const orgId = body.org_id;
  const planCodeRaw = body.plan_code;
  const intervalRaw = body.interval;

  if (!orgId || typeof orgId !== "string") {
    return jsonResponse({ error: "org_id required" }, 400);
  }

  if (!planCodeRaw || typeof planCodeRaw !== "string") {
    return jsonResponse({ error: "plan_code required" }, 400);
  }

  const allowedPlans = ["starter", "growth", "scale"];
  const planCode = planCodeRaw.toLowerCase();
  if (!allowedPlans.includes(planCode)) {
    return jsonResponse({ error: "Invalid plan_code" }, 400);
  }

  if (!intervalRaw || typeof intervalRaw !== "string") {
    return jsonResponse({ error: "interval required" }, 400);
  }
  const interval = intervalRaw.toLowerCase() as Interval;
  if (!(interval === "monthly" || interval === "yearly")) {
    return jsonResponse({ error: "Invalid interval" }, 400);
  }

  // 1) Validate membership
  const { data: membershipRows, error: memErr } = await supabaseAdmin
    .from("org_memberships")
    .select("org_id, user_id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .limit(1);

  if (memErr) {
    return jsonResponse({ error: "Membership lookup failed" }, 500);
  }
  if (!membershipRows || membershipRows.length === 0) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // 2) Check existing active entitlements
  const { data: ent, error: entErr } = await supabaseAdmin
    .from("billing_org_entitlements")
    .select("is_active")
    .eq("org_id", orgId)
    .maybeSingle();

  if (entErr) {
    console.error("Entitlements lookup error", entErr);
    return jsonResponse({ error: "Entitlements lookup failed" }, 500);
  }

  if (ent?.is_active === true) {
    return jsonResponse(
      { error: "Organization already has an active billing entitlement" },
      409,
    );
  }

  // 3) Resolve plan and price
  const { data: plan, error: planErr } = await supabaseAdmin
    .from("billing_plans")
    .select(
      "id, code, is_active, stripe_price_monthly_id, stripe_price_yearly_id",
    )
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();

  if (planErr) {
    console.error("Plan lookup error", planErr);
    return jsonResponse({ error: "Plan lookup failed" }, 500);
  }
  if (!plan) {
    return jsonResponse({ error: "Plan not found or inactive" }, 404);
  }

  let priceId: string | null = null;
  if (interval === "monthly") {
    priceId = (plan.stripe_price_monthly_id as string | null) ?? null;
  } else {
    priceId = (plan.stripe_price_yearly_id as string | null) ?? null;
  }

  if (!priceId) {
    return jsonResponse({ error: "Plan price not configured" }, 500);
  }

  // 4) Create checkout session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: orgId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/app/billing?checkout=success`,
      cancel_url: `${APP_URL}/app/billing?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: {
        org_id: orgId,
        user_id: userId,
        plan_code: planCode,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          user_id: userId,
          plan_code: planCode,
        },
      },
    });

    return jsonResponse(
      {
        url: session.url,
        sessionId: session.id,
      },
      200,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout.session.create error", msg, err);
    return jsonResponse({ error: msg }, 500);
  }
}
);

