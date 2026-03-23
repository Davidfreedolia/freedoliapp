import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const onboardingTs = () => new Date().toISOString()
const onboardingLog = (phase, payload = {}) => console.info('[useOnboardingStatus]', { ts: onboardingTs(), phase, ...payload })
const onboardingWarn = (phase, payload = {}) => console.warn('[useOnboardingStatus]', { ts: onboardingTs(), phase, ...payload })

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
    onboardingLog('refetch.requested', { orgId })
    setRetryNonce((n) => n + 1)
  }, [orgId])

  useEffect(() => {
    if (!orgId) {
      onboardingLog('reset.noOrgId', { pathname: location.pathname })
      setActivation(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchActivation = async () => {
      const startedAt = Date.now()
      let resolved = false
      const slowTimer = window.setTimeout(() => {
        if (!resolved && !cancelled) {
          onboardingWarn('fetch.slow', {
            orgId,
            pathname: location.pathname,
            elapsedMs: Date.now() - startedAt,
          })
        }
      }, 4000)

      onboardingLog('fetch.start', {
        orgId,
        pathname: location.pathname,
        retryNonce,
      })
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
        resolved = true
        window.clearTimeout(slowTimer)
        onboardingLog('fetch.resolved', {
          orgId,
          pathname: location.pathname,
          hasActivation: Boolean(data),
          activationPath: data?.activation_path ?? null,
          elapsedMs: Date.now() - startedAt,
        })
        setActivation(data ?? null)
      } catch (err) {
        if (cancelled) return
        resolved = true
        window.clearTimeout(slowTimer)
        onboardingWarn('fetch.failed', {
          orgId,
          pathname: location.pathname,
          message: err instanceof Error ? err.message : String(err),
          elapsedMs: Date.now() - startedAt,
        })
        setError(err instanceof Error ? err : new Error(String(err)))
        setActivation(null)
      } finally {
        if (!cancelled) {
          window.clearTimeout(slowTimer)
          onboardingLog('fetch.finally', {
            orgId,
            pathname: location.pathname,
            elapsedMs: Date.now() - startedAt,
            nextRequiresOnboarding: Boolean(orgId) && !error && !activation,
          })
          setLoading(false)
        }
      }
    }

    fetchActivation()

    return () => {
      cancelled = true
      onboardingLog('fetch.cancelled', { orgId, pathname: location.pathname })
    }
    // Re-fetch when route changes (e.g. /activation → /app) so org_activation insert is visible
    // without relying on orgId alone — avoids stale requiresOnboarding after wizard completion.
    // retryNonce lets the gate retry after a read failure without full page reload.
  }, [orgId, location.pathname, retryNonce])

  const requiresOnboarding = Boolean(orgId) && !error && !activation

  useEffect(() => {
    onboardingLog('derived.state', {
      orgId,
      pathname: location.pathname,
      loading,
      hasActivation: Boolean(activation),
      activationPath: activation?.activation_path ?? null,
      hasError: Boolean(error),
      errorMessage: error?.message ?? null,
      requiresOnboarding,
    })
  }, [orgId, location.pathname, loading, activation, error, requiresOnboarding])

  return {
    loading,
    requiresOnboarding,
    activation,
    activation_path: activation?.activation_path ?? null,
    error,
    refetch,
  }
}
