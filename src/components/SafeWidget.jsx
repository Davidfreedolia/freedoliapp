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
      <div
        className="dashboard-safe-widget"
        style={{
          backgroundColor: darkMode ? '#15292A' : '#ffffff',
          borderColor: darkMode ? 'rgba(216, 225, 222, 0.16)' : 'var(--border-1)'
        }}
      >
        <div className="dashboard-safe-widget__icon">
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <h3 className="dashboard-safe-widget__title" style={{ color: darkMode ? '#ffffff' : '#111827' }}>
          {widgetName} no disponible
        </h3>
        <p className="dashboard-safe-widget__message">
          S'ha produït un error en aquest widget
        </p>
        <button
          className="dashboard-safe-widget__action"
          onClick={this.handleRetry}
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

