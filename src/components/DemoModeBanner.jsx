import { Info } from 'lucide-react'
import { isDemoMode } from '../demo/demoMode'

export default function DemoModeBanner({ darkMode }) {
  if (!isDemoMode()) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '12px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      cursor: 'default'
    }}>
      <Info size={14} />
      <span>Demo</span>
    </div>
  )
}



