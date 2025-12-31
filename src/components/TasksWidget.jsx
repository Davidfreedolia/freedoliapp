import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, MoreVertical, Calendar, ArrowRight, AlertCircle } from 'lucide-react'
import { getOpenTasks, markTaskDone, snoozeTask, bulkMarkTasksDone, bulkSnoozeTasks } from '../lib/supabase'
import { showToast } from './Toast'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function TasksWidget({ darkMode, limit = 10 }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const data = await getOpenTasks(limit)
      setTasks(data || [])
    } catch (err) {
      console.error('Error loading tasks:', err)
    }
    setLoading(false)
  }

  const handleMarkDone = async (taskId) => {
    setActionLoading(taskId)
    try {
      await markTaskDone(taskId)
      showToast('Task marked as done', 'success')
      await loadTasks()
    } catch (err) {
      console.error('Error marking task done:', err)
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    }
    setActionLoading(null)
  }

  const handleSnooze = async (taskId, days = 3) => {
    setActionLoading(taskId)
    try {
      await snoozeTask(taskId, days)
      showToast(`Task snoozed +${days} day${days > 1 ? 's' : ''}`, 'success')
      await loadTasks()
    } catch (err) {
      console.error('Error snoozing task:', err)
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    }
    setActionLoading(null)
  }

  const handleOpenEntity = (task) => {
    switch (task.entity_type) {
      case 'project':
        navigate(`/projects/${task.entity_id}`)
        break
      case 'purchase_order':
        navigate(`/orders?po=${task.entity_id}`)
        break
      case 'supplier':
        navigate(`/suppliers`)
        break
      case 'shipment':
        navigate(`/orders`)
        break
      default:
        break
    }
  }

  const handleToggleSelect = (taskId) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)))
    }
  }

  const handleBulkMarkDone = async () => {
    if (selectedTasks.size === 0) return
    
    setBulkActionLoading(true)
    try {
      await bulkMarkTasksDone(Array.from(selectedTasks))
      showToast(`${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} marked as done`, 'success')
      setSelectedTasks(new Set())
      await loadTasks()
    } catch (err) {
      console.error('Error bulk marking tasks done:', err)
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    }
    setBulkActionLoading(false)
  }

  const handleBulkSnooze = async (days) => {
    if (selectedTasks.size === 0) return
    
    setBulkActionLoading(true)
    try {
      await bulkSnoozeTasks(Array.from(selectedTasks), days)
      showToast(`${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} snoozed +${days} day${days > 1 ? 's' : ''}`, 'success')
      setSelectedTasks(new Set())
      await loadTasks()
    } catch (err) {
      console.error('Error bulk snoozing tasks:', err)
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    }
    setBulkActionLoading(false)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#ef4444'
      case 'normal':
        return '#f59e0b'
      case 'low':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getDueDateInfo = (dueDate) => {
    if (!dueDate) return { text: 'No due date', color: '#6b7280' }
    
    const due = parseISO(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `Overdue ${Math.abs(diffDays)} days`, color: '#ef4444' }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: '#f59e0b' }
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: '#f59e0b' }
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: '#f59e0b' }
    } else {
      return { text: format(due, 'MMM d', { locale: es }) || format(due, 'MMM d'), color: '#6b7280' }
    }
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <CheckCircle2 size={20} color="#22c55e" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Tasks
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.tasks.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <CheckCircle2 size={20} color="#22c55e" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Tasks ({tasks.length})
        </h3>
        {tasks.length > 0 && (
          <button
            onClick={handleSelectAll}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
              borderRadius: '6px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              cursor: 'pointer'
            }}
          >
            {selectedTasks.size === tasks.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>
      
      {/* Bulk Actions Bar */}
      {selectedTasks.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
          borderRadius: '8px',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '500',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {selectedTasks.size} selected
          </span>
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            <button
              onClick={handleBulkMarkDone}
              disabled={bulkActionLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#22c55e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                opacity: bulkActionLoading ? 0.6 : 1
              }}
            >
              Mark Done
            </button>
            <button
              onClick={() => handleBulkSnooze(1)}
              disabled={bulkActionLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                opacity: bulkActionLoading ? 0.6 : 1
              }}
            >
              Snooze +1d
            </button>
            <button
              onClick={() => handleBulkSnooze(3)}
              disabled={bulkActionLoading}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                opacity: bulkActionLoading ? 0.6 : 1
              }}
            >
              Snooze +3d
            </button>
            <button
              onClick={() => setSelectedTasks(new Set())}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: darkMode ? '#9ca3af' : '#6b7280',
                border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div style={widgetStyles.content}>
        {tasks.map(task => {
          const dueInfo = getDueDateInfo(task.due_date)
          const priorityColor = getPriorityColor(task.priority)
          
          return (
            <div key={task.id} style={widgetStyles.taskItem}>
              <input
                type="checkbox"
                checked={selectedTasks.has(task.id)}
                onChange={() => handleToggleSelect(task.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  marginRight: '12px',
                  cursor: 'pointer',
                  width: '18px',
                  height: '18px'
                }}
              />
              <div style={widgetStyles.taskContent}>
                <div style={widgetStyles.taskHeader}>
                  <span style={{
                    ...widgetStyles.taskTitle,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {task.title}
                  </span>
                  <div style={widgetStyles.taskBadges}>
                    {task.priority !== 'normal' && (
                      <span style={{
                        ...widgetStyles.badge,
                        backgroundColor: priorityColor + '20',
                        color: priorityColor,
                        borderColor: priorityColor
                      }}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
                {task.notes && (
                  <p style={{
                    ...widgetStyles.taskNotes,
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    {task.notes}
                  </p>
                )}
                <div style={widgetStyles.taskMeta}>
                  <span style={{
                    ...widgetStyles.metaItem,
                    color: dueInfo.color
                  }}>
                    <Calendar size={12} />
                    {dueInfo.text}
                  </span>
                  <span style={{
                    ...widgetStyles.metaItem,
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    {task.entity_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div style={widgetStyles.taskActions}>
                <button
                  onClick={() => handleMarkDone(task.id)}
                  disabled={actionLoading === task.id}
                  style={{
                    ...widgetStyles.actionButton,
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    opacity: actionLoading === task.id ? 0.6 : 1
                  }}
                  title="Mark done"
                >
                  <CheckCircle2 size={14} />
                </button>
                <button
                  onClick={() => handleSnooze(task.id, 1)}
                  disabled={actionLoading === task.id}
                  style={{
                    ...widgetStyles.actionButton,
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    opacity: actionLoading === task.id ? 0.6 : 1,
                    fontSize: '11px'
                  }}
                  title="Snooze +1d"
                >
                  +1d
                </button>
                <button
                  onClick={() => handleSnooze(task.id, 3)}
                  disabled={actionLoading === task.id}
                  style={{
                    ...widgetStyles.actionButton,
                    backgroundColor: '#f59e0b',
                    color: '#ffffff',
                    opacity: actionLoading === task.id ? 0.6 : 1,
                    fontSize: '11px'
                  }}
                  title="Snooze +3d"
                >
                  +3d
                </button>
                <button
                  onClick={() => handleOpenEntity(task)}
                  style={{
                    ...widgetStyles.actionButton,
                    backgroundColor: 'transparent',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`
                  }}
                  title="Open entity"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const widgetStyles = {
  container: {
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '40px',
    textAlign: 'center'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  taskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)'
  },
  taskContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px'
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
  },
  taskBadges: {
    display: 'flex',
    gap: '4px'
  },
  badge: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
    textTransform: 'uppercase'
  },
  taskNotes: {
    fontSize: '12px',
    margin: 0
  },
  taskMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '11px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  taskActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
}

