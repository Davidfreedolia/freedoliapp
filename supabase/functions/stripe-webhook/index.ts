// D8.2 — Stripe webhook: sync subscription/invoice events to org_billing. Idempotent via stripe_webhook_events.

import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PRICE_TO_PLAN: Record<string, string> = {};
const priceGrowth = Deno.env.get("STRIPE_PRICE_GROWTH");
const pricePro = Deno.env.get("STRIPE_PRICE_PRO");
const priceAgency = Deno.env.get("STRIPE_PRICE_AGENCY");
if (priceGrowth) PRICE_TO_PLAN[priceGrowth] = "growth";
if (pricePro) PRICE_TO_PLAN[pricePro] = "pro";
if (priceAgency) PRICE_TO_PLAN[priceAgency] = "agency";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

function mapStripeStatus(s: string): BillingStatus {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled") return "canceled";
  return "past_due";
}

function planFromPriceId(priceId: string | undefined): string {
  if (!priceId) return "growth";
  return PRICE_TO_PLAN[priceId] || "growth";
}

function getOrgIdFromEvent(obj: { metadata?: { org_id?: string }; customer?: string; subscription?: string }): string | null {
  const meta = obj?.metadata as { org_id?: string } | undefined;
  if (meta?.org_id) return meta.org_id;
  return null;
}

async function ensureNotDuplicate(eventId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({ event_id: eventId });
  if (error?.code === "23505") return false; // duplicate
  if (error) throw error;
  return true;
}

async function updateOrgBilling(orgId: string, update: {
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
  plan?: string;
  status?: BillingStatus;
  current_period_end_at?: string | null;
}) {
  const payload: Record<string, unknown> = { ...update, updated_at: new Date().toISOString() };
  const { error } = await supabaseAdmin.from("org_billing").update(payload).eq("org_id", orgId);
  if (error) throw error;
}

async function findOrgByStripeCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("org_billing").select("org_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.org_id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  try {
    const isNew = await ensureNotDuplicate(event.id);
    if (!isNew) {
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("Idempotency check failed", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = getOrgIdFromEvent(session) || (session.customer ? await findOrgByStripeCustomer(String(session.customer)) : null);
      if (!orgId) {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const subId = session.subscription ? String(session.subscription) : null;
      const payload: { stripe_customer_id?: string; stripe_subscription_id?: string | null; updated_at: string } = {
        stripe_customer_id: session.customer ? String(session.customer) : undefined,
        stripe_subscription_id: subId,
        updated_at: new Date().toISOString(),
      };
      if (session.customer) payload.stripe_customer_id = String(session.customer);
      await updateOrgBilling(orgId, payload);
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = String(sub.customer);
      const orgId = (sub.metadata as { org_id?: string } | undefined)?.org_id || await findOrgByStripeCustomer(customerId);
      if (!orgId) {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const priceId = sub.items?.data?.[0]?.price?.id;
      await updateOrgBilling(orgId, {
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan: planFromPriceId(priceId),
        status: mapStripeStatus(sub.status),
        current_period_end_at: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      });
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = String(sub.customer);
      const orgId = (sub.metadata as { org_id?: string } | undefined)?.org_id || await findOrgByStripeCustomer(customerId);
      if (!orgId) {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      await updateOrgBilling(orgId, { status: "canceled", stripe_subscription_id: null });
    } else if (event.type === "invoice.payment_succeeded") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = String(inv.customer);
      const subId = inv.subscription ? String(inv.subscription) : null;
      let orgId: string | null = null;
      if (inv.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
          orgId = (sub.metadata as { org_id?: string } | undefined)?.org_id || null;
        } catch (_) {}
      }
      if (!orgId) orgId = await findOrgByStripeCustomer(customerId);
      if (!orgId) {
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const update: { status: BillingStatus; current_period_end_at?: string } = { status: "active" };
      if (subId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          update.current_period_end_at = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined;
        } catch (_) {}
      }
      await updateOrgBilling(orgId, update);
    } else if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = String(inv.customer);
      let orgId: string | null = await findOrgByStripeCustomer(customerId);
      if (inv.subscription && !orgId) {
        try {
          const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
          orgId = (sub.metadata as { org_id?: string } | undefined)?.org_id || null;
        } catch (_) {}
      }
      if (orgId) {
        await updateOrgBilling(orgId, { status: "past_due" });
      }
    }
  } catch (err) {
    console.error("Webhook handler error", event.type, err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
