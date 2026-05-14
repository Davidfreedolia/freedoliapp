import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { isDemoMode } from '../demo/demoMode'

export default function DemoModeBanner({ darkMode }) {
  const { t } = useTranslation()
  if (!isDemoMode()) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: darkMode ? 'var(--text-1)' : '#ffffff',
      border: `1px solid ${darkMode ? 'var(--text-1)' : 'var(--border-1)'}`,
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: darkMode ? 'var(--muted-1)' : 'var(--text-2)',
      fontSize: '12px',
      fontWeight: '500',
      boxShadow: 'var(--shadow-popover)',
      cursor: 'default'
    }}>
      <Info size={14} />
      <span>{t('demoMode.banner')}</span>
    </div>
  )
}



