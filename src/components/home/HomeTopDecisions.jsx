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
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Top Decisions</div>
        <Link to="/app/decisions" style={styles.cta}>
          View all decisions
        </Link>
      </div>
      {loading ? (
        <div style={styles.placeholder}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={styles.placeholder}>No high-priority decisions right now.</div>
      ) : (
        <ul style={styles.list}>
          {items.map((item) => (
            <li key={item.id} style={styles.row}>
              <div style={styles.rowTitle}>{item.title}</div>
              <div style={styles.rowMeta}>
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

const styles = {
  wrap: {
    width: '100%',
    padding: '1rem 1.25rem',
    borderRadius: 8,
    background: 'var(--card-bg, #f9fafb)',
    border: '1px solid var(--border-color, #e5e7eb)',
    marginBottom: 16,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
  },
  cta: {
    fontSize: 12,
    color: 'var(--primary-1, #2563eb)',
    textDecoration: 'none',
  },
  list: { margin: 0, padding: 0, listStyle: 'none' },
  row: {
    padding: '6px 0',
    borderBottom: '1px solid var(--border-color, #e5e7eb)',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-1, #111827)',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
    color: 'var(--text-2, #6b7280)',
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  placeholder: {
    fontSize: 13,
    color: 'var(--text-2, #6b7280)',
  },
}

