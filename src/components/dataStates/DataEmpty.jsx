import { useTranslation } from 'react-i18next'

/**
 * Standard empty state when a query succeeds but returns no data.
 * Uses existing design tokens; no new global styles.
 */
export default function DataEmpty({ message, icon: Icon, action }) {
  const { t } = useTranslation()
  const displayMessage = message ?? t('dataStates.emptyGeneric', { defaultValue: 'No data available' })
  return (
    <div
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
      {Icon && <Icon size={40} color="var(--muted-1, #9ca3af)" aria-hidden />}
      <p style={{ margin: 0 }}>{displayMessage}</p>
      {action}
    </div>
  )
}
