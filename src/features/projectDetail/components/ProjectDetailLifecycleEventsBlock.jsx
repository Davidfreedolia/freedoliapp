import { useState, useEffect } from 'react'
import { getRecentLifecycleEvents } from '../../../lib/lifecycleEvents'

const EVENT_TYPE_LABELS = {
  project_phase_changed: 'Phase changed',
  purchase_order_created: 'PO created',
  shipment_in_transit: 'Shipment in transit',
  shipment_delivered: 'Shipment delivered',
  inventory_low_stock: 'Low stock'
}

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
    <div style={blockStyle}>
      <div style={titleStyle}>Recent lifecycle events</div>
      {loading && (
        <div style={metaStyle}>Loading…</div>
      )}
      {error && !loading && (
        <div style={metaStyle}>Unable to load events</div>
      )}
      {!loading && !error && events.length === 0 && (
        <div style={metaStyle}>No recent lifecycle events</div>
      )}
      {!loading && !error && events.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {events.map((ev) => (
            <li key={ev.id} style={itemStyle}>
              <span>{EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}</span>
              {(ev.lifecycle_stage || ev.phase_id) && (
                <span style={metaStyle}>
                  {ev.lifecycle_stage ?? `Phase ${ev.phase_id}`}
                </span>
              )}
              <span style={metaStyle}>{formatTimestamp(ev.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
