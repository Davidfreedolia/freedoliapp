import React, { useEffect, useState } from 'react'
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

const WINDOW_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

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
  const { activeOrgId } = useWorkspace()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()

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
            Decision Dashboard
          </span>
        }
        rightSlot={
          <Button type="button" variant="primary" size="sm" onClick={handleViewInbox}>
            Open Decision Inbox
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
                Refresh
              </Button>
            </AppToolbar.Right>
          </AppToolbar>
        )}

        {loading && !isScreenshotMode() && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary, #6b7280)' }}>
            Loading decision dashboard…
          </div>
        )}
        {error && !loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--status-critical, #b91c1c)' }}>
            Error loading decision metrics.
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
                label="Open decisions"
                value={openCount}
                tone="neutral"
              />
              <KpiCard
                icon={<AlertTriangle size={20} />}
                label="High severity open"
                value={highSeverityOpenCount}
                tone="danger"
              />
              <KpiCard
                icon={<Activity size={20} />}
                label="Acted rate"
                value={formatPercent(actedRate)}
                tone="success"
              />
              <KpiCard
                icon={<BarChart3 size={20} />}
                label="Dismissed rate"
                value={formatPercent(dismissedRate)}
                tone="muted"
              />
              <KpiCard
                icon={<Clock size={20} />}
                label="Avg time-to-action"
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
              <Card title="Decisions by status" icon={<PieChart size={18} />}>
                <SimpleBarList data={byStatus} emptyLabel="No decisions in window" />
              </Card>
              <Card title="Decisions by type" icon={<BarChart3 size={18} />}>
                <SimpleBarList data={byType} emptyLabel="No decisions in window" />
              </Card>
              <Card title="High severity open decisions" icon={<AlertTriangle size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginBottom: 8 }}>
                  Count of high severity decisions that are currently open or acknowledged.
                </p>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--status-critical, #b91c1c)' }}>
                  {highSeverityOpenCount}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/app/decisions')}
                  style={{ marginTop: 12 }}
                >
                  View in Inbox
                </Button>
              </Card>
              <Card title="Feedback distribution" icon={<Activity size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginBottom: 8 }}>
                  Share of decisions with explicit feedback marked as useful or wrong in this window.
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)' }}>Useful</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#22c55e' }}>
                      {formatPercent(feedbackUsefulRate)}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #9ca3af)' }}>Wrong</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>
                      {formatPercent(feedbackWrongRate)}
                    </div>
                  </div>
                </div>
              </Card>
              <Card title="Time-to-action distribution" icon={<Clock size={18} />}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)', marginBottom: 8 }}>
                  How quickly decisions are acted on or dismissed after creation.
                </p>
                <SimpleBarList data={timeToActionBuckets} emptyLabel="No closed decisions in window" />
              </Card>
            </div>

            {/* Recent activity */}
            <Card title="Recent decision activity" icon={<Activity size={18} />}>
              {recent.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
                  No recent activity in this window.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recent.map((item) => (
                    <li
                      key={`${item.kind}-${item.decisionId}-${item.at.toISOString()}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                        onClick={() => handleOpenDecision(item.decisionId)}
                      >
                        <span style={{ fontWeight: 500 }}>{item.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
                          {item.decisionType} · {item.status} ·{' '}
                          {item.at.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleOpenDecision(item.decisionId)}
                      >
                        Open
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
  let color = 'var(--text-primary, #e5e7eb)'
  if (tone === 'success') color = '#22c55e'
  if (tone === 'danger') color = '#ef4444'
  if (tone === 'muted') color = '#6b7280'

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: '1px solid var(--border-1)',
        backgroundColor: 'var(--surface-bg-2, #020617)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(148,163,184,0.16)',
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #9ca3af)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function Card({ title, icon, children }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        border: '1px solid var(--border-1)',
        backgroundColor: 'var(--surface-bg-2, #020617)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        {icon}
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function SimpleBarList({ data, emptyLabel }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-secondary, #6b7280)' }}>
        {emptyLabel || 'No data'}
      </div>
    )
  }

  const max = entries[0][1] || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-secondary, #9ca3af)',
            }}
          >
            <span>{key}</span>
            <span>{value}</span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(148,163,184,0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (value / max) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  'linear-gradient(90deg, rgba(96,165,250,1) 0%, rgba(129,140,248,1) 50%, rgba(236,72,153,1) 100%)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

