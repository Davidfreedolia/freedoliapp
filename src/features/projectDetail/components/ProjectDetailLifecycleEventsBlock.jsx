import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getRecentLifecycleEvents } from '../../../lib/lifecycleEvents'

function formatTimestamp(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

/**
 * Compact read-only block: latest 5 lifecycle events for the current project.
 * Renders inside Project Detail right panel. Loading / empty / error handled lightly.
 */
export default function ProjectDetailLifecycleEventsBlock({ projectId }) {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      setEvents([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    getRecentLifecycleEvents(projectId, { limit: 5 })
      .then((data) => {
        if (!cancelled) {
          setEvents(data || [])
          setError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId])

  if (!projectId) return null

  const blockStyle = {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border-subtle, #e5e7eb)'
  }
  const titleStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--muted-1, #6b7280)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  }
  const itemStyle = {
    fontSize: 12,
    color: 'var(--text-1, #111827)',
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  }
  const metaStyle = {
    fontSize: 11,
    color: 'var(--muted-1, #6b7280)'
  }

  return (
    <div className="project-detail-lifecycle" style={blockStyle}>
      <div className="project-detail-lifecycle__title" style={titleStyle}>{t('projectDetailLifecycle.title')}</div>
      {loading && (
        <div className="project-detail-lifecycle__meta" style={metaStyle}>{t('common.loading')}</div>
      )}
      {error && !loading && (
        <div className="project-detail-lifecycle__meta" style={metaStyle}>{t('projectDetailLifecycle.error')}</div>
      )}
      {!loading && !error && events.length === 0 && (
        <div className="project-detail-lifecycle__meta" style={metaStyle}>{t('projectDetailLifecycle.empty')}</div>
      )}
      {!loading && !error && events.length > 0 && (
        <ul className="project-detail-lifecycle__list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {events.map((ev) => (
            <li key={ev.id} className="project-detail-lifecycle__item" style={itemStyle}>
              <span>
                {t(`projectDetailLifecycle.events.${ev.event_type}`, { defaultValue: ev.event_type })}
              </span>
              {(ev.lifecycle_stage || ev.phase_id) && (
                <span className="project-detail-lifecycle__meta" style={metaStyle}>
                  {ev.lifecycle_stage ?? t('projectDetailLifecycle.phaseLabel', { id: ev.phase_id })}
                </span>
              )}
              <span className="project-detail-lifecycle__meta" style={metaStyle}>{formatTimestamp(ev.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
