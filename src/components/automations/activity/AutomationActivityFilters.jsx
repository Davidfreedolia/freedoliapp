import React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../../ui/Card'
import { AUTOMATION_ACTIVITY_EVENT_TYPES } from '../../../lib/automations/constants/eventTypes'

export default function AutomationActivityFilters({ filters, onChange }) {
  const { t } = useTranslation()
  const eventType = filters?.eventType ?? ''
  const options = [
    { value: '', label: t('automations.activityFilters.allEvents') },
    ...AUTOMATION_ACTIVITY_EVENT_TYPES.map((evt) => ({ value: evt, label: evt })),
  ]

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', fontWeight: 600 }}>{t('automations.activityFilters.eventType')}</div>
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
