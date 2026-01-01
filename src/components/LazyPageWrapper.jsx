import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import PageLoader from './PageLoader'

const LOAD_TIMEOUT = 10000 // 10 seconds

/**
 * LazyPageWrapper - Wraps lazy-loaded pages with timeout and error handling
 */
export default function LazyPageWrapper({ 
  children, 
  darkMode = false,
  timeout = LOAD_TIMEOUT 
}) {
  const [hasTimeout, setHasTimeout] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimeout(true)
    }, timeout)

    return () => clearTimeout(timer)
  }, [timeout])

  if (hasError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
          padding: '32px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#ef444415',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={24} color="#ef4444" />
          </div>
          <h2 style={{
            margin: '0 0 8px',
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Error carregant la pàgina
          </h2>
          <p style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            No s'ha pogut carregar aquesta pàgina
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Recarregar
          </button>
        </div>
      </div>
    )
  }

  if (hasTimeout) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
          padding: '32px'
        }}>
          <PageLoader darkMode={darkMode} />
          <p style={{
            margin: '16px 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            La pàgina està tardant més del normal...
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '16px auto 0',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel·lar
          </button>
        </div>
      </div>
    )
  }

  try {
    return children
  } catch (error) {
    setHasError(true)
    return null
  }
}




