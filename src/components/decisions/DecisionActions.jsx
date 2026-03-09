import React from 'react'

export default function DecisionActions({ item, onAction, loading }) {
  if (!item) return null

  const { status } = item
  const canAcknowledge = status === 'open'
  const canAct = status === 'open' || status === 'acknowledged'
  const canDismiss = status === 'open' || status === 'acknowledged'

  const disabled = !!loading

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button
        type="button"
        disabled={!canAcknowledge || disabled}
        onClick={() => onAction('acknowledged')}
      >
        Acknowledge
      </button>
      <button
        type="button"
        disabled={!canAct || disabled}
        onClick={() => onAction('acted')}
      >
        Mark as done
      </button>
      <button
        type="button"
        disabled={!canDismiss || disabled}
        onClick={() => onAction('dismissed')}
      >
        Dismiss
      </button>
    </div>
  )
}

