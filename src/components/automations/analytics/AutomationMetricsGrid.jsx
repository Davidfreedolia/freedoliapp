import React from 'react'
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
  if (empty) {
    return (
      <Card className="ui-card--elevated" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1, #111827)', marginBottom: 4 }}>
          No automation data yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
          Automation analytics will appear once the system starts generating proposals.
        </div>
      </Card>
    )
  }

  if (loading || !summary) {
    const skeletons = ['Total proposals', 'Pending approval', 'Approved', 'Queued']
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
    { key: 'proposalsTotal', label: 'Total proposals', value: s.proposalsTotal },
    { key: 'pending', label: 'Pending approval', value: s.proposalsPendingApproval },
    { key: 'approved', label: 'Approved', value: s.proposalsApproved },
    { key: 'queued', label: 'Queued for execution', value: s.proposalsQueued },
    { key: 'executed', label: 'Executed', value: s.proposalsExecuted },
    { key: 'execFailed', label: 'Execution failed', value: s.proposalsExecutionFailed },
    { key: 'execSucceeded', label: 'Executions succeeded', value: s.executionsSucceeded },
    { key: 'execFailed2', label: 'Executions failed', value: s.executionsFailed },
    { key: 'execRate', label: 'Success rate %', value: successRate },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {cards.map((c) => (
        <MetricCard key={c.key} label={c.label} value={c.value} />
      ))}
    </div>
  )
}

