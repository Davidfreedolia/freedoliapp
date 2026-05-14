import React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../../ui/Card'

function MetricCard({ label, value, loading }) {
  const display = loading ? '…' : value ?? '—'
  return (
    <Card className="ui-card--elevated" style={{ flex: '1 1 160px', minWidth: 140, padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1, #111827)' }}>{display}</div>
    </Card>
  )
}

export default function AutomationMetricsGrid({ summary, loading, empty }) {
  const { t } = useTranslation()
  if (empty) {
    return (
      <Card className="ui-card--elevated" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1, #111827)', marginBottom: 4 }}>
          {t('automations.metrics.emptyTitle')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
          {t('automations.metrics.emptyDesc')}
        </div>
      </Card>
    )
  }

  const labels = {
    total: t('automations.metrics.totalProposals'),
    pending: t('automations.metrics.pendingApproval'),
    approved: t('automations.metrics.approved'),
    queued: t('automations.metrics.queued'),
    executed: t('automations.metrics.executed'),
    execFailed: t('automations.metrics.executionFailed'),
    execSucceeded: t('automations.metrics.executionsSucceeded'),
    execFailed2: t('automations.metrics.executionsFailed'),
    successRate: t('automations.metrics.successRate'),
  }

  if (loading || !summary) {
    const skeletons = [labels.total, labels.pending, labels.approved, labels.queued]
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {skeletons.map((label) => (
          <MetricCard key={label} label={label} value={null} loading />
        ))}
      </div>
    )
  }

  const s = summary || {}
  const successRate =
    typeof s.executionSuccessRate === 'number' ? `${Math.round(s.executionSuccessRate * 100)}%` : '—'

  const cards = [
    { key: 'proposalsTotal', label: labels.total, value: s.proposalsTotal },
    { key: 'pending', label: labels.pending, value: s.proposalsPendingApproval },
    { key: 'approved', label: labels.approved, value: s.proposalsApproved },
    { key: 'queued', label: labels.queued, value: s.proposalsQueued },
    { key: 'executed', label: labels.executed, value: s.proposalsExecuted },
    { key: 'execFailed', label: labels.execFailed, value: s.proposalsExecutionFailed },
    { key: 'execSucceeded', label: labels.execSucceeded, value: s.executionsSucceeded },
    { key: 'execFailed2', label: labels.execFailed2, value: s.executionsFailed },
    { key: 'execRate', label: labels.successRate, value: successRate },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {cards.map((c) => (
        <MetricCard key={c.key} label={c.label} value={c.value} />
      ))}
    </div>
  )
}
