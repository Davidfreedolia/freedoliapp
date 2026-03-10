import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useAutomationPermissions } from '../../hooks/automations/useAutomationPermissions'
import PageLoader from '../../components/PageLoader'
import { showToast } from '../../components/Toast'
import AutomationInboxFilters from '../../components/automations/inbox/AutomationInboxFilters'
import AutomationProposalList from '../../components/automations/inbox/AutomationProposalList'
import { getAutomationInbox } from '../../lib/automations/queries/getAutomationInbox'
import { approveAutomationProposal } from '../../lib/automations/mutations/approveAutomationProposal'
import { rejectAutomationProposal } from '../../lib/automations/mutations/rejectAutomationProposal'

export default function AutomationInboxPage() {
  const navigate = useNavigate()
  const { activeOrgId, memberships, isWorkspaceReady } = useWorkspace()

  const userRole = useMemo(() => {
    const m = (memberships || []).find((x) => x.org_id === activeOrgId)
    return m?.role ?? 'member'
  }, [memberships, activeOrgId])

  const permissions = useAutomationPermissions(userRole)

  const [filters, setFilters] = useState({ status: '', actionType: '' })
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const load = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const res = await getAutomationInbox({ orgId: activeOrgId, page: 1, pageSize: 25, filters })
      setItems(res.items || [])
    } catch (err) {
      console.warn('AutomationInboxPage: load failed', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isWorkspaceReady) return
    if (!activeOrgId) {
      setLoading(false)
      setItems([])
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkspaceReady, activeOrgId, filters.status, filters.actionType])

  const handleOpen = (proposal) => {
    if (proposal?.id) navigate(`/app/automations/${proposal.id}`)
  }

  const handleApprove = async (proposal) => {
    if (!permissions.canApprove) return
    if (!activeOrgId || !proposal?.id) return
    const res = await approveAutomationProposal({ orgId: activeOrgId, proposalId: proposal.id })
    if (res?.ok) {
      showToast('Approved', 'success')
      load()
    } else {
      showToast(`Approve blocked: ${res?.reason ?? 'unknown'}`, 'warning', 4500)
    }
  }

  const handleReject = async (proposal) => {
    if (!permissions.canReject) return
    if (!activeOrgId || !proposal?.id) return
    const res = await rejectAutomationProposal({ orgId: activeOrgId, proposalId: proposal.id })
    if (res?.ok) {
      showToast('Rejected', 'success')
      load()
    } else {
      showToast(`Reject blocked: ${res?.reason ?? 'unknown'}`, 'warning', 4500)
    }
  }

  if (!isWorkspaceReady || loading) {
    return <PageLoader />
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1, #111827)' }}>Automation Inbox</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
            Review proposals, approvals, and execution intents for org {activeOrgId || '—'}.
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>role: {userRole}</div>
      </div>

      <AutomationInboxFilters filters={filters} onChange={setFilters} />

      <AutomationProposalList
        proposals={items}
        permissions={permissions}
        onOpen={handleOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}

