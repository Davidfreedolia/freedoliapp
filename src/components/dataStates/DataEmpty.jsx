import { useTranslation } from 'react-i18next'

/**
 * Standard empty state when a query succeeds but returns no data.
 * Uses existing design tokens; no new global styles.
 */
export default function DataEmpty({ message, icon: Icon, action }) {
  const { t } = useTranslation()
  const displayMessage = message ?? t('dataStates.emptyGeneric', { defaultValue: 'No data available' })
  return (
    <div className="data-state data-state--empty">
      {Icon && (
        <div className="data-state__icon" aria-hidden="true">
          <Icon size={36} color="currentColor" />
        </div>
      )}
      <p className="data-state__title">{t('dataStates.emptyTitle', { defaultValue: 'Nothing here yet' })}</p>
      <p className="data-state__message">{displayMessage}</p>
      {action}
    </div>
  )
}
