import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Check, Pin, PinOff } from 'lucide-react'
import { getStickyNotes, createStickyNote, updateStickyNote, deleteStickyNote, markStickyNoteDone } from '../lib/supabase'

const COLORS = {
  yellow: { bg: '#fef9c3', border: '#fde047', text: '#713f12' },
  blue: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  green: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  pink: { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  orange: { bg: '#fed7aa', border: '#fdba74', text: '#9a3412' }
}

export default function StickyNotesWidget({ darkMode, showOverlay = false }) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'yellow', pinned: true })

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const allNotes = await getStickyNotes({ status: 'open' })
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
      await createStickyNote(newNote)
      setNewNote({ title: '', content: '', color: 'yellow', pinned: true })
      setShowAddForm(false)
      loadNotes()
    } catch (err) {
      console.error('Error creating sticky note:', err)
    }
  }

  const handleMarkDone = async (id) => {
    try {
      await markStickyNoteDone(id)
      loadNotes()
    } catch (err) {
      console.error('Error marking note as done:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('stickyNotes.confirmDelete', 'Vols eliminar aquesta nota?'))) return
    
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

  const handleColorChange = async (id, color) => {
    try {
      await updateStickyNote(id, { color })
      loadNotes()
    } catch (err) {
      console.error('Error changing color:', err)
    }
  }

  const pinnedNotes = notes.filter(n => n.pinned && n.status === 'open')
  const unpinnedNotes = notes.filter(n => !n.pinned && n.status === 'open')

  const styles = {
    widget: {
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
      marginBottom: '16px',
      padding: '12px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    input: {
      width: '100%',
      padding: '8px',
      marginBottom: '8px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px'
    },
    textarea: {
      width: '100%',
      padding: '8px',
      marginBottom: '8px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      minHeight: '60px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    formActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    colorSelector: {
      display: 'flex',
      gap: '6px'
    },
    colorButton: {
      width: '24px',
      height: '24px',
      borderRadius: '4px',
      border: '2px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    notesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      flex: 1,
      overflowY: 'auto'
    },
    note: {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid',
      position: 'relative',
      minHeight: '80px'
    },
    noteHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    },
    noteTitle: {
      fontSize: '14px',
      fontWeight: '600',
      margin: 0,
      flex: 1
    },
    noteActions: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center'
    },
    actionButton: {
      padding: '4px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.7,
      transition: 'opacity 0.2s'
    },
    noteContent: {
      fontSize: '13px',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    },
    empty: {
      textAlign: 'center',
      padding: '40px 20px',
      color: darkMode ? '#6b7280' : '#9ca3af',
      fontSize: '14px'
    },
    loading: {
      textAlign: 'center',
      padding: '40px 20px',
      color: darkMode ? '#6b7280' : '#9ca3af',
      fontSize: '14px'
    }
  }

  // Overlay mode: show only pinned notes as small cards
  if (showOverlay) {
    if (pinnedNotes.length === 0) return null

    return (
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '300px',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        {pinnedNotes.map(note => {
          const colorStyle = COLORS[note.color] || COLORS.yellow
          return (
            <div
              key={note.id}
              style={{
                ...styles.note,
                backgroundColor: colorStyle.bg,
                borderColor: colorStyle.border,
                color: colorStyle.text,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                minWidth: '250px'
              }}
            >
              <div style={styles.noteHeader}>
                {note.title && (
                  <h4 style={{ ...styles.noteTitle, color: colorStyle.text }}>
                    {note.title}
                  </h4>
                )}
                <div style={styles.noteActions}>
                  <button
                    onClick={() => handleTogglePin(note.id, note.pinned)}
                    style={{ ...styles.actionButton, color: colorStyle.text }}
                    title={t('stickyNotes.unpin', 'Despenjar')}
                  >
                    <PinOff size={14} />
                  </button>
                  <button
                    onClick={() => handleMarkDone(note.id)}
                    style={{ ...styles.actionButton, color: colorStyle.text }}
                    title={t('stickyNotes.markDone', 'Marcar com fet')}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    style={{ ...styles.actionButton, color: colorStyle.text }}
                    title={t('stickyNotes.delete', 'Eliminar')}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ ...styles.noteContent, color: colorStyle.text }}>
                {note.content}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Widget mode: full widget in dashboard
  return (
    <div style={styles.widget}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t('stickyNotes.title', 'Notes')}</h3>
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
            placeholder={t('stickyNotes.contentPlaceholder', 'Contingut...')}
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            style={styles.textarea}
          />
          <div style={styles.formActions}>
            <div style={styles.colorSelector}>
              {Object.keys(COLORS).map(color => (
                <button
                  key={color}
                  onClick={() => setNewNote({ ...newNote, color })}
                  style={{
                    ...styles.colorButton,
                    backgroundColor: COLORS[color].bg,
                    borderColor: newNote.color === color ? COLORS[color].border : 'transparent'
                  }}
                  title={color}
                />
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newNote.pinned}
                onChange={(e) => setNewNote({ ...newNote, pinned: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <Pin size={14} />
              {t('stickyNotes.pin', 'Penjar')}
            </label>
            <button
              onClick={handleAddNote}
              style={{
                ...styles.addButton,
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                marginLeft: 'auto'
              }}
            >
              {t('common.save', 'Guardar')}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewNote({ title: '', content: '', color: 'yellow', pinned: true })
              }}
              style={{
                ...styles.addButton,
                backgroundColor: 'transparent',
                border: 'none'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>{t('common.loading', 'Carregant...')}</div>
      ) : notes.length === 0 ? (
        <div style={styles.empty}>
          {t('stickyNotes.empty', 'No hi ha notes. Clica "Afegir" per crear-ne una.')}
        </div>
      ) : (
        <div style={styles.notesList}>
          {pinnedNotes.map(note => {
            const colorStyle = COLORS[note.color] || COLORS.yellow
            return (
              <div
                key={note.id}
                style={{
                  ...styles.note,
                  backgroundColor: colorStyle.bg,
                  borderColor: colorStyle.border,
                  color: colorStyle.text
                }}
              >
                <div style={styles.noteHeader}>
                  {note.title && (
                    <h4 style={{ ...styles.noteTitle, color: colorStyle.text }}>
                      {note.title}
                    </h4>
                  )}
                  <div style={styles.noteActions}>
                    <button
                      onClick={() => handleTogglePin(note.id, note.pinned)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.unpin', 'Despenjar')}
                    >
                      <PinOff size={14} />
                    </button>
                    <button
                      onClick={() => handleMarkDone(note.id)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.markDone', 'Marcar com fet')}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.delete', 'Eliminar')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ ...styles.noteContent, color: colorStyle.text }}>
                  {note.content}
                </div>
              </div>
            )
          })}
          
          {unpinnedNotes.map(note => {
            const colorStyle = COLORS[note.color] || COLORS.yellow
            return (
              <div
                key={note.id}
                style={{
                  ...styles.note,
                  backgroundColor: colorStyle.bg,
                  borderColor: colorStyle.border,
                  color: colorStyle.text
                }}
              >
                <div style={styles.noteHeader}>
                  {note.title && (
                    <h4 style={{ ...styles.noteTitle, color: colorStyle.text }}>
                      {note.title}
                    </h4>
                  )}
                  <div style={styles.noteActions}>
                    <button
                      onClick={() => handleTogglePin(note.id, note.pinned)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.pin', 'Penjar')}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => handleMarkDone(note.id)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.markDone', 'Marcar com fet')}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{ ...styles.actionButton, color: colorStyle.text }}
                      title={t('stickyNotes.delete', 'Eliminar')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ ...styles.noteContent, color: colorStyle.text }}>
                  {note.content}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

