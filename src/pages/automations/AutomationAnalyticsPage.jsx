import React, { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import PageLoader from '../../components/PageLoader'
import AutomationMetricsGrid from '../../components/automations/analytics/AutomationMetricsGrid'
import AutomationFunnel from '../../components/automations/analytics/AutomationFunnel'
import AutomationRiskDistribution from '../../components/automations/analytics/AutomationRiskDistribution'
import AutomationExecutionReliability from '../../components/automations/analytics/AutomationExecutionReliability'
import AutomationVelocityChart from '../../components/automations/analytics/AutomationVelocityChart'
import {
  getAutomationMetricsSummary,
  getAutomationFunnelStats,
  getAutomationRiskStats,
  getAutomationExecutionStats,
  getAutomationVelocityStats,
} from '../../lib/automations/queries/automationAnalyticsBundle'

export default function AutomationAnalyticsPage() {
  const { activeOrgId, memberships, isWorkspaceReady } = useWorkspace()

  const userRole = useMemo(() => {
    const m = (memberships || []).find((x) => x.org_id === activeOrgId)
    return m?.role ?? 'member'
  }, [memberships, activeOrgId])

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [risk, setRisk] = useState([])
  const [execStats, setExecStats] = useState(null)
  const [velocity, setVelocity] = useState([])

  useEffect(() => {
    if (!isWorkspaceReady) return
    if (!activeOrgId) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [s, f, r, e, v] = await Promise.all([
          getAutomationMetricsSummary({ orgId: activeOrgId }),
          getAutomationFunnelStats({ orgId: activeOrgId }),
          getAutomationRiskStats({ orgId: activeOrgId }),
          getAutomationExecutionStats({ orgId: activeOrgId }),
          getAutomationVelocityStats({ orgId: activeOrgId }),
        ])
        if (!cancelled) {
          setSummary(s)
          setFunnel(f)
          setRisk(r)
          setExecStats(e)
          setVelocity(v)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('AutomationAnalyticsPage: load failed', err)
          setSummary(null)
          setFunnel(null)
          setRisk([])
          setExecStats(null)
          setVelocity([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isWorkspaceReady, activeOrgId])

  if (!isWorkspaceReady) {
    return <PageLoader />
  }

  const allZero =
    summary &&
    summary.proposalsTotal === 0 &&
    summary.proposalsPendingApproval === 0 &&
    summary.proposalsApproved === 0 &&
    summary.proposalsQueued === 0 &&
    summary.proposalsExecuted === 0 &&
    summary.proposalsExecutionFailed === 0

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1, #111827)' }}>Automation analytics</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-2, #6b7280)' }}>
            Read-only automation metrics for org {activeOrgId || '—'}.
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2, #6b7280)' }}>role: {userRole}</div>
      </div>

      <AutomationMetricsGrid summary={summary} loading={loading} empty={allZero} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, alignItems: 'stretch' }}>
        <AutomationFunnel funnel={funnel} />
        <AutomationExecutionReliability stats={execStats} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AutomationRiskDistribution risk={risk} />
        <AutomationVelocityChart velocity={velocity} />
      </div>
    </div>
  )
}

