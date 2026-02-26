import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'

/**
 * Llegeix l'estat de projectes des de la vista public.v_projects_list_state.
 * Filtre per user_id + is_demo (mateix criteri que getProjects) per no trencar multi-tenant.
 * Si en el futur hi ha context d'org, es pot afegir .eq('org_id', orgId).
 *
 * @returns {{ data: Array, loading: boolean, error: Error | null, refetch: function }}
 */
export function useProjectsListState() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = await getCurrentUserId()
      const demoMode = await getDemoMode()
      if (!userId) {
        setData([])
        return
      }
      let query = supabase
        .from('v_projects_list_state')
        .select('*')
        .eq('user_id', userId)
        .eq('is_demo', demoMode)
        .order('created_at', { ascending: false })
      const { data: rows, error: err } = await query
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
    fetchList()
  }, [fetchList])

  return { data, loading, error, refetch: fetchList }
}
