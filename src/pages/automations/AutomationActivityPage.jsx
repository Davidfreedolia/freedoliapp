import React, { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import PageLoader from '../../components/PageLoader'
import AutomationActivityFilters from '../../components/automations/activity/AutomationActivityFilters'
import AutomationActivityFeed from '../../components/automations/activity/AutomationActivityFeed'
import { getAutomationActivity } from '../../lib/automations/queries/getAutomationActivity'

export default function AutomationActivityPage() {
  const { activeOrgId, memberships, isWorkspaceReady } = useWorkspace()

  const userRole = useMemo(() => {
    const m = (memberships || []).find((x) => x.org_id === activeOrgId)
    return m?.role ?? 'member'
  }, [memberships, activeOrgId])

  const [filters, setFilters] = useState({ eventType: '' })
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])

  const load = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const res = await getAutomationActivity({ orgId: activeOrgId, page: 1, pageSize: 50, filters })
      setItems(res.items || [])
    } catch (err) {
      console.warn('AutomationActivityPage: load failed', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isWorkspaceReady) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkspaceReady, activeOrgId, filters.eventType])

  if (!isWorkspaceReady || loading) return <PageLoader />

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1, #111827)' }}>Automation Activity</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
            Global timeline of automation events for org {activeOrgId || '—'}.
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>role: {userRole}</div>
      </div>

      <AutomationActivityFilters filters={filters} onChange={setFilters} />
      <AutomationActivityFeed events={items} />
    </div>
  )
}

