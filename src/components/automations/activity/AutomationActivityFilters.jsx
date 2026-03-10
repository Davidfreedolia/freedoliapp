import React from 'react'
import Card from '../../ui/Card'
import { AUTOMATION_ACTIVITY_EVENT_TYPES } from '../../../lib/automations/constants/eventTypes'

export default function AutomationActivityFilters({ filters, onChange }) {
  const eventType = filters?.eventType ?? ''
  const options = [{ value: '', label: 'All events' }, ...AUTOMATION_ACTIVITY_EVENT_TYPES.map((t) => ({ value: t, label: t }))]

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', fontWeight: 600 }}>Event type</div>
          <select
            value={eventType}
            onChange={(e) => onChange?.({ ...filters, eventType: e.target.value })}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--card-bg, #fff)' }}
          >
            {options.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}

