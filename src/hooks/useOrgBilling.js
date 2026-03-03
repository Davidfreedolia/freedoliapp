import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * D8.2 — Billing state per org (org_billing).
 *
 * @param {string | null} orgId - UUID de l'organització actual.
 * @returns {{ loading: boolean, billing: object | null, isTrialExpired: boolean }}
 */
export function useOrgBilling(orgId) {
  const [billing, setBilling] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!orgId) {
      setBilling(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchBilling = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('org_billing')
          .select('plan, status, trial_ends_at, current_period_end_at')
          .eq('org_id', orgId)
          .maybeSingle()

        if (error) throw error
        if (cancelled) return
        setBilling(data ?? null)
      } catch (err) {
        if (cancelled) return
        setBilling(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBilling()
    return () => { cancelled = true }
  }, [orgId])

  const isTrialExpired =
    billing?.status === 'trialing' &&
    billing?.trial_ends_at != null &&
    new Date(billing.trial_ends_at) < new Date()

  return {
    loading,
    billing,
    isTrialExpired,
  }
}
