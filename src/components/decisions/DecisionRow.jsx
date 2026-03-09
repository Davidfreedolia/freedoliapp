import React from 'react'

const severityColors = {
  high: 'var(--status-critical, #b91c1c)',
  medium: 'var(--status-warning, #d97706)',
  low: 'var(--status-info, #2563eb)',
}

export default function DecisionRow({ item, selected, onSelect }) {
  if (!item) return null
  const color = severityColors[item.severity] || severityColors.low
  const created = item.createdAt ? new Date(item.createdAt) : null
  const createdLabel = created ? created.toLocaleDateString() : ''

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: selected ? 'var(--nav-highlight-strong, #111827)' : 'transparent',
        color: 'inherit',
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '999px',
            backgroundColor: color,
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)' }}>
        {item.explanation}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11 }}>
        <span style={{ textTransform: 'capitalize' }}>{item.status}</span>
        <span>{createdLabel}</span>
      </div>
    </button>
  )
}

