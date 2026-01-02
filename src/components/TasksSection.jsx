import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CheckCircle2, Clock, Calendar, X, Trash2 } from 'lucide-react'
import { getTasks, createTask, updateTask, deleteTask, markTaskDone, snoozeTask } from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function TasksSection({ entityType, entityId, darkMode }) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    notes: '',
    due_date: '',
    priority: 'normal'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [entityType, entityId])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const data = await getTasks({
        entityType,
        entityId,
        status: 'open'
      })
      setTasks(data || [])
    } catch (err) {
      console.error('Error loading tasks:', err)
    }
    setLoading(false)
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    
    setSaving(true)
    try {
      await createTask({
        entity_type: entityType,
        entity_id: entityId,
        title: newTask.title,
        notes: newTask.notes || null,
        due_date: newTask.due_date || null,
        priority: newTask.priority,
        status: 'open'
      })
      setNewTask({ title: '', notes: '', due_date: '', priority: 'normal' })
      setShowAddForm(false)
      await loadTasks()
    } catch (err) {
      console.error('Error creating task:', err)
    }
    setSaving(false)
  }

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId)
      await loadTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const handleMarkDone = async (taskId) => {
    try {
      await markTaskDone(taskId)
      await loadTasks()
    } catch (err) {
      console.error('Error marking task done:', err)
    }
  }

  const handleSnooze = async (taskId) => {
    try {
      await snoozeTask(taskId, 3)
      await loadTasks()
    } catch (err) {
      console.error('Error snoozing task:', err)
    }
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
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `Overdue ${Math.abs(diffDays)} days`, color: '#ef4444' }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: '#f59e0b' }
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', color: '#f59e0b' }
    } else {
      return { 
        text: format(due, 'MMM d, yyyy', { locale: es }) || format(due, 'MMM d, yyyy'), 
        color: '#6b7280' 
      }
    }
  }

  return (
    <div style={{
      ...sectionStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={sectionStyles.header}>
        <h3 style={{
          ...sectionStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          <CheckCircle2 size={18} />
          Tasks
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={sectionStyles.addButton}
          >
            <Plus size={16} />
            Add task
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{
          ...sectionStyles.form,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderColor: darkMode ? '#374151' : '#d1d5db'
        }}>
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            style={{
              ...sectionStyles.input,
              backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
          <textarea
            placeholder="Notes (optional)"
            value={newTask.notes}
            onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
            rows={2}
            style={{
              ...sectionStyles.textarea,
              backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
          <div style={sectionStyles.formRow}>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              style={{
                ...sectionStyles.input,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db',
                flex: 1
              }}
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              style={{
                ...sectionStyles.select,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div style={sectionStyles.formActions}>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewTask({ title: '', notes: '', due_date: '', priority: 'normal' })
              }}
              style={sectionStyles.cancelButton}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              disabled={saving || !newTask.title.trim()}
              style={{
                ...sectionStyles.saveButton,
                opacity: (saving || !newTask.title.trim()) ? 0.6 : 1
              }}
            >
              {saving ? 'Adding...' : 'Add task'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={sectionStyles.loading}>{t('common.loading')}</div>
      ) : tasks.length === 0 ? (
        <div style={sectionStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            No tasks yet
          </p>
        </div>
      ) : (
        <div style={sectionStyles.tasksList}>
          {tasks.map(task => {
            const dueInfo = getDueDateInfo(task.due_date)
            const priorityColor = getPriorityColor(task.priority)
            
            return (
              <div key={task.id} style={{
                ...sectionStyles.taskItem,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}>
                <div style={sectionStyles.taskContent}>
                  <div style={sectionStyles.taskHeader}>
                    <span style={{
                      ...sectionStyles.taskTitle,
                      color: darkMode ? '#ffffff' : '#111827'
                    }}>
                      {task.title}
                    </span>
                    {task.priority !== 'normal' && (
                      <span style={{
                        ...sectionStyles.badge,
                        backgroundColor: priorityColor + '20',
                        color: priorityColor,
                        borderColor: priorityColor
                      }}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  {task.notes && (
                    <p style={{
                      ...sectionStyles.taskNotes,
                      color: darkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      {task.notes}
                    </p>
                  )}
                  {dueInfo && (
                    <div style={sectionStyles.taskMeta}>
                      <span style={{
                        ...sectionStyles.metaItem,
                        color: dueInfo.color
                      }}>
                        <Calendar size={12} />
                        {dueInfo.text}
                      </span>
                    </div>
                  )}
                </div>
                <div style={sectionStyles.taskActions}>
                  <button
                    onClick={() => handleMarkDone(task.id)}
                    style={{
                      ...sectionStyles.actionButton,
                      color: '#22c55e'
                    }}
                    title="Mark done"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    onClick={() => handleSnooze(task.id)}
                    style={{
                      ...sectionStyles.actionButton,
                      color: '#f59e0b'
                    }}
                    title="Snooze +3d"
                  >
                    <Clock size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{
                      ...sectionStyles.actionButton,
                      color: '#ef4444'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const sectionStyles = {
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid'
  },
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none'
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
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
  tasksList: {
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
    border: '1px solid'
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
    alignItems: 'center',
    gap: '8px'
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '500',
    flex: 1
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
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
}






