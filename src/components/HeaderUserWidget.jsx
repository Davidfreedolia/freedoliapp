import React from 'react'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Avatar from './Avatar'

/**
 * HeaderUserWidget - User controls grouped together
 * Contains: Avatar + Logout button
 */
export default function HeaderUserWidget({ 
  userEmail, 
  userName, 
  onAvatarClick, 
  onLogout 
}) {
  const { t } = useTranslation()

  const widgetStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    height: '36px' // Consistent height with other widgets
  }

  const logoutButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: 0,
    borderRadius: 'var(--radius-ui)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-muted)',
    transition: 'all 0.15s ease'
  }

  return (
    <div style={widgetStyle}>
      {/* Avatar */}
      <Avatar
        userEmail={userEmail}
        userName={userName}
        size={28}
        onClick={onAvatarClick}
        className="topbar-avatar"
      />

      {/* Logout */}
      <button
        onClick={onLogout}
        style={logoutButtonStyle}
        title={t('navbar.logout')}
        aria-label={t('navbar.logout')}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg)'
          e.currentTarget.style.color = 'var(--color-text)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--color-muted)'
        }}
      >
        <LogOut size={18} />
      </button>
    </div>
  )
}
