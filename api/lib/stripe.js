/**
 * Stripe server-side helper — NOMÉS serverless.
 */
import Stripe from 'stripe'

let _stripe = null

export function getStripe() {
  if (_stripe) return _stripe
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is required for Stripe API')
  _stripe = new Stripe(secretKey, { apiVersion: '2024-11-20.acacia' })
  return _stripe
}

export const stripe = new Proxy({}, { get(_, prop) { return getStripe()[prop] } })

/**
 * Map Stripe subscription status → DB billing_status_enum
 * trialing | active | past_due | canceled
 */
export function mapSubscriptionStatus(stripeStatus) {
  if (!stripeStatus) return 'canceled'
  const s = String(stripeStatus).toLowerCase()
  if (s === 'trialing') return 'trialing'
  if (s === 'active') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  if (s === 'canceled' || s === 'cancelled' || s === 'incomplete_expired') return 'canceled'
  return 'canceled'
}
