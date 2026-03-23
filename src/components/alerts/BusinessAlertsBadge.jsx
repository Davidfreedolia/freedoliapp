/**
 * FASE 3.4 — Bell de negoci: comptador + drawer d’alertes persistents (biz:).
 * Consumeix useBusinessAlerts; accions Acknowledge / Resolve; sense barreja amb OPS/SHIPMENT.
 */
import React, { useState, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useBusinessAlerts } from '../../hooks/useBusinessAlerts'
import { createOrGetTaskFromOrigin } from '../../lib/supabase'

const SEVERITY_COLOR = {
  critical: 'var(--danger-1, #dc2626)',
  high: 'var(--danger-1, #dc2626)',
  medium: 'var(--warning-1, #d97706)',
  low: 'var(--muted-2, #6b7280)',
}

function AlertRow({ alert, activeOrgId, onAcknowledge, onResolve, onCreateTaskResult }) {
  const [acking, setAcking] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const color = SEVERITY_COLOR[alert.severity] || SEVERITY_COLOR.low
  const message = (alert.message || '').slice(0, 80) + ((alert.message || '').length > 80 ? '…' : '')

  const handleAck = async (e) => {
    e.stopPropagation()
    setAcking(true)
    await onAcknowledge(alert.id)
    setAcking(false)
  }
  const handleResolve = async (e) => {
    e.stopPropagation()
    setResolving(true)
    await onResolve(alert.id)
    setResolving(false)
  }
  const handleCreateTask = async (e) => {
    e.stopPropagation()
    if (!activeOrgId || creatingTask) return
    setCreatingTask(true)
    try {
      const title = (alert.title || 'Follow up: alert').slice(0, 255)
      const entityType = alert.entity_type && ['project', 'purchase_order', 'supplier', 'shipment', 'org'].includes(alert.entity_type) ? alert.entity_type : 'org'
      const entityId = alert.entity_id || activeOrgId
      const { task, created } = await createOrGetTaskFromOrigin(
        activeOrgId,
        { source: 'alert', source_ref_type: 'alert', source_ref_id: alert.id },
        { title, entity_type: entityType, entity_id: entityId }
      )
      onCreateTaskResult?.({ task, created })
    } catch (err) {
      onCreateTaskResult?.({ error: err?.message })
    } finally {
      setCreatingTask(false)
    }
  }

  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid var(--border-1, #1f2937)',
        marginBottom: 6,
        background: 'var(--surface-bg-1, #0f172a)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '999px',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={alert.title}
        >
          {alert.title}
        </span>
      </div>
      {message && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted-1, #9ca3af)',
            marginBottom: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleCreateTask}
          disabled={creatingTask}
          style={{
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            borderRadius: 6,
            background: 'var(--surface-bg-2)',
            color: 'var(--text-1)',
            cursor: creatingTask ? 'wait' : 'pointer',
          }}
        >
          {creatingTask ? '…' : 'Create task'}
        </button>
        <button
          type="button"
          onClick={handleAck}
          disabled={acking || alert.status === 'acknowledged'}
          style={{
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            borderRadius: 6,
            background: 'var(--surface-bg-2)',
            color: 'var(--text-1)',
            cursor: acking ? 'wait' : 'pointer',
          }}
        >
          {acking ? '…' : 'Acknowledge'}
        </button>
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          style={{
            fontSize: 11,
            padding: '4px 8px',
            border: '1px solid var(--border-1)',
            borderRadius: 6,
            background: 'var(--surface-bg-2)',
            color: 'var(--text-1)',
            cursor: resolving ? 'wait' : 'pointer',
          }}
        >
          {resolving ? '…' : 'Resolve'}
        </button>
      </div>
    </div>
  )
}

export default function BusinessAlertsBadge() {
  const { activeOrgId } = useWorkspace()
  const { alerts, count, loading, error, refetch, acknowledge, resolve } = useBusinessAlerts(activeOrgId, {
    listLimit: 25,
  })
  const [open, setOpen] = useState(false)
  const [taskMessage, setTaskMessage] = useState(null)
  const rootRef = useRef(null)

  const handleCreateTaskResult = (result) => {
    if (result?.error) {
      setTaskMessage({ type: 'error', text: result.error })
    } else if (result?.created) {
      setTaskMessage({ type: 'success', text: 'Task created.' })
    } else {
      setTaskMessage({ type: 'success', text: 'Task already exists.' })
    }
  }
  useEffect(() => {
    if (!taskMessage) return
    const t = setTimeout(() => setTaskMessage(null), 3000)
    return () => clearTimeout(t)
  }, [taskMessage])

  useEffect(() => {
    if (open && activeOrgId) refetch()
  }, [open, activeOrgId, refetch])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
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

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="topbar-button topbar-business-alerts"
        title="Business alerts"
        aria-label={`Business alerts${count > 0 ? `, ${count} open` : ''}`}
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
        <AlertTriangle size={18} />
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
              backgroundColor: 'var(--warning-1, #d97706)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            width: 340,
            maxHeight: 400,
            backgroundColor: 'var(--surface-bg-2, #020617)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-soft, 0 10px 40px rgba(15,23,42,0.6))',
            border: '1px solid var(--border-1, #1f2933)',
            overflow: 'hidden',
            zIndex: 1600,
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--border-1, #1f2933)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                color: 'var(--text-secondary, #9ca3af)',
              }}
            >
              Business alerts
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-secondary, #9ca3af)',
              }}
            >
              Close
            </button>
          </div>
          <div
            style={{
              maxHeight: 340,
              overflowY: 'auto',
              padding: '8px',
              backgroundColor: 'var(--surface-bg, #020617)',
            }}
          >
            {loading && (
              <div style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary, #9ca3af)' }}>
                Loading…
              </div>
            )}
            {error && !loading && (
              <div style={{ padding: 10, fontSize: 12, color: 'var(--danger-1, #b91c1c)' }}>
                {error}
              </div>
            )}
            {!loading && !error && (!alerts || alerts.length === 0) && (
              <div style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary, #9ca3af)' }}>
                No business alerts.
              </div>
            )}
            {taskMessage && (
              <div
                style={{
                  padding: '6px 8px',
                  marginBottom: 6,
                  fontSize: 11,
                  borderRadius: 6,
                  background: taskMessage.type === 'error' ? 'var(--danger-1, #dc2626)' : 'var(--success-1, #16a34a)',
                  color: '#fff',
                }}
              >
                {taskMessage.text}
              </div>
            )}
            {!loading && !error && alerts?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {alerts.map((a) => (
                  <AlertRow
                    key={a.id}
                    alert={a}
                    activeOrgId={activeOrgId}
                    onAcknowledge={acknowledge}
                    onResolve={resolve}
                    onCreateTaskResult={handleCreateTaskResult}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
