import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspace } from '../contexts/WorkspaceContext'
import Header from '../components/Header'
import AppToolbar from '../components/ui/AppToolbar'
import Button from '../components/Button'
import { useBreakpoint } from '../hooks/useBreakpoint'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  PieChart,
  TrendingUp,
  ListChecks,
} from 'lucide-react'
import {
  getDecisionDashboardSummary,
  getDecisionDashboardGroups,
  getDecisionDashboardRecentActivity,
  getDecisionAnalyticsSummary,
} from '../lib/decisions/getDecisionDashboardData'
import { useNavigate } from 'react-router-dom'
import { isScreenshotMode } from '../lib/ui/screenshotMode'

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

function formatHours(value) {
  if (!Number.isFinite(value)) return '-'
  if (value < 1) return `${(value * 60).toFixed(0)} min`
  if (value < 24) return `${value.toFixed(1)} h`
  const days = value / 24
  return `${days.toFixed(1)} d`
}

export default function DecisionDashboard() {
  const { t } = useTranslation()
  const { activeOrgId } = useWorkspace()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()

  const WINDOW_OPTIONS = [
    { value: 7,  label: t('decisionDashboardPage.window.last7') },
    { value: 30, label: t('decisionDashboardPage.window.last30') },
    { value: 90, label: t('decisionDashboardPage.window.last90') },
  ]

  const [windowDays, setWindowDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [summary, setSummary] = useState(null)
  const [groups, setGroups] = useState({ byStatus: {}, byType: {} })
  const [recent, setRecent] = useState([])
  const [analytics, setAnalytics] = useState(null)

  const load = async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const [s, g, r, a] = await Promise.all([
        getDecisionDashboardSummary({ orgId: activeOrgId, days: windowDays }),
        getDecisionDashboardGroups({ orgId: activeOrgId, days: windowDays }),
        getDecisionDashboardRecentActivity({ orgId: activeOrgId, days: windowDays, limit: 20 }),
        getDecisionAnalyticsSummary({ orgId: activeOrgId, days: windowDays }),
      ])
      setSummary(s)
      setGroups(g)
      setRecent(r)
      setAnalytics(a)
    } catch (e) {
      console.error('DecisionDashboard: error loading data', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, windowDays])

  const openCount = summary?.openCount ?? 0
  const highSeverityOpenCount = summary?.highSeverityOpenCount ?? 0
  const actedRate = summary?.actedRate ?? 0
  const dismissedRate = summary?.dismissedRate ?? 0
  const avgTimeToActionHours = summary?.avgTimeToActionHours ?? 0

  const byStatus = groups.byStatus || {}
  const byType = groups.byType || {}
  const timeToActionBuckets = analytics?.timeToActionBuckets || {}
  const feedbackUsefulRate = analytics?.overall?.feedbackUsefulRate ?? 0
  const feedbackWrongRate = analytics?.overall?.feedbackWrongRate ?? 0

  const handleViewInbox = () => {
    navigate('/app/decisions')
  }

  const handleOpenDecision = (id) => {
    if (!id) return
    navigate(`/app/decisions?id=${encodeURIComponent(id)}`)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header
        title={
          <span className="page-title-with-icon">
            <TrendingUp size={22} />
            {t('decisionDashboardPage.title')}
          </span>
        }
        rightSlot={
          <Button type="button" variant="primary" size="sm" onClick={handleViewInbox}>
            {t('decisionDashboardPage.openInbox')}
          </Button>
        }
      />

      <div style={{ padding: isMobile ? 16 : 32, overflowY: 'auto' }}>
        {!isScreenshotMode() && (
          <AppToolbar style={{ marginBottom: 20 }}>
            <AppToolbar.Left>
              <div className="toolbar-group">
                <select
                  value={windowDays}
                  onChange={(e) => setWindowDays(Number(e.target.value) || 30)}
                  style={{
                    height: 'var(--btn-h-sm)',
                    padding: '0 12px',
                    borderRadius: 'var(--btn-radius)',
                    border: '1px solid var(--btn-secondary-border)',
                    backgroundColor: 'var(--btn-ghost-bg)',
                    color: 'var(--btn-secondary-fg)',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </AppToolbar.Left>
            <AppToolbar.Right>
              <Button type="button" variant="secondary" size="sm" onClick={load}>
                {t('decisionDashboardPage.refresh')}
              </Button>
            </AppToolbar.Right>
          </AppToolbar>
        )}

        {loading && !isScreenshotMode() && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-2)' }}>
            {t('decisionDashboardPage.loading')}
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--danger-1)' }}>
            {t('decisionDashboardPage.error')}
          </div>
        )}
        {!loading && !error && (
          <>
            {/* KPI strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <KpiCard
                icon={<ListChecks size={20} />}
                label={t('decisionDashboardPage.kpi.openDecisions')}
                value={openCount}
                tone="neutral"
              />
              <KpiCard
                icon={<AlertTriangle size={20} />}
                label={t('decisionDashboardPage.kpi.highSeverityOpen')}
                value={highSeverityOpenCount}
                tone="danger"
              />
              <KpiCard
                icon={<Activity size={20} />}
                label={t('decisionDashboardPage.kpi.actedRate')}
                value={formatPercent(actedRate)}
                tone="success"
              />
              <KpiCard
                icon={<BarChart3 size={20} />}
                label={t('decisionDashboardPage.kpi.dismissedRate')}
                value={formatPercent(dismissedRate)}
                tone="muted"
              />
              <KpiCard
                icon={<Clock size={20} />}
                label={t('decisionDashboardPage.kpi.avgTimeToAction')}
                value={formatHours(avgTimeToActionHours)}
                tone="neutral"
              />
            </div>

            {/* Main widgets */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 20,
                marginBottom: 24,
              }}
            >
              <Card title={t('decisionDashboardPage.cards.byStatus')} icon={<PieChart size={18} />}>
                <SimpleBarList data={byStatus} emptyLabel={t('decisionDashboardPage.empty.noDecisions')} />
              </Card>
              <Card title={t('decisionDashboardPage.cards.byType')} icon={<BarChart3 size={18} />}>
                <SimpleBarList data={byType} emptyLabel={t('decisionDashboardPage.empty.noDecisions')} />
              </Card>
              <Card title={t('decisionDashboardPage.cards.highSeverityOpenTitle')} icon={<AlertTriangle size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  {t('decisionDashboardPage.cards.highSeverityOpenDesc')}
                </p>
                <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--danger-1)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {highSeverityOpenCount}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/app/decisions')}
                  style={{ marginTop: 12 }}
                >
                  {t('decisionDashboardPage.cards.viewInInbox')}
                </Button>
              </Card>
              <Card title={t('decisionDashboardPage.cards.feedbackDistTitle')} icon={<Activity size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
                  {t('decisionDashboardPage.cards.feedbackDistDesc')}
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <div style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(63,191,154,0.08)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      {t('decisionDashboardPage.cards.feedbackUseful')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
                      {formatPercent(feedbackUsefulRate)}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(229,83,83,0.08)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      {t('decisionDashboardPage.cards.feedbackWrong')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
                      {formatPercent(feedbackWrongRate)}
                    </div>
                  </div>
                </div>
              </Card>
              <Card title={t('decisionDashboardPage.cards.timeToActionTitle')} icon={<Clock size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
                  {t('decisionDashboardPage.cards.timeToActionDesc')}
                </p>
                <SimpleBarList data={timeToActionBuckets} emptyLabel={t('decisionDashboardPage.empty.noClosed')} />
              </Card>
            </div>

            {/* Recent activity */}
            <Card title={t('decisionDashboardPage.cards.recentActivityTitle')} icon={<Activity size={18} />}>
              {recent.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>
                  {t('decisionDashboardPage.cards.recentActivityEmpty')}
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recent.map((item) => (
                    <li
                      key={`${item.kind}-${item.decisionId}-${item.at.toISOString()}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 13,
                        padding: '10px 12px',
                        borderRadius: 10,
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-bg-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={() => handleOpenDecision(item.decisionId)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                          <span style={{ textTransform: 'capitalize' }}>{String(item.decisionType).replace(/_/g, ' ')}</span> · {item.status} · {item.at.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={(e) => { e.stopPropagation(); handleOpenDecision(item.decisionId) }}
                      >
                        {t('decisionDashboardPage.cards.open')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, tone }) {
  let color = 'var(--text-1)'
  let iconBg = 'rgba(31, 95, 99, 0.08)'
  let iconColor = 'var(--brand-1)'
  if (tone === 'success') {
    color = 'var(--success-1)'
    iconBg = 'rgba(63, 191, 154, 0.14)'
    iconColor = 'var(--success-1)'
  } else if (tone === 'danger') {
    color = 'var(--danger-1)'
    iconBg = 'rgba(229, 83, 83, 0.12)'
    iconColor = 'var(--danger-1)'
  } else if (tone === 'muted') {
    color = 'var(--text-2)'
    iconBg = 'rgba(95, 116, 118, 0.12)'
    iconColor = 'var(--text-2)'
  } else if (tone === 'neutral') {
    color = 'var(--brand-1)'
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: iconBg,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 10, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function Card({ title, icon, children }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          color: 'var(--brand-1)',
        }}
      >
        {icon}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function SimpleBarList({ data, emptyLabel }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic' }}>
        {emptyLabel || 'No data'}
      </div>
    )
  }

  const max = entries[0][1] || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-1)',
              fontWeight: 500,
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{String(key).replace(/_/g, ' ')}</span>
            <span style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(31, 95, 99, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (value / max) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  'linear-gradient(90deg, var(--brand-1) 0%, var(--brand-2) 100%)',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

