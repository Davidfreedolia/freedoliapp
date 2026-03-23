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
    <div className="data-state data-state--error" role="alert">
      <p className="data-state__title">{t('dataStates.errorTitle', { defaultValue: 'Something went wrong' })}</p>
      <p className="data-state__message">{displayMessage}</p>
      {onRetry && (
        <button
          className="data-state__action"
          type="button"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
