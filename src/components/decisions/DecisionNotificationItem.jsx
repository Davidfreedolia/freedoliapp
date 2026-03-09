import React from 'react'

const severityColors = {
  high: 'var(--status-critical, #b91c1c)',
  medium: 'var(--status-warning, #d97706)',
  low: 'var(--status-info, #2563eb)',
}

export default function DecisionNotificationItem({ item, onClick }) {
  if (!item) return null
  const color = severityColors[item.severity] || severityColors.low
  const created = item.createdAt ? new Date(item.createdAt) : null
  const createdLabel = created ? created.toLocaleString() : ''

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(item)}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        padding: '8px 10px',
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
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={item.title}
        >
          {item.title}
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary, #6b7280)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ textTransform: 'capitalize' }}>{item.severity}</span>
        <span>{createdLabel}</span>
      </div>
    </button>
  )
}
