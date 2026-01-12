import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Avatar from './Avatar'

/**
 * Avatar Selector Modal - P0 implementation with localStorage
 * Allows user to select avatar color from Canadian Palette
 */
export default function AvatarSelector({ isOpen, onClose, userEmail = '', userName = '' }) {
  const [selectedColor, setSelectedColor] = useState(null)

  // Canadian Palette colors for avatar selection
  const paletteColors = [
    { name: 'Peter River', value: '#3498DB' },
    { name: 'Emerald', value: '#2ECC71' },
    { name: 'Amethyst', value: '#9B59B6' },
    { name: 'Carrot', value: '#E67E22' },
    { name: 'Turquoise', value: '#1ABC9C' },
    { name: 'Alizarin', value: '#E74C3C' },
    { name: 'Orange', value: '#F39C12' },
    { name: 'Green Sea', value: '#16A085' },
    { name: 'Belize Hole', value: '#2980B9' },
    { name: 'Wisteria', value: '#8E44AD' },
    { name: 'Nephritis', value: '#27AE60' },
    { name: 'Pomegranate', value: '#C0392B' },
  ]

  // Load current color from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('user_avatar_color')
      if (stored) {
        setSelectedColor(stored)
      } else {
        // Default color based on initials
        const initials = (userName && userName.trim()?.charAt(0)) || (userEmail && userEmail.trim()?.charAt(0)) || '?'
        const index = initials.charCodeAt(0) % paletteColors.length
        setSelectedColor(paletteColors[index].value)
      }
    }
  }, [isOpen, userEmail, userName])

  const handleSave = () => {
    if (selectedColor) {
      localStorage.setItem('user_avatar_color', selectedColor)
      onClose()
    }
  }

  if (!isOpen) return null

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    },
    modal: {
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-ui)',
      padding: '24px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: 'var(--shadow-lg)',
      position: 'relative'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-text)',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-ui)',
      color: 'var(--color-muted)',
      transition: 'all 0.2s ease'
    },
    preview: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: 'var(--color-bg)',
      borderRadius: 'var(--radius-ui)'
    },
    colorGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '24px'
    },
    colorButton: {
      width: '60px',
      height: '60px',
      borderRadius: 'var(--radius-ui)',
      border: '3px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: '600',
      color: '#FFFFFF',
      boxShadow: 'var(--shadow-sm)'
    },
    colorButtonSelected: {
      borderColor: 'var(--color-accent)',
      transform: 'scale(1.1)',
      boxShadow: 'var(--shadow-md)'
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '10px 20px',
      borderRadius: 'var(--radius-ui)',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    buttonPrimary: {
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF'
    },
    buttonSecondary: {
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Canviar avatar</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.preview}>
          <Avatar
            userEmail={userEmail}
            userName={userName}
            avatarColor={selectedColor}
            size={64}
          />
        </div>

        <div style={styles.colorGrid}>
          {paletteColors.map((color) => (
            <button
              key={color.value}
              style={{
                ...styles.colorButton,
                backgroundColor: color.value,
                ...(selectedColor === color.value ? styles.colorButtonSelected : {})
              }}
              onClick={() => setSelectedColor(color.value)}
              onMouseEnter={(e) => {
                if (selectedColor !== color.value) {
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedColor !== color.value) {
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
              title={color.name}
            >
              {(userName && userName.trim()?.charAt(0)?.toUpperCase()) || (userEmail && userEmail.trim()?.charAt(0)?.toUpperCase()) || '?'}
            </button>
          ))}
        </div>

        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={onClose}
          >
            Cancel·lar
          </button>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={handleSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}