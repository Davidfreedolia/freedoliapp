import React from 'react'
import Card from '../../ui/Card'

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'drafted', label: 'drafted' },
  { value: 'pending_approval', label: 'pending_approval' },
  { value: 'approved', label: 'approved' },
  { value: 'queued_for_execution', label: 'queued_for_execution' },
  { value: 'executed', label: 'executed' },
  { value: 'execution_failed', label: 'execution_failed' },
  { value: 'rejected', label: 'rejected' },
  { value: 'invalidated', label: 'invalidated' },
  { value: 'expired', label: 'expired' },
]

const ACTION_TYPES = [
  { value: '', label: 'All action types' },
  { value: 'prepare_reorder', label: 'prepare_reorder' },
  { value: 'create_internal_task', label: 'create_internal_task' },
  { value: 'schedule_review', label: 'schedule_review' },
]

export default function AutomationInboxFilters({ filters, onChange }) {
  const status = filters?.status ?? ''
  const actionType = filters?.actionType ?? ''

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', fontWeight: 600 }}>Status</div>
          <select
            value={status}
            onChange={(e) => onChange?.({ ...filters, status: e.target.value })}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--card-bg, #fff)' }}
          >
            {STATUSES.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', fontWeight: 600 }}>Action type</div>
          <select
            value={actionType}
            onChange={(e) => onChange?.({ ...filters, actionType: e.target.value })}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)', background: 'var(--card-bg, #fff)' }}
          >
            {ACTION_TYPES.map((a) => (
              <option key={a.value || 'all'} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}

