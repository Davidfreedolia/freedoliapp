import { useTranslation } from 'react-i18next'

/**
 * Standard error state when a request fails.
 * Optional onRetry shows a translated "Try again" button.
 * Uses existing design tokens; no new global styles.
 */
export default function DataError({ message, onRetry }) {
  const { t } = useTranslation()
  const displayMessage = message ?? t('dataStates.errorGeneric', { defaultValue: 'Unable to load data' })
  const retryLabel = t('dataStates.retry', { defaultValue: 'Try again' })
  return (
    <div
      role="alert"
      style={{
        textAlign: 'center',
        padding: 24,
        color: 'var(--muted-1, #6b7280)',
        fontSize: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <p style={{ margin: 0 }}>{displayMessage}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            fontSize: 14,
            cursor: 'pointer',
            border: '1px solid var(--border-1, #e5e7eb)',
            borderRadius: 8,
            background: 'var(--surface-bg-2, #f9fafb)',
            color: 'var(--text-1, #111827)',
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
