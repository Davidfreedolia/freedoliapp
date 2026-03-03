import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function TrackingEventList({ packageId, darkMode }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!packageId) {
      setEvents([])
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('tracking_events')
      .select('event_time, location, status_code, status_description')
      .eq('package_id', packageId)
      .order('event_time', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[TrackingEventList]', error)
          setEvents([])
        } else {
          setEvents(data || [])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [packageId])

  if (!packageId) {
    return (
      <div style={{ padding: 12, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>
        Selecciona un package per veure els events.
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 12, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant…</div>
  }

  if (!events.length) {
    return <div style={{ padding: 12, fontSize: 13, color: darkMode ? '#9ca3af' : '#6b7280' }}>Cap event de tracking.</div>
  }

  const formatTime = (v) => {
    if (!v) return '—'
    try {
      return new Date(v).toLocaleString()
    } catch {
      return v
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#9ca3af' : '#6b7280', fontWeight: 600 }}>Data</th>
            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#9ca3af' : '#6b7280', fontWeight: 600 }}>Ubicació</th>
            <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#9ca3af' : '#6b7280', fontWeight: 600 }}>Estat</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={i}>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#e5e7eb' : '#374151' }}>{formatTime(ev.event_time)}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#e5e7eb' : '#374151' }}>{ev.location || '—'}</td>
              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-1)', color: darkMode ? '#e5e7eb' : '#374151' }}>{ev.status_description || ev.status_code || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
