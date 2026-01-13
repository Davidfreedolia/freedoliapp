/**
 * Unified Button Component
 * Uses Canadian Palette tokens for consistent styling across the app
 */

import React from 'react'
import { TOKENS } from '../theme/tokens'

/**
 * Button component with unified styling
 * @param {string} variant - 'primary' | 'success-soft' | 'warning-soft' | 'danger' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} disabled
 * @param {React.ReactNode} children
 * @param {object} style - Additional inline styles
 * @param {function} onClick
 * @param {string} type - 'button' | 'submit' | 'reset'
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  style = {},
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyle = {
    borderRadius: 'var(--radius-ui)', // 10px
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px', // Consistent icon spacing
    fontWeight: '500',
    outline: 'none',
    opacity: disabled ? 0.6 : 1,
    ...style
  }

  // Size variants
  const sizeStyles = {
    sm: {
      height: '32px',
      padding: '0 12px',
      fontSize: '13px'
    },
    md: {
      height: '36px',
      padding: '0 16px',
      fontSize: '14px'
    },
    lg: {
      height: '40px',
      padding: '0 20px',
      fontSize: '15px'
    }
  }

  // Color variants using Canadian Palette tokens
  const variantStyles = {
    primary: {
      backgroundColor: TOKENS['button-primary-bg'], // #3498DB
      color: TOKENS['button-primary-text'], // #FFFFFF
      border: `1px solid ${TOKENS['button-primary-bg']}`,
      ':hover': {
        backgroundColor: TOKENS['button-primary-hover'] // #2980B9
      }
    },
    'success-soft': {
      backgroundColor: TOKENS['button-success-soft-bg'], // rgba(46, 204, 113, 0.1)
      color: TOKENS['button-success-soft-text'], // #27AE60
      border: `1px solid ${TOKENS['button-success-soft-border']}`, // rgba(46, 204, 113, 0.2)
      ':hover': {
        backgroundColor: 'rgba(46, 204, 113, 0.15)',
        borderColor: 'rgba(46, 204, 113, 0.3)'
      }
    },
    'warning-soft': {
      backgroundColor: TOKENS['button-warning-soft-bg'], // rgba(231, 76, 60, 0.08)
      color: TOKENS['button-warning-soft-text'], // #C0392B
      border: `1px solid ${TOKENS['button-warning-soft-border']}`, // rgba(231, 76, 60, 0.15)
      ':hover': {
        backgroundColor: 'rgba(231, 76, 60, 0.12)',
        borderColor: 'rgba(231, 76, 60, 0.25)'
      }
    },
    danger: {
      backgroundColor: TOKENS['button-danger-bg'], // #E74C3C
      color: TOKENS['button-danger-text'], // #FFFFFF
      border: `1px solid ${TOKENS['button-danger-bg']}`,
      ':hover': {
        backgroundColor: TOKENS['button-danger-hover'] // #C0392B
      }
    },
    ghost: {
      backgroundColor: 'transparent',
      color: TOKENS.text,
      border: `1px solid ${TOKENS.border}`,
      ':hover': {
        backgroundColor: TOKENS.bg,
        borderColor: TOKENS.text
      }
    }
  }

  const finalStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(disabled && {
      cursor: 'not-allowed',
      opacity: 0.6
    })
  }

  // Handle hover state (inline styles don't support :hover, so we use onMouseEnter/Leave)
  const [isHovered, setIsHovered] = React.useState(false)
  
  const hoverStyle = variantStyles[variant][':hover'] || {}
  const appliedStyle = {
    ...finalStyle,
    ...(isHovered && !disabled && hoverStyle)
  }

  // Remove ':hover' key from appliedStyle (it's not valid in inline styles)
  const { ':hover': _, ...cleanStyle } = appliedStyle

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={cleanStyle}
      {...props}
    >
      {children}
    </button>
  )
}
