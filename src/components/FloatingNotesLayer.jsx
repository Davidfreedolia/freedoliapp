import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Minimize2, Maximize2 } from 'lucide-react'
import { useNotes } from '../hooks/useNotes'
import { useApp } from '../context/AppContext'

const COLORS = {
  yellow: { bg: '#fef3c7', border: '#fbbf24', text: '#78350f' },
  blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
  green: { bg: '#d1fae5', border: '#22c55e', text: '#14532d' },
  pink: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
  orange: { bg: '#fed7aa', border: '#f97316', text: '#7c2d12' },
  purple: { bg: '#e9d5ff', border: '#a855f7', text: '#581c87' }
}

export default function FloatingNotesLayer() {
  const { darkMode } = useApp()
  const { notes, updateNote, removeNote, bringToFront, refresh } = useNotes()
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const noteRefs = useRef({})

  // Inicialitzar posicions si no existeixen
  useEffect(() => {
    notes.forEach(note => {
      if (!note.position_x || !note.position_y) {
        updateNote(note.id, {
          position_x: Math.random() * 200 + 100,
          position_y: Math.random() * 200 + 100
        })
      }
    })
  }, [notes, updateNote])

  // Gestió de drag
  const handleMouseDown = useCallback((e, noteId) => {
    e.preventDefault()
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setDragging(noteId)
    bringToFront(noteId)
  }, [notes, bringToFront])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Limitar dins de la pantalla (considerant mida del post-it)
    const noteWidth = 260
    const noteHeight = 200
    const maxX = window.innerWidth - noteWidth
    const maxY = window.innerHeight - noteHeight
    const constrainedX = Math.max(0, Math.min(newX, maxX))
    const constrainedY = Math.max(0, Math.min(newY, maxY))

    updateNote(dragging, {
      position_x: constrainedX,
      position_y: constrainedY
    })
  }, [dragging, dragOffset, updateNote])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // Edició inline
  const handleContentChange = async (noteId, newContent) => {
    await updateNote(noteId, { content: newContent })
  }

  // Minimitzar/maximitzar
  const toggleMinimize = async (noteId) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    await updateNote(noteId, { minimized: !note.minimized })
  }

  // Eliminar
  const handleDelete = async (noteId) => {
    if (confirm('Segur que vols eliminar aquesta nota?')) {
      await removeNote(noteId)
    }
  }

  return (
    <div style={styles.container}>
      {notes.map(note => {
        const color = COLORS[note.color] || COLORS.yellow
        const isMinimized = note.minimized

        return (
          <div
            key={note.id}
            ref={el => noteRefs.current[note.id] = el}
            style={{
              ...styles.note,
              left: note.position_x || 100,
              top: note.position_y || 100,
              zIndex: note.z_index || 1000,
              backgroundColor: color.bg,
              borderColor: color.border,
              color: color.text,
              cursor: dragging === note.id ? 'grabbing' : 'grab',
              height: isMinimized ? '40px' : 'auto',
              minHeight: isMinimized ? '40px' : '180px',
              maxWidth: '90vw' // Mobile: no més del 90% de l'ample
            }}
            onMouseDown={(e) => handleMouseDown(e, note.id)}
          >
            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                {note.title && (
                  <div style={styles.title}>{note.title}</div>
                )}
              </div>
              <div style={styles.headerRight}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMinimize(note.id)
                  }}
                  style={styles.iconButton}
                  title={isMinimized ? 'Maximitzar' : 'Minimitzar'}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(note.id)
                  }}
                  style={styles.iconButton}
                  title="Eliminar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div style={styles.content}>
                <textarea
                  value={note.content || ''}
                  onChange={(e) => handleContentChange(note.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={styles.textarea}
                  placeholder="Escriu la teva nota..."
                  rows={6}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 9999
  },
  note: {
    position: 'absolute',
    width: '260px', // 220-280px range
    minHeight: '180px',
    maxWidth: '90vw', // Mobile: no més del 90% de l'ample
    border: '2px solid',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    userSelect: 'none'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    cursor: 'grab'
  },
  headerLeft: {
    flex: 1,
    overflow: 'hidden'
  },
  title: {
    fontSize: '12px',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  headerRight: {
    display: 'flex',
    gap: '4px'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    opacity: 0.7,
    transition: 'opacity 0.2s'
  },
  content: {
    flex: 1,
    padding: '12px'
  },
  textarea: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    resize: 'none',
    outline: 'none',
    fontSize: '14px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    minHeight: '120px'
  }
}

