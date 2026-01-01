import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * SafeWidget - Wraps a widget to prevent Dashboard crashes
 * If the widget fails, it shows an error UI instead of breaking the Dashboard
 */
class SafeWidget extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`SafeWidget error in ${this.props.widgetName}:`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRetry) {
      this.props.onRetry()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      const { widgetName = 'Widget', darkMode = false } = this.props
    return (
      <div style={{
        padding: '24px',
        backgroundColor: darkMode ? '#15151f' : '#ffffff',
        borderRadius: '12px',
        border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
        textAlign: 'center'
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
        <h3 style={{
          margin: '0 0 8px',
          fontSize: '16px',
          fontWeight: '600',
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          {widgetName} no disponible
        </h3>
        <p style={{
          margin: '0 0 16px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          S'ha produït un error en aquest widget
        </p>
        <button
          onClick={this.handleRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            padding: '8px 16px',
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
          Reintentar
        </button>
      </div>
    )
    }

    return this.props.children
  }
}

export default SafeWidget

