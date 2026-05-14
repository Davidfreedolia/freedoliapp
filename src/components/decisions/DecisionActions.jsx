import React from 'react'
import { useTranslation } from 'react-i18next'

export default function DecisionActions({ item, onAction, loading }) {
  const { t } = useTranslation()
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
        {t('decisionActions.acknowledge')}
      </button>
      <button
        type="button"
        disabled={!canAct || disabled}
        onClick={() => onAction('acted')}
      >
        {t('decisionActions.markAsDone')}
      </button>
      <button
        type="button"
        disabled={!canDismiss || disabled}
        onClick={() => onAction('dismissed')}
      >
        {t('decisionActions.dismiss')}
      </button>
    </div>
  )
}
