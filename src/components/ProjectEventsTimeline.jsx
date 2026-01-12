import { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, MoreVertical, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import DeleteConfirmationModal from './DeleteConfirmationModal'

const EVENT_TYPES = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' }
]

/**
 * Format date to YYYY-MM-DD for input
 */
function formatDateInput(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date for display
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export default function ProjectEventsTimeline({ projectId, projectStatus, darkMode }) {
  const { demoMode } = useApp()
  const { isMobile } = useBreakpoint()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, event: null })
  const [menuOpen, setMenuOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'milestone',
    event_date: '',
    notes: ''
  })

  // Check if project is locked (closed/archived)
  // Locked if status is null/undefined OR if status is closed/archived
  const isLocked = !projectStatus || ['closed', 'archived'].includes(projectStatus)

  useEffect(() => {
    loadEvents()
  }, [projectId, demoMode])

  const loadEvents = async () => {
    if (!projectId) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('project_events')
        .select('id,type,title,event_date,notes,is_demo')
        .eq('project_id', projectId)
        .order('event_date', { ascending: true })

      // Filter by is_demo if demoMode is false
      if (demoMode === false) {
        query = query.eq('is_demo', false)
      }

      const { data, error } = await query

      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error('Error loading project events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = () => {
    setFormData({
      title: '',
      type: 'milestone',
      event_date: '',
      notes: ''
    })
    setEditingEvent(null)
    setShowAddModal(true)
  }

  const handleEditEvent = (event) => {
    setFormData({
      title: event.title || '',
      type: event.type || 'milestone',
      event_date: formatDateInput(event.event_date) || '',
      notes: event.notes || ''
    })
    setEditingEvent(event)
    setShowAddModal(true)
    setMenuOpen(null)
  }

  const handleSaveEvent = async () => {
    if (!formData.title.trim() || !formData.event_date) return

    setSaving(true)
    try {
      const { showToast } = await import('./Toast')

      const eventData = {
        project_id: projectId,
        title: formData.title.trim(),
        type: formData.type,
        event_date: formData.event_date,
        notes: formData.notes.trim() || null
      }

      if (editingEvent) {
        const { error } = await supabase
          .from('project_events')
          .update(eventData)
          .eq('id', editingEvent.id)

        if (error) throw error
        showToast('Evento actualizado', 'success')
      } else {
        const { error } = await supabase
          .from('project_events')
          .insert([eventData])

        if (error) throw error
        showToast('Evento creado', 'success')
      }

      setShowAddModal(false)
      setEditingEvent(null)
      await loadEvents()
    } catch (err) {
      console.error('Error saving event:', err)
      const { showToast } = await import('./Toast')
      showToast('Error guardando evento: ' + (err.message || 'Error desconocido'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (event) => {
    setDeleteModal({ isOpen: true, event })
    setMenuOpen(null)
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.event) return

    try {
      const { showToast } = await import('./Toast')

      const { error } = await supabase
        .from('project_events')
        .delete()
        .eq('id', deleteModal.event.id)

      if (error) throw error

      showToast('Evento eliminado', 'success')
      setDeleteModal({ isOpen: false, event: null })
      await loadEvents()
    } catch (err) {
      console.error('Error deleting event:', err)
      const { showToast } = await import('./Toast')
      showToast('Error eliminando evento: ' + (err.message || 'Error desconocido'), 'error')
      setDeleteModal({ isOpen: false, event: null })
    }
  }

  const styles = {
    container: {
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      padding: '20px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
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
      padding: '8px 16px',
      backgroundColor: '#4f46e5',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'opacity 0.2s'
    },
    addButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    loading: {
      padding: '40px',
      textAlign: 'center',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    empty: {
      padding: '40px',
      textAlign: 'center',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    tableHeaderCell: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    tableRow: {
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    tableCell: {
      padding: '14px 16px',
      fontSize: '14px',
      color: darkMode ? '#ffffff' : '#111827'
    },
    typeBadge: {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: darkMode ? '#4f46e515' : '#e0e7ff',
      color: darkMode ? '#c7d2fe' : '#3730a3'
    },
    actionsCell: {
      position: 'relative'
    },
    menuButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: darkMode ? '#9ca3af' : '#6b7280',
      padding: '4px',
      display: 'flex',
      alignItems: 'center'
    },
    menu: {
      position: 'absolute',
      right: '0',
      top: '100%',
      zIndex: 100,
      marginTop: '4px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      minWidth: '140px',
      overflow: 'hidden'
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '10px 16px',
      background: 'none',
      border: 'none',
      textAlign: 'left',
      fontSize: '14px',
      cursor: 'pointer',
      color: darkMode ? '#ffffff' : '#111827',
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'
    },
    menuItemHover: {
      backgroundColor: darkMode ? '#374151' : '#f9fafb'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      width: '100%',
      maxWidth: '500px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      overflow: 'hidden'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    modalTitle: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827'
    },
    modalClose: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px',
      display: 'flex',
      alignItems: 'center'
    },
    modalBody: {
      padding: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#ffffff' : '#111827'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none',
      resize: 'vertical',
      minHeight: '80px'
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      fontFamily: 'inherit',
      outline: 'none',
      cursor: 'pointer'
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      padding: '20px 24px',
      borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    buttonCancel: {
      backgroundColor: 'transparent',
      color: darkMode ? '#9ca3af' : '#6b7280',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    buttonSave: {
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    if (menuOpen === null) return

    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-menu-container]')) {
        setMenuOpen(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [menuOpen])

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={{ ...styles.title, color: darkMode ? '#ffffff' : '#111827' }}>
          <Calendar size={18} />
          Timeline
        </h3>
        <button
          onClick={handleAddEvent}
          disabled={isLocked}
          title={isLocked ? 'Reopen the project to edit timeline' : ''}
          style={{
            ...styles.addButton,
            ...(isLocked ? styles.addButtonDisabled : {})
          }}
        >
          <Plus size={16} />
          Afegir esdeveniment
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>Carregant...</div>
      ) : events.length === 0 ? (
        <div style={styles.empty}>No hi ha esdeveniments</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableHeaderCell}>Data</th>
                <th style={styles.tableHeaderCell}>Títol</th>
                <th style={styles.tableHeaderCell}>Tipus</th>
                <th style={styles.tableHeaderCell}>Notes</th>
                {!isLocked && <th style={styles.tableHeaderCell}></th>}
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    {formatDateDisplay(event.event_date)}
                  </td>
                  <td style={styles.tableCell}>
                    <strong>{event.title}</strong>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.typeBadge}>
                      {EVENT_TYPES.find(t => t.value === event.type)?.label || event.type}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    {event.notes || '-'}
                  </td>
                  {!isLocked && (
                    <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                      <div data-menu-container style={{ position: 'relative' }}>
                        <button
                          onClick={() => setMenuOpen(menuOpen === event.id ? null : event.id)}
                          style={styles.menuButton}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {menuOpen === event.id && (
                          <div style={{ ...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff' }}>
                            <button
                              onClick={() => handleEditEvent(event)}
                              style={styles.menuItem}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f9fafb'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#ffffff'
                              }}
                            >
                              <Edit size={14} />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteClick(event)}
                              style={{ ...styles.menuItem, color: '#ef4444' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f9fafb'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#ffffff'
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => !saving && setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingEvent ? 'Editar esdeveniment' : 'Nou esdeveniment'}
              </h3>
              <button
                onClick={() => !saving && setShowAddModal(false)}
                style={styles.modalClose}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Títol *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={styles.input}
                  placeholder="Títol de l'esdeveniment"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tipus</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  style={styles.select}
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Data *</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={styles.textarea}
                  placeholder="Notes opcionals"
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => !saving && setShowAddModal(false)}
                disabled={saving}
                style={{
                  ...styles.button,
                  ...styles.buttonCancel,
                  ...(saving ? styles.buttonDisabled : {})
                }}
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !formData.title.trim() || !formData.event_date}
                style={{
                  ...styles.button,
                  ...styles.buttonSave,
                  ...((saving || !formData.title.trim() || !formData.event_date) ? styles.buttonDisabled : {})
                }}
              >
                {saving ? 'Guardant...' : (editingEvent ? 'Guardar' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, event: null })}
        onConfirm={handleConfirmDelete}
        entityName={deleteModal.event?.title || ''}
        entityType="esdeveniment"
        darkMode={darkMode}
      />
    </div>
  )
}
