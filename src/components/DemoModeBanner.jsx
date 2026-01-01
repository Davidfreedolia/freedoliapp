import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function DemoModeBanner({ darkMode }) {
  const { t } = useTranslation()
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  if (!isDemoMode) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: darkMode ? '#7c2d12' : '#fef2f2',
      borderBottom: `2px solid ${darkMode ? '#991b1b' : '#fecaca'}`,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: darkMode ? '#fca5a5' : '#991b1b',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <AlertTriangle size={18} />
      <span>
        <strong>DEMO MODE</strong> — {t('demo.banner')}
      </span>
    </div>
  )
}

