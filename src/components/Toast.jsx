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
      gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        const colors = {
          success: { fg: 'var(--success-1)', tint: 'rgba(63, 191, 154, 0.10)', icon: CheckCircle2 },
          error:   { fg: 'var(--danger-1)',  tint: 'rgba(229, 83, 83, 0.10)',  icon: XCircle },
          warning: { fg: 'var(--warning-1)', tint: 'rgba(240, 180, 41, 0.12)', icon: AlertTriangle },
          info:    { fg: 'var(--brand-1)',   tint: 'rgba(31, 95, 99, 0.10)',   icon: AlertTriangle }
        }
        const { fg, tint, icon: Icon } = colors[toast.type] || colors.success

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              backgroundColor: 'var(--surface-bg)',
              color: 'var(--text-1)',
              borderRadius: '12px',
              border: '1px solid var(--border-1)',
              boxShadow: 'var(--fd-shadow-lg, 0 16px 40px rgba(15, 36, 38, 0.10))',
              minWidth: '280px',
              maxWidth: '420px',
              pointerEvents: 'auto',
              animation: 'fd-toast-in 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* left accent bar */}
            <span aria-hidden style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: fg, borderRadius: '3px 0 0 3px'
            }} />
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: tint, color: fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Icon size={18} />
            </div>
            <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.5, fontWeight: 500 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 8,
                color: 'var(--text-2)',
                transition: 'background-color 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-bg-2)'; e.currentTarget.style.color = 'var(--text-1)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent';        e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes fd-toast-in {
          from { transform: translateX(20px) scale(0.96); opacity: 0; }
          to   { transform: translateX(0) scale(1);       opacity: 1; }
        }
      `}</style>
    </div>
  )
}

