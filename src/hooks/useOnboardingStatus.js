import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Hook D8.1 — estat d'onboarding per org (org_activation).
 *
 * @param {string | null} orgId - UUID de l'organització actual.
 * @returns {{ loading: boolean, requiresOnboarding: boolean, activation: object | null, error: Error | null, refetch: () => void }}
 */
export function useOnboardingStatus(orgId) {
  const location = useLocation()
  const [activation, setActivation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)

  const refetch = useCallback(() => {
    setRetryNonce((n) => n + 1)
  }, [])

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
        setError(err instanceof Error ? err : new Error(String(err)))
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
    // Re-fetch when route changes (e.g. /activation → /app) so org_activation insert is visible
    // without relying on orgId alone — avoids stale requiresOnboarding after wizard completion.
    // retryNonce lets the gate retry after a read failure without full page reload.
  }, [orgId, location.pathname, retryNonce])

  const requiresOnboarding = Boolean(orgId) && !error && !activation

  return {
    loading,
    requiresOnboarding,
    activation,
    activation_path: activation?.activation_path ?? null,
    error,
    refetch,
  }
}
