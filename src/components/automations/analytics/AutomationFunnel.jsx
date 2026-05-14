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

export default function AutomationFunnel({ funnel }) {
  const { t } = useTranslation()
  const f = funnel || {}
  const data = [
    { stage: t('automations.funnel.stages.decisionsWithProposals'), value: Math.max(0, f.proposalLinkedDecisions ?? 0) },
    { stage: t('automations.funnel.stages.proposals'),              value: Math.max(0, f.proposalsTotal ?? 0) },
    { stage: t('automations.funnel.stages.pendingApproval'),        value: Math.max(0, f.proposalsPendingApproval ?? 0) },
    { stage: t('automations.funnel.stages.approved'),               value: Math.max(0, f.proposalsApproved ?? 0) },
    { stage: t('automations.funnel.stages.queued'),                 value: Math.max(0, f.proposalsQueued ?? 0) },
    { stage: t('automations.funnel.stages.executed'),               value: Math.max(0, f.proposalsExecuted ?? 0) },
  ]

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #111827)', marginBottom: 8 }}>
        {t('automations.funnel.title')}
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1F5F63" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
