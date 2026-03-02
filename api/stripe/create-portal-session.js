/**
 * POST /api/stripe/create-portal-session
 * Auth: Bearer JWT required. Caller must be owner or admin of org_id.
 * Requires org to have stripe_customer_id (already subscribed); otherwise 400.
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

  const { data: org, error: orgError } = await admin
    .from('orgs')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return res.status(404).json({ error: 'org_not_found' })
  }
  if (!org.stripe_customer_id) {
    return res.status(400).json({
      error: 'no_customer_yet',
      message: 'No Stripe customer for this org. Complete checkout first.'
    })
  }

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  if (!appUrl) {
    return res.status(500).json({ error: 'server_config', message: 'APP_URL not set' })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/`
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('create-portal-session error', err)
    return res.status(500).json({ error: 'stripe_error', message: err.message })
  }
}
