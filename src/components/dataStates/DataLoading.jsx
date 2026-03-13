import { Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Standard loading state for data-driven views.
 * Uses existing design tokens and fd-spin; no new global styles.
 */
export default function DataLoading({ message }) {
  const { t } = useTranslation()
  const displayMessage = message ?? t('dataStates.loading', { defaultValue: 'Loading data…' })
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
      aria-live="polite"
      aria-busy="true"
    >
      <Loader size={24} className="fd-spin" aria-hidden />
      <span>{displayMessage}</span>
    </div>
  )
}
