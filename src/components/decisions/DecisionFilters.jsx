import React from 'react'

const STATUS_OPTIONS = [
  { value: 'open_ack', label: 'Open + Acknowledged' },
  { value: 'open_only', label: 'Open only' },
  { value: 'all', label: 'All statuses' },
  { value: 'acted', label: 'Acted' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'expired', label: 'Expired' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'reorder', label: 'Reorder' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const CONFIDENCE_OPTIONS = [
  { value: 'all', label: 'All confidence' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function DecisionFilters({ filters, onChange }) {
  const handleChange = (key) => (e) => {
    onChange({ ...filters, [key]: e.target.value })
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
      <select value={filters.status} onChange={handleChange('status')}>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.decisionType} onChange={handleChange('decisionType')}>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.severity} onChange={handleChange('severity')}>
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select value={filters.confidence} onChange={handleChange('confidence')}>
        {CONFIDENCE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

