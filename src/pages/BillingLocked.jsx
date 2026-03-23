import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useLang } from '../i18n/useLang'
import { t } from '../i18n/t'
import { supabase } from '../lib/supabase'
import { createStripeCheckoutSession, createStripePortalSession } from '../lib/billingApi'
import { showToast } from '../components/Toast'
import AppLanguageControl from '../components/AppLanguageControl'
import { useOrgBilling } from '../hooks/useOrgBilling'

export default function BillingLocked() {
  const location = useLocation()
  const navigate = useNavigate()
  const { lang } = useLang()
  const { activeOrgId, memberships } = useWorkspace()
  const [org, setOrg] = useState(location.state?.org ?? null)
  const [loading, setLoading] = useState(!location.state?.org)
  const [actionLoading, setActionLoading] = useState(false)

  const { billing, loading: billingLoading } = useOrgBilling(activeOrgId || null)

  const isOwnerAdmin = memberships.some(
    (m) => m.org_id === activeOrgId && (m.role === 'owner' || m.role === 'admin')
  )

  useEffect(() => {
    if (org || !activeOrgId) return
    let cancelled = false
    supabase.from('orgs').select('*').eq('id', activeOrgId).single()
      .then(({ data }) => {
        if (!cancelled) { setOrg(data ?? null); setLoading(false) }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeOrgId, org])

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

  const handleCheckout = async () => {
    if (!org?.id || actionLoading) return
    setActionLoading(true)
    try {
      const data = await createStripeCheckoutSession(org.id, 'growth')
      if (data?.url) window.location.href = data.url
      else showToast(t(lang, 'billing_toastCheckoutUnavailable'), 'error')
    } catch (err) {
      showToast(err?.message || t(lang, 'billing_toastCheckoutUnavailable'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const status = billing?.status ?? 'inactive'
  const hasCustomer = !!billing?.stripe_customer_id
  const statusLabel = status === 'past_due' ? t(lang, 'billingLocked_statusPastDue') : status === 'canceled' ? t(lang, 'billingLocked_statusCanceled') : t(lang, 'billingLocked_statusInactive')

  const langCorner = (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 50 }}>
      <AppLanguageControl />
    </div>
  )

  if (loading || billingLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        {langCorner}
        <span style={{ color: 'var(--text-secondary)' }}>{t(lang, 'common_loading')}</span>
      </div>
    )
  }

  // Si billing està OK (active/trial vigent) o no tenim info de billing, no mostrem pantalla locked.
  if (!billing) {
    return <Navigate to="/app" replace />
  }

  const now = new Date()
  const trialEndsAt = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null
  const billingOk =
    billing.status === 'active' ||
    (billing.status === 'trialing' && trialEndsAt && trialEndsAt > now)

  const locked =
    billing.status === 'past_due' ||
    billing.status === 'canceled' ||
    (billing.status === 'trialing' && trialEndsAt && trialEndsAt <= now)

  if (billingOk || !locked) {
    return <Navigate to="/app" replace />
  }

  if (!org) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        {langCorner}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t(lang, 'common_workspaceNotFound')}</p>
          <button type="button" onClick={() => navigate('/app')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-1)', cursor: 'pointer' }}>{t(lang, 'common_backToApp')}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'var(--page-bg)' }}>
      {langCorner}
      <div style={{ maxWidth: 420, width: '100%', padding: 32, background: 'var(--surface-bg-2)', border: '1px solid var(--border-1)', borderRadius: 12, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--danger-1)' }}>{t(lang, 'billingLocked_title')}</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{t(lang, 'billingLocked_status', { status: statusLabel })}</p>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {status === 'past_due' ? t(lang, 'billingLocked_messagePastDue') : t(lang, 'billingLocked_messageInactive')}
        </p>
        {isOwnerAdmin ? (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hasCustomer ? (
              <>
                <button type="button" onClick={handlePortal} disabled={actionLoading}
                  style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--danger-1)', color: '#fff', border: 'none', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                  {actionLoading ? t(lang, 'billingLocked_opening') : t(lang, 'billingLocked_manageSubscription')}
                </button>
                <button type="button" onClick={handleCheckout} disabled={actionLoading}
                  style={{ padding: '10px 16px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-1)', cursor: actionLoading ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {actionLoading ? t(lang, 'billingLocked_opening') : t(lang, 'billingLocked_startSubscription')}
                </button>
              </>
            ) : (
              <button type="button" onClick={handleCheckout} disabled={actionLoading}
                style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--primary-1)', color: '#fff', border: 'none', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? t(lang, 'billingLocked_opening') : t(lang, 'billingLocked_startSubscription')}
              </button>
            )}
            <button type="button" onClick={() => navigate('/app')} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>{t(lang, 'common_backToApp')}</button>
          </div>
        ) : (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>{t(lang, 'billingLocked_contactOwner')}</p>
        )}
      </div>
    </div>
  )
}




