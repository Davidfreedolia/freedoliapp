/**
 * Button styles helper for consistent styling across the app
 * Ensures proper contrast and opacity in dark mode
 */

import { useState } from 'react'

export const getButtonStyles = ({ variant = 'primary', darkMode = false, disabled = false, isHovered = false, isActive = false, size = 'md' }) => {
  const sizeStyles = {
    md: {
      height: '40px',
      minWidth: '140px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: '500'
    },
    sm: {
      height: '32px',
      minWidth: '100px',
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '500'
    },
    lg: {
      height: '48px',
      minWidth: '160px',
      padding: '14px 28px',
      fontSize: '15px',
      fontWeight: '600'
    }
  }

  const sizeStyle = sizeStyles[size] || sizeStyles.md

  const baseStyles = {
    ...sizeStyle,
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: disabled ? 0.6 : 1,
    transform: isActive ? 'scale(0.99)' : 'scale(1)',
    outline: 'none',
    boxSizing: 'border-box'
  }

  const variants = {
    primary: {
      backgroundColor: isHovered
        ? (darkMode ? '#184351' : '#184351')
        : (darkMode ? '#1F4E5F' : '#1F4E5F'),
      color: '#F4F7F3',
      border: '1px solid #1F4E5F',
      boxShadow: isHovered ? '0 6px 16px rgba(31, 78, 95, 0.18)' : '0 2px 6px rgba(31, 78, 95, 0.12)'
    },
    secondary: {
      backgroundColor: isHovered
        ? (darkMode ? 'rgba(244, 247, 243, 0.08)' : 'rgba(31, 78, 95, 0.06)')
        : (darkMode ? 'rgba(244, 247, 243, 0.04)' : '#FFFFFF'),
      color: darkMode ? '#F4F7F3' : '#1F4E5F',
      border: `1px solid ${darkMode ? 'rgba(244, 247, 243, 0.2)' : 'rgba(31, 78, 95, 0.2)'}`,
      filter: isHovered ? 'brightness(1.02)' : 'brightness(1)'
    },
    danger: {
      backgroundColor: isHovered
        ? (darkMode ? '#E85E56' : '#E85E56')
        : (darkMode ? '#F26C63' : '#F26C63'),
      color: '#ffffff',
      border: '1px solid #F26C63',
      boxShadow: isHovered ? '0 6px 16px rgba(242, 108, 99, 0.25)' : '0 2px 6px rgba(242, 108, 99, 0.18)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: darkMode ? '#F4F7F3' : '#1F4E5F',
      border: `1px solid ${darkMode ? 'rgba(244, 247, 243, 0.2)' : 'rgba(31, 78, 95, 0.2)'}`
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
      backgroundColor: darkMode ? 'rgba(244, 247, 243, 0.06)' : '#FFFFFF',
      border: `1px solid ${darkMode ? 'rgba(244, 247, 243, 0.2)' : 'rgba(31, 78, 95, 0.2)'}`,
      color: darkMode ? '#F4F7F3' : '#1F4E5F'
    },
    primary: {
      backgroundColor: darkMode ? '#1F4E5F' : '#1F4E5F',
      color: '#F4F7F3',
      boxShadow: '0 2px 6px rgba(31, 78, 95, 0.12)'
    }
  }

  const variantStyle = variants[variant] || variants.default

  return {
    ...baseStyles,
    ...variantStyle
  }
}

