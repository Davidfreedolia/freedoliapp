/**
 * F8.3.2 — Determines dashboard mode: A (with data) vs B (getting started).
 * Uses same criterion as activation snapshot: recent activity in financial_ledger (org, company scope, last 30 days).
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
    const from = new Date()
    from.setDate(from.getDate() - 30)
    const fromStr = from.toISOString().slice(0, 10)

    supabase
      .from('financial_ledger')
      .select('id')
      .eq('org_id', activeOrgId)
      .eq('scope', 'company')
      .in('status', ['posted', 'locked'])
      .gte('occurred_at', fromStr)
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
