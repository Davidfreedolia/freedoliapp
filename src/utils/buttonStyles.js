/**
 * Button styles helper for consistent styling across the app
 * Ensures proper contrast and opacity in dark mode
 */

export const getButtonStyles = ({ variant = 'primary', darkMode = false, disabled = false }) => {
  const baseStyles = {
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: disabled ? 0.5 : 1
  }

  const variants = {
    primary: {
      backgroundColor: darkMode ? '#4f46e5' : '#4f46e5',
      color: '#ffffff',
      boxShadow: darkMode ? '0 2px 8px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
      ':hover': {
        backgroundColor: darkMode ? '#4338ca' : '#4338ca',
        boxShadow: darkMode ? '0 4px 12px rgba(79, 70, 229, 0.4)' : '0 4px 8px rgba(0, 0, 0, 0.15)'
      }
    },
    secondary: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      color: darkMode ? '#e5e7eb' : '#374151',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      ':hover': {
        backgroundColor: darkMode ? '#2a2a3a' : '#e5e7eb'
      }
    },
    danger: {
      backgroundColor: darkMode ? '#dc2626' : '#ef4444',
      color: '#ffffff',
      boxShadow: darkMode ? '0 2px 8px rgba(220, 38, 38, 0.3)' : '0 2px 4px rgba(239, 68, 68, 0.2)',
      ':hover': {
        backgroundColor: darkMode ? '#b91c1c' : '#dc2626',
        boxShadow: darkMode ? '0 4px 12px rgba(220, 38, 38, 0.4)' : '0 4px 8px rgba(239, 68, 68, 0.3)'
      }
    },
    success: {
      backgroundColor: darkMode ? '#16a34a' : '#22c55e',
      color: '#ffffff',
      boxShadow: darkMode ? '0 2px 8px rgba(22, 163, 74, 0.3)' : '0 2px 4px rgba(34, 197, 94, 0.2)',
      ':hover': {
        backgroundColor: darkMode ? '#15803d' : '#16a34a',
        boxShadow: darkMode ? '0 4px 12px rgba(22, 163, 74, 0.4)' : '0 4px 8px rgba(34, 197, 94, 0.3)'
      }
    }
  }

  const variantStyle = variants[variant] || variants.primary

  return {
    ...baseStyles,
    ...variantStyle,
    // Remove :hover from object (React doesn't support it in inline styles)
    // Hover will be handled via onMouseEnter/onMouseLeave if needed
  }
}

/**
 * Icon button styles (smaller, square)
 */
export const getIconButtonStyles = ({ darkMode = false, variant = 'default', disabled = false }) => {
  const baseStyles = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    border: 'none',
    opacity: disabled ? 0.5 : 1
  }

  const variants = {
    default: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    primary: {
      backgroundColor: darkMode ? '#4f46e5' : '#4f46e5',
      color: '#ffffff',
      boxShadow: darkMode ? '0 2px 8px rgba(79, 70, 229, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
    }
  }

  const variantStyle = variants[variant] || variants.default

  return {
    ...baseStyles,
    ...variantStyle
  }
}

