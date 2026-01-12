import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUserId } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'

/**
 * Convert Date to YYYY-MM-DD format (local timezone)
 */
function formatDateLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Hook para consultar eventos de calendario de proyectos
 * 
 * @param {Object} params - Parámetros de la consulta
 * @param {Date} params.from - Fecha de inicio (inclusive)
 * @param {Date} params.to - Fecha de fin (inclusive)
 * @param {string|null} params.projectId - Optional project ID filter
 * @returns {Object} { data, loading, error, fromISO, toISO }
 */
export function useProjectCalendarEvents({ from, to, projectId = null }) {
  const { demoMode } = useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Ref para cancelar actualizaciones de estado en unmount
  const mountedRef = useRef(true)
  
  // Convertir fechas a YYYY-MM-DD (local)
  const fromISO = from ? formatDateLocal(from) : null
  const toISO = to ? formatDateLocal(to) : null

  useEffect(() => {
    mountedRef.current = true
    
    const fetchEvents = async () => {
      // Validar que las fechas estén presentes
      if (!from || !to) {
        if (mountedRef.current) {
          setLoading(false)
          setData([])
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const userId = await getCurrentUserId()
        
        // Construir consulta base
        let query = supabase
          .from('project_events')
          .select('id,type,title,event_date,notes,is_demo,project:projects(id,code,name,sku,status,phase)')
          .eq('user_id', userId)
          .gte('event_date', fromISO)
          .lte('event_date', toISO)
          .order('event_date', { ascending: true })

        // Filtrar por project_id si se proporciona
        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        // Filtrar por is_demo solo si demoMode es false
        if (demoMode === false) {
          query = query.eq('is_demo', false)
        }

        const { data: eventsData, error: queryError } = await query

        // Solo actualizar estado si el componente sigue montado
        if (!mountedRef.current) {
          return
        }

        if (queryError) {
          throw queryError
        }

        setData(eventsData || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching project calendar events:', err)
        if (mountedRef.current) {
          setError(err.message || 'Error carregant esdeveniments del calendari')
          setData([])
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchEvents()

    // Cleanup: marcar como desmontado
    return () => {
      mountedRef.current = false
    }
  }, [fromISO, toISO, demoMode, projectId])

  return {
    data,
    loading,
    error,
    fromISO,
    toISO
  }
}
