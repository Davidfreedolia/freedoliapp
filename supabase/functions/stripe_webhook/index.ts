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

type BillingSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

type BillingAccessStatus =
  | "trialing"
  | "active"
  | "grace"
  | "past_due"
  | "canceled"
  | "restricted";

type WebhookRecord = {
  id: string;
  duplicate: boolean;
};

type PlanResolution = {
  id: string;
  code: string;
} | null;

function toIsoFromUnixSeconds(value: number | null | undefined): string | null {
  if (!value && value !== 0) return null;
  return new Date(value * 1000).toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function upsertWebhookEvent(event: Stripe.Event): Promise<WebhookRecord> {
  const { data, error } = await supabaseAdmin
    .from("billing_webhook_events")
    .upsert(
      {
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as any,
      },
      { onConflict: "stripe_event_id" },
    )
    .select("id, processed")
    .single();

  if (error) {
    console.error("billing_webhook_events upsert error", error);
    throw error;
  }

  return {
    id: data.id as string,
    duplicate: data.processed === true,
  };
}

async function markWebhookProcessed(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("billing_webhook_events")
    .update({
      processed: true,
      processed_at: nowIso(),
      error_message: null,
      updated_at: nowIso(),
    })
    .eq("id", id);
  if (error) {
    console.error("billing_webhook_events mark processed error", error);
  }
}

async function markWebhookError(id: string, message: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("billing_webhook_events")
    .update({
      processed: false,
      error_message: message,
      updated_at: nowIso(),
    })
    .eq("id", id);
  if (error) {
    console.error("billing_webhook_events mark error", error);
  }
}

// D20 — Trial conversion tracking. Same contract as src/lib/trials/markTrialConverted.js
const TRIAL_STATUS_PENDING = ["started", "workspace_created"];

type TrialConvertResult = {
  ok: boolean;
  matched: boolean;
  updated: boolean;
  matchType: "workspace_id" | "email" | null;
  trialRegistrationId: string | null;
  error: string | null;
};

async function tryMarkTrialConverted(
  supabase: ReturnType<typeof createClient>,
  opts: { workspaceId?: string | null; email?: string | null; convertedAt?: string | null }
): Promise<TrialConvertResult> {
  const { workspaceId = null, email = null, convertedAt = null } = opts;
  const convertedAtValue = convertedAt || nowIso();
  const empty = (overrides: Partial<TrialConvertResult> = {}): TrialConvertResult => ({
    ok: true,
    matched: false,
    updated: false,
    matchType: null,
    trialRegistrationId: null,
    error: null,
    ...overrides,
  });

  try {
    let row: { id: string } | null = null;
    let matchType: "workspace_id" | "email" | null = null;

    if (workspaceId) {
      const { data } = await supabase
        .from("trial_registrations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .in("status", TRIAL_STATUS_PENDING)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        row = data;
        matchType = "workspace_id";
      }
    }

    if (!row && email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (normalizedEmail) {
        const { data: candidates } = await supabase
          .from("trial_registrations")
          .select("id, email")
          .in("status", TRIAL_STATUS_PENDING)
          .order("created_at", { ascending: false })
          .limit(10);
        const found = (candidates || []).find(
          (c: { email?: string | null }) =>
            c.email && String(c.email).trim().toLowerCase() === normalizedEmail
        );
        if (found) {
          row = { id: (found as { id: string }).id };
          matchType = "email";
        }
      }
    }

    if (!row) return empty();

    const { error } = await supabase
      .from("trial_registrations")
      .update({ status: "converted", converted_at: convertedAtValue })
      .eq("id", row.id);

    if (error) {
      console.warn("D20 trial conversion update failed", error);
      return empty({
        ok: false,
        matched: true,
        updated: false,
        matchType,
        trialRegistrationId: row.id,
        error: error.message || String(error),
      });
    }

    return empty({
      matched: true,
      updated: true,
      matchType,
      trialRegistrationId: row.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("D20 trial conversion", msg);
    return empty({ ok: false, error: msg });
  }
}

function getMetadataOrgId(obj: { metadata?: { org_id?: string } } | any): string | null {
  const meta = (obj?.metadata ?? {}) as { org_id?: string };
  return meta.org_id ?? null;
}

function getMetadataUserId(obj: { metadata?: { user_id?: string } } | any): string | null {
  const meta = (obj?.metadata ?? {}) as { user_id?: string };
  return meta.user_id ?? null;
}

function getMetadataPlanCode(obj: { metadata?: { plan_code?: string } } | any): string | null {
  const meta = (obj?.metadata ?? {}) as { plan_code?: string };
  return meta.plan_code ?? null;
}

async function resolveOrgIdFromCustomer(customerId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("billing_customers")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) {
    console.error("resolveOrgIdFromCustomer error", error);
    throw error;
  }
  return data?.org_id ?? null;
}

async function resolveOrgIdFromEventObject(obj: any): Promise<string> {
  const metaOrg = getMetadataOrgId(obj);
  if (metaOrg) return metaOrg;

  const customerIdRaw = (obj?.customer ?? null) as string | null;
  const customerId = customerIdRaw ? String(customerIdRaw) : null;
  if (customerId) {
    const orgId = await resolveOrgIdFromCustomer(customerId);
    if (orgId) return orgId;
  }

  throw new Error("Unable to resolve org_id for event");
}

async function ensureBillingCustomer(
  orgId: string,
  stripeCustomerId: string,
  email: string | null,
  fullName: string | null,
): Promise<string> {
  // Set other customers for this org as non-default before upsert
  const { error: clearErr } = await supabaseAdmin
    .from("billing_customers")
    .update({ is_default: false, updated_at: nowIso() })
    .eq("org_id", orgId);
  if (clearErr) {
    console.error("ensureBillingCustomer clear default error", clearErr);
  }

  const { data, error } = await supabaseAdmin
    .from("billing_customers")
    .upsert(
      {
        org_id: orgId,
        stripe_customer_id: stripeCustomerId,
        email: email ?? undefined,
        full_name: fullName ?? undefined,
        is_default: true,
        updated_at: nowIso(),
      },
      { onConflict: "stripe_customer_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("ensureBillingCustomer upsert error", error);
    throw error;
  }

  return data.id as string;
}

async function resolvePlanByPriceId(stripePriceId: string | null | undefined): Promise<PlanResolution> {
  if (!stripePriceId) return null;
  const priceId = String(stripePriceId);
  const { data, error } = await supabaseAdmin
    .from("billing_plans")
    .select("id, code")
    .or(`stripe_price_monthly_id.eq.${priceId},stripe_price_yearly_id.eq.${priceId}`)
    .maybeSingle();
  if (error) {
    console.error("resolvePlanByPriceId error", error);
    throw error;
  }
  if (!data) return null;
  return { id: data.id as string, code: data.code as string };
}

async function buildPlanFeaturesJson(planId: string | null): Promise<Record<string, { enabled: boolean; limit: number | null }>> {
  if (!planId) return {};
  const { data, error } = await supabaseAdmin
    .from("billing_plan_features")
    .select("feature_code, enabled, limit_value")
    .eq("plan_id", planId);
  if (error) {
    console.error("buildPlanFeaturesJson error", error);
    throw error;
  }
  const result: Record<string, { enabled: boolean; limit: number | null }> = {};
  for (const row of data ?? []) {
    result[row.feature_code as string] = {
      enabled: row.enabled as boolean,
      limit: row.limit_value === null || row.limit_value === undefined ? null : (row.limit_value as number),
    };
  }
  return result;
}

async function getSeatLimitFromPlan(planId: string | null): Promise<number> {
  if (!planId) return 1;
  const { data, error } = await supabaseAdmin
    .from("billing_plan_features")
    .select("feature_code, limit_value")
    .eq("plan_id", planId)
    .eq("feature_code", "team.seats")
    .maybeSingle();
  if (error) {
    console.error("getSeatLimitFromPlan error", error);
    throw error;
  }
  const limit = data?.limit_value as number | null | undefined;
  return limit == null ? 1 : limit;
}

async function getActiveOverrideForOrg(orgId: string): Promise<any | null> {
  const now = nowIso();
  const query = supabaseAdmin
    .from("billing_org_overrides")
    .select("*")
    .eq("org_id", orgId)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("getActiveOverrideForOrg error", error);
    throw error;
  }
  return data ?? null;
}

async function refreshOrgEntitlements(orgId: string): Promise<void> {
  const now = new Date();

  // 1) Check override
  const override = await getActiveOverrideForOrg(orgId);

  let planId: string | null = null;
  let subscriptionId: string | null = null;
  let billingStatus: BillingAccessStatus = "restricted";
  let seatLimit = 1;
  let featuresJson: Record<string, { enabled: boolean; limit: number | null }> = {};
  let graceUntil: string | null = null;
  let isActive = false;

  if (override) {
    planId = override.plan_id ?? null;
    const baseFeatures = await buildPlanFeaturesJson(planId);
    const overrideFeatures = (override.features_override as Record<string, { enabled: boolean; limit: number | null }> | null) ?? null;
    featuresJson = overrideFeatures ? { ...baseFeatures, ...overrideFeatures } : baseFeatures;

    const seatFromPlan = await getSeatLimitFromPlan(planId);
    seatLimit = override.seat_limit_override ?? seatFromPlan ?? 1;

    billingStatus = (override.billing_status_override as BillingAccessStatus | null) ?? "active";
    graceUntil = override.ends_at ? (override.ends_at as string) : null;
    isActive = true;
  } else {
    // 2) Most recent subscription
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id, plan_id, status, access_status, current_period_end, grace_until")
      .eq("org_id", orgId)
      .order("current_period_end", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      console.error("refreshOrgEntitlements subscription error", subErr);
      throw subErr;
    }

    if (sub) {
      subscriptionId = sub.id as string;
      planId = sub.plan_id ?? null;
      const status = sub.status as BillingSubscriptionStatus;
      const grace = sub.grace_until ? new Date(sub.grace_until as string) : null;
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end as string) : null;

      if (status === "trialing") {
        isActive = true;
        billingStatus = "trialing";
      } else if (status === "active") {
        isActive = true;
        billingStatus = "active";
      } else if (status === "past_due") {
        if (grace && grace >= now) {
          isActive = true;
          billingStatus = "grace";
          graceUntil = grace.toISOString();
        } else {
          isActive = false;
          billingStatus = "past_due";
        }
      } else if (status === "unpaid") {
        isActive = false;
        billingStatus = "restricted";
      } else if (status === "canceled") {
        if (periodEnd && periodEnd >= now) {
          isActive = true;
          billingStatus = "canceled";
        } else {
          isActive = false;
          billingStatus = "restricted";
        }
      } else {
        isActive = false;
        billingStatus = "restricted";
      }

      featuresJson = await buildPlanFeaturesJson(planId);
      seatLimit = await getSeatLimitFromPlan(planId);
    } else {
      // No subscription: restricted
      isActive = false;
      billingStatus = "restricted";
      seatLimit = 1;
      featuresJson = {};
    }
  }

  const { error } = await supabaseAdmin
    .from("billing_org_entitlements")
    .upsert(
      {
        org_id: orgId,
        plan_id: planId,
        subscription_id: subscriptionId,
        billing_status: billingStatus,
        seat_limit: seatLimit,
        features_jsonb: featuresJson,
        grace_until: graceUntil,
        is_active: isActive,
        updated_at: nowIso(),
      },
      { onConflict: "org_id" },
    );

  if (error) {
    console.error("refreshOrgEntitlements upsert error", error);
    throw error;
  }
}

function mapStripeToAccessStatus(status: string): BillingAccessStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    default:
      return "restricted";
  }
}

function mapStripeToBillingStatus(status: string): BillingSubscriptionStatus {
  const s = status as BillingSubscriptionStatus;
  return s;
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  const metadataOrgId = getMetadataOrgId(session as any);
  const metadataUserId = getMetadataUserId(session as any);
  const metadataPlanCode = getMetadataPlanCode(session as any);
  if (!metadataOrgId) {
    throw new Error("checkout.session.completed missing metadata.org_id");
  }
  const orgId = metadataOrgId;

  const customerIdRaw = session.customer ?? null;
  if (!customerIdRaw) {
    throw new Error("checkout.session.completed missing customer");
  }
  const customerId = String(customerIdRaw);

  const email = session.customer_details?.email ?? null;
  const fullName = session.customer_details?.name ?? null;

  const billingCustomerId = await ensureBillingCustomer(orgId, customerId, email, fullName);

  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(String(session.subscription));
    const item = sub.items.data[0];
    const price = item?.price;
    const priceId = price?.id ?? null;
    const productId = price?.product ? String(price.product) : null;

    const planResolution = await resolvePlanByPriceId(priceId);
    const planId = planResolution?.id ?? null;

    const status = mapStripeToBillingStatus(sub.status);
    const accessStatus = mapStripeToAccessStatus(sub.status) as BillingAccessStatus;

    const { error } = await supabaseAdmin
      .from("billing_subscriptions")
      .upsert(
        {
          org_id: orgId,
          billing_customer_id: billingCustomerId,
          plan_id: planId,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          stripe_product_id: productId,
          status,
          access_status: accessStatus,
          current_period_start: toIsoFromUnixSeconds(sub.current_period_start),
          current_period_end: toIsoFromUnixSeconds(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          canceled_at: toIsoFromUnixSeconds(sub.canceled_at ?? null),
          trial_ends_at: toIsoFromUnixSeconds(sub.trial_end),
          raw_event: sub as any,
          updated_at: nowIso(),
        },
        { onConflict: "stripe_subscription_id" },
      );

    if (error) {
      console.error("handleCheckoutSessionCompleted upsert subscription error", error);
      throw error;
    }
  }

  await refreshOrgEntitlements(orgId);
}

async function handleSubscriptionUpsert(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = String(sub.customer);

  const metaOrgId = getMetadataOrgId(sub as any);
  const metaUserId = getMetadataUserId(sub as any);
  const metaPlanCode = getMetadataPlanCode(sub as any);

  const orgId = await resolveOrgIdFromEventObject(sub as any);

  // ensure billing customer row exists
  const billingCustomerId = await ensureBillingCustomer(orgId, customerId, null, null);

  const item = sub.items.data[0];
  const price = item?.price;
  const priceId = price?.id ?? null;
  const productId = price?.product ? String(price.product) : null;

  const planResolution = await resolvePlanByPriceId(priceId);
  const planId = planResolution?.id ?? null;

  const status = mapStripeToBillingStatus(sub.status);
  let accessStatus = mapStripeToAccessStatus(sub.status);

  let graceUntil: string | null = null;
  if (status === "past_due") {
    const graceDate = new Date();
    graceDate.setDate(graceDate.getDate() + 7);
    graceUntil = graceDate.toISOString();
  }

  const { error } = await supabaseAdmin
    .from("billing_subscriptions")
    .upsert(
      {
        org_id: orgId,
        billing_customer_id: billingCustomerId,
        plan_id: planId,
        stripe_subscription_id: sub.id,
        stripe_price_id: priceId,
        stripe_product_id: productId,
        status,
        access_status: accessStatus,
        current_period_start: toIsoFromUnixSeconds(sub.current_period_start),
        current_period_end: toIsoFromUnixSeconds(sub.current_period_end),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: toIsoFromUnixSeconds(sub.canceled_at ?? null),
        trial_ends_at: toIsoFromUnixSeconds(sub.trial_end),
        grace_until: graceUntil,
        raw_event: sub as any,
        updated_at: nowIso(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (error) {
    console.error("handleSubscriptionUpsert upsert error", error);
    throw error;
  }

  await refreshOrgEntitlements(orgId);

  // D20 — trial conversion tracking (best-effort, never blocks)
  try {
    const { data: cust } = await supabaseAdmin
      .from("billing_customers")
      .select("email")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle();
    const customerEmail = (cust as { email?: string | null } | null)?.email ?? null;
    const result = await tryMarkTrialConverted(supabaseAdmin, {
      workspaceId: orgId,
      email: customerEmail,
      convertedAt: nowIso(),
    });
    if (result.matched || result.error) {
      console.log("D20 subscription trial conversion", {
        event: event.type,
        matched: result.matched,
        updated: result.updated,
        matchType: result.matchType,
        trialRegistrationId: result.trialRegistrationId ?? undefined,
        error: result.error ?? undefined,
      });
    }
  } catch (_) {
    console.warn("D20 trial conversion (subscription) failed");
  }
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const customerId = String(inv.customer);
  const subscriptionId = inv.subscription ? String(inv.subscription) : null;

  const orgId = await resolveOrgIdFromEventObject(inv as any);

  let internalSubId: string | null = null;
  if (subscriptionId) {
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (subErr) {
      console.error("handleInvoicePaid subscription lookup error", subErr);
      throw subErr;
    }
    internalSubId = subRow?.id ?? null;
  }

  const { error: invErr } = await supabaseAdmin
    .from("billing_invoices")
    .upsert(
      {
        org_id: orgId,
        subscription_id: internalSubId,
        stripe_invoice_id: inv.id,
        status: inv.status ?? null,
        amount_due: inv.amount_due ?? null,
        amount_paid: inv.amount_paid ?? null,
        currency: inv.currency ?? null,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        invoice_pdf_url: inv.invoice_pdf ?? null,
        period_start: toIsoFromUnixSeconds(inv.period_start ?? null),
        period_end: toIsoFromUnixSeconds(inv.period_end ?? null),
        paid_at: toIsoFromUnixSeconds(inv.status_transitions?.paid_at ?? null),
        raw_event: inv as any,
        updated_at: nowIso(),
      },
      { onConflict: "stripe_invoice_id" },
    );

  if (invErr) {
    console.error("handleInvoicePaid upsert invoice error", invErr);
    throw invErr;
  }

  if (internalSubId) {
    const { error: subUpdErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .update({
        status: "active" as BillingSubscriptionStatus,
        access_status: "active" as BillingAccessStatus,
        grace_until: null,
        current_period_start: toIsoFromUnixSeconds(inv.period_start ?? null),
        current_period_end: toIsoFromUnixSeconds(inv.period_end ?? null),
        updated_at: nowIso(),
      })
      .eq("id", internalSubId);

    if (subUpdErr) {
      console.error("handleInvoicePaid update subscription error", subUpdErr);
      throw subUpdErr;
    }
  }

  await refreshOrgEntitlements(orgId);

  // D20 — trial conversion tracking (best-effort, never blocks)
  try {
    const customerEmail = (inv as { customer_email?: string | null }).customer_email ?? null;
    const result = await tryMarkTrialConverted(supabaseAdmin, {
      workspaceId: orgId,
      email: customerEmail,
      convertedAt: nowIso(),
    });
    if (result.matched || result.error) {
      console.log("D20 invoice.paid trial conversion", {
        event: "invoice.paid",
        matched: result.matched,
        updated: result.updated,
        matchType: result.matchType,
        trialRegistrationId: result.trialRegistrationId ?? undefined,
        error: result.error ?? undefined,
      });
    }
  } catch (_) {
    console.warn("D20 trial conversion (invoice.paid) failed");
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const inv = event.data.object as Stripe.Invoice;
  const customerId = String(inv.customer);
  const subscriptionId = inv.subscription ? String(inv.subscription) : null;

  const orgId = await resolveOrgIdFromEventObject(inv as any);

  let internalSubId: string | null = null;
  if (subscriptionId) {
    const { data: subRow, error: subErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    if (subErr) {
      console.error("handleInvoicePaymentFailed subscription lookup error", subErr);
      throw subErr;
    }
    internalSubId = subRow?.id ?? null;
  }

  const { error: invErr } = await supabaseAdmin
    .from("billing_invoices")
    .upsert(
      {
        org_id: orgId,
        subscription_id: internalSubId,
        stripe_invoice_id: inv.id,
        status: inv.status ?? null,
        amount_due: inv.amount_due ?? null,
        amount_paid: inv.amount_paid ?? null,
        currency: inv.currency ?? null,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        invoice_pdf_url: inv.invoice_pdf ?? null,
        period_start: toIsoFromUnixSeconds(inv.period_start ?? null),
        period_end: toIsoFromUnixSeconds(inv.period_end ?? null),
        paid_at: toIsoFromUnixSeconds(inv.status_transitions?.paid_at ?? null),
        raw_event: inv as any,
        updated_at: nowIso(),
      },
      { onConflict: "stripe_invoice_id" },
    );

  if (invErr) {
    console.error("handleInvoicePaymentFailed upsert invoice error", invErr);
    throw invErr;
  }

  if (internalSubId) {
    const graceDate = new Date();
    graceDate.setDate(graceDate.getDate() + 7);

    const { error: subUpdErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .update({
        status: "past_due" as BillingSubscriptionStatus,
        access_status: "past_due" as BillingAccessStatus,
        grace_until: graceDate.toISOString(),
        updated_at: nowIso(),
      })
      .eq("id", internalSubId);

    if (subUpdErr) {
      console.error("handleInvoicePaymentFailed update subscription error", subUpdErr);
      throw subUpdErr;
    }
  }

  await refreshOrgEntitlements(orgId);
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = String(sub.customer);

  const orgId = await resolveOrgIdFromEventObject(sub as any);

  const { data: subRow, error: subErr } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  if (subErr) {
    console.error("handleSubscriptionDeleted lookup error", subErr);
    throw subErr;
  }

  const internalSubId = subRow?.id ?? null;

  if (internalSubId) {
    const { error: updErr } = await supabaseAdmin
      .from("billing_subscriptions")
      .update({
        status: "canceled" as BillingSubscriptionStatus,
        access_status: "canceled" as BillingAccessStatus,
        canceled_at: toIsoFromUnixSeconds(sub.canceled_at ?? null),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        current_period_end: toIsoFromUnixSeconds(sub.current_period_end),
        raw_event: sub as any,
        updated_at: nowIso(),
      })
      .eq("id", internalSubId);

    if (updErr) {
      console.error("handleSubscriptionDeleted update error", updErr);
      throw updErr;
    }
  }

  await refreshOrgEntitlements(orgId);
}

Deno.serve(async (req: Request) => {
  // Beta bypass: if BETA_MODE=true, acknowledge Stripe events without processing.
  // Remove once Stripe is live in production.
  if (Deno.env.get("BETA_MODE") === "true") {
    console.info("[stripe_webhook] BETA_MODE active — skipping event processing");
    return new Response(JSON.stringify({ ok: true, beta: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook not configured", { status: 501 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? req.headers.get("Stripe-Signature");
  if (!sig) {
    return new Response("Missing Stripe-Signature", { status: 401 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed", msg, err);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 401 });
  }

  let record: WebhookRecord;
  try {
    record = await upsertWebhookEvent(event);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook idempotency error", msg, err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (record.duplicate) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        // Other events are ignored but marked received
        break;
    }

    await markWebhookProcessed(record.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook handler error", event.type, msg, err);
    await markWebhookError(record.id, msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
