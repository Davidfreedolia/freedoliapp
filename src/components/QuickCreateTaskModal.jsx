import { useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { createTask } from '../lib/supabase'
import { showToast } from './Toast'
import { useTranslation } from 'react-i18next'

export default function QuickCreateTaskModal({ isOpen, onClose, onSave, defaultDate, projects = [] }) {
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    project_id: null,
    priority: 'normal',
    due_date: defaultDate || new Date().toISOString().split('T')[0]
  })

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      showToast(t('calendar.taskTitleRequired', 'El títol és obligatori'), 'error')
      return
    }

    setLoading(true)
    try {
      // Create task
      // Note: entity_id can be NULL for global tasks (after SQL update)
      const taskData = {
        title: formData.title.trim(),
        due_date: formData.due_date,
        priority: formData.priority,
        status: 'open',
        entity_type: 'project',
        entity_id: formData.project_id || null // Allow null for global tasks
      }

      const task = await createTask(taskData)
      
      showToast(t('calendar.taskCreated', 'Tasca creada correctament'), 'success')
      onSave(task)
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        project_id: null,
        priority: 'normal',
        due_date: defaultDate || new Date().toISOString().split('T')[0]
      })
    } catch (err) {
      console.error('Error creating task:', err)
      showToast(t('calendar.taskCreateError', 'Error al crear la tasca'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    overlay: modalStyles.overlay,
    modal: {
      ...modalStyles.modal,
      maxWidth: isMobile ? '100%' : '480px'
    },
    header: {
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: darkMode ? '#9ca3af' : '#6b7280',
      padding: '4px',
      display: 'flex',
      alignItems: 'center'
    },
    form: {
      padding: '24px'
    },
    field: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '8px',
      color: darkMode ? '#ffffff' : '#111827'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      outline: 'none',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      outline: 'none',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    cancelButton: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      color: darkMode ? '#ffffff' : '#111827'
    },
    saveButton: {
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{t('calendar.newTask', 'Nova Tasca')}</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              {t('calendar.taskTitle', 'Títol')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('calendar.taskTitlePlaceholder', 'Títol de la tasca')}
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {t('calendar.dueDate', 'Data de venciment')}
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {t('calendar.priority', 'Prioritat')}
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={styles.select}
            >
              <option value="low">{t('calendar.priorityLow', 'Baixa')}</option>
              <option value="normal">{t('calendar.priorityNormal', 'Normal')}</option>
              <option value="high">{t('calendar.priorityHigh', 'Alta')}</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {t('calendar.project', 'Projecte')} {t('common.optional', '(opcional)')}
            </label>
            <select
              value={formData.project_id || ''}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value || null })}
              style={styles.select}
            >
              <option value="">{t('calendar.noProject', 'Sense projecte (tasca global)')}</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} {project.sku_internal ? `(${project.sku_internal})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...styles.button, ...styles.cancelButton }}
              disabled={loading}
            >
              {t('common.cancel', 'Cancel·lar')}
            </button>
            <button
              type="submit"
              style={{ ...styles.button, ...styles.saveButton }}
              disabled={loading || !formData.title.trim()}
            >
              {loading ? t('common.loading', 'Carregant...') : t('common.save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

