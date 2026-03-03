import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useOrgBilling } from '../hooks/useOrgBilling'
import { createStripeCheckoutSession, createStripePortalSession } from '../lib/billingApi'
import { showToast } from '../components/Toast'

const PLANS = [
  { id: 'growth', label: 'Growth' },
  { id: 'pro', label: 'Pro' },
  { id: 'agency', label: 'Agency' },
]

export default function BillingSettings() {
  const { activeOrgId } = useWorkspace()
  const { loading, billing } = useOrgBilling(activeOrgId ?? null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const stripe = searchParams.get('stripe')
    if (stripe === 'success') {
      showToast('Checkout complete. Syncing…', 'success')
      searchParams.delete('stripe')
      setSearchParams(searchParams, { replace: true })
    } else if (stripe === 'cancel') {
      showToast('Checkout canceled.', 'info')
      searchParams.delete('stripe')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleUpgrade = async (plan) => {
    if (!activeOrgId || actionLoading) return
    setActionLoading(plan)
    try {
      const data = await createStripeCheckoutSession(activeOrgId, plan)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      showToast('Could not start checkout', 'error')
    } catch (err) {
      showToast(err?.message || 'Checkout failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!activeOrgId || actionLoading) return
    setActionLoading('portal')
    try {
      const data = await createStripePortalSession(activeOrgId)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      showToast('No billing customer yet. Choose a plan first.', 'info')
    } catch (err) {
      const isNoCustomer = err?.message?.includes('NO_CUSTOMER')
      showToast(isNoCustomer ? 'No billing customer yet. Choose a plan first.' : (err?.message || 'Portal failed'), isNoCustomer ? 'info' : 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '—')

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Header title={<span><CreditCard size={22} /> Billing</span>} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Header title={<span><CreditCard size={22} /> Billing</span>} />
      <div style={{ maxWidth: 560, marginTop: 16 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Plan</div>
          <div style={{ fontWeight: 600 }}>{billing?.plan ?? 'growth'}</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Status</div>
          <div style={{ fontWeight: 600 }}>{billing?.status ?? '—'}</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Trial ends</div>
          <div style={{ fontWeight: 600 }}>{formatDate(billing?.trial_ends_at)}</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Current period ends</div>
          <div style={{ fontWeight: 600 }}>{formatDate(billing?.current_period_end_at)}</div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Upgrade</div>
          {PLANS.map((p) => (
            <Button
              key={p.id}
              variant="primary"
              size="md"
              disabled={actionLoading != null}
              onClick={() => handleUpgrade(p.id)}
            >
              {actionLoading === p.id ? '…' : `Upgrade to ${p.label}`}
            </Button>
          ))}
          <div style={{ marginTop: 16 }}>
            <Button
              variant="secondary"
              size="md"
              disabled={actionLoading != null}
              onClick={handleManageBilling}
            >
              {actionLoading === 'portal' ? '…' : 'Manage billing'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
