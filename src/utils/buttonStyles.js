/**
 * Button styles helper for consistent styling across the app
 * Ensures proper contrast and opacity in dark mode
 */

import { useState } from 'react'

export const getButtonStyles = ({ variant = 'primary', darkMode = false, disabled = false, isHovered = false, isActive = false, size = 'md' }) => {
  const sizeStyles = {
    md: {
      height: 'var(--btn-h)',
      minWidth: '140px',
      padding: '0 var(--btn-pad-x)',
      fontSize: '14px',
      fontWeight: '600'
    },
    sm: {
      height: 'var(--btn-h-sm)',
      minWidth: '100px',
      padding: '0 var(--btn-pad-x)',
      fontSize: '13px',
      fontWeight: '600'
    },
    lg: {
      height: '48px',
      minWidth: '160px',
      padding: '0 20px',
      fontSize: '15px',
      fontWeight: '600'
    }
  }

  const sizeStyle = sizeStyles[size] || sizeStyles.md

  const baseStyles = {
    ...sizeStyle,
    borderRadius: 'var(--btn-radius)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--btn-gap)',
    opacity: disabled ? 'var(--btn-disabled-opacity)' : 1,
    transform: isActive ? 'scale(0.99)' : 'scale(1)',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : 'var(--btn-shadow)'
  }

  const variants = {
    primary: {
      backgroundColor: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid var(--btn-primary-bg)',
      boxShadow: isHovered
        ? 'var(--btn-shadow), inset 0 0 0 999px var(--btn-primary-hover)'
        : 'var(--btn-shadow)'
    },
    secondary: {
      backgroundColor: 'var(--btn-secondary-bg)',
      color: 'var(--btn-secondary-fg)',
      border: '1px solid var(--btn-secondary-border)',
      filter: isHovered ? 'brightness(1.03)' : 'brightness(1)'
    },
    danger: {
      backgroundColor: 'var(--btn-danger-bg)',
      color: 'var(--btn-danger-fg)',
      border: '1px solid var(--btn-danger-border)',
      filter: isHovered ? 'brightness(0.98)' : 'brightness(1)'
    },
    ghost: {
      backgroundColor: 'var(--btn-ghost-bg)',
      color: 'var(--btn-ghost-fg)',
      border: '1px solid var(--btn-ghost-border)'
    }
  }

  const variantStyle = variants[variant] || variants.primary

  return {
    ...baseStyles,
    ...variantStyle
  }
}

/**
 * Hook to manage button hover/active states
 */
export const useButtonState = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [isActive, setIsActive] = useState(false)
  
  return {
    isHovered,
    isActive,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => {
      setIsHovered(false)
      setIsActive(false)
    },
    onMouseDown: () => setIsActive(true),
    onMouseUp: () => setIsActive(false),
    onTouchStart: () => setIsActive(true),
    onTouchEnd: () => setIsActive(false)
  }
}

/**
 * Icon button styles (smaller, square)
 */
export const getIconButtonStyles = ({ darkMode = false, variant = 'default', disabled = false }) => {
  const baseStyles = {
    width: 'var(--btn-h)',
    height: 'var(--btn-h)',
    borderRadius: 'var(--btn-radius)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    border: 'none',
    opacity: disabled ? 'var(--btn-disabled-opacity)' : 1,
    boxShadow: disabled ? 'none' : 'var(--btn-shadow)'
  }

  const variants = {
    default: {
      backgroundColor: 'var(--btn-secondary-bg)',
      border: '1px solid var(--btn-secondary-border)',
      color: 'var(--btn-secondary-fg)'
    },
    primary: {
      backgroundColor: 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      boxShadow: 'var(--btn-shadow)'
    }
  }

  const variantStyle = variants[variant] || variants.default

  return {
    ...baseStyles,
    ...variantStyle
  }
}

