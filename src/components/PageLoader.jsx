import { Loader } from 'lucide-react'

/**
 * Component de càrrega simple per Suspense fallback
 * Compatible amb darkMode
 */
export default function PageLoader({ darkMode = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '16px',
      color: darkMode ? '#9ca3af' : '#6b7280'
    }}>
      <Loader size={32} className="spin" style={{
        animation: 'spin 1s linear infinite'
      }} />
      <span style={{
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Loading...
      </span>
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














