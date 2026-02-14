/**
 * Unified Button Component
 * Uses Freedoliapp palette tokens for consistent styling across the app
 */

import React from 'react'

/**
 * Button component with unified styling
 * @param {string} variant - 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'note'
 * @param {string} size - 'sm' | 'md'
 * @param {boolean} disabled
 * @param {React.ReactNode} children
 * @param {object} style - Additional inline styles
 * @param {function} onClick
 * @param {string} type - 'button' | 'submit' | 'reset'
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  style = {},
  onClick,
  type = 'button',
  ...props
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)
  const isDisabled = disabled || loading

  const sizeStyles = {
    sm: {
      height: 'var(--btn-h-sm)',
      fontSize: 'var(--btn-font-size-sm)'
    },
    md: {
      height: 'var(--btn-h)',
      fontSize: 'var(--btn-font-size)'
    }
  }

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid var(--btn-primary-bg)',
      hover: {
        boxShadow: 'var(--btn-shadow), inset 0 0 0 999px var(--btn-primary-hover)'
      }
    },
    secondary: {
      backgroundColor: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-fg)',
      border: '1px solid var(--btn-secondary-border)',
      hover: {
        backgroundColor: 'var(--btn-secondary-hover-bg)'
      }
    },
    success: {
      backgroundColor: 'var(--success-1)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid var(--success-1)',
      hover: {
        backgroundColor: 'var(--success-1)'
      }
    },
    ghost: {
      backgroundColor: 'var(--btn-ghost-bg)',
      color: 'var(--btn-ghost-fg)',
      border: '1px solid var(--btn-ghost-border)',
      hover: {
        backgroundColor: 'var(--btn-ghost-hover-bg)'
      }
    },
    danger: {
      backgroundColor: 'var(--btn-danger-bg)',
      color: 'var(--btn-danger-fg)',
      border: '1px solid var(--btn-danger-border)',
      hover: {
        backgroundColor: 'var(--btn-danger-hover)'
      }
    },
    note: {
      backgroundColor: 'var(--btn-note-bg)',
      color: 'var(--btn-note-fg)',
      border: '1px solid var(--btn-note-border)',
      hover: {
        filter: 'brightness(1.02)'
      }
    }
  }

  const resolvedVariant = variantStyles[variant] ? variant : 'primary'
  const hoverStyle = variantStyles[resolvedVariant].hover || {}

  const baseShadow = isDisabled ? 'none' : 'var(--btn-shadow)'

  const baseStyle = {
    borderRadius: 'var(--btn-radius)',
    border: '1px solid transparent',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--btn-gap)',
    padding: '0 var(--btn-pad-x)',
    fontWeight: 'var(--text-weight-semibold)',
    outline: 'none',
    boxShadow: baseShadow,
    opacity: isDisabled ? 'var(--btn-disabled-opacity)' : 1,
    width: fullWidth ? '100%' : 'auto',
    transform: isActive ? 'scale(0.98)' : 'scale(1)'
  }

  const appliedStyle = {
    ...baseStyle,
    ...(sizeStyles[size] || sizeStyles.md),
    ...variantStyles[resolvedVariant],
    ...(isHovered && !isDisabled ? hoverStyle : null),
    ...(isFocused && !isDisabled ? { boxShadow: `${baseShadow}, var(--focus-ring)` } : null),
    ...style
  }

  const { hover, ...cleanStyle } = appliedStyle

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsActive(false)
      }}
      onMouseDown={() => !isDisabled && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={cleanStyle}
      {...props}
    >
      {children}
    </button>
  )
}
