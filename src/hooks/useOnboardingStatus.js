import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook D8.1 — estat d'onboarding per org (org_activation).
 *
 * @param {string | null} orgId - UUID de l'organització actual.
 * @returns {{ loading: boolean, requiresOnboarding: boolean, activation: object | null, error: Error | null }}
 */
export function useOnboardingStatus(orgId) {
  const [activation, setActivation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orgId) {
      setActivation(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchActivation = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('org_activation')
          .select('*')
          .eq('org_id', orgId)
          .maybeSingle()

        if (err) throw err
        if (cancelled) return
        setActivation(data ?? null)
      } catch (err) {
        if (cancelled) return
        setError(err)
        setActivation(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchActivation()

    return () => {
      cancelled = true
    }
  }, [orgId])

  const requiresOnboarding = Boolean(orgId) && !activation

  return {
    loading,
    requiresOnboarding,
    activation,
    activation_path: activation?.activation_path ?? null,
    error,
  }
}

