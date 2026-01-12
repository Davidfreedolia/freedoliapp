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

  // Get color from localStorage or use provided color or default
  const getAvatarColor = () => {
    if (avatarColor) return avatarColor
    const stored = localStorage.getItem('user_avatar_color')
    if (stored) return stored
    // Default: use first letter hash to pick from Canadian Palette
    const initials = getInitials()
    const colors = [
      '#3498DB', // peter-river
      '#2ECC71', // emerald
      '#9B59B6', // amethyst
      '#E67E22', // carrot
      '#1ABC9C', // turquoise
      '#E74C3C', // alizarin
      '#F39C12', // orange
      '#16A085', // green-sea
    ]
    const index = initials.charCodeAt(0) % colors.length
    return colors[index]
  }

  const color = getAvatarColor()
  const initials = getInitials()

  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: color,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.floor(size * 0.45)}px`,
    fontWeight: '600',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    flexShrink: 0,
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