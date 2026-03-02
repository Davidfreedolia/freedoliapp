/**
 * PAS 5 — Calls to Stripe API routes with Supabase Bearer token.
 * Base URL: same origin (Vercel serverless at /api/stripe/*).
 */
import { supabase } from './supabase'

export async function postJson(url, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const res = await fetch(`${base}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

export async function createCheckoutSession(orgId, options = {}) {
  return postJson('/api/stripe/create-checkout-session', {
    org_id: orgId,
    price_id: options.priceId,
    quantity: options.quantity,
    trial_days: options.trialDays,
  })
}

export async function createPortalSession(orgId) {
  return postJson('/api/stripe/create-portal-session', { org_id: orgId })
}
