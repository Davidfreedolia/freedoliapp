/**
 * D12 Slice 2 — React hook that exposes workspace usage from the central engine.
 * Consumes getWorkspaceUsage(supabase, orgId); no duplicate queries or entitlements logic.
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { getWorkspaceUsage } from '../lib/workspace/usage'

/**
 * @returns {{
 *   usage: { projects: { used, limit, percent }, seats: { used, limit, percent }, limitsReached: string[], nearLimits: string[] } | null,
 *   isLoading: boolean,
 *   error: string | null,
 *   refresh: () => void
 * }}
 */
export function useWorkspaceUsage() {
  const { activeOrgId } = useWorkspace()
  const [usage, setUsage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)

  const refresh = useCallback(() => {
    setRefreshCount((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!activeOrgId) {
      setUsage(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getWorkspaceUsage(supabase, activeOrgId)
      .then((data) => {
        if (!cancelled) {
          setUsage(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load workspace usage')
          setUsage(null)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [activeOrgId, refreshCount])

  return { usage, isLoading, error, refresh }
}
