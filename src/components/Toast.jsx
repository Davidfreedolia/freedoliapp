import React, { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

let toastId = 0
let toasts = []
let listeners = []

export const showToast = (message, type = 'success', duration = 3000) => {
  const id = toastId++
  const toast = { id, message, type, duration }
  toasts = [...toasts, toast]
  listeners.forEach(listener => listener(toasts))
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  
  return id
}

export const removeToast = (id) => {
  toasts = toasts.filter(t => t.id !== id)
  listeners.forEach(listener => listener(toasts))
}

export const useToasts = () => {
  const [state, setState] = React.useState(toasts)
  
  useEffect(() => {
    const listener = (newToasts) => setState([...newToasts])
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])
  
  return state
}

export default function ToastContainer({ darkMode }) {
  const toasts = useToasts()
  
  if (toasts.length === 0) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const colors = {
          success: { bg: '#10b981', icon: CheckCircle2 },
          error: { bg: '#ef4444', icon: XCircle },
          warning: { bg: '#f59e0b', icon: AlertTriangle },
          info: { bg: '#3b82f6', icon: AlertTriangle }
        }
        const { bg, icon: Icon } = colors[toast.type] || colors.success
        
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              borderRadius: '8px',
              border: `1px solid ${bg}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '250px',
              maxWidth: '400px',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <Icon size={20} color={bg} />
            <span style={{ flex: 1, fontSize: '14px' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

