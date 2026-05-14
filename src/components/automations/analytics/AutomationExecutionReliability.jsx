import React from 'react'
import { useTranslation } from 'react-i18next'
import Card from '../../ui/Card'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export default function AutomationExecutionReliability({ stats }) {
  const { t } = useTranslation()
  const s = stats || {}
  const data = [
    { status: t('automations.execution.statuses.succeeded'), count: s.succeeded ?? 0 },
    { status: t('automations.execution.statuses.failed'),    count: s.failed ?? 0 },
    { status: t('automations.execution.statuses.running'),   count: s.running ?? 0 },
    { status: t('automations.execution.statuses.queued'),    count: s.queued ?? 0 },
  ]

  const denom = (s.succeeded ?? 0) + (s.failed ?? 0)
  const successRate =
    denom > 0 ? `${Math.round(((s.succeeded ?? 0) / denom) * 100)}%` : '—'

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #111827)' }}>{t('automations.execution.title')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>{t('automations.execution.successRate', { rate: successRate })}</div>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3FBF9A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
