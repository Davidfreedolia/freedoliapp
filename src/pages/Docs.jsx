/**
 * Docs.jsx — Pàgina de documentació interna de FreedoliApp
 *
 * Accés restringit: l'usuari ha de tenir un registre a docs_access.
 * Estructura: sidebar de seccions (docs_sections) + llistat + vista markdown d'entrades (docs_entries).
 * Sub-ruta /app/docs/access: gestió d'accessos.
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  BookOpen, ChevronRight, Plus, Edit2, Save, X, Trash2,
  UserPlus, UserMinus, ShieldAlert, ArrowLeft, FileText,
  Loader
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import Button from '../components/Button'

// ---------------------------------------------------------------------------
// Simple Markdown → HTML renderer (no external library)
// Suports: # headings, **bold**, *italic*, `code`, ```blocks```, - lists, > blockquote, [link](url)
// ---------------------------------------------------------------------------
function renderMarkdown(md) {
  if (!md) return ''
  let html = md
    // Escape HTML entities first (basic security)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Fenced code blocks
    .replace(/```([^`]*?)```/gs, (_, code) =>
      `<pre class="docs-code-block"><code>${code.trim()}</code></pre>`)
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="docs-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="docs-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="docs-h1">$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="docs-blockquote">$1</blockquote>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="docs-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="docs-ul">$1</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="docs-hr" />')
    // Paragraphs: double newlines
    .replace(/\n\n+/g, '</p><p class="docs-p">')

  return `<p class="docs-p">${html}</p>`
}

// ---------------------------------------------------------------------------
// 403 inline
// ---------------------------------------------------------------------------
function AccessDenied() {
  const { t } = useTranslation()
  return (
    <div className="docs-access-denied" role="alert">
      <ShieldAlert size={40} className="docs-access-denied__icon" />
      <h2 className="docs-access-denied__title">{t('docs.accessDeniedTitle', 'Accés restringit')}</h2>
      <p className="docs-access-denied__msg">{t('docs.accessDeniedMsg', 'No tens permisos per accedir a la documentació interna. Contacta un administrador.')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Access management sub-page
// ---------------------------------------------------------------------------
function DocsAccessPage({ userEmail }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('docs_access')
      .select('*')
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    else setRows(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('docs_access').insert({
      email: newEmail.trim().toLowerCase(),
      label: newLabel.trim() || null,
      granted_by: userEmail,
    })
    if (err) setError(err.message)
    else {
      setNewEmail('')
      setNewLabel('')
      await load()
    }
    setSaving(false)
  }

  const handleRemove = async (id) => {
    if (!window.confirm(t('docs.confirmRemoveAccess', 'Eliminar accés?'))) return
    const { error: err } = await supabase.from('docs_access').delete().eq('id', id)
    if (err) setError(err.message)
    else await load()
  }

  return (
    <div className="docs-access-page">
      <Header
        title={t('docs.accessTitle', 'Gestió d\'accessos')}
        rightSlot={
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/docs')}>
            <ArrowLeft size={16} />
            {t('docs.backToDocs', 'Tornar a docs')}
          </Button>
        }
      />

      {error && (
        <div className="docs-error-banner" role="alert">{error}</div>
      )}

      <form className="docs-access-form" onSubmit={handleAdd}>
        <input
          className="docs-input"
          type="email"
          placeholder={t('docs.emailPlaceholder', 'correu@exemple.com')}
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          required
        />
        <input
          className="docs-input"
          type="text"
          placeholder={t('docs.labelPlaceholder', 'Etiqueta (opcional)')}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
        />
        <Button type="submit" variant="primary" size="sm" loading={saving} disabled={saving}>
          <UserPlus size={15} />
          {t('docs.addAccess', 'Afegir accés')}
        </Button>
      </form>

      {loading ? (
        <div className="docs-loading"><Loader size={20} className="docs-spinner" /></div>
      ) : (
        <table className="docs-access-table">
          <thead>
            <tr>
              <th>{t('docs.colEmail', 'Correu')}</th>
              <th>{t('docs.colLabel', 'Etiqueta')}</th>
              <th>{t('docs.colGrantedBy', 'Concedit per')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.email}</td>
                <td>{row.label ?? '—'}</td>
                <td>{row.granted_by ?? '—'}</td>
                <td>
                  <button
                    className="docs-icon-btn docs-icon-btn--danger"
                    onClick={() => handleRemove(row.id)}
                    title={t('docs.removeAccess', 'Eliminar accés')}
                    type="button"
                  >
                    <UserMinus size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="docs-empty-row">
                  {t('docs.noAccess', 'Cap usuari amb accés.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Entry editor (inline)
// ---------------------------------------------------------------------------
function EntryEditor({ entry, onSave, onCancel }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(entry?.title ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({ title, content })
    setSaving(false)
  }

  return (
    <div className="docs-editor">
      <div className="docs-editor__toolbar">
        <button
          className={`docs-tab ${!preview ? 'docs-tab--active' : ''}`}
          onClick={() => setPreview(false)}
          type="button"
        >
          {t('docs.editTab', 'Editar')}
        </button>
        <button
          className={`docs-tab ${preview ? 'docs-tab--active' : ''}`}
          onClick={() => setPreview(true)}
          type="button"
        >
          {t('docs.previewTab', 'Previsualitzar')}
        </button>
        <div style={{ flex: 1 }} />
        <button className="docs-icon-btn" onClick={onCancel} type="button" title={t('common.cancel', 'Cancel·lar')}>
          <X size={16} />
        </button>
        <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
          <Save size={14} />
          {t('common.save', 'Guardar')}
        </Button>
      </div>

      <input
        className="docs-input docs-editor__title-input"
        placeholder={t('docs.entryTitlePlaceholder', 'Títol de l\'entrada')}
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      {preview ? (
        <div
          className="docs-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      ) : (
        <textarea
          className="docs-textarea"
          placeholder={t('docs.contentPlaceholder', 'Escriu en Markdown…')}
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={18}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Docs page
// ---------------------------------------------------------------------------
export default function Docs() {
  const { t } = useTranslation()
  const { darkMode } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  // Sub-ruta: /app/docs/access
  const isAccessPage = location.pathname.startsWith('/app/docs/access')

  // Auth + access guard
  const [userEmail, setUserEmail] = useState(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email ?? null
      if (!email || cancelled) { setAccessChecked(true); return }
      setUserEmail(email)

      const { data } = await supabase
        .from('docs_access')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (!cancelled) {
        setHasAccess(!!data)
        setAccessChecked(true)
      }
    }
    checkAccess()
    return () => { cancelled = true }
  }, [])

  // Sections + entries
  const [sections, setSections] = useState([])
  const [entries, setEntries] = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [editing, setEditing] = useState(false)
  const [creatingEntry, setCreatingEntry] = useState(false)
  const [error, setError] = useState(null)

  const loadSections = useCallback(async () => {
    setSectionsLoading(true)
    const { data, error: err } = await supabase
      .from('docs_sections')
      .select('*')
      .order('sort_order', { ascending: true })
    if (err) setError(err.message)
    else {
      setSections(data ?? [])
      if (!selectedSection && data?.length) setSelectedSection(data[0].id)
    }
    setSectionsLoading(false)
  }, [selectedSection])

  const loadEntries = useCallback(async (sectionId) => {
    if (!sectionId) return
    const { data, error: err } = await supabase
      .from('docs_entries')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true })
    if (err) setError(err.message)
    else setEntries(data ?? [])
  }, [])

  useEffect(() => {
    if (hasAccess) loadSections()
  }, [hasAccess, loadSections])

  useEffect(() => {
    if (selectedSection) {
      setSelectedEntry(null)
      setEditing(false)
      setCreatingEntry(false)
      loadEntries(selectedSection)
    }
  }, [selectedSection, loadEntries])

  // Save entry (edit existing)
  const handleSaveEntry = async ({ title, content }) => {
    if (!selectedEntry) return
    const { error: err } = await supabase
      .from('docs_entries')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', selectedEntry.id)
    if (err) { setError(err.message); return }
    setEditing(false)
    await loadEntries(selectedSection)
    // Refresh selected entry with new data
    setSelectedEntry(prev => prev ? { ...prev, title, content } : null)
  }

  // Create new entry
  const handleCreateEntry = async ({ title, content }) => {
    const { data, error: err } = await supabase
      .from('docs_entries')
      .insert({
        section_id: selectedSection,
        title,
        content,
        sort_order: entries.length + 1,
      })
      .select()
      .single()
    if (err) { setError(err.message); return }
    setCreatingEntry(false)
    await loadEntries(selectedSection)
    setSelectedEntry(data)
  }

  // Delete entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm(t('docs.confirmDeleteEntry', 'Eliminar aquesta entrada?'))) return
    const { error: err } = await supabase.from('docs_entries').delete().eq('id', entryId)
    if (err) { setError(err.message); return }
    setSelectedEntry(null)
    await loadEntries(selectedSection)
  }

  // Loading spinner
  if (!accessChecked) {
    return (
      <div className="docs-loading docs-loading--fullpage">
        <Loader size={28} className="docs-spinner" />
      </div>
    )
  }

  // 403
  if (!hasAccess) return <AccessDenied />

  // Access management sub-page
  if (isAccessPage) return <DocsAccessPage userEmail={userEmail} />

  const currentSection = sections.find(s => s.id === selectedSection)
  const entriesForSection = entries

  return (
    <div className="docs-root" data-dark={darkMode ? '' : undefined}>
      <Header
        title={t('nav.docs', 'Documentació')}
        rightSlot={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/docs/access')}
          >
            <ShieldAlert size={15} />
            {t('docs.manageAccess', 'Accessos')}
          </Button>
        }
      />

      {error && (
        <div className="docs-error-banner" role="alert">
          {error}
          <button className="docs-icon-btn" onClick={() => setError(null)} type="button"><X size={14} /></button>
        </div>
      )}

      <div className="docs-layout">
        {/* Left: sections sidebar */}
        <aside className="docs-sections-sidebar">
          {sectionsLoading ? (
            <div className="docs-loading"><Loader size={18} className="docs-spinner" /></div>
          ) : sections.length === 0 ? (
            <p className="docs-empty-hint">{t('docs.noSections', 'Encara no hi ha seccions.')}</p>
          ) : (
            sections.map(section => (
              <button
                key={section.id}
                className={`docs-section-btn ${selectedSection === section.id ? 'docs-section-btn--active' : ''}`}
                onClick={() => setSelectedSection(section.id)}
                type="button"
              >
                <BookOpen size={16} />
                <span className="docs-section-btn__label">{section.title}</span>
                {selectedSection === section.id && <ChevronRight size={14} className="docs-section-btn__arrow" />}
              </button>
            ))
          )}
        </aside>

        {/* Right: entries + content */}
        <div className="docs-main">
          {/* Entries list panel */}
          <div className="docs-entries-panel">
            <div className="docs-entries-panel__header">
              <span className="docs-entries-panel__title">
                {currentSection?.title ?? t('docs.selectSection', 'Selecciona una secció')}
              </span>
              <button
                className="docs-icon-btn docs-icon-btn--primary"
                onClick={() => { setSelectedEntry(null); setEditing(false); setCreatingEntry(true) }}
                title={t('docs.newEntry', '+ Nova entrada')}
                type="button"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="docs-entries-list">
              {entriesForSection.length === 0 ? (
                <p className="docs-empty-hint">{t('docs.noEntries', 'Encara no hi ha entrades en aquesta secció.')}</p>
              ) : (
                entriesForSection.map(entry => (
                  <button
                    key={entry.id}
                    className={`docs-entry-item ${selectedEntry?.id === entry.id ? 'docs-entry-item--active' : ''}`}
                    onClick={() => { setSelectedEntry(entry); setEditing(false); setCreatingEntry(false) }}
                    type="button"
                  >
                    <FileText size={14} />
                    <span className="docs-entry-item__title">{entry.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Content panel */}
          <div className="docs-content-panel">
            {creatingEntry ? (
              <EntryEditor
                entry={null}
                onSave={handleCreateEntry}
                onCancel={() => setCreatingEntry(false)}
              />
            ) : editing && selectedEntry ? (
              <EntryEditor
                entry={selectedEntry}
                onSave={handleSaveEntry}
                onCancel={() => setEditing(false)}
              />
            ) : selectedEntry ? (
              <article className="docs-article">
                <div className="docs-article__header">
                  <h2 className="docs-article__title">{selectedEntry.title}</h2>
                  <div className="docs-article__actions">
                    <button
                      className="docs-icon-btn"
                      onClick={() => setEditing(true)}
                      title={t('docs.editEntry', 'Editar')}
                      type="button"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="docs-icon-btn docs-icon-btn--danger"
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      title={t('docs.deleteEntry', 'Eliminar')}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {selectedEntry.tags?.length > 0 && (
                  <div className="docs-tags">
                    {selectedEntry.tags.map(tag => (
                      <span key={tag} className="docs-tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div
                  className="docs-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedEntry.content) }}
                />
              </article>
            ) : (
              <div className="docs-placeholder">
                <BookOpen size={40} className="docs-placeholder__icon" />
                <p className="docs-placeholder__text">{t('docs.selectEntry', 'Selecciona una entrada per llegir-la.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
