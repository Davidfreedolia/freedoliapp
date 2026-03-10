import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useAutomationPermissions } from '../../hooks/automations/useAutomationPermissions'
import PageLoader from '../../components/PageLoader'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ApprovalPanel from '../../components/automations/detail/ApprovalPanel'
import ExecutionPanel from '../../components/automations/detail/ExecutionPanel'
import AutomationProgressBar from '../../components/automations/shared/AutomationProgressBar'
import OperationalTimeline from '../../components/automations/shared/OperationalTimeline'
import { getAutomationProposalDetail } from '../../lib/automations/queries/getAutomationProposalDetail'
import { mapRiskBadgeVariant } from '../../lib/automations/mappers/mapRiskBadgeVariant'

function KeyValueTable({ rows }) {
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) return <div style={{ color: 'var(--text-2, #6b7280)', fontSize: 13 }}>—</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((r) => (
        <div key={r.key ?? r.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 140, fontSize: 12, fontWeight: 700, color: 'var(--text-2, #6b7280)' }}>{r.key}</div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-1, #111827)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AutomationProposalDetailPage() {
  const navigate = useNavigate()
  const { proposalId } = useParams()
  const { activeOrgId, memberships, isWorkspaceReady } = useWorkspace()

  const userRole = useMemo(() => {
    const m = (memberships || []).find((x) => x.org_id === activeOrgId)
    return m?.role ?? 'member'
  }, [memberships, activeOrgId])
  const permissions = useAutomationPermissions(userRole)

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  const load = async () => {
    if (!activeOrgId || !proposalId) return
    setLoading(true)
    try {
      const res = await getAutomationProposalDetail({ orgId: activeOrgId, proposalId })
      setDetail(res)
    } catch (err) {
      console.warn('AutomationProposalDetailPage: load failed', err)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isWorkspaceReady) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkspaceReady, activeOrgId, proposalId])

  if (!isWorkspaceReady || loading) return <PageLoader />

  const proposal = detail?.proposal ?? null
  const decision = detail?.decision ?? null
  const approvals = detail?.approvals ?? []
  const executions = detail?.executions ?? []
  const events = detail?.events ?? []

  if (!proposal) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 800 }}>Proposal not found</div>
        <Button variant="secondary" onClick={() => navigate('/app/automations')}>Back to Inbox</Button>
      </div>
    )
  }

  const riskVariant = mapRiskBadgeVariant(proposal.riskBand)

  const contextRows = (detail?.decisionContext || []).map((c) => ({ id: c.id, key: c.key, value: c.value }))

  const ruleRows = [
    { key: 'action_type', value: proposal.actionType },
    { key: 'automation_level', value: proposal.automationLevel },
    { key: 'approval_mode', value: proposal.approvalMode },
  ]

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1, #111827)' }}>
            {proposal.productIdentity}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge variant="neutral">{proposal.actionType}</Badge>
            <Badge variant="neutral">{proposal.proposalStatus}</Badge>
            <Badge variant={riskVariant}>{proposal.riskBand ?? 'risk: —'}</Badge>
          </div>
          <div style={{ marginTop: 10 }}>
            <AutomationProgressBar currentStage={proposal.progressStage} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => navigate('/app/automations')}>Back</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card className="ui-card--elevated" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1, #111827)' }}>Proposal Context</div>
            <div style={{ fontSize: 13, color: 'var(--text-2, #6b7280)', marginBottom: 10 }}>
              Decision: {decision?.title ?? decision?.decision_type ?? '—'} · status {decision?.status ?? '—'}
            </div>
            <KeyValueTable rows={contextRows} />
          </Card>

          <Card className="ui-card--elevated" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1, #111827)' }}>Proposal Payload</div>
            <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {proposal.payload ? JSON.stringify(proposal.payload, null, 2) : '—'}
            </div>
          </Card>

          <Card className="ui-card--elevated" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1, #111827)' }}>Rule Source</div>
            <KeyValueTable rows={ruleRows} />
          </Card>

          <Card className="ui-card--elevated" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1, #111827)' }}>Operational Timeline</div>
            <OperationalTimeline currentStage={proposal?.contextSnapshot?.operational_stage ?? null} />
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-2, #6b7280)' }}>
              This shows product operational status (not automation status).
            </div>
          </Card>

          <Card className="ui-card--elevated" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1, #111827)' }}>Event History</div>
            {events.length === 0 ? (
              <div style={{ color: 'var(--text-2, #6b7280)', fontSize: 13 }}>No events.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0, alignItems: 'center' }}>
                      <Badge variant="neutral">{e.event_type}</Badge>
                      <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.execution_id ? `execution ${e.execution_id}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ApprovalPanel orgId={activeOrgId} proposal={proposal} approvals={approvals} permissions={permissions} onChanged={load} />
          <ExecutionPanel orgId={activeOrgId} proposal={proposal} executions={executions} permissions={permissions} onChanged={load} />
        </div>
      </div>
    </div>
  )
}

