import React, { useMemo, useState } from 'react'
import Card from '../../ui/Card'
import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import { showToast } from '../../Toast'
import { approveAutomationProposal } from '../../../lib/automations/mutations/approveAutomationProposal'
import { rejectAutomationProposal } from '../../../lib/automations/mutations/rejectAutomationProposal'

function statusVariant(status) {
  const s = (status || '').toString()
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'pending') return 'info'
  return 'neutral'
}

export default function ApprovalPanel({ orgId, proposal, approvals, permissions, onChanged }) {
  const canApprove = Boolean(permissions?.canApprove)
  const canReject = Boolean(permissions?.canReject)

  const [busy, setBusy] = useState(false)

  const isActionable = useMemo(() => {
    const ps = proposal?.proposalStatus ?? proposal?.proposal_status
    return ps === 'pending_approval'
  }, [proposal])

  const handleApprove = async () => {
    if (!orgId || !proposal?.id) return
    setBusy(true)
    try {
      const res = await approveAutomationProposal({ orgId, proposalId: proposal.id })
      if (res?.ok) {
        showToast('Approved', 'success')
        onChanged?.()
      } else {
        showToast(`Approve blocked: ${res?.reason ?? 'unknown'}`, 'warning', 4500)
      }
    } catch (err) {
      showToast('Approve failed', 'error', 4500)
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!orgId || !proposal?.id) return
    setBusy(true)
    try {
      const res = await rejectAutomationProposal({ orgId, proposalId: proposal.id })
      if (res?.ok) {
        showToast('Rejected', 'success')
        onChanged?.()
      } else {
        showToast(`Reject blocked: ${res?.reason ?? 'unknown'}`, 'warning', 4500)
      }
    } catch (err) {
      showToast('Reject failed', 'error', 4500)
    } finally {
      setBusy(false)
    }
  }

  const list = Array.isArray(approvals) ? approvals : []

  return (
    <Card className="ui-card--elevated" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1, #111827)' }}>Approval</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="primary" disabled={!canApprove || !isActionable || busy} loading={busy} onClick={handleApprove}>
            Approve
          </Button>
          <Button size="sm" variant="danger" disabled={!canReject || !isActionable || busy} loading={busy} onClick={handleReject}>
            Reject
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <div style={{ color: 'var(--text-2, #6b7280)', fontSize: 13 }}>No approval steps.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1, #111827)' }}>
                  Step {a.approval_step}
                  {a.required_role ? ` · role ${a.required_role}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  approver {a.acted_by ?? '—'} · {a.acted_at ? new Date(a.acted_at).toLocaleString() : '—'}
                </div>
              </div>
              <Badge variant={statusVariant(a.approval_status)}>{a.approval_status}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

