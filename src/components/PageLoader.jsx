import { Loader } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Simple Suspense fallback — copy follows active UI language (Catalan-first defaults).
 */
export default function PageLoader({ darkMode = false, fullScreen = false }) {
  const { t } = useTranslation()
  return (
    <div
      className={`data-state data-state--page${fullScreen ? ' layout-fullstate' : ''}`}
      style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}
    >
      <div className="data-state__icon" aria-hidden="true">
        <Loader size={30} className="spin" style={{
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      <p className="data-state__title">{t('common.loading')}</p>
      <p className="data-state__message">{t('shell.loadingPage', { defaultValue: 'Preparing the page…' })}</p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

















