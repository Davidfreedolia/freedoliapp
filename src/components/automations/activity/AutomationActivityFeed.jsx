import React from 'react'
import Card from '../../ui/Card'
import Badge from '../../ui/Badge'

function eventVariant(type) {
  const t = (type || '').toString()
  if (t.includes('failed') || t.includes('rejected')) return 'danger'
  if (t.includes('requested') || t.includes('started')) return 'info'
  if (t.includes('granted') || t.includes('succeeded') || t.includes('approved')) return 'success'
  return 'neutral'
}

export default function AutomationActivityFeed({ events }) {
  const list = Array.isArray(events) ? events : []
  if (list.length === 0) {
    return <div style={{ padding: 16, color: 'var(--text-2, #6b7280)' }}>No activity events.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map((ev) => (
        <Card key={ev.id} className="ui-card--elevated" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Badge variant={eventVariant(ev.eventType)}>{ev.eventType}</Badge>
              <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                proposal {ev.proposalId}
                {ev.executionId ? ` · execution ${ev.executionId}` : ''}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>
              {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : '—'}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

