import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Llegeix l'estat d'un projecte des de la vista public.v_project_state_integrity.
 *
 * @param {string | null} projectId - UUID del projecte (si null, no es fa query).
 * @returns {{ data: object | null, loading: boolean, error: Error | null, refetch: function }}
 */
export function useProjectState(projectId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchState = useCallback(async () => {
    if (!projectId) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: row, error: err } = await supabase
        .from('v_project_state_integrity')
        .select('*')
        .eq('project_id', projectId)
        .single()
      if (err) throw err
      setData(row ?? null)
    } catch (err) {
      setError(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  return { data, loading, error, refetch: fetchState }
}
