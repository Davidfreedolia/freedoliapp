/**
 * FASE 3.3 — Hook per consumir alertes de negoci (taula alerts, prefix biz:) a la UI.
 * Proporciona llista, comptatge, refetch i accions acknowledge/resolve i runEngine.
 * No inclou UI Bell ni Drawer (3.4).
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getBusinessAlerts,
  getBusinessAlertsCount,
  alertAcknowledge,
  alertResolve,
  runBusinessAlertEngine,
} from '../lib/alerts/businessAlertsApi'

/**
 * @param {string | null} orgId
 * @param {{ listLimit?: number }} [options]
 * @returns {{
 *   alerts: Array<{ id: string, title: string, message: string | null, severity: string, status: string, dedupe_key: string, entity_type: string | null, entity_id: string | null, first_seen_at: string, created_at: string }>,
 *   count: number,
 *   loading: boolean,
 *   error: string | null,
 *   refetch: () => Promise<void>,
 *   acknowledge: (alertId: string) => Promise<{ ok: boolean, error?: string }>,
 *   resolve: (alertId: string) => Promise<{ ok: boolean, error?: string }>,
 *   runEngine: () => Promise<{ ok: boolean, processed?: number, error?: string }>,
 * }}
 */
export function useBusinessAlerts(orgId, options = {}) {
  const { listLimit = 50 } = options
  const [alerts, setAlerts] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!orgId) {
      setAlerts([])
      setCount(0)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { items, total } = await getBusinessAlerts(supabase, orgId, {
        limit: listLimit,
        statuses: ['open', 'acknowledged'],
      })
      setAlerts(items)
      setCount(total)
    } catch (err) {
      setError(err?.message ?? 'Failed to load business alerts')
      setAlerts([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [orgId, listLimit])

  useEffect(() => {
    fetch()
  }, [fetch])

  const acknowledge = useCallback(
    async (alertId) => {
      const result = await alertAcknowledge(supabase, alertId)
      if (result.ok) await fetch()
      return result
    },
    [fetch],
  )

  const resolve = useCallback(
    async (alertId) => {
      const result = await alertResolve(supabase, alertId)
      if (result.ok) await fetch()
      return result
    },
    [fetch],
  )

  const runEngine = useCallback(async () => {
    if (!orgId) return { ok: false, error: 'org_id_required' }
    const result = await runBusinessAlertEngine(supabase, orgId)
    if (result.ok) await fetch()
    return result
  }, [orgId, fetch])

  return {
    alerts,
    count,
    loading,
    error,
    refetch: fetch,
    acknowledge,
    resolve,
    runEngine,
  }
}
