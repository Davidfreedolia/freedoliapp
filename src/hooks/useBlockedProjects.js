import { useState, useEffect, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { useApp } from '../context/AppContext'

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true

/**
 * Projectes bloquejats (requereixen atenció) calculats a partir de projects + project_tasks.
 * Contracte RLS-safe: org_id + is_demo (sense dependre de vistes trencades).
 *
 * @returns {{ data: Array, loading: boolean, error: Error | null, refetch: function }}
 */
export function useBlockedProjects() {
  const { activeOrgId } = useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBlocked = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        setData([])
        setLoading(false)
        return
      }

      const orgId = activeOrgId ?? null
      if (orgId == null) {
        // Sense workspace actiu: no mostrem projectes bloquejats
        setData([])
        setLoading(false)
        if (isDev) {
          console.log('[BlockedProjects] skip (no activeOrgId)', { userId, activeOrgId: orgId })
        }
        return
      }

      let demoMode = false
      try {
        demoMode = await getDemoMode()
      } catch (_) {}

      const filtersProjects = { org_id: orgId, is_demo: demoMode }
      const projectsQuery = supabase
        .from('projects')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_demo', demoMode)
        .order('created_at', { ascending: false })

      if (isDev) {
        console.log('[BlockedProjects] projects query', {
          userId,
          activeOrgId: orgId,
          demoMode,
          requestSignature: { table: 'projects', filters: filtersProjects }
        })
      }

      const { data: projects, error: projErr } = await projectsQuery
      if (projErr) {
        if (isDev) {
          console.error('[BlockedProjects] projects load failed', {
            code: projErr?.code,
            message: projErr?.message,
            details: projErr?.details,
            hint: projErr?.hint,
            status: projErr?.status,
            requestSignature: { table: 'projects', filters: filtersProjects }
          })
        }
        setError(projErr)
        setData([])
        setLoading(false)
        return
      }

      const projectRows = projects || []
      const ids = projectRows.map(p => p.id).filter(Boolean)
      if (!ids.length) {
        setData([])
        setLoading(false)
        return
      }

      const filtersTasks = { org_id: orgId, is_demo: demoMode, project_id_in: ids.length }
      const tasksQuery = supabase
        .from('project_tasks')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_demo', demoMode)
        .in('project_id', ids)

      if (isDev) {
        console.log('[BlockedProjects] project_tasks query', {
          requestSignature: { table: 'project_tasks', filters: filtersTasks }
        })
      }

      const { data: taskRows, error: tasksErr } = await tasksQuery
      if (tasksErr) {
        if (isDev) {
          console.error('[BlockedProjects] project_tasks load failed', {
            code: tasksErr?.code,
            message: tasksErr?.message,
            details: tasksErr?.details,
            hint: tasksErr?.hint,
            status: tasksErr?.status,
            requestSignature: { table: 'project_tasks', filters: filtersTasks }
          })
        }
        // No bloquejar dashboard per errors de tasks: simplement no mostrem res
        setError(tasksErr)
        setData([])
        setLoading(false)
        return
      }

      const byProjectId = {}
      ;(taskRows || []).forEach(t => {
        const pid = t.project_id
        if (!pid) return
        if (!byProjectId[pid]) byProjectId[pid] = []
        byProjectId[pid].push(t)
      })

      const scored = []
      for (const project of projectRows) {
        if (!project?.id) continue
        const tasks = byProjectId[project.id] || []

        // blocking tasks: si hi ha camps específics, utilitza'ls; sinó, cap bloqueig
        const blockingTasks = tasks.filter(t => t.blocking === true || t.blocking === 'true')
        const blockingTotal = blockingTasks.length
        const blockingDone = blockingTasks.filter(
          t =>
            t.status === 'done' ||
            t.override_done === true ||
            t.system_done === true
        ).length

        const pending = Math.max(0, blockingTotal - blockingDone)
        const isBlocked = pending > 0
        const progressRatio = blockingTotal > 0 ? blockingDone / blockingTotal : 1

        if (!isBlocked) continue

        const blocked_reason =
          pending > 0
            ? `Queden ${pending} tasques bloquejants`
            : null

        const last_activity_at =
          project.last_activity_at ||
          project.updated_at ||
          project.created_at ||
          null

        const phaseId =
          project.phase ??
          project.phase_id ??
          project.current_phase ??
          null

        scored.push({
          id: project.id,
          name: project.name,
          phase: phaseId,
          progress_ratio: progressRatio,
          blocked_reason,
          last_activity_at,
          _pending: pending
        })
      }

      const sorted = scored
        .sort((a, b) => b._pending - a._pending || (a.progress_ratio ?? 0) - (b.progress_ratio ?? 0))
        .slice(0, 5)
        .map(({ _pending, ...rest }) => rest)

      setData(sorted)
    } catch (err) {
      if (isDev) {
        console.error('[BlockedProjects] unexpected error', {
          code: err?.code,
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          status: err?.status
        })
      }
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    fetchBlocked()
  }, [fetchBlocked])

  return { data, loading, error, refetch: fetchBlocked }
}
