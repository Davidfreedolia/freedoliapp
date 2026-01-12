import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * CollapsibleSection - Reusable accordion section component
 * 
 * @param {string} title - Section title
 * @param {ReactNode} icon - Icon component (from lucide-react)
 * @param {boolean} defaultOpen - Whether section is open by default
 * @param {ReactNode} children - Section content
 * @param {boolean} darkMode - Dark mode flag
 */
export default function CollapsibleSection({ 
  title, 
  icon: Icon, 
  defaultOpen = false, 
  children,
  darkMode = false 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={{
      marginBottom: '24px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid var(--border-color)`,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      overflow: 'hidden',
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#f9fafb'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          {Icon && (
            <Icon 
              size={20} 
              color={darkMode ? '#9ca3af' : '#6b7280'}
              style={{ flexShrink: 0 }}
            />
          )}
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronDown 
            size={20} 
            color={darkMode ? '#9ca3af' : '#6b7280'}
            style={{ flexShrink: 0, transition: 'transform 0.2s ease' }}
          />
        ) : (
          <ChevronRight 
            size={20} 
            color={darkMode ? '#9ca3af' : '#6b7280'}
            style={{ flexShrink: 0, transition: 'transform 0.2s ease' }}
          />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{
          padding: '20px',
          borderTop: `1px solid var(--border-color)`,
          backgroundColor: darkMode ? '#0f0f15' : '#fafafa'
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
