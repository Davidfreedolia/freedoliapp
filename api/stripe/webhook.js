/**
 * POST /api/stripe/webhook
 * Stripe webhook: verify signature (raw body only), race-safe idempotency via insert-first, update orgs.
 * ONLY place that writes stripe_customer_id, stripe_subscription_id, billing_status, plan_id, seat_limit, trial_ends_at to orgs.
 */
import { getStripe } from '../lib/stripe.js'
import { mapSubscriptionStatus } from '../lib/stripe.js'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'

/** Read raw body from request stream; no fallback. Returns null if stream already consumed or not readable. */
async function getRawBodyBuffer(req) {
  const chunks = []
  try {
    for await (const chunk of req) chunks.push(chunk)
  } catch (_) {
    return null
  }
  const raw = Buffer.concat(chunks)
  return raw.length ? raw : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set')
    return res.status(500).json({ error: 'server_config' })
  }

  const rawBody = await getRawBodyBuffer(req)
  if (!rawBody) {
    console.error('Webhook raw body unavailable (stream consumed or empty)')
    return res.status(400).json({ error: 'raw_body_unavailable', message: 'Request body must be raw for signature verification' })
  }

  const sig = req.headers['stripe-signature'] || req.headers['Stripe-Signature']
  if (!sig) {
    return res.status(400).json({ error: 'missing_signature' })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err.message)
    return res.status(400).json({ error: 'invalid_signature' })
  }

  const admin = getSupabaseAdmin()

  const record = {
    id: event.id,
    type: event.type,
    org_id: null,
    stripe_customer_id: null,
    stripe_subscription_id: null
  }

  const { error: insertError } = await admin.from('stripe_webhook_events').insert(record)
  if (insertError) {
    if (insertError.code === '23505') {
      return res.status(200).json({ received: true, duplicate: true })
    }
    console.error('stripe_webhook_events insert error', insertError)
    return res.status(500).json({ error: 'idempotency_error', message: insertError.message })
  }

  async function upsertOrg(orgId, patch) {
    if (!orgId) return
    const { error } = await admin.from('orgs').update(patch).eq('id', orgId)
    if (error) console.error('orgs update error', orgId, error)
  }

  async function handleCheckoutCompleted(session) {
    const orgId = session.client_reference_id || session.metadata?.org_id
    if (!orgId) return
    const customerId = session.customer || session.subscription?.customer
    const subId = session.subscription
    let planId = null
    let quantity = 1
    let status = 'active'
    let trialEndsAt = null
    if (subId) {
      const stripe = getStripe()
      const sub = await stripe.subscriptions.retrieve(subId)
      status = mapSubscriptionStatus(sub.status)
      trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
      const item = sub.items?.data?.[0]
      if (item) {
        planId = item.price?.id || null
        quantity = Math.max(1, item.quantity || 1)
      }
    }
    await upsertOrg(orgId, {
      stripe_customer_id: customerId || undefined,
      stripe_subscription_id: subId || undefined,
      billing_status: status,
      plan_id: planId,
      seat_limit: quantity,
      trial_ends_at: trialEndsAt
    })
    record.org_id = orgId
    record.stripe_customer_id = customerId
    record.stripe_subscription_id = subId
  }

  async function handleSubscription(sub) {
    const orgId = sub.metadata?.org_id
    if (!orgId) return
    const status = mapSubscriptionStatus(sub.status)
    const item = sub.items?.data?.[0]
    const planId = item?.price?.id || null
    const quantity = Math.max(1, item?.quantity || 1)
    const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
    await upsertOrg(orgId, {
      stripe_subscription_id: sub.id,
      billing_status: status,
      plan_id: planId,
      seat_limit: quantity,
      trial_ends_at: trialEndsAt,
      ...(sub.customer && { stripe_customer_id: sub.customer })
    })
    record.org_id = orgId
    record.stripe_customer_id = sub.customer
    record.stripe_subscription_id = sub.id
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscription(event.data.object)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const orgId = sub.metadata?.org_id
        if (orgId) {
          await upsertOrg(orgId, {
            billing_status: 'canceled',
            stripe_subscription_id: null,
            plan_id: null,
            seat_limit: 1,
            trial_ends_at: null
          })
          record.org_id = orgId
          record.stripe_subscription_id = sub.id
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        const customerId = inv.customer
        const { data: orgRow } = await admin
          .from('orgs')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (orgRow) {
          await upsertOrg(orgRow.id, { billing_status: 'past_due' })
          record.org_id = orgRow.id
          record.stripe_customer_id = customerId
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object
        const customerId = inv.customer
        const { data: orgRow } = await admin
          .from('orgs')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()
        if (orgRow && inv.billing_reason !== 'subscription_create') {
          await upsertOrg(orgRow.id, { billing_status: 'active' })
          record.org_id = orgRow.id
          record.stripe_customer_id = customerId
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error', event.type, err)
    return res.status(500).json({ error: 'handler_error', message: err.message })
  }

  await admin.from('stripe_webhook_events').update({
    org_id: record.org_id,
    stripe_customer_id: record.stripe_customer_id,
    stripe_subscription_id: record.stripe_subscription_id
  }).eq('id', event.id)
  return res.status(200).json({ received: true })
}
