import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error
    const errorId = this.logError(error, errorInfo)
    
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
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      errors.unshift(errorData)
      localStorage.setItem('app_errors', JSON.stringify(errors.slice(0, 5)))
    } catch (e) {
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
            maxWidth: '600px',
            width: '100%',
            backgroundColor: darkMode ? '#15151f' : '#ffffff',
            borderRadius: '16px',
            border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
            padding: '32px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
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
                  color: darkMode ? '#ffffff' : '#111827'
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
                {this.state.error?.message || 'Error desconegut'}
              </p>
              {this.state.errorId && (
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
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4338ca'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#4f46e5'}
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
                  backgroundColor: 'transparent',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = darkMode ? '#1f1f2e' : '#f9fafb'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent'
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

