/**
 * Billing: Supabase Edge Functions (stripe-checkout-session, stripe-portal-session).
 * No Vercel serverless; SPA uses Supabase only.
 */
import { supabase } from './supabase'

export async function createStripeCheckoutSession(orgId, plan) {
  const { data, error } = await supabase.functions.invoke('stripe-checkout-session', {
    body: { org_id: orgId, plan: plan || 'growth' },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function createStripePortalSession(orgId) {
  const { data, error } = await supabase.functions.invoke('stripe-portal-session', {
    body: { org_id: orgId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
