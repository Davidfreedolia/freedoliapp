import React from 'react'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import AutomationProgressBar from '../shared/AutomationProgressBar'
import { mapRiskBadgeVariant } from '../../../lib/automations/mappers/mapRiskBadgeVariant'

function initialsFromIdentity(identity) {
  const s = (identity || '').toString().trim()
  if (!s) return '—'
  return s
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default function AutomationProposalCard({ proposal, permissions, onOpen, onApprove, onReject }) {
  const canApprove = Boolean(permissions?.canApprove)
  const canReject = Boolean(permissions?.canReject)

  const riskBand = proposal?.riskBand ?? null
  const riskVariant = mapRiskBadgeVariant(riskBand)

  const decisionTitle = proposal?.decision?.title ?? proposal?.decision?.decisionType ?? '—'
  const decisionSource = proposal?.decision?.id ? `Decision ${proposal.decision.id}` : '—'

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--card-bg, #f9fafb)',
            border: '1px solid var(--border-color, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-2, #6b7280)',
            flex: '0 0 auto',
          }}
          aria-label="Thumbnail"
        >
          {initialsFromIdentity(proposal?.productIdentity)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', marginBottom: 4 }}>
                {proposal?.actionType ?? '—'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1, #111827)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proposal?.productIdentity ?? '—'}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge variant={riskVariant}>{riskBand ?? 'risk: —'}</Badge>
                <Badge variant="neutral">{proposal?.proposalStatus ?? '—'}</Badge>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => onOpen?.(proposal)}>
                Open
              </Button>
              <Button variant="primary" size="sm" disabled={!canApprove} onClick={() => onApprove?.(proposal)}>
                Approve
              </Button>
              <Button variant="danger" size="sm" disabled={!canReject} onClick={() => onReject?.(proposal)}>
                Reject
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong style={{ color: 'var(--text-1, #111827)' }}>Decision</strong>: {decisionTitle}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong style={{ color: 'var(--text-1, #111827)' }}>Source</strong>: {decisionSource}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <AutomationProgressBar currentStage={proposal?.progressStage ?? 'proposal'} />
          </div>
        </div>
      </div>
    </Card>
  )
}

