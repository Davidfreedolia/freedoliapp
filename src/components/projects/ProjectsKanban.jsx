import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PHASE_META } from '../../utils/phaseStyles'
import { updateProject } from '../../lib/supabase'
import { showToast } from '../Toast'

/**
 * ProjectsKanban — kanban board with drag & drop to change project phase.
 *
 * Props:
 *   projects: Array of project objects (must include id, name, asin, current_phase, updated_at)
 *   businessByProjectId?: { [projectId]: { marginPct, ... } }
 *   darkMode?: boolean
 *   onPhaseChanged?: (projectId, newPhaseId) => void
 */
const PHASE_ORDER = [1, 2, 3, 4, 5, 6, 7]

const daysBetween = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function ProjectsKanban({ projects = [], businessByProjectId = {}, darkMode = false, onPhaseChanged }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dragging, setDragging] = useState(null)
  const [hoverColumn, setHoverColumn] = useState(null)

  const grouped = useMemo(() => {
    const map = Object.fromEntries(PHASE_ORDER.map((id) => [id, []]))
    projects.forEach((p) => {
      const phase = Number(p.current_phase ?? p.phase_id ?? 1)
      const targetPhase = map[phase] ? phase : 1
      map[targetPhase].push(p)
    })
    return map
  }, [projects])

  const handleDragStart = (project) => (e) => {
    setDragging(project.id)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', project.id) } catch (_) { /* empty */ }
  }

  const handleDragOverColumn = (phaseId) => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (hoverColumn !== phaseId) setHoverColumn(phaseId)
  }

  const handleDragLeaveColumn = (phaseId) => () => {
    if (hoverColumn === phaseId) setHoverColumn(null)
  }

  const handleDrop = (phaseId) => async (e) => {
    e.preventDefault()
    setHoverColumn(null)
    const projectId = dragging || e.dataTransfer.getData('text/plain')
    setDragging(null)
    if (!projectId) return
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    const current = Number(project.current_phase ?? 1)
    if (current === phaseId) return

    try {
      await updateProject(projectId, { current_phase: phaseId })
      showToast(t('projects.kanban.phaseUpdated', 'Fase actualitzada'), 'success')
      if (onPhaseChanged) onPhaseChanged(projectId, phaseId)
    } catch (err) {
      showToast(err?.message || t('projects.kanban.updateFailed', 'No s\'ha pogut actualitzar'), 'error')
    }
  }

  const columnBg = darkMode ? 'rgba(20,20,30,0.6)' : 'var(--surface-bg-2, #f2f4ed)'
  const columnBgHover = darkMode ? 'rgba(31,95,99,0.25)' : 'rgba(110,203,195,0.18)'
  const cardBg = darkMode ? '#1b1b2a' : '#ffffff'
  const borderColor = darkMode ? '#2a2a3a' : 'var(--border-1, rgba(31,95,99,0.14))'
  const ink = darkMode ? '#e6e9f2' : 'var(--ink-1, #1f2937)'
  const muted = darkMode ? '#9aa1b4' : 'var(--muted-1, #6b7280)'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${PHASE_ORDER.length}, minmax(240px, 1fr))`,
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 16,
      }}
      className="projects-kanban"
    >
      {PHASE_ORDER.map((phaseId) => {
        const meta = PHASE_META[phaseId]
        const items = grouped[phaseId] || []
        const isHover = hoverColumn === phaseId
        const Icon = meta?.icon
        return (
          <div
            key={phaseId}
            onDragOver={handleDragOverColumn(phaseId)}
            onDragLeave={handleDragLeaveColumn(phaseId)}
            onDrop={handleDrop(phaseId)}
            style={{
              backgroundColor: isHover ? columnBgHover : columnBg,
              border: `1px solid ${isHover ? 'var(--brand-2,#6ECBC3)' : borderColor}`,
              borderRadius: 12,
              padding: 10,
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10, padding: '4px 4px 8px', borderBottom: `1px solid ${borderColor}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ink, fontWeight: 700, fontSize: 13 }}>
                {Icon ? <Icon size={16} color={meta.color} /> : null}
                {meta?.label || `Phase ${phaseId}`}
              </div>
              <span style={{
                backgroundColor: 'rgba(31,95,99,0.12)', color: 'var(--brand-1,#1F5F63)',
                borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700,
              }}>
                {items.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {items.length === 0 && (
                <div style={{
                  color: muted, fontSize: 12, textAlign: 'center', padding: '24px 8px',
                  border: `1px dashed ${borderColor}`, borderRadius: 8,
                }}>
                  {t('projects.kanban.emptyColumn', 'Sense projectes')}
                </div>
              )}
              {items.map((project) => {
                const biz = businessByProjectId[project.id]
                const days = daysBetween(project.updated_at)
                const isDragging = dragging === project.id
                return (
                  <article
                    key={project.id}
                    draggable
                    onDragStart={handleDragStart(project)}
                    onDragEnd={() => { setDragging(null); setHoverColumn(null) }}
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 10,
                      cursor: 'grab',
                      opacity: isDragging ? 0.5 : 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4, lineHeight: 1.3 }}>
                      {project.name || project.asin || '—'}
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 11, color: muted, gap: 6,
                    }}>
                      <span style={{ fontFamily: 'monospace' }}>{project.asin || '—'}</span>
                      {biz?.marginPct != null && (
                        <span style={{
                          color: biz.marginPct >= 25
                            ? 'var(--success-1,#3FBF9A)'
                            : biz.marginPct >= 10
                              ? 'var(--warning-1,#F2D94E)'
                              : 'var(--danger-1,#F26C6C)',
                          fontWeight: 600,
                        }}>
                          {biz.marginPct}%
                        </span>
                      )}
                    </div>
                    {days != null && (
                      <div style={{ fontSize: 10, color: muted, marginTop: 4 }}>
                        {t('projects.kanban.daysInPhase', { count: days, defaultValue: '{{count}}d a la fase' })}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
