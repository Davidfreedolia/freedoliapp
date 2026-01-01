import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Check, Trash2, Pin, PinOff, Calendar, CheckSquare, Link2, Unlink, ExternalLink } from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useApp } from '../context/AppContext'
import { 
  getStickyNotes, 
  createStickyNote, 
  updateStickyNote, 
  deleteStickyNote, 
  markStickyNoteDone,
  convertStickyNoteToTask,
  unlinkStickyNoteTask
} from '../lib/supabase'
import { showToast } from './Toast'

const COLORS = [
  { value: 'yellow', label: 'Groc', bg: '#fef3c7', border: '#fbbf24' },
  { value: 'blue', label: 'Blau', bg: '#dbeafe', border: '#3b82f6' },
  { value: 'green', label: 'Verd', bg: '#d1fae5', border: '#22c55e' },
  { value: 'pink', label: 'Rosa', bg: '#fce7f3', border: '#ec4899' },
  { value: 'orange', label: 'Taronja', bg: '#fed7aa', border: '#f97316' },
  { value: 'purple', label: 'Morat', bg: '#e9d5ff', border: '#a855f7' }
]

export default function StickyNotesWidget({ darkMode, showOverlay = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const { sidebarCollapsed } = useApp()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newNote, setNewNote] = useState({ content: '', title: '', color: 'yellow' })
  const [editingId, setEditingId] = useState(null)
  const [planningNoteId, setPlanningNoteId] = useState(null)
  const [planDate, setPlanDate] = useState('')

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const allNotes = await getStickyNotes()
      setNotes(allNotes || [])
    } catch (err) {
      console.error('Error loading sticky notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.content.trim()) return
    
    try {
      await createStickyNote({
        content: newNote.content,
        title: newNote.title || null,
        color: newNote.color,
        pinned: true,
        status: 'open'
      })
      setNewNote({ content: '', title: '', color: 'yellow' })
      setShowAddForm(false)
      loadNotes()
    } catch (err) {
      console.error('Error creating note:', err)
    }
  }

  const handleMarkDone = async (id) => {
    try {
      await markStickyNoteDone(id)
      loadNotes()
    } catch (err) {
      console.error('Error marking note done:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('stickyNotes.confirmDelete', 'Segur que vols eliminar aquesta nota?'))) return
    
    try {
      await deleteStickyNote(id)
      loadNotes()
    } catch (err) {
      console.error('Error deleting note:', err)
    }
  }

  const handleTogglePin = async (id, currentPinned) => {
    try {
      await updateStickyNote(id, { pinned: !currentPinned })
      loadNotes()
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const handleUpdateColor = async (id, color) => {
    try {
      await updateStickyNote(id, { color })
      loadNotes()
    } catch (err) {
      console.error('Error updating color:', err)
    }
  }

  const handlePlan = async (id, date) => {
    try {
      await updateStickyNote(id, { due_date: date || null })
      setPlanningNoteId(null)
      setPlanDate('')
      loadNotes()
      showToast(t('stickyNotes.planSaved', 'Data planificada guardada'), 'success')
    } catch (err) {
      console.error('Error planning note:', err)
      showToast(t('stickyNotes.planError', 'Error al guardar la data'), 'error')
    }
  }

  const handleConvertToTask = async (note) => {
    try {
      // D) Evitar duplicats - Check if already linked
      if (note.linked_task_id) {
        showToast(t('stickyNotes.alreadyLinked', 'Ja està vinculada a una tasca'), 'warning')
        return
      }
      
      const { task } = await convertStickyNoteToTask(note.id)
      loadNotes()
      // C) mostrar toast "Task created"
      showToast(t('stickyNotes.taskCreated', 'Tasca creada correctament'), 'success')
      
      // Optionally navigate to calendar or task
      // navigate(`/calendar`)
    } catch (err) {
      console.error('Error converting to task:', err)
      
      // Handle specific errors
      if (err.message === 'ALREADY_LINKED') {
        showToast(t('stickyNotes.alreadyLinked', 'Ja està vinculada a una tasca'), 'warning')
      } else if (err.message === 'PROJECT_REQUIRED') {
        showToast(t('stickyNotes.projectRequired', 'Has de seleccionar un projecte per crear la tasca'), 'error')
      } else {
        showToast(t('stickyNotes.convertError', 'Error al crear la tasca'), 'error')
      }
    }
  }

  const handleUnlink = async (id) => {
    try {
      await unlinkStickyNoteTask(id)
      loadNotes()
      showToast(t('stickyNotes.unlinked', 'Tasca desvinculada'), 'success')
    } catch (err) {
      console.error('Error unlinking task:', err)
      showToast(t('stickyNotes.unlinkError', 'Error al desvincular'), 'error')
    }
  }

  const handleOpenTask = (note) => {
    if (note.linked_task_id && note.tasks) {
      const task = Array.isArray(note.tasks) ? note.tasks[0] : note.tasks
      if (task?.entity_type === 'project') {
        navigate(`/projects/${task.entity_id}?highlightTask=${task.id}`)
      } else if (task?.entity_type === 'purchase_order') {
        navigate(`/orders?open=${task.entity_id}&highlightTask=${task.id}`)
      } else {
        navigate(`/calendar`)
      }
    }
  }

  const openNotes = notes.filter(n => n.status === 'open')
  // For overlay: only show pinned notes without linked_task_id and without converted_to_task_at
  const pinnedOpenNotes = openNotes.filter(n => 
    n.pinned && 
    !n.linked_task_id && 
    !n.converted_to_task_at
  )

  // Overlay mode: show pinned notes at top
  if (showOverlay && pinnedOpenNotes.length > 0) {
    const sidebarWidth = isMobile ? 0 : (isTablet ? 72 : (sidebarCollapsed ? 72 : 260))
    
    return (
      <div style={{
        position: 'fixed',
        top: '70px',
        left: `${sidebarWidth}px`,
        right: '0',
        zIndex: 100,
        display: 'flex',
        gap: '12px',
        padding: '12px',
        flexWrap: 'wrap',
        pointerEvents: 'none',
        maxWidth: '100vw'
      }}>
        {pinnedOpenNotes.map(note => {
          const colorConfig = COLORS.find(c => c.value === note.color) || COLORS[0]
          return (
            <div
              key={note.id}
              style={{
                backgroundColor: colorConfig.bg,
                border: `2px solid ${colorConfig.border}`,
                borderRadius: '8px',
                padding: '12px',
                minWidth: '200px',
                maxWidth: '300px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                pointerEvents: 'auto',
                position: 'relative'
              }}
            >
              {note.title && (
                <div style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '6px',
                  color: darkMode ? '#111827' : '#111827'
                }}>
                  {note.title}
                </div>
              )}
              <div style={{
                fontSize: '13px',
                color: darkMode ? '#374151' : '#4b5563',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {note.content}
              </div>
              {/* Badge if task linked */}
              {note.linked_task_id && note.tasks && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  padding: '4px 8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#3b82f6'
                }}>
                  <Link2 size={12} />
                  {t('stickyNotes.taskLinked', 'Tasca vinculada')}
                </div>
              )}
              
              <div style={{
                display: 'flex',
                gap: '4px',
                marginTop: '8px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                {!note.linked_task_id && (
                  <>
                    {planningNoteId === note.id ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="date"
                          value={planDate}
                          onChange={(e) => setPlanDate(e.target.value)}
                          style={{
                            fontSize: '11px',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <button
                          onClick={() => handlePlan(note.id, planDate)}
                          style={{
                            background: '#4f46e5',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            color: '#ffffff',
                            fontSize: '11px'
                          }}
                        >
                          {t('common.save', 'Guardar')}
                        </button>
                        <button
                          onClick={() => {
                            setPlanningNoteId(null)
                            setPlanDate('')
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setPlanningNoteId(note.id)
                            setPlanDate(note.due_date || '')
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={t('stickyNotes.plan', 'Planificar')}
                        >
                          <Calendar size={14} color="#f59e0b" />
                        </button>
                        <button
                          onClick={() => handleConvertToTask(note)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={t('stickyNotes.convertToTask', 'Convertir a tasca')}
                        >
                          <CheckSquare size={14} color="#4f46e5" />
                        </button>
                      </>
                    )}
                  </>
                )}
                {note.linked_task_id && (
                  <>
                    <button
                      onClick={() => handleOpenTask(note)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={t('stickyNotes.openTask', 'Obrir tasca')}
                    >
                      <ExternalLink size={14} color="#3b82f6" />
                    </button>
                    <button
                      onClick={() => handleUnlink(note.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={t('stickyNotes.unlink', 'Desvincular')}
                    >
                      <Unlink size={14} color="#6b7280" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleMarkDone(note.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={t('stickyNotes.markDone', 'Marcar com fet')}
                >
                  <Check size={14} color="#22c55e" />
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={t('stickyNotes.delete', 'Eliminar')}
                >
                  <X size={14} color="#ef4444" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Widget mode
  const styles = {
    container: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    },
    addForm: {
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '16px'
    },
    input: {
      width: '100%',
      padding: '8px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      marginBottom: '8px'
    },
    textarea: {
      width: '100%',
      padding: '8px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      minHeight: '60px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    colorSelector: {
      display: 'flex',
      gap: '6px',
      marginBottom: '8px',
      flexWrap: 'wrap'
    },
    colorButton: {
      width: '24px',
      height: '24px',
      borderRadius: '4px',
      border: '2px solid',
      cursor: 'pointer',
      padding: 0
    },
    formActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    notesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      flex: 1,
      overflowY: 'auto',
      maxHeight: '400px'
    },
    noteCard: {
      borderRadius: '8px',
      padding: '12px',
      position: 'relative',
      border: '2px solid',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    noteHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '6px'
    },
    noteTitle: {
      fontWeight: '600',
      fontSize: '14px',
      color: darkMode ? '#111827' : '#111827',
      flex: 1
    },
    noteContent: {
      fontSize: '13px',
      color: darkMode ? '#374151' : '#4b5563',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      marginBottom: '8px'
    },
    noteActions: {
      display: 'flex',
      gap: '4px',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
    },
    actionButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      borderRadius: '4px',
      transition: 'background-color 0.2s'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '14px'
    },
    empty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '14px',
      textAlign: 'center'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('stickyNotes.title', 'Notes Ràpides')}</h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            style={styles.addButton}
          >
            <Plus size={16} />
            {t('stickyNotes.add', 'Afegir')}
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <input
            type="text"
            placeholder={t('stickyNotes.titlePlaceholder', 'Títol (opcional)')}
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            style={styles.input}
          />
          <textarea
            placeholder={t('stickyNotes.contentPlaceholder', 'Contingut de la nota...')}
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            style={styles.textarea}
          />
          <div style={styles.colorSelector}>
            {COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setNewNote({ ...newNote, color: color.value })}
                style={{
                  ...styles.colorButton,
                  backgroundColor: color.bg,
                  borderColor: newNote.color === color.value ? color.border : 'transparent'
                }}
                title={color.label}
              />
            ))}
          </div>
          <div style={styles.formActions}>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewNote({ content: '', title: '', color: 'yellow' })
              }}
              style={{
                ...styles.button,
                backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              {t('common.cancel', 'Cancel·lar')}
            </button>
            <button
              onClick={handleAddNote}
              style={{
                ...styles.button,
                backgroundColor: '#4f46e5',
                color: '#ffffff'
              }}
            >
              <Plus size={16} />
              {t('stickyNotes.add', 'Afegir')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>{t('common.loading', 'Carregant...')}</div>
      ) : openNotes.length === 0 ? (
        <div style={styles.empty}>
          <p>{t('stickyNotes.empty', 'No hi ha notes. Afegeix una nota ràpida!')}</p>
        </div>
      ) : (
        <div style={styles.notesList}>
          {openNotes.map(note => {
            const colorConfig = COLORS.find(c => c.value === note.color) || COLORS[0]
            return (
              <div
                key={note.id}
                style={{
                  ...styles.noteCard,
                  backgroundColor: colorConfig.bg,
                  borderColor: colorConfig.border
                }}
              >
                <div style={styles.noteHeader}>
                  {note.title && (
                    <div style={styles.noteTitle}>{note.title}</div>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleTogglePin(note.id, note.pinned)}
                      style={{
                        ...styles.actionButton,
                        backgroundColor: note.pinned ? 'rgba(0,0,0,0.1)' : 'transparent'
                      }}
                      title={note.pinned ? t('stickyNotes.unpin', 'Desenganxar') : t('stickyNotes.pin', 'Enganxar')}
                    >
                      {note.pinned ? <Pin size={14} /> : <PinOff size={14} />}
                    </button>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => handleUpdateColor(note.id, color.value)}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '2px',
                            backgroundColor: color.bg,
                            border: `1px solid ${note.color === color.value ? color.border : 'transparent'}`,
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={styles.noteContent}>{note.content}</div>
                
                {/* Badge if task linked */}
                {note.linked_task_id && note.tasks && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#3b82f6'
                  }}>
                    <Link2 size={14} />
                    {t('stickyNotes.taskLinked', 'Tasca vinculada')}
                  </div>
                )}
                
                {/* Due date badge if set */}
                {note.due_date && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#f59e0b'
                  }}>
                    <Calendar size={14} />
                    {new Date(note.due_date).toLocaleDateString()}
                  </div>
                )}
                
                <div style={styles.noteActions}>
                  {!note.linked_task_id && (
                    <>
                      {planningNoteId === note.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1 }}>
                          <input
                            type="date"
                            value={planDate}
                            onChange={(e) => setPlanDate(e.target.value)}
                            style={{
                              flex: 1,
                              fontSize: '12px',
                              padding: '6px',
                              borderRadius: '4px',
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                              backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                              color: darkMode ? '#ffffff' : '#111827'
                            }}
                          />
                          <button
                            onClick={() => handlePlan(note.id, planDate)}
                            style={{
                              ...styles.actionButton,
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              padding: '6px 12px'
                            }}
                          >
                            {t('common.save', 'Guardar')}
                          </button>
                          <button
                            onClick={() => {
                              setPlanningNoteId(null)
                              setPlanDate('')
                            }}
                            style={styles.actionButton}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setPlanningNoteId(note.id)
                              setPlanDate(note.due_date || '')
                            }}
                            style={styles.actionButton}
                            title={t('stickyNotes.plan', 'Planificar')}
                          >
                            <Calendar size={16} color="#f59e0b" />
                          </button>
                          <button
                            onClick={() => handleConvertToTask(note)}
                            style={styles.actionButton}
                            title={t('stickyNotes.convertToTask', 'Convertir a tasca')}
                          >
                            <CheckSquare size={16} color="#4f46e5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {note.linked_task_id && (
                    <>
                      <button
                        onClick={() => handleOpenTask(note)}
                        style={styles.actionButton}
                        title={t('stickyNotes.openTask', 'Obrir tasca')}
                      >
                        <ExternalLink size={16} color="#3b82f6" />
                      </button>
                      <button
                        onClick={() => handleUnlink(note.id)}
                        style={styles.actionButton}
                        title={t('stickyNotes.unlink', 'Desvincular')}
                      >
                        <Unlink size={16} color="#6b7280" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleMarkDone(note.id)}
                    style={styles.actionButton}
                    title={t('stickyNotes.markDone', 'Marcar com fet')}
                  >
                    <Check size={16} color="#22c55e" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    style={styles.actionButton}
                    title={t('stickyNotes.delete', 'Eliminar')}
                  >
                    <Trash2 size={16} color="#ef4444" />
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
