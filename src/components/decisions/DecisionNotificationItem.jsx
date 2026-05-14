import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const severityColors = {
  high: 'var(--danger-1, #E55353)',
  medium: 'var(--warning-1, #F0B429)',
  low: 'var(--brand-1, #1F5F63)',
}

export default function DecisionNotificationItem({ item, onClick, onCreateTask }) {
  const { t } = useTranslation()
  const [creatingTask, setCreatingTask] = useState(false)
  if (!item) return null
  const color = severityColors[item.severity] || severityColors.low
  const created = item.createdAt ? new Date(item.createdAt) : null
  const createdLabel = created ? created.toLocaleString() : ''

  const handleCreateTask = async (e) => {
    e.stopPropagation()
    if (!onCreateTask || creatingTask) return
    setCreatingTask(true)
    try {
      await onCreateTask(item)
    } finally {
      setCreatingTask(false)
    }
  }

  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid var(--border-1, #D8E1DE)',
        marginBottom: 4,
        background: 'var(--surface-bg, #ffffff)',
      }}
    >
      <button
        type="button"
        onClick={() => onClick && onClick(item)}
        style={{
          width: '100%',
          textAlign: 'left',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          padding: 0,
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
            color: 'var(--text-2, #5F7476)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ textTransform: 'capitalize' }}>{item.severity}</span>
          <span>{createdLabel}</span>
        </div>
      </button>
      {onCreateTask && (
        <button
          type="button"
          onClick={handleCreateTask}
          disabled={creatingTask}
          style={{
            marginTop: 6,
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            borderRadius: 6,
            background: 'var(--surface-bg-2)',
            color: 'var(--text-1)',
            cursor: creatingTask ? 'wait' : 'pointer',
          }}
        >
          {creatingTask ? '…' : t('decisionNotificationItem.createTask')}
        </button>
      )}
    </div>
  )
}
