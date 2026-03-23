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
    <div className="data-state data-state--loading" aria-live="polite" aria-busy="true">
      <div className="data-state__icon" aria-hidden="true">
        <Loader size={24} className="fd-spin" />
      </div>
      <p className="data-state__title">{t('common.loading')}</p>
      <p className="data-state__message">{displayMessage}</p>
    </div>
  )
}
