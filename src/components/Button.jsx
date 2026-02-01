/**
 * Unified Button Component
 * Uses Freedoliapp palette tokens for consistent styling across the app
 */

import React from 'react'
import { TOKENS } from '../theme/tokens'

/**
 * Button component with unified styling
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
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

  // Color variants using Freedoliapp palette tokens
  const variantStyles = {
    primary: {
      backgroundColor: TOKENS['button-primary-bg'], // #3498DB
      color: TOKENS['button-primary-text'], // #FFFFFF
      border: `1px solid ${TOKENS['button-primary-bg']}`,
      ':hover': {
        backgroundColor: TOKENS['button-primary-hover'] // #2980B9
      }
    },
    secondary: {
      backgroundColor: TOKENS['button-secondary-bg'],
      color: TOKENS['button-secondary-text'],
      border: `1px solid ${TOKENS['button-secondary-border']}`,
      ':hover': {
        backgroundColor: TOKENS['button-secondary-hover'],
        borderColor: TOKENS['button-secondary-border']
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
      color: TOKENS.primary,
      border: `1px solid ${TOKENS.border}`,
      ':hover': {
        backgroundColor: 'rgba(31, 78, 95, 0.06)',
        borderColor: TOKENS.primary
      }
    }
  }

  const resolvedVariant = variantStyles[variant]
    ? variant
    : (variant === 'success-soft' || variant === 'warning-soft' ? 'secondary' : 'primary')

  const finalStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[resolvedVariant],
    ...(disabled && {
      cursor: 'not-allowed',
      opacity: 0.6
    })
  }

  // Handle hover state (inline styles don't support :hover, so we use onMouseEnter/Leave)
  const [isHovered, setIsHovered] = React.useState(false)
  
  const hoverStyle = variantStyles[resolvedVariant][':hover'] || {}
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
