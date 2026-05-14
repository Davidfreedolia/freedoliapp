/**
 * D23.3–D23.6 — Internal Admin Console. Trials + Workspaces + Subscriptions
 * + Conversions; read-only cross-tenant view for the platform super-admin.
 *
 * Route is gated by `AdminGate` (see src/App.jsx). Data access is enforced
 * by Postgres RLS: see migration 20260514120000_super_admin_and_trial_rls.sql
 * for `is_super_admin()` + the OR-clauses that grant read-only cross-tenant
 * access to this single account.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Button from '../components/ui/Button'

function formatDate(s) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatConversionHours(createdAt, convertedAt) {
  if (!createdAt || !convertedAt) return '—'
  const a = new Date(createdAt).getTime()
  const b = new Date(convertedAt).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return '—'
  const hours = (b - a) / (1000 * 60 * 60)
  if (hours < 0) return '—'
  const rounded = hours % 1 === 0 ? Math.round(hours) : Math.round(hours * 10) / 10
  return `${rounded} h`
}

export default function AdminConsole() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [workspacesLoading, setWorkspacesLoading] = useState(true)
  const [workspacesError, setWorkspacesError] = useState(null)
  const [workspacesRows, setWorkspacesRows] = useState([])
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true)
  const [subscriptionsError, setSubscriptionsError] = useState(null)
  const [subscriptionsRows, setSubscriptionsRows] = useState([])
  const [conversionsLoading, setConversionsLoading] = useState(true)
  const [conversionsError, setConversionsError] = useState(null)
  const [conversionsRows, setConversionsRows] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('trial_registrations')
        .select('id, email, workspace_id, status, created_at, converted_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      setRows(
        (data || []).map((r) => ({
          id: r.id,
          email: r.email ?? '',
          workspaceId: r.workspace_id ?? null,
          status: r.status ?? 'started',
          createdAt: r.created_at ?? '',
          convertedAt: r.converted_at ?? null,
        }))
      )
    } catch (e) {
      setError(e?.message || String(e))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true)
    setWorkspacesError(null)
    try {
      const { data: orgsData, error: orgsErr } = await supabase
        .from('orgs')
        .select('id, name, created_at, created_by')
        .order('created_at', { ascending: false })
      if (orgsErr) throw orgsErr
      const orgs = orgsData || []

      const { data: entData } = await supabase
        .from('billing_org_entitlements')
        .select('org_id, plan_id')
      const { data: plansData } = await supabase
        .from('billing_plans')
        .select('id, code')
      const entByOrg = (entData || []).reduce((acc, r) => {
        acc[r.org_id] = r.plan_id
        return acc
      }, {})
      const planCodeById = (plansData || []).reduce((acc, r) => {
        acc[r.id] = r.code
        return acc
      }, {})

      setWorkspacesRows(
        orgs.map((r) => {
          const planId = entByOrg[r.id]
          return {
            workspaceId: r.id,
            name: r.name ?? '',
            ownerEmail: null,
            createdAt: r.created_at ?? '',
            plan: planId ? (planCodeById[planId] ?? planId) : null,
          }
        })
      )
    } catch (e) {
      setWorkspacesError(e?.message || String(e))
      setWorkspacesRows([])
    } finally {
      setWorkspacesLoading(false)
    }
  }, [])

  const loadSubscriptions = useCallback(async () => {
    setSubscriptionsLoading(true)
    setSubscriptionsError(null)
    try {
      const { data: subData, error: subErr } = await supabase
        .from('billing_subscriptions')
        .select('org_id, stripe_subscription_id, status, plan_id, current_period_end')
        .order('current_period_end', { ascending: true, nullsFirst: false })
      if (subErr) throw subErr
      const subs = subData || []
      const planIds = [...new Set(subs.map((s) => s.plan_id).filter(Boolean))]
      const planCodeById = {}
      if (planIds.length > 0) {
        const { data: plansData } = await supabase
          .from('billing_plans')
          .select('id, code')
          .in('id', planIds)
        ;(plansData || []).forEach((r) => { planCodeById[r.id] = r.code })
      }
      setSubscriptionsRows(
        subs.map((r) => ({
          workspaceId: r.org_id ?? '',
          stripeSubscriptionId: r.stripe_subscription_id ?? '',
          status: r.status ?? '',
          plan: r.plan_id ? (planCodeById[r.plan_id] ?? r.plan_id) : null,
          currentPeriodEnd: r.current_period_end ?? null,
        }))
      )
    } catch (e) {
      setSubscriptionsError(e?.message || String(e))
      setSubscriptionsRows([])
    } finally {
      setSubscriptionsLoading(false)
    }
  }, [])

  const loadConversions = useCallback(async () => {
    setConversionsLoading(true)
    setConversionsError(null)
    try {
      const { data, error: err } = await supabase
        .from('trial_registrations')
        .select('id, email, workspace_id, created_at, converted_at')
        .eq('status', 'converted')
        .not('converted_at', 'is', null)
        .order('converted_at', { ascending: false })
      if (err) throw err
      setConversionsRows(
        (data || []).map((r) => ({
          id: r.id,
          email: r.email ?? '',
          workspaceId: r.workspace_id ?? null,
          trialCreatedAt: r.created_at ?? '',
          convertedAt: r.converted_at ?? '',
        }))
      )
    } catch (e) {
      setConversionsError(e?.message || String(e))
      setConversionsRows([])
    } finally {
      setConversionsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])
  useEffect(() => { loadSubscriptions() }, [loadSubscriptions])
  useEffect(() => { loadConversions() }, [loadConversions])

  const isEmpty = rows.length === 0
  const workspacesEmpty = workspacesRows.length === 0
  const subscriptionsEmpty = subscriptionsRows.length === 0
  const conversionsEmpty = conversionsRows.length === 0

  return (
    <div style={styles.page}>
      {/* Super-admin warning banner — always visible at the top of this page. */}
      <div style={styles.adminBanner} role="status" aria-live="polite">
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <div>
          <div style={styles.adminBannerTitle}>{t('adminConsole.banner.title')}</div>
          <div style={styles.adminBannerBody}>{t('adminConsole.banner.body')}</div>
        </div>
      </div>

      <header style={styles.header}>
        <h1 style={styles.title}>{t('adminConsole.title')}</h1>
        <p style={styles.subtitle}>{t('adminConsole.subtitle')}</p>
      </header>

      {/* Trials */}
      <section style={styles.section} aria-labelledby="trials-heading">
        <h2 id="trials-heading" style={styles.sectionTitle}>{t('adminConsole.trials.title')}</h2>
        {loading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : error ? (
          <div style={styles.errorWrap}>
            <p style={styles.errorText}>{error}</p>
            <Button variant="primary" size="md" onClick={load}>
              {t('common.retry')}
            </Button>
          </div>
        ) : isEmpty ? (
          <div style={styles.empty}>{t('adminConsole.trials.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('adminConsole.trials.headers.email')}</th>
                  <th style={styles.th}>{t('adminConsole.trials.headers.created')}</th>
                  <th style={styles.th}>{t('adminConsole.trials.headers.workspace')}</th>
                  <th style={styles.th}>{t('adminConsole.trials.headers.status')}</th>
                  <th style={styles.th}>{t('adminConsole.trials.headers.converted')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{row.email || '—'}</td>
                    <td style={styles.td}>{formatDate(row.createdAt)}</td>
                    <td style={styles.td}>{row.workspaceId ?? '—'}</td>
                    <td style={styles.td}>{row.status || '—'}</td>
                    <td style={styles.td}>{row.convertedAt ? formatDate(row.convertedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workspaces */}
      <section style={styles.section} aria-labelledby="workspaces-heading">
        <h2 id="workspaces-heading" style={styles.sectionTitle}>{t('adminConsole.workspaces.title')}</h2>
        <p style={styles.sectionSubtitle}>{t('adminConsole.workspaces.subtitle')}</p>
        {workspacesLoading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : workspacesError ? (
          <div style={styles.errorWrap}>
            <p style={styles.errorText}>{workspacesError}</p>
            <Button variant="secondary" size="md" onClick={loadWorkspaces}>
              {t('common.retry')}
            </Button>
          </div>
        ) : workspacesEmpty ? (
          <div style={styles.empty}>{t('adminConsole.workspaces.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('adminConsole.workspaces.headers.workspace')}</th>
                  <th style={styles.th}>{t('adminConsole.workspaces.headers.name')}</th>
                  <th style={styles.th}>{t('adminConsole.workspaces.headers.owner')}</th>
                  <th style={styles.th}>{t('adminConsole.workspaces.headers.created')}</th>
                  <th style={styles.th}>{t('adminConsole.workspaces.headers.plan')}</th>
                </tr>
              </thead>
              <tbody>
                {workspacesRows.map((row) => (
                  <tr key={row.workspaceId}>
                    <td style={styles.td}>{row.workspaceId ?? '—'}</td>
                    <td style={styles.td}>{row.name || '—'}</td>
                    <td style={styles.td}>{row.ownerEmail ?? '—'}</td>
                    <td style={styles.td}>{formatDate(row.createdAt)}</td>
                    <td style={styles.td}>{row.plan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Subscriptions */}
      <section style={styles.section} aria-labelledby="subscriptions-heading">
        <h2 id="subscriptions-heading" style={styles.sectionTitle}>{t('adminConsole.subscriptions.title')}</h2>
        <p style={styles.sectionSubtitle}>{t('adminConsole.subscriptions.subtitle')}</p>
        {subscriptionsLoading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : subscriptionsError ? (
          <div style={styles.errorWrap}>
            <p style={styles.errorText}>{subscriptionsError}</p>
            <Button variant="secondary" size="md" onClick={loadSubscriptions}>
              {t('common.retry')}
            </Button>
          </div>
        ) : subscriptionsEmpty ? (
          <div style={styles.empty}>{t('adminConsole.subscriptions.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('adminConsole.subscriptions.headers.workspace')}</th>
                  <th style={styles.th}>{t('adminConsole.subscriptions.headers.stripeSubscription')}</th>
                  <th style={styles.th}>{t('adminConsole.subscriptions.headers.status')}</th>
                  <th style={styles.th}>{t('adminConsole.subscriptions.headers.plan')}</th>
                  <th style={styles.th}>{t('adminConsole.subscriptions.headers.periodEnd')}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionsRows.map((row, idx) => (
                  <tr key={`${row.workspaceId}-${row.stripeSubscriptionId}-${idx}`}>
                    <td style={styles.td}>{row.workspaceId || '—'}</td>
                    <td style={styles.td}>{row.stripeSubscriptionId || '—'}</td>
                    <td style={styles.td}>{row.status || '—'}</td>
                    <td style={styles.td}>{row.plan ?? '—'}</td>
                    <td style={styles.td}>{row.currentPeriodEnd ? formatDate(row.currentPeriodEnd) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Conversions */}
      <section style={styles.section} aria-labelledby="conversions-heading">
        <h2 id="conversions-heading" style={styles.sectionTitle}>{t('adminConsole.conversions.title')}</h2>
        <p style={styles.sectionSubtitle}>{t('adminConsole.conversions.subtitle')}</p>
        {conversionsLoading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : conversionsError ? (
          <div style={styles.errorWrap}>
            <p style={styles.errorText}>{conversionsError}</p>
            <Button variant="secondary" size="md" onClick={loadConversions}>
              {t('common.retry')}
            </Button>
          </div>
        ) : conversionsEmpty ? (
          <div style={styles.empty}>{t('adminConsole.conversions.empty')}</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t('adminConsole.conversions.headers.email')}</th>
                  <th style={styles.th}>{t('adminConsole.conversions.headers.workspace')}</th>
                  <th style={styles.th}>{t('adminConsole.conversions.headers.trialCreated')}</th>
                  <th style={styles.th}>{t('adminConsole.conversions.headers.converted')}</th>
                  <th style={styles.th}>{t('adminConsole.conversions.headers.conversionTime')}</th>
                </tr>
              </thead>
              <tbody>
                {conversionsRows.map((row) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{row.email || '—'}</td>
                    <td style={styles.td}>{row.workspaceId ?? '—'}</td>
                    <td style={styles.td}>{formatDate(row.trialCreatedAt)}</td>
                    <td style={styles.td}>{formatDate(row.convertedAt)}</td>
                    <td style={styles.td}>{formatConversionHours(row.trialCreatedAt, row.convertedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  page: {
    padding: '1.5rem 1.5rem 2rem',
    maxWidth: 1200,
    margin: '0 auto',
  },
  adminBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    marginBottom: '1.5rem',
    background: 'rgba(229, 83, 83, 0.06)',
    border: '1px solid rgba(229, 83, 83, 0.32)',
    borderRadius: 12,
    color: 'var(--danger-1, #B0413F)',
  },
  adminBannerTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: 'var(--danger-1, #B0413F)',
    marginBottom: 2,
  },
  adminBannerBody: {
    fontSize: 13,
    color: 'var(--text-1)',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-1, #111827)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: 'var(--text-2, #6b7280)',
    margin: '0.25rem 0 0',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--text-1, #111827)',
    margin: '0 0 0.25rem',
    letterSpacing: '-0.01em',
  },
  sectionSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-2, #6b7280)',
    margin: '0 0 1rem',
  },
  loading: {
    padding: '2rem',
    color: 'var(--text-2, #6b7280)',
  },
  errorWrap: {
    padding: '2rem',
    textAlign: 'center',
  },
  errorText: {
    color: 'var(--danger-1, #B0413F)',
    marginBottom: '1rem',
  },
  empty: {
    padding: '2rem',
    color: 'var(--text-2, #6b7280)',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid var(--border-1, #e5e7eb)',
    borderRadius: 12,
    background: 'var(--surface-bg, #fff)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    fontWeight: 700,
    color: 'var(--text-2)',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border-1)',
    background: 'var(--surface-bg-2)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-1)',
    color: 'var(--text-1)',
  },
}
