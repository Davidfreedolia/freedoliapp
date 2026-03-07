import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Users, FolderKanban } from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/Button'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useOrgBilling } from '../hooks/useOrgBilling'
import { useWorkspaceUsage } from '../hooks/useWorkspaceUsage'
import { createStripeCheckoutSession, createStripePortalSession } from '../lib/billingApi'
import { getOrgEntitlements } from '../lib/billing/entitlements'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import FeatureLockedCard from '../components/billing/FeatureLockedCard'
import LimitReachedBanner from '../components/billing/LimitReachedBanner'

const PLANS = [
  { id: 'growth', label: 'Growth' },
  { id: 'pro', label: 'Pro' },
  { id: 'agency', label: 'Agency' },
]

export default function Billing() {
  const { activeOrgId } = useWorkspace()
  const { loading: billingLoading, billing } = useOrgBilling(activeOrgId ?? null)
  const { usage, isLoading: usageLoading, error: usageError } = useWorkspaceUsage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [entitlements, setEntitlements] = useState(null)
  const [entitlementsLoading, setEntitlementsLoading] = useState(false)

  useEffect(() => {
    if (!activeOrgId) {
      setEntitlements(null)
      setEntitlementsLoading(false)
      return
    }
    let cancelled = false
    setEntitlementsLoading(true)
    getOrgEntitlements(supabase, activeOrgId)
      .then((ent) => { if (!cancelled) setEntitlements(ent) })
      .catch(() => { if (!cancelled) setEntitlements(null) })
      .finally(() => { if (!cancelled) setEntitlementsLoading(false) })
    return () => { cancelled = true }
  }, [activeOrgId])

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
    setActionError(null)
    try {
      const data = await createStripeCheckoutSession(activeOrgId, plan)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      const msg = 'Could not start checkout'
      setActionError(msg)
      showToast(msg, 'error')
    } catch (err) {
      const msg = err?.message || 'Checkout failed'
      setActionError(msg)
      showToast(msg, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!activeOrgId || actionLoading) return
    setActionLoading('portal')
    setActionError(null)
    try {
      const data = await createStripePortalSession(activeOrgId)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      const msg = 'No billing customer yet. Choose a plan first.'
      setActionError(msg)
      showToast(msg, 'info')
    } catch (err) {
      const isNoCustomer = err?.message?.includes('NO_CUSTOMER')
      const msg = isNoCustomer ? 'No billing customer yet. Choose a plan first.' : (err?.message || 'Portal failed')
      setActionError(msg)
      showToast(msg, isNoCustomer ? 'info' : 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '—')
  const loading = billingLoading

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

      <div style={{ maxWidth: 560, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Billing alerts (D11.8 Slice 5) — UX only; data from useWorkspaceUsage (D12) */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Billing alerts</h2>
          <LimitReachedBanner
            resource="projects"
            used={usage?.projects?.used ?? 0}
            limit={usage?.projects?.limit ?? null}
            onUpgrade={() => handleUpgrade('growth')}
            upgradeDisabled={actionLoading != null}
          />
          <LimitReachedBanner
            resource="seats"
            used={usage?.seats?.used ?? 0}
            limit={usage?.seats?.limit ?? null}
            onUpgrade={() => handleUpgrade('growth')}
            upgradeDisabled={actionLoading != null}
          />
        </section>

        {/* Block 1: Current Plan */}
        <section style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Current Plan</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Current plan</div>
              <div style={{ fontWeight: 600 }}>{billing?.plan ?? 'growth'}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Billing status</div>
              <div style={{ fontWeight: 600 }}>{billing?.status ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Trial ends</div>
              <div style={{ fontWeight: 600 }}>{formatDate(billing?.trial_ends_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Current period ends</div>
              <div style={{ fontWeight: 600 }}>{formatDate(billing?.current_period_end_at)}</div>
            </div>
          </div>
          {actionError && (
            <div role="alert" style={{ marginTop: 16, padding: '10px 12px', background: 'var(--error-bg, #fef2f2)', color: 'var(--error-text, #b91c1c)', borderRadius: 6, fontSize: 14 }}>
              {actionError}
            </div>
          )}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Upgrade plan</div>
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
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Manage subscription</div>
            <Button
              variant="secondary"
              size="md"
              disabled={actionLoading != null}
              onClick={handleManageSubscription}
            >
              {actionLoading === 'portal' ? '…' : 'Manage subscription'}
            </Button>
          </div>
        </section>

        {/* Block 2: Usage — single source: useWorkspaceUsage (D12 Slice 3) */}
        <section style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Usage</h2>
          {usageLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading usage…</p>
          ) : usageError ? (
            <p style={{ fontSize: 14, color: 'var(--error-text, #b91c1c)' }} role="alert">{usageError}</p>
          ) : usage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderKanban size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Projects</span>
                <span style={{ fontWeight: 600 }}>{usage.projects.used} / {usage.projects.limit != null ? usage.projects.limit : '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Seats</span>
                <span style={{ fontWeight: 600 }}>{usage.seats.used} / {usage.seats.limit != null ? usage.seats.limit : '—'}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No usage data.</p>
          )}
        </section>

        {/* Block 3: Locked features (D11.8 Slice 4) — upsell via canonical hasOrgFeature */}
        <section style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Locked features</h2>
          {entitlementsLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FeatureLockedCard
                title="Analytics"
                description="Charts, KPIs and analytics by project and category."
                featureCode="analytics"
                entitlements={entitlements}
                onUpgrade={() => handleUpgrade('growth')}
                upgradeDisabled={actionLoading != null}
              />
              <FeatureLockedCard
                title="Amazon ingest"
                description="Import settlement data from Amazon SP-API."
                featureCode="amazon_ingest"
                entitlements={entitlements}
                onUpgrade={() => handleUpgrade('growth')}
                upgradeDisabled={actionLoading != null}
              />
              <FeatureLockedCard
                title="Profit engine"
                description="Recompute profit and coverage by product and period."
                featureCode="profit_engine"
                entitlements={entitlements}
                onUpgrade={() => handleUpgrade('growth')}
                upgradeDisabled={actionLoading != null}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
