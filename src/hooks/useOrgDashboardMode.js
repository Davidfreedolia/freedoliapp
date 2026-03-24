/**
 * F8.3.2 — Determines dashboard mode: A (with data) vs B (getting started).
 * Hotfix: avoid direct client-side reads to financial_ledger, which can 403 under the
 * current finance access contract. Use a safer org-scoped signal instead.
 * On error or no data → Mode B (do not block UX).
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useOrgDashboardMode(activeOrgId) {
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false)
      setHasData(false)
      return
    }
    let cancelled = false
    setLoading(true)

    supabase
      .from('projects')
      .select('id')
      .eq('org_id', activeOrgId)
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) {
          setHasData(false)
          return
        }
        setHasData(Array.isArray(data) && data.length > 0)
      })
    return () => { cancelled = true }
  }, [activeOrgId])

  return { loading, hasData }
}

export default useOrgDashboardMode
