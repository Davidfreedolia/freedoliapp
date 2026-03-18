import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Inbox,
  Filter
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  getTasks,
  markTaskDone,
  snoozeTask,
  bulkMarkTasksDone,
  bulkSnoozeTasks
} from '../lib/supabase'
import { showToast } from '../components/Toast'
import AppToolbar from '../components/ui/AppToolbar'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'tasks.inbox.filterStatusAll' },
  { value: 'open', labelKey: 'tasks.inbox.filterStatusOpen' },
  { value: 'done', labelKey: 'tasks.inbox.filterStatusDone' }
]

const SOURCE_OPTIONS = [
  { value: 'all', labelKey: 'tasks.inbox.filterSourceAll' },
  { value: 'manual', labelKey: 'tasks.inbox.sourceManual' },
  { value: 'sticky_note', labelKey: 'tasks.inbox.sourceStickyNote' },
  { value: 'alert', labelKey: 'tasks.inbox.sourceAlert' },
  { value: 'decision', labelKey: 'tasks.inbox.sourceDecision' },
  { value: 'gate', labelKey: 'tasks.inbox.sourceGate' }
]

function getSourceLabelKey(source) {
  if (!source) return 'tasks.inbox.sourceManual'
  const keyMap = {
    manual: 'tasks.inbox.sourceManual',
    sticky_note: 'tasks.inbox.sourceStickyNote',
    alert: 'tasks.inbox.sourceAlert',
    decision: 'tasks.inbox.sourceDecision',
    gate: 'tasks.inbox.sourceGate'
  }
  return keyMap[source] || 'tasks.inbox.sourceManual'
}

function getDueDateInfo(dueDate, t) {
  if (!dueDate) return { text: t('tasks.noDueDate'), color: '#6b7280' }
  const due = parseISO(dueDate)
  const now = new Date()
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) {
    const days = Math.abs(diffDays)
    return { text: t('tasks.overdue', { days, count: days }), color: '#ef4444' }
  }
  if (diffDays === 0) return { text: t('tasks.dueToday'), color: '#f59e0b' }
  if (diffDays === 1) return { text: t('tasks.dueTomorrow'), color: '#f59e0b' }
  if (diffDays <= 7) return { text: t('tasks.dueInDays', { days: diffDays }), color: '#f59e0b' }
  return { text: format(due, 'MMM d', { locale: es }) || format(due, 'MMM d'), color: '#6b7280' }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'high': return '#ef4444'
    case 'normal': return '#f59e0b'
    case 'low': return '#6b7280'
    default: return '#6b7280'
  }
}

export default function TaskInbox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { darkMode, activeOrgId } = useApp()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('open')
  const [sourceFilter, setSourceFilter] = useState('all')

  const loadTasks = useCallback(async () => {
    if (!activeOrgId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const filters = { org_id: activeOrgId }
      if (statusFilter !== 'all') filters.status = statusFilter
      if (sourceFilter !== 'all') filters.source = sourceFilter
      const data = await getTasks(filters)
      setTasks(data || [])
    } catch (err) {
      console.error('TaskInbox: load tasks error', err)
      showToast(err?.message || 'Error loading tasks', 'error')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, statusFilter, sourceFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleMarkDone = async (taskId) => {
    setActionLoading(taskId)
    try {
      await markTaskDone(taskId)
      showToast(t('tasks.markedDone'), 'success')
      await loadTasks()
    } catch (err) {
      showToast(err?.message || 'Error', 'error')
    }
    setActionLoading(null)
  }

  const handleSnooze = async (taskId, days = 3) => {
    setActionLoading(taskId)
    try {
      await snoozeTask(taskId, days)
      showToast(t('tasks.snoozed', { days }), 'success')
      await loadTasks()
    } catch (err) {
      showToast(err?.message || 'Error', 'error')
    }
    setActionLoading(null)
  }

  const handleOpenEntity = (task) => {
    switch (task.entity_type) {
      case 'project':
        navigate(`/app/projects/${task.entity_id}`)
        break
      case 'purchase_order':
        navigate(`/app/orders?po=${task.entity_id}`)
        break
      case 'supplier':
        navigate('/app/suppliers')
        break
      case 'shipment':
        navigate('/app/orders')
        break
      default:
        break
    }
  }

  const handleOpenDecisionOrigin = (task) => {
    if (!task?.source_ref_type || !task?.source_ref_id) return
    if (task.source === 'decision' && task.source_ref_type === 'decision') {
      navigate(`/app/decisions?id=${encodeURIComponent(task.source_ref_id)}`)
    }
  }

  const handleToggleSelect = (taskId) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) setSelectedTasks(new Set())
    else setSelectedTasks(new Set(tasks.map((t) => t.id)))
  }

  const handleBulkMarkDone = async () => {
    if (selectedTasks.size === 0) return
    setBulkActionLoading(true)
    try {
      await bulkMarkTasksDone(Array.from(selectedTasks))
      showToast(t('tasks.bulkMarkedDone', { count: selectedTasks.size }), 'success')
      setSelectedTasks(new Set())
      await loadTasks()
    } catch (err) {
      showToast(err?.message || 'Error', 'error')
    }
    setBulkActionLoading(false)
  }

  const handleBulkSnooze = async (days) => {
    if (selectedTasks.size === 0) return
    setBulkActionLoading(true)
    try {
      await bulkSnoozeTasks(Array.from(selectedTasks), days)
      showToast(t('tasks.bulkSnoozed', { count: selectedTasks.size, days }), 'success')
      setSelectedTasks(new Set())
      await loadTasks()
    } catch (err) {
      showToast(err?.message || 'Error', 'error')
    }
    setBulkActionLoading(false)
  }

  const borderColor = darkMode ? '#374151' : '#e5e7eb'
  const bgColor = darkMode ? '#111827' : '#ffffff'
  const textPrimary = darkMode ? '#f9fafb' : '#111827'
  const textSecondary = darkMode ? '#9ca3af' : '#6b7280'

  if (!activeOrgId) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: textPrimary, marginBottom: '0.5rem' }}>
          {t('tasks.inbox.title')}
        </h1>
        <p style={{ color: textSecondary }}>
          {t('tasks.inbox.noWorkspace')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', backgroundColor: darkMode ? '#0f0f14' : '#f9fafb', minHeight: '100%' }}>
      <AppToolbar>
        <AppToolbar.Left>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Inbox size={22} color="#6366f1" />
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: textPrimary }}>
              {t('tasks.inbox.title')}
            </h1>
          </div>
        </AppToolbar.Left>
      </AppToolbar>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: textSecondary, fontSize: '0.875rem' }}>
          <Filter size={14} />
          {t('tasks.inbox.filters')}
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
            backgroundColor: darkMode ? '#1f2937' : '#fff',
            color: textPrimary,
            fontSize: '0.875rem'
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
            backgroundColor: darkMode ? '#1f2937' : '#fff',
            color: textPrimary,
            fontSize: '0.875rem'
          }}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </select>
      </div>

      {selectedTasks.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
          border: `1px solid ${borderColor}`,
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '0.875rem', color: textPrimary }}>{selectedTasks.size} {t('tasks.selected')}</span>
          <button
            type="button"
            onClick={handleBulkMarkDone}
            disabled={bulkActionLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
              opacity: bulkActionLoading ? 0.6 : 1
            }}
          >
            {t('tasks.markDone')}
          </button>
          <button
            type="button"
            onClick={() => handleBulkSnooze(1)}
            disabled={bulkActionLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
              opacity: bulkActionLoading ? 0.6 : 1
            }}
          >
            +1d
          </button>
          <button
            type="button"
            onClick={() => handleBulkSnooze(3)}
            disabled={bulkActionLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
              opacity: bulkActionLoading ? 0.6 : 1
            }}
          >
            +3d
          </button>
          <button
            type="button"
            onClick={() => setSelectedTasks(new Set())}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: textSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      <div style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: textSecondary }}>{t('common.loading')}</div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: textSecondary }}>
            {t('tasks.inbox.empty')}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {tasks.map((task) => {
              const dueInfo = getDueDateInfo(task.due_date, t)
              const priorityColor = getPriorityColor(task.priority)
              const sourceLabel = t(getSourceLabelKey(task.source))
              const entityLabel = task.entity_type && task.entity_id
                ? `${(task.entity_type || '').replace('_', ' ')}`
                : '—'
              return (
                <li
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: `1px solid ${borderColor}`
                  }}
                >
                  {task.status === 'open' && (
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => handleToggleSelect(task.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  )}
                  {task.status === 'done' && <span style={{ width: '18px' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500, color: textPrimary }}>{task.title}</span>
                      {task.priority && task.priority !== 'normal' && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: `${priorityColor}20`,
                          color: priorityColor,
                          border: `1px solid ${priorityColor}`
                        }}>
                          {task.priority}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: darkMode ? '#374151' : '#e5e7eb',
                        color: textSecondary
                      }}>
                        {sourceLabel}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: task.status === 'done' ? '#22c55e20' : '#f59e0b20',
                        color: task.status === 'done' ? '#22c55e' : '#f59e0b'
                      }}>
                        {task.status}
                      </span>
                    </div>
                    {task.notes && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: textSecondary }}>{task.notes}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8125rem', color: textSecondary }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: dueInfo.color }}>
                        <Calendar size={12} />
                        {dueInfo.text}
                      </span>
                      <span>{entityLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {task.status === 'open' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMarkDone(task.id)}
                          disabled={actionLoading === task.id}
                          title={t('tasks.markDone')}
                          style={{
                            padding: '6px',
                            backgroundColor: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: actionLoading === task.id ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === task.id ? 0.6 : 1
                          }}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSnooze(task.id, 1)}
                          disabled={actionLoading === task.id}
                          title="+1d"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: actionLoading === task.id ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === task.id ? 0.6 : 1
                          }}
                        >
                          +1d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSnooze(task.id, 3)}
                          disabled={actionLoading === task.id}
                          title="+3d"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: actionLoading === task.id ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === task.id ? 0.6 : 1
                          }}
                        >
                          +3d
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEntity(task)}
                      title={t('tasks.inbox.openEntity')}
                      style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        color: textSecondary,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowRight size={14} />
                    </button>
                        {task.source === 'decision' && task.source_ref_type === 'decision' && task.source_ref_id && (
                          <button
                            type="button"
                            onClick={() => handleOpenDecisionOrigin(task)}
                            title={t('tasks.inbox.openDecision')}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              color: textSecondary,
                              border: `1px solid ${borderColor}`,
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            {t('tasks.inbox.openDecision')}
                          </button>
                        )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
