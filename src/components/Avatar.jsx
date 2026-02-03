import React from 'react'

/**
 * Avatar component - Modern, circular avatar with fallback to initials
 * Uses Canadian Palette for fallback colors
 */
export default function Avatar({ 
  userEmail = '', 
  userName = '', 
  avatarColor = null, 
  size = 36, 
  onClick = null,
  className = '',
  style = {} 
}) {
  // Get initials from email or name
  const getInitials = () => {
    if (userName && userName.trim()) {
      const parts = userName.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return userName.trim().charAt(0).toUpperCase()
    }
    if (userEmail && userEmail.trim()) {
      return userEmail.trim().charAt(0).toUpperCase()
    }
    return '?'
  }

  const initials = getInitials()

  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.floor(size * 0.45)}px`,
    fontWeight: '600',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    ...(avatarColor ? { backgroundColor: avatarColor, color: '#ffffff' } : null),
    ...style
  }

  const handleClick = () => {
    if (onClick) onClick()
  }

  const handleMouseEnter = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'scale(1.05)'
      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
    }
  }

  const handleMouseLeave = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'scale(1)'
      e.currentTarget.style.boxShadow = 'none'
    }
  }

  return (
    <div
      style={avatarStyle}
      className={`avatar ${className}`.trim()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Canviar avatar' : undefined}
    >
      {initials}
    </div>
  )
}