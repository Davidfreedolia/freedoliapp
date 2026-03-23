import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { safeJsonArray } from '../lib/safeJson'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error
    const errorId = this.logError(error, errorInfo)
    let debugErrors = false
    try {
      debugErrors = localStorage.getItem('debugErrors') === '1'
    } catch {
      debugErrors = false
    }
    if (debugErrors) {
      console.error(error, errorInfo)
      const truncate = (value, max = 12000) => {
        if (!value || typeof value !== 'string') return value
        if (value.length <= max) return value
        return `${value.slice(0, max)}\n... [truncated ${value.length - max} chars]`
      }
      const payload = {
        message: String(error?.message ?? error ?? 'Unknown error'),
        stack: truncate(error?.stack),
        componentStack: truncate(errorInfo?.componentStack),
        time: new Date().toISOString(),
        path: window.location.pathname
      }
      try {
        window.__lastError = payload
      } catch {
        // Ignore window assignment errors
      }
      try {
        localStorage.setItem('lastError', JSON.stringify(payload))
      } catch {
        // Ignore localStorage errors
      }
    }
    
    this.setState({
      error,
      errorInfo,
      errorId
    })
  }

  logError = (error, errorInfo) => {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const errorData = {
      id: errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: this.props.context || 'unknown'
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', errorData)
    }

    // Store in localStorage for debugging (last 5 errors)
    try {
      const errors = safeJsonArray(localStorage.getItem('app_errors'))
      errors.unshift(errorData)
      localStorage.setItem('app_errors', JSON.stringify(errors.slice(0, 5)))
    } catch {
      // Ignore localStorage errors
    }

    return errorId
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const { darkMode = false, showDetails = false } = this.props
      let debugErrors = false
      try {
        debugErrors = localStorage.getItem('debugErrors') === '1'
      } catch {
        debugErrors = false
      }
      
      return (
        <div className="layout-fullstate" style={{ backgroundColor: darkMode ? '#0F1F20' : 'var(--page-bg)' }}>
          <div
            className="layout-fullstate__card"
            style={{
              maxWidth: '600px',
              backgroundColor: darkMode ? 'rgba(21, 41, 42, 0.92)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: darkMode ? 'rgba(216, 225, 222, 0.16)' : 'var(--border-1)',
              alignItems: 'stretch',
              textAlign: 'left'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: '#ef444415',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--text-1)'
                }}>
                  Alguna cosa ha fallat
                </h2>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  S'ha produït un error inesperat
                </p>
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: darkMode ? '#9ca3af' : '#6b7280',
                lineHeight: '1.5'
              }}>
                {debugErrors
                  ? (this.state.error?.message || 'Error desconegut')
                  : 'S\'ha produït un error inesperat.'}
              </p>
              {debugErrors && this.state.errorId && (
                <p style={{
                  margin: '8px 0 0',
                  fontSize: '12px',
                  color: '#9ca3af',
                  fontFamily: 'monospace'
                }}>
                  ID: {this.state.errorId}
                </p>
              )}
            </div>

            {debugErrors && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: darkMode ? '#9ca3af' : '#6b7280',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>Debug error</div>
                <div style={{ marginBottom: '8px' }}>
                  {String(this.state.error?.message ?? this.state.error ?? 'Unknown error')}
                </div>
                {this.state.error?.stack && (
                  <pre style={{
                    margin: '0 0 8px 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.stack}
                  </pre>
                )}
                {this.state.errorInfo?.componentStack && (
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {showDetails && this.state.errorInfo && (
              <details style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: darkMode ? '#9ca3af' : '#6b7280',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                  Detalls tècnics
                </summary>
                <pre style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'var(--cta-1)',
                  color: 'var(--cta-1-fg, #ffffff)',
                  border: '1px solid var(--cta-1)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--cta-1-hover)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--cta-1)'}
              >
                <RefreshCw size={16} />
                Recarregar secció
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'var(--surface-bg)',
                  color: 'var(--text-1)',
                  border: '1px solid var(--border-1)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-bg-2)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-bg)'
                }}
              >
                <Home size={16} />
                Anar a l'inici
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary



