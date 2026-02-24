// S8.1 — Stripe webhook Edge Function (TEST MODE: sk_test_... + whsec_...)
// Events: subscription created/updated/deleted, invoice paid/payment_failed
// Updates public.orgs: billing_status, stripe_customer_id, stripe_subscription_id, trial_ends_at

import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

function mapStripeStatusToBilling(status: string): BillingStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return "past_due";
  }
}

async function findOrgId(customerId: string | null, subscriptionId: string | null): Promise<string | null> {
  if (!customerId && !subscriptionId) return null;
  const conditions: string[] = [];
  const params: string[] = [];
  if (customerId) {
    conditions.push("stripe_customer_id.eq." + customerId);
  }
  if (subscriptionId) {
    conditions.push("stripe_subscription_id.eq." + subscriptionId);
  }
  const { data, error } = await supabaseAdmin
    .from("orgs")
    .select("id")
    .or(conditions.join(","))
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

async function updateOrg(
  orgId: string,
  update: {
    billing_status?: BillingStatus;
    stripe_customer_id?: string;
    stripe_subscription_id?: string | null;
    trial_ends_at?: string | null;
  }
) {
  const { error } = await supabaseAdmin.from("orgs").update(update).eq("id", orgId);
  if (error) throw error;
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

  console.log(event.type);

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = String(sub.customer);
      const subId = sub.id;
      const billing = mapStripeStatusToBilling(sub.status);
      const trialEndsAt = sub.trial_end != null ? new Date(sub.trial_end * 1000).toISOString() : undefined;

      const orgId = await findOrgId(customerId, subId);
      if (!orgId) {
        console.log("No org found for subscription", subId, "customer", customerId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await updateOrg(orgId, {
        billing_status: billing,
        stripe_customer_id: customerId,
        stripe_subscription_id: subId,
        ...(trialEndsAt != null && { trial_ends_at: trialEndsAt }),
      });
      console.log("Updated org", orgId, "subscription", sub.type);
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = String(sub.customer);
      const subId = sub.id;

      const orgId = await findOrgId(customerId, subId);
      if (!orgId) {
        console.log("No org found for subscription.deleted", subId);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await updateOrg(orgId, { billing_status: "canceled" });
      console.log("Updated org", orgId, "subscription deleted");
    } else if (event.type === "invoice.paid") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = String(inv.customer);
      const subscriptionId = inv.subscription ? String(inv.subscription) : null;

      const orgId = await findOrgId(customerId, subscriptionId);
      if (!orgId) {
        console.log("No org found for invoice.paid", inv.id);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await updateOrg(orgId, { billing_status: "active" });
      console.log("Updated org", orgId, "invoice.paid");
    } else if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = String(inv.customer);
      const subscriptionId = inv.subscription ? String(inv.subscription) : null;

      const orgId = await findOrgId(customerId, subscriptionId);
      if (!orgId) {
        console.log("No org found for invoice.payment_failed", inv.id);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      await updateOrg(orgId, { billing_status: "past_due" });
      console.log("Updated org", orgId, "invoice.payment_failed");
    }
  } catch (err) {
    console.error("Webhook handler error", event.type, err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
