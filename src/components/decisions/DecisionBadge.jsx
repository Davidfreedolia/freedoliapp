import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { getDecisionNotifications } from '../../lib/decisions/getDecisionNotifications'
import { trackDecisionViewed } from '../../lib/decisions/trackDecisionViewed'
import { createOrGetTaskFromOrigin } from '../../lib/supabase'
import DecisionDropdown from './DecisionDropdown'

export default function DecisionBadge() {
  const { activeOrgId } = useWorkspace()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const load = useCallback(async () => {
    if (!activeOrgId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { items: list } = await getDecisionNotifications({ orgId: activeOrgId, limit: 10 })
      setItems(list || [])
    } catch (e) {
      console.error('DecisionBadge: error loading notifications', e)
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target)) return
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleItemClick = async (item) => {
    if (!item) return
    // Track view for read/unread model
    trackDecisionViewed({ decisionId: item.id }).catch(() => {
      // soft-fail, no-op
    })
    // Optimistically remove from local list / badge
    setItems((prev) => prev.filter((x) => x.id !== item.id))
    setOpen(false)
    navigate(`/app/decisions?id=${encodeURIComponent(item.id)}`)
  }

  const handleCreateTask = useCallback(async (item) => {
    if (!activeOrgId || !item?.id) return
    const title = (item.title || 'Follow up: decision').slice(0, 255)
    await createOrGetTaskFromOrigin(
      activeOrgId,
      { source: 'decision', source_ref_type: 'decision', source_ref_id: item.id },
      { title, entity_type: 'org', entity_id: activeOrgId }
    )
  }, [activeOrgId])

  const count = items.length

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="topbar-button topbar-decisions"
        title="Decision notifications"
        aria-label="Decision notifications"
        style={{
          border: 'none',
          background: 'transparent',
          padding: 6,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              backgroundColor: 'var(--danger-1)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <DecisionDropdown
          items={items}
          loading={loading}
          error={error}
          onItemClick={handleItemClick}
          onClose={() => setOpen(false)}
          onCreateTask={handleCreateTask}
        />
      )}
    </div>
  )
}
