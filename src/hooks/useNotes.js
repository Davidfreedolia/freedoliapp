import { useState, useEffect, useCallback } from 'react'
import { 
  getStickyNotes, 
  createStickyNote, 
  updateStickyNote, 
  deleteStickyNote 
} from '../lib/supabase'
import { useApp } from '../context/AppContext'

/**
 * Hook per gestionar notes flotants (post-its)
 * Carrega notes actives i proporciona funcions per gestionar-les
 */
export function useNotes() {
  const { darkMode } = useApp()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  // Carregar notes actives (status = 'open')
  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const allNotes = await getStickyNotes({ status: 'open' })
      // Filtrar només notes amb context global o dashboard (per ara)
      // Més endavant es pot filtrar per context específic
      setNotes(allNotes || [])
    } catch (err) {
      console.error('Error loading notes:', err)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar notes a l'inici
  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Afegir nova nota
  const addNote = useCallback(async (initialData = {}) => {
    try {
      const newNote = await createStickyNote({
        content: initialData.content || '',
        title: initialData.title || null,
        color: initialData.color || 'yellow',
        status: 'open',
        pinned: true,
        // Posició inicial aleatòria per evitar superposició
        position_x: initialData.position_x || Math.random() * 200 + 100,
        position_y: initialData.position_y || Math.random() * 200 + 100,
        context: initialData.context || 'global',
        context_id: initialData.context_id || null,
        minimized: false,
        z_index: Date.now() // Timestamp com z-index per portar al davant
      })
      await loadNotes()
      return newNote
    } catch (err) {
      console.error('Error creating note:', err)
      throw err
    }
  }, [loadNotes])

  // Actualitzar nota (posició, contingut, etc.)
  const updateNote = useCallback(async (id, updates) => {
    try {
      await updateStickyNote(id, {
        ...updates,
        updated_at: new Date().toISOString()
      })
      await loadNotes()
    } catch (err) {
      console.error('Error updating note:', err)
      throw err
    }
  }, [loadNotes])

  // Eliminar nota
  const removeNote = useCallback(async (id) => {
    try {
      await deleteStickyNote(id)
      await loadNotes()
    } catch (err) {
      console.error('Error deleting note:', err)
      throw err
    }
  }, [loadNotes])

  // Portar nota al davant (actualitzar z_index)
  const bringToFront = useCallback(async (id) => {
    const maxZ = Math.max(...notes.map(n => n.z_index || 1000), 1000)
    await updateNote(id, { z_index: maxZ + 1 })
  }, [notes, updateNote])

  return {
    notes,
    loading,
    addNote,
    updateNote,
    removeNote,
    bringToFront,
    refresh: loadNotes
  }
}





