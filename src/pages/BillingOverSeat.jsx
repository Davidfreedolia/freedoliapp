import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useLang } from '../i18n/useLang'
import { t } from '../i18n/t'
import { supabase } from '../lib/supabase'
import { createStripePortalSession } from '../lib/billingApi'
import { showToast } from '../components/Toast'

export default function BillingOverSeat() {
  const location = useLocation()
  const navigate = useNavigate()
  const { lang } = useLang()
  const { activeOrgId, memberships } = useWorkspace()
  const [org, setOrg] = useState(location.state?.org ?? null)
  const [seatsUsed, setSeatsUsed] = useState(location.state?.seatsUsed ?? 0)
  const [loading, setLoading] = useState(!location.state?.org)
  const [actionLoading, setActionLoading] = useState(false)

  const isOwnerAdmin = memberships.some(
    (m) => m.org_id === activeOrgId && (m.role === 'owner' || m.role === 'admin')
  )

  useEffect(() => {
    if (!activeOrgId) return
    if (location.state?.org) {
      setOrg(location.state.org)
      setSeatsUsed(location.state.seatsUsed ?? 0)
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([
      supabase.from('orgs').select('*').eq('id', activeOrgId).single(),
      supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', activeOrgId),
    ]).then(([orgRes, countRes]) => {
      if (cancelled) return
      setOrg(orgRes.data ?? null)
      setSeatsUsed(countRes.count ?? 0)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeOrgId, location.state])

  const handlePortal = async () => {
    if (!org?.id || actionLoading) return
    setActionLoading(true)
    try {
      const { url } = await createStripePortalSession(org.id)
      if (url) window.location.href = url
      else showToast(t(lang, 'billing_toastPortalUnavailable'), 'error')
    } catch (err) {
      showToast(err?.message || t(lang, 'billing_toastPortalUnavailable'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const seatLimit = org?.seat_limit ?? 1

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{t(lang, 'common_loading')}</span>
      </div>
    )
  }

  if (!org) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t(lang, 'common_workspaceNotFound')}</p>
          <button type="button" onClick={() => navigate('/app')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-1)', cursor: 'pointer' }}>
            {t(lang, 'common_backToApp')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'var(--page-bg)',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 32,
          background: 'var(--surface-bg-2)',
          border: '1px solid var(--border-1)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--warning-1, #b45309)' }}>
          {t(lang, 'billingOverSeat_title')}
        </h1>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t(lang, 'billingOverSeat_seatsCount', { seatsUsed, seatLimit })}
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {t(lang, 'billingOverSeat_message')}
        </p>

        {isOwnerAdmin ? (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={handlePortal}
              disabled={actionLoading}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                background: 'var(--primary-1)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {actionLoading ? t(lang, 'billingOverSeat_opening') : t(lang, 'billingOverSeat_openPortal')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/settings')}
              style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              {t(lang, 'billingOverSeat_goToSettings')}
            </button>
            <button type="button" onClick={() => navigate('/app')} style={{ padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              {t(lang, 'billingOverSeat_backToApp')}
            </button>
          </div>
        ) : (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
            {t(lang, 'billingOverSeat_contactOwner')}
          </p>
        )}
      </div>
    </div>
  )
}
