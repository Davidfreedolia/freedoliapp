import React, { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getDecisionInboxPage } from '../../lib/decisions/getDecisionInboxPage'
import { Link } from 'react-router-dom'

const MAX_ITEMS = 3

export default function HomeTopDecisions() {
  const { activeOrgId } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeOrgId) {
      setItems([])
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await getDecisionInboxPage({
          orgId: activeOrgId,
          page: 1,
          pageSize: MAX_ITEMS,
          filters: { status: 'open_ack' },
        })
        if (!cancelled) {
          setItems((res.items || []).slice(0, MAX_ITEMS))
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  return (
    <div className="dashboard-home-card dashboard-home-card--list">
      <div className="dashboard-home-card__header">
        <div className="dashboard-home-card__title">Top Decisions</div>
        <Link to="/app/decisions" className="dashboard-home-card__cta">
          View all decisions
        </Link>
      </div>
      {loading ? (
        <div className="dashboard-home-card__placeholder">Loading…</div>
      ) : items.length === 0 ? (
        <div className="dashboard-home-card__placeholder">No high-priority decisions right now.</div>
      ) : (
        <ul className="dashboard-home-card__list">
          {items.map((item) => (
            <li key={item.id} className="dashboard-home-card__listRow dashboard-home-card__listRow--stacked">
              <div className="dashboard-home-card__listPrimary">{item.title}</div>
              <div className="dashboard-home-card__metaWrap">
                <span>{item.severity ? `Severity: ${item.severity}` : null}</span>
                {item.explanation && (
                  <span className="truncate" title={item.explanation}>
                    {item.explanation}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

