/**
 * POST /api/stripe/create-checkout-session
 * Auth: Bearer JWT required. Caller must be owner or admin of org_id.
 * No writes to orgs; Stripe customer/subscription created by webhook after checkout.
 */
import { getUserFromRequest } from '../lib/auth.js'
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js'
import { getStripe } from '../lib/stripe.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const { user, error: authError } = await getUserFromRequest(req)
  if (authError || !user) {
    return res.status(401).json({ error: 'unauthorized', message: authError || 'invalid_token' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch (_) {
    return res.status(400).json({ error: 'invalid_body' })
  }

  const orgId = body.org_id || body.orgId
  if (!orgId) {
    return res.status(400).json({ error: 'org_id_required' })
  }

  const admin = getSupabaseAdmin()
  const { data: membership, error: memError } = await admin
    .from('org_memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memError || !membership) {
    return res.status(403).json({ error: 'forbidden', message: 'not_org_member' })
  }
  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'owner_or_admin_required' })
  }

  const priceId = body.price_id || body.priceId || process.env.STRIPE_PRICE_ID
  const quantity = Math.max(1, parseInt(body.quantity || body.seats || 1, 10))
  if (!priceId) {
    return res.status(400).json({ error: 'price_id_required', message: 'Set price_id in body or STRIPE_PRICE_ID env' })
  }

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  if (!appUrl) {
    return res.status(500).json({ error: 'server_config', message: 'APP_URL not set' })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: orgId,
      metadata: { org_id: orgId },
      line_items: [{ price: priceId, quantity }],
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      subscription_data: {
        metadata: { org_id: orgId },
        trial_period_days: body.trial_days ? parseInt(body.trial_days, 10) : undefined
      }
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error', err)
    return res.status(500).json({ error: 'stripe_error', message: err.message })
  }
}
