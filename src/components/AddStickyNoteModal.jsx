import { useState } from 'react'
import { X, StickyNote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createStickyNote } from '../lib/supabase'
import { showToast } from './Toast'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

const COLORS = [
  { value: 'yellow', label: 'Groc', bg: '#fef3c7', border: '#fbbf24' },
  { value: 'blue', label: 'Blau', bg: '#dbeafe', border: '#3b82f6' },
  { value: 'green', label: 'Verd', bg: '#d1fae5', border: '#22c55e' },
  { value: 'pink', label: 'Rosa', bg: '#fce7f3', border: '#ec4899' },
  { value: 'orange', label: 'Taronja', bg: '#fed7aa', border: '#f97316' },
  { value: 'purple', label: 'Morat', bg: '#e9d5ff', border: '#a855f7' }
]

export default function AddStickyNoteModal({ isOpen, onClose, onSuccess, darkMode }) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const [newNote, setNewNote] = useState({ content: '', title: '', color: 'yellow' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newNote.content.trim()) {
      showToast('El contingut és obligatori', 'error')
      return
    }

    setLoading(true)
    try {
      await createStickyNote({
        content: newNote.content,
        title: newNote.title || null,
        color: newNote.color,
        pinned: true,
        status: 'open'
      })
      showToast('Nota creada correctament', 'success')
      setNewNote({ content: '', title: '', color: 'yellow' })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error creating note:', err)
      showToast('Error al crear la nota', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{...styles.overlay, ...modalStyles.overlay}} onClick={onClose}>
      <div 
        style={{...styles.modal, ...modalStyles.modal}}
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StickyNote size={24} color="#5F4B00" />
            <h2 style={{...styles.title, color: darkMode ? '#ffffff' : '#111827'}}>
              {t('stickyNotes.add', 'Afegir nota')}
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={{...styles.label, color: darkMode ? '#ffffff' : '#111827'}}>
              {t('stickyNotes.titlePlaceholder', 'Títol')} ({t('common.optional', 'Opcional')})
            </label>
            <input
              type="text"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              placeholder={t('stickyNotes.titlePlaceholder', 'Títol (opcional)')}
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />
          </div>

          <div style={styles.field}>
            <label style={{...styles.label, color: darkMode ? '#ffffff' : '#111827'}}>
              {t('stickyNotes.contentPlaceholder', 'Contingut')} *
            </label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder={t('stickyNotes.contentPlaceholder', 'Contingut...')}
              required
              rows={5}
              style={{
                ...styles.textarea,
                backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />
          </div>

          <div style={styles.field}>
            <label style={{...styles.label, color: darkMode ? '#ffffff' : '#111827'}}>
              Color
            </label>
            <div style={styles.colorSelector}>
              {COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewNote({ ...newNote, color: color.value })}
                  style={{
                    ...styles.colorButton,
                    backgroundColor: color.bg,
                    borderColor: newNote.color === color.value ? color.border : 'transparent',
                    borderWidth: newNote.color === color.value ? '3px' : '2px'
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...styles.button,
                ...styles.cancelButton,
                backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              {t('common.cancel', 'Cancel·lar')}
            </button>
            <button
              type="submit"
              disabled={loading || !newNote.content.trim()}
              style={{
                ...styles.button,
                ...styles.submitButton,
                backgroundColor: '#FFE066',
                color: '#5F4B00',
                opacity: (loading || !newNote.content.trim()) ? 0.6 : 1,
                cursor: (loading || !newNote.content.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? t('common.loading', 'Carregant...') : t('stickyNotes.add', 'Afegir')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    color: '#6b7280'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    boxSizing: 'border-box'
  },
  colorSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  colorButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '2px solid',
    cursor: 'pointer',
    padding: 0
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px'
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
    gap: '8px',
    transition: 'opacity 0.2s'
  },
  cancelButton: {},
  submitButton: {}
}


