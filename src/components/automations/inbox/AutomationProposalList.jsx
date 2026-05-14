import React from 'react'
import { useTranslation } from 'react-i18next'
import AutomationProposalCard from './AutomationProposalCard'

export default function AutomationProposalList({ proposals, permissions, onOpen, onApprove, onReject }) {
  const { t } = useTranslation()
  const list = Array.isArray(proposals) ? proposals : []
  if (list.length === 0) {
    return <div style={{ padding: 16, color: 'var(--text-2, #6b7280)' }}>{t('automations.inbox.empty')}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {list.map((p) => (
        <AutomationProposalCard
          key={p.id}
          proposal={p}
          permissions={permissions}
          onOpen={onOpen}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  )
}
