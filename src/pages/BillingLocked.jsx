import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { createCheckoutSession, createPortalSession } from '../lib/billingApi'
import { showToast } from '../components/Toast'

export default function BillingLocked() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeOrgId, memberships } = useWorkspace()
  const [org, setOrg] = useState(location.state?.org ?? null)
  const [loading, setLoading] = useState(!location.state?.org)
  const [actionLoading, setActionLoading] = useState(false)

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
      const { url } = await createPortalSession(org.id)
      if (url) window.location.href = url
      else showToast('Billing portal unavailable', 'error')
    } catch (err) {
      showToast(err?.message || 'Billing portal unavailable', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!org?.id || actionLoading) return
    setActionLoading(true)
    try {
      const { url } = await createCheckoutSession(org.id)
      if (url) window.location.href = url
      else showToast('Checkout unavailable', 'error')
    } catch (err) {
      showToast(err?.message || 'Checkout unavailable', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const status = org?.billing_status ?? 'inactive'
  const hasCustomer = !!org?.stripe_customer_id

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Carregant...</span>
      </div>
    )
  }

  if (!org) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No s'ha trobat el workspace.</p>
          <button type="button" onClick={() => navigate('/app')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-1)', cursor: 'pointer' }}>Tornar a l'app</button>
        </div>
      </div>
    )
  }

  const statusLabel = status === 'past_due' ? 'Pagament pendent' : status === 'canceled' ? 'Cancel·lada' : status

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'var(--page-bg)' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: 32, background: 'var(--surface-bg-2)', border: '1px solid var(--border-1)', borderRadius: 12, textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, color: 'var(--danger-1)' }}>Subscripció inactiva</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Estat: {statusLabel}</p>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {status === 'past_due' ? 'Hi ha un pagament pendent. Actualitzeu la facturació per continuar.' : 'La subscripció del workspace no és activa. Actualitzeu la facturació per continuar.'}
        </p>
        {isOwnerAdmin ? (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {hasCustomer ? (
              <button type="button" onClick={handlePortal} disabled={actionLoading}
                style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--danger-1)', color: '#fff', border: 'none', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'Obrint...' : 'Gestionar subscripció'}
              </button>
            ) : (
              <button type="button" onClick={handleCheckout} disabled={actionLoading}
                style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--primary-1)', color: '#fff', border: 'none', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'Obrint...' : 'Començar subscripció'}
              </button>
            )}
            <button type="button" onClick={() => navigate('/app')} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--border-1)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>Tornar a l'app</button>
          </div>
        ) : (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>Contacteu l'administrador del workspace per reactivar la subscripció.</p>
        )}
      </div>
    </div>
  )
}
