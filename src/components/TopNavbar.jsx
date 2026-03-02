import React, { useState, useEffect, useCallback } from 'react'
import { StickyNote, HelpCircle, Bell, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { logSuccess } from '../lib/auditLog'
import { useNotes } from '../hooks/useNotes'
import AddStickyNoteModal from './AddStickyNoteModal'
import HelpModal from './HelpModal'
import AvatarSelector from './AvatarSelector'
import HeaderTimeWidget from './HeaderTimeWidget'
import HeaderPreferencesWidget from './HeaderPreferencesWidget'
import HeaderUserWidget from './HeaderUserWidget'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { showToast } from './Toast'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Button from './Button'

export default function TopNavbar({ sidebarWidth = 0 }) {
  const { darkMode, setDarkMode } = useApp()
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { isMobile } = useBreakpoint()
  const { refresh } = useNotes()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState(null)
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false)
  const [alertsActionId, setAlertsActionId] = useState(null)

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUserEmail(session.user.email || '')
          // Try to get user name from metadata or use email
          setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '')
        }
      } catch (err) {
        console.error('Error loading user info:', err)
      }
    }
    loadUserInfo()
  }, [])

  useEffect(() => {
    getDemoMode().then(setDemoMode).catch(() => setDemoMode(false))
  }, [])

  const loadAlerts = useCallback(async () => {
    if (!activeOrgId) {
      setAlerts([])
      return
    }
    setAlertsLoading(true)
    setAlertsError(null)
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, message, severity, status, last_seen_at')
        .eq('org_id', activeOrgId)
        .eq('status', 'open')
      if (error) throw error
      const list = Array.isArray(data) ? data : []
      const severityRank = { low: 1, medium: 2, high: 3, critical: 4 }
      list.sort((a, b) => {
        const sa = severityRank[a?.severity] || 0
        const sb = severityRank[b?.severity] || 0
        if (sa !== sb) return sb - sa
        const ta = a?.last_seen_at ? new Date(a.last_seen_at).getTime() : 0
        const tb = b?.last_seen_at ? new Date(b.last_seen_at).getTime() : 0
        return tb - ta
      })
      setAlerts(list)
    } catch (err) {
      console.error('[TopNavbar] Error carregant alertes', err)
      setAlertsError(err)
    } finally {
      setAlertsLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    if (!showAlertsDrawer) return
    loadAlerts()
  }, [showAlertsDrawer, loadAlerts])

  // No mostrar navbar a login
  if (location.pathname === '/login') return null

  const formatDateTime = (value) => {
    if (!value) return ''
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleString()
    } catch {
      return ''
    }
  }

  const severityToColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'var(--danger-1)'
      case 'high':
        return 'var(--warning-1)'
      case 'medium':
        return 'var(--primary-1)'
      case 'low':
      default:
        return 'var(--muted-1)'
    }
  }

  const handleAlertAction = async (alertId, action) => {
    if (!alertId || !action) return
    const rpcName =
      action === 'acknowledge'
        ? 'alert_acknowledge'
        : action === 'resolve'
        ? 'alert_resolve'
        : action === 'mute'
        ? 'alert_mute'
        : null
    if (!rpcName) return
    setAlertsActionId(`${alertId}:${action}`)
    try {
      const { error } = await supabase.rpc(rpcName, { p_alert_id: alertId })
      if (error) throw error
      showToast('Alert actualitzada', 'success')
      await loadAlerts()
    } catch (err) {
      console.error('[TopNavbar] Error actualitzant alerta', err)
      const raw = err?.message || err?.details || ''
      let friendly = 'No s\'ha pogut actualitzar l\'alerta'
      if (typeof raw === 'string' && raw.includes('forbidden_owner_only')) {
        friendly = 'Només el propietari pot gestionar aquesta alerta'
      } else if (typeof raw === 'string' && raw.includes('forbidden_admin_owner')) {
        friendly = 'Només owner o admin poden gestionar aquesta alerta'
      } else if (typeof raw === 'string' && raw.includes('alert_invalid_state')) {
        friendly = 'L’estat de l’alerta no permet aquesta acció'
      }
      showToast(friendly, 'error')
    } finally {
      setAlertsActionId(null)
    }
  }

  const handleLogout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      await supabase.auth.signOut()
      
      if (userId) {
        try {
          await logSuccess('user', 'logout', userId, 'User logged out successfully')
        } catch (err) {
          console.warn('[TopNavbar] Failed to log audit:', err)
        }
      }
      
      navigate('/login')
    } catch (err) {
      console.error('Error during logout:', err)
      navigate('/login')
    }
  }

  const navStyle = {
    left: isMobile ? 0 : 'var(--sidebar-w)',
    width: isMobile ? '100%' : 'calc(100% - var(--sidebar-w))'
  }

  return (
    <>
      <nav style={navStyle} className="topbar">
        <div style={styles.leftSection}>
          <Button
            type="button"
            variant="note"
            size="sm"
            onClick={() => setShowNoteModal(true)}
            className="topbar-button topbar-notes"
            title="Afegir nota"
            aria-label="Afegir nota"
          >
            <StickyNote size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>+ {t('navbar.notes')}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="topbar-button topbar-help"
            title={t('navbar.help')}
            aria-label={t('navbar.help')}
          >
            <HelpCircle size={18} />
            {!isMobile && <span style={{ marginLeft: '6px', fontSize: '14px' }}>{t('navbar.help')}</span>}
          </Button>
        </div>

        <div style={styles.centerSection}>
          <div style={styles.centerGroup}>
            <HeaderTimeWidget />
          </div>
        </div>

        <div style={styles.rightSection}>
          <span style={{ fontSize: 11, color: 'var(--muted-1)', marginRight: 6 }}>Workspace: Freedolia</span>
          <span style={{
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            background: 'var(--surface-bg-2)',
            borderRadius: 999,
            color: demoMode ? 'var(--warning-1)' : 'var(--success-1)',
            fontWeight: 600
          }}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAlertsDrawer((prev) => !prev)}
            className="topbar-button topbar-alerts"
            title="Alerts"
            aria-label="Alerts"
          >
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} />
              {alerts.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 999,
                    backgroundColor: 'var(--danger-1)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {alerts.length}
                </span>
              )}
            </span>
          </Button>
          <HeaderPreferencesWidget />
          <HeaderUserWidget
            userEmail={userEmail}
            userName={userName}
            onAvatarClick={() => setShowAvatarSelector(true)}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      {/* Note Modal */}
      <AddStickyNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSuccess={() => {
          refresh()
          setShowNoteModal(false)
        }}
        darkMode={darkMode}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        darkMode={darkMode}
      />

      {/* Avatar Selector */}
      <AvatarSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        userEmail={userEmail}
        userName={userName}
      />

      {showAlertsDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(15,23,42,0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setShowAlertsDrawer(false)}
        >
          <aside
            style={{
              position: 'relative',
              width: isMobile ? '100%' : 380,
              maxWidth: '100%',
              height: '100%',
              backgroundColor: darkMode ? '#020617' : '#ffffff',
              borderLeft: '1px solid var(--border-1)',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 16px 12px',
                borderBottom: '1px solid var(--border-1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: darkMode ? '#e5e7eb' : '#111827',
                    }}
                  >
                    Alerts
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--muted-1)',
                    }}
                  >
                    {alerts.length > 0 ? `${alerts.length} open` : 'No alerts'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertsDrawer(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--muted-1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close alerts"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 12px 16px',
                backgroundColor: darkMode ? '#020617' : '#f9fafb',
              }}
            >
              {alertsLoading ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: 'var(--muted-1)',
                  }}
                >
                  Carregant alertes…
                </div>
              ) : alertsError ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: 'var(--danger-1)',
                  }}
                >
                  No s&apos;han pogut carregar les alertes.
                </div>
              ) : alerts.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    fontSize: 14,
                    color: 'var(--muted-1)',
                  }}
                >
                  No alerts
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map((alert) => {
                    const color = severityToColor(alert?.severity)
                    const isBusy = alertsActionId && alertsActionId.startsWith(`${alert.id}:`)
                    return (
                      <div
                        key={alert.id}
                        style={{
                          borderRadius: 10,
                          padding: 12,
                          backgroundColor: darkMode ? '#020617' : '#ffffff',
                          border: `1px solid rgba(148,163,184,0.6)`,
                          boxShadow: 'var(--shadow-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: color,
                              }}
                            />
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: darkMode ? '#e5e7eb' : '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={alert?.title || ''}
                            >
                              {alert?.title || 'Alert'}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 999,
                              border: `1px solid ${color}`,
                              color,
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                            }}
                          >
                            {alert?.severity || 'low'}
                          </span>
                        </div>
                        {alert?.message && (
                          <div
                            style={{
                              fontSize: 12,
                              color: darkMode ? '#9ca3af' : '#4b5563',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {alert.message}
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 4,
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--muted-1)',
                            }}
                          >
                            Last seen: {formatDateTime(alert?.last_seen_at)}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                              disabled={isBusy}
                            >
                              Acknowledge
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleAlertAction(alert.id, 'resolve')}
                              disabled={isBusy}
                            >
                              Resolve
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleAlertAction(alert.id, 'mute')}
                              disabled={isBusy}
                            >
                              Mute
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

    </>
  )
}

const styles = {
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  centerSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center'
  },
  centerGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
}

