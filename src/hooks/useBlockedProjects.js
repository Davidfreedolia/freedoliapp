import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'

/**
 * Projectes bloquejats des de v_projects_list_state.
 * Mateix filtre user_id + is_demo que useProjectsListState (multi-tenant).
 *
 * @returns {{ data: Array, loading: boolean, error: Error | null, refetch: function }}
 */
export function useBlockedProjects() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBlocked = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = await getCurrentUserId()
      const demoMode = await getDemoMode()
      if (!userId) {
        setData([])
        return
      }
      const { data: rows, error: err } = await supabase
        .from('v_projects_list_state')
        .select('id,name,phase,progress_ratio,blocked_reason,last_activity_at')
        .eq('user_id', userId)
        .eq('is_demo', demoMode)
        .eq('is_blocked', true)
        .order('progress_ratio', { ascending: true })
        .order('last_activity_at', { ascending: false, nullsFirst: false })
      if (err) throw err
      setData(rows ?? [])
    } catch (err) {
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBlocked()
  }, [fetchBlocked])

  return { data, loading, error, refetch: fetchBlocked }
}
