import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { getDecisionInboxPage } from '../lib/decisions/getDecisionInboxPage'
import { getDecisionById } from '../lib/decisions/getDecisionById'
import { updateDecisionStatus } from '../lib/decisions/updateDecisionStatus'
import { submitDecisionFeedback } from '../lib/decisions/submitDecisionFeedback'
import DecisionList from '../components/decisions/DecisionList'
import DecisionDetail from '../components/decisions/DecisionDetail'
import { useBreakpoint } from '../hooks/useBreakpoint'

export default function Decisions() {
  const { activeOrgId } = useWorkspace()
  const { isMobile } = useBreakpoint()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [filters, setFilters] = useState({
    status: 'open_ack',
    decisionType: 'all',
    severity: 'all',
    confidence: 'all',
  })

  const loadPage = async () => {
    if (!activeOrgId) return
    setLoading(true)
    setError(null)
    try {
      const { items: rawItems, total: t } = await getDecisionInboxPage({
        orgId: activeOrgId,
        page,
        pageSize,
        filters: {
          status: filters.status,
          decisionType: filters.decisionType,
        },
      })

      // Client-side filtering for severity / confidence
      let filtered = rawItems
      if (filters.severity && filters.severity !== 'all') {
        filtered = filtered.filter((i) => i.severity === filters.severity)
      }
      if (filters.confidence && filters.confidence !== 'all') {
        filtered = filtered.filter((i) => i.confidence === filters.confidence)
      }

      setItems(filtered)
      setTotal(t)
      const selectedIdFromUrl = searchParams.get('id')
      if (selectedIdFromUrl) {
        const fromUrl = filtered.find((i) => i.id === selectedIdFromUrl)
        if (fromUrl) {
          setSelected(fromUrl)
          setFeedbackGiven(false)
          return
        }
      }
      if (!selected && filtered.length > 0) {
        setSelected(filtered[0])
        setFeedbackGiven(false)
      }
    } catch (e) {
      console.error('Decisions: error loading inbox page', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, page, filters.status, filters.decisionType])

  const handleSelect = async (item) => {
    setSelected(item)
    setFeedbackGiven(false)
    if (!item || !activeOrgId) return
    setDetailLoading(true)
    try {
      const detail = await getDecisionById({ orgId: activeOrgId, decisionId: item.id })
      if (detail) {
        setSelected(detail)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('id', detail.id)
          return next
        })
      }
    } catch (e) {
      console.error('Decisions: error loading detail', e)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAction = async (nextStatus) => {
    if (!selected || !activeOrgId) return
    setActionLoading(true)
    try {
      const res = await updateDecisionStatus({
        orgId: activeOrgId,
        decisionId: selected.id,
        nextStatus,
      })
      if (!res.ok && res.code === 'invalid_transition') {
        await loadPage()
        return
      }
      await loadPage()
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (selected?.id) {
          next.set('id', selected.id)
        }
        return next
      })
    } catch (e) {
      console.error('Decisions: error updating status', e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFeedback = async (feedbackType) => {
    if (!selected || !activeOrgId) return
    if (feedbackSubmitting || feedbackGiven) return
    setFeedbackSubmitting(true)
    try {
      const res = await submitDecisionFeedback({
        orgId: activeOrgId,
        decisionId: selected.id,
        feedbackType,
      })
      if (res.ok || res.code === 'duplicate') {
        setFeedbackGiven(true)
      }
    } catch (e) {
      console.error('Decisions: error submitting feedback', e)
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const layoutStyle = isMobile
    ? { display: 'flex', flexDirection: 'column', height: '100%' }
    : { display: 'flex', height: '100%' }

  return (
    <div style={{ padding: 16, height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Decision Inbox</h1>
      <div style={layoutStyle}>
        <div style={{ flexBasis: isMobile ? 'auto' : '35%', maxWidth: isMobile ? '100%' : '360px' }}>
          <DecisionList
            items={items}
            selectedId={selected?.id || null}
            onSelect={handleSelect}
            loading={loading}
            error={error}
            onRetry={loadPage}
            filters={filters}
            onFiltersChange={(next) => {
              setFilters(next)
              setPage(1)
            }}
          />
        </div>
        <div style={{ flex: 1, minHeight: isMobile ? 240 : 'auto' }}>
          <DecisionDetail
            item={selected}
            onAction={handleAction}
            actionLoading={actionLoading || detailLoading}
            onFeedback={handleFeedback}
            feedbackSubmitting={feedbackSubmitting}
            feedbackGiven={feedbackGiven}
          />
        </div>
      </div>
    </div>
  )
}

