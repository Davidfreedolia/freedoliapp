import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader, Hash, Tag, Link } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createProject, updateProject, generateProjectCode } from '../lib/supabase'
import { logSuccess, logError } from '../lib/auditLog'
import { handleError } from '../lib/errorHandling'
import { showToast } from './Toast'
import Button from './Button'
import { downloadPrompt } from '../utils/marketResearchPrompt'

export default function NewProjectModal({ isOpen, onClose }) {
  const { refreshProjects } = useApp()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const reportInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [createMode, setCreateMode] = useState('asin')
  const [asinOrUrl, setAsinOrUrl] = useState('')
  const [asinError, setAsinError] = useState('')
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichError, setEnrichError] = useState('')
  const [touchedName, setTouchedName] = useState(false)
  const [touchedDescription, setTouchedDescription] = useState(false)
  const [enrichData, setEnrichData] = useState({
    title: '',
    short_description: '',
    thumb_url: '',
    product_url: ''
  })
  const [reportFile, setReportFile] = useState(null)
  const [reportParsed, setReportParsed] = useState({
    asin: '',
    title: '',
    thumb_url: '',
    product_url: '',
    summary: ''
  })
  const [projectCodes, setProjectCodes] = useState({ projectCode: '', sku: '' })
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [newProjectClaudePrompt, setNewProjectClaudePrompt] = useState(null)

  /** ASIN per al prompt: 10 alfanumèrics o extret de URL /dp/ o /gp/product/ */
  const deriveAsinForPrompt = (input) => {
    const v = (input || '').trim()
    if (!v) return null
    if (/^[A-Z0-9]{10}$/i.test(v)) return v.toUpperCase()
    if (isUrlLike(v)) {
      const m = v.match(/\/dp\/([A-Z0-9]{10})/i) || v.match(/\/gp\/product\/([A-Z0-9]{10})/i)
      return m?.[1]?.toUpperCase() ?? null
    }
    return null
  }

  /** Marketplace a partir de URL: amazon.es -> Amazon ES, etc. Per defecte Amazon ES. */
  const deriveMarketplaceFromUrl = (url) => {
    const u = (url || '').trim()
    if (!u) return 'Amazon ES'
    const m = u.match(/amazon\.(co\.uk|es|de|fr|it)/i)
    if (!m) return 'Amazon ES'
    const tld = m[1].toLowerCase()
    const map = { 'co.uk': 'Amazon UK', es: 'Amazon ES', de: 'Amazon DE', fr: 'Amazon FR', it: 'Amazon IT' }
    return map[tld] || 'Amazon ES'
  }

  const loadNextCode = useCallback(async () => {
    setGeneratingCode(true)
    try {
      const codes = await generateProjectCode()
      setProjectCodes(codes)
    } catch (err) {
      console.error('Error generant codi:', err)
    }
    setGeneratingCode(false)
  }, [])

  // Generar codi automàticament quan s'obre el modal
  useEffect(() => {
    if (isOpen) {
      loadNextCode()
    }
  }, [isOpen, loadNextCode])

  const isUrlLike = (value) => /^https?:\/\//i.test((value || '').trim())

  const extractAsin = (value) => {
    const v = (value || '').trim()
    if (!v) return ''
    if (isUrlLike(v)) {
      const urlMatch = v.match(/(?:\/dp\/|\/gp\/product\/)(B0[A-Z0-9]{8})/i)
      return urlMatch?.[1]?.toUpperCase() || ''
    }
    const textMatch = v.match(/\bB0[A-Z0-9]{8}\b/i)
    return textMatch?.[0]?.toUpperCase() || ''
  }

  const normalizeAmazonUrl = (input, asin) => {
    const safeAsin = (asin || '').trim().toUpperCase()
    if (!safeAsin) return ''
    const match = (input || '').match(/amazon\.(co\.[a-z]{2}|[a-z]{2,})/i)
    const tld = match?.[1]?.toLowerCase() || 'es'
    return `https://www.amazon.${tld}/dp/${safeAsin}`
  }

  const buildAmazonThumbUrl = (asin) => {
    const safeAsin = (asin || '').trim().toUpperCase()
    if (!safeAsin) return ''
    return `https://m.media-amazon.com/images/P/${safeAsin}.01._SX300_SY300_.jpg`
  }

  const parseReport = (text) => {
    const getSection = (label) => {
      const re = new RegExp(`${label}[\\s\\S]*?(?=\\n#|\\n##|\\n###|$)`, 'i')
      const m = text.match(re)
      return m ? m[0] : ''
    }
    const getValue = (section, key) => {
      const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'mi')
      const m = section.match(re)
      return m ? (m[1] || '').trim() : ''
    }
    const snapshot = getSection('PRODUCT_SNAPSHOT')
    const decision = getSection('FINAL_DECISION')
    const asin = extractAsin(getValue(snapshot, 'asin'))
    const title = getValue(snapshot, 'title')
    const thumb_url = getValue(snapshot, 'thumb_url')
    const product_url = getValue(snapshot, 'product_url')
    const summary = getValue(decision, 'summary')
    return { asin, title, thumb_url, product_url, summary }
  }

  const truncateText = (value, max) => {
    const v = (value || '').trim()
    if (!v) return ''
    return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v
  }

  const handleReportFile = async (file) => {
    try {
      const text = await file.text()
      const parsed = parseReport(text)
      setReportParsed(parsed)
      setReportFile(file)
      setFormData(prev => ({
        ...prev,
        name: prev.name.trim() ? prev.name : (parsed.title || ''),
        description: prev.description.trim()
          ? prev.description
          : truncateText(parsed.summary, 180)
      }))
    } catch {
      setReportParsed({ asin: '', title: '', thumb_url: '', product_url: '', summary: '' })
      setReportFile(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalAsin = createMode === 'report'
      ? extractAsin(reportParsed?.asin || '')
      : extractAsin(asinOrUrl)
    if (!finalAsin) return
    const generatedThumbUrl = buildAmazonThumbUrl(finalAsin)
    const finalName = formData.name.trim()
      || (createMode === 'report' ? (reportParsed?.title || '').trim() : '')
      || `ASIN ${finalAsin}`
    const finalDescription = formData.description.trim()
      || (createMode === 'report' ? truncateText(reportParsed?.summary, 180) : '')
    const finalThumbUrl = createMode === 'report'
      ? ((reportParsed?.thumb_url || '').trim() || generatedThumbUrl)
      : ((enrichData.thumb_url || '').trim() || generatedThumbUrl)
    const finalProductUrl = createMode === 'report'
      ? normalizeAmazonUrl(reportParsed?.product_url || '', finalAsin)
      : (enrichData.product_url || normalizeAmazonUrl(asinOrUrl, finalAsin))
    if (!projectCodes.projectCode) {
      showToast('Error: No s\'ha pogut generar el codi de projecte', 'error')
      return
    }

    setLoading(true)
    try {
      // Crear projecte a Supabase
      const payload = {
        project_code: projectCodes.projectCode,  // PR-FRDL250001
        sku: projectCodes.sku,                    // FRDL250001
        name: finalName,
        description: finalDescription || null,
        asin: finalAsin,
        product_url: finalProductUrl,
        current_phase: 1,
        status: 'active'
      }
      payload.thumb_url = finalThumbUrl
      const newProject = await createProject(payload)

      // Audit log: projecte creat
      await logSuccess('project', 'create', newProject.id, 'Project created successfully', {
        project_code: projectCodes.projectCode,
        sku: projectCodes.sku,
        name: formData.name.trim()
      })

      try {
        const snapshot = {
          asin: finalAsin,
          url: finalProductUrl,
          title: finalName,
          thumbUrl: finalThumbUrl
        }
        const seed = {
          asinInput: createMode === 'report' ? finalProductUrl || finalAsin : asinOrUrl,
          snapshot
        }
        localStorage.setItem(`research_${newProject.id}`, JSON.stringify(seed))
      } catch (_) {}
      refreshProjects()
      setFormData({ name: '', description: '' })
      setProjectCodes({ projectCode: '', sku: '' })
      handleClose()
      navigate(`/projects/${newProject.id}`, { replace: true })
    } catch (err) {
      // Audit log: error creant projecte
      await logError('project', 'create', err, { 
        project_code: projectCodes.projectCode,
        name: formData.name.trim()
      })
      await handleError('project', 'create', err, { notify: true })
    }
    setLoading(false)
  }

  const handleClose = () => {
    setFormData({ name: '', description: '' })
    setProjectCodes({ projectCode: '', sku: '' })
    setCreateMode('asin')
    setAsinOrUrl('')
    setEnrichLoading(false)
    setEnrichError('')
    setTouchedName(false)
    setTouchedDescription(false)
    setEnrichData({ title: '', short_description: '', thumb_url: '', product_url: '' })
    setReportFile(null)
    setReportParsed({ asin: '', title: '', thumb_url: '', product_url: '', summary: '' })
    setNewProjectClaudePrompt(null)
    onClose()
  }

  const modalAsin = createMode === 'asin'
    ? deriveAsinForPrompt(asinOrUrl)
    : (extractAsin(reportParsed?.asin || '') || deriveAsinForPrompt(reportParsed?.product_url || '') || null)
  const modalMarketplace = createMode === 'asin'
    ? deriveMarketplaceFromUrl(asinOrUrl)
    : deriveMarketplaceFromUrl(reportParsed?.product_url)

  const asinPreview = extractAsin(asinOrUrl)
  const asinThumbUrl = (enrichData.thumb_url || '').trim() || buildAmazonThumbUrl(asinPreview)

  useEffect(() => {
    if (!isOpen) return
    if (createMode !== 'asin') return
    const asin = extractAsin(asinOrUrl)
    if (!asin) {
      setEnrichLoading(false)
      setEnrichError('')
      setEnrichData({ title: '', short_description: '', thumb_url: '', product_url: '' })
      return
    }
    setEnrichLoading(true)
    setEnrichError('')
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/asin-enrich?asin=${asin}&market=es`, {
          signal: controller.signal
        })
        if (!res.ok) {
          setEnrichError('No s’han pogut carregar dades (fallback)')
          setEnrichData({ title: '', short_description: '', thumb_url: '', product_url: '' })
          return
        }
        const data = await res.json()
        setEnrichData({
          title: data?.title || '',
          short_description: data?.short_description || '',
          thumb_url: data?.thumb_url || '',
          product_url: data?.product_url || ''
        })
        if (!touchedName && !formData.name.trim() && data?.title) {
          setFormData(prev => ({ ...prev, name: data.title }))
        }
        if (!touchedDescription && !formData.description.trim() && data?.short_description) {
          setFormData(prev => ({ ...prev, description: data.short_description }))
        }
        if (data?.source === 'fallback') {
          setEnrichError('No s’han pogut carregar dades (fallback)')
        }
      } catch {
        setEnrichError('No s’han pogut carregar dades (fallback)')
      } finally {
        setEnrichLoading(false)
      }
    }, 400)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [asinOrUrl, createMode, isOpen, touchedName, touchedDescription, formData.name, formData.description])

  if (!isOpen) return null

  return (
    <div className="fd-modal__overlay" onClick={handleClose}>
      <div className="fd-modal" onClick={e => e.stopPropagation()}>
        <div className="fd-modal__header">
          <h2 className="fd-modal__title">
            {t('projects.newProject')}
          </h2>
          <button type="button" className="fd-modal__close" onClick={handleClose} aria-label="Tancar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fd-modal__body">
          <div className="fd-modal__segment">
            <button
              type="button"
              className={`fd-modal__segment-btn ${createMode === 'asin' ? 'is-active' : ''}`}
              onClick={() => setCreateMode('asin')}
            >
              ASIN / URL
            </button>
            <button
              type="button"
              className={`fd-modal__segment-btn ${createMode === 'report' ? 'is-active' : ''}`}
              onClick={() => setCreateMode('report')}
            >
              Informe .md
            </button>
          </div>

          <div className="fd-modal__mode">
            <div className="fd-field">
              <label className="fd-field__label">ASIN o URL</label>
              <div className="fd-field__input-wrap">
                <Link size={16} className="fd-field__input-icon" />
                <input
                  type="text"
                  value={asinOrUrl}
                  onChange={(e) => {
                    const next = e.target.value
                    setAsinOrUrl(next)
                    if (!next.trim()) {
                      setAsinError('')
                      return
                    }
                    const asin = extractAsin(next)
                    if (!asin && isUrlLike(next)) {
                      setAsinError('Aquest enllaç no és una fitxa de producte. Enganxa la URL /dp/ASIN o l’ASIN.')
                    } else {
                      setAsinError('')
                    }
                  }}
                  placeholder="B0XXXXXXXX o https://www.amazon.../dp/B0XXXXXXXX"
                  className="fd-field__input fd-field__input--icon"
                  disabled={createMode === 'report'}
                />
              </div>
              {createMode === 'report' ? (
                <div className="fd-modal__microcopy">
                  L’informe ja conté l’ASIN i dades clau.
                </div>
              ) : null}
              {createMode !== 'report' ? (
                <div className="fd-modal__microcopy">
                  Formats: B0XXXXXXX o https://amazon.xx/dp/B0XXXXXXX
                </div>
              ) : null}
              {createMode !== 'report' && asinError ? (
                <div className="fd-field__error">{asinError}</div>
              ) : null}
              {createMode === 'asin' && enrichLoading ? (
                <div className="fd-modal__microcopy">Carregant dades del producte…</div>
              ) : null}
              {createMode === 'asin' && enrichError ? (
                <div className="fd-field__error">No s’han pogut carregar dades (es crea igualment).</div>
              ) : null}
            </div>
            {createMode === 'asin' && asinPreview ? (
              <div className="fd-modal__preview fd-modal__preview--compact">
                <div className="fd-modal__preview-meta">
                  <div className="fd-modal__preview-asin">ASIN {asinPreview}</div>
                  <div className="fd-modal__preview-title">
                    {formData.name.trim() ? formData.name : `ASIN ${asinPreview}`}
                  </div>
                </div>
                {asinThumbUrl ? (
                  <img className="fd-modal__preview-img" src={asinThumbUrl} alt="" />
                ) : (
                  <div className="fd-modal__preview-img fd-modal__preview-img--placeholder" />
                )}
              </div>
            ) : null}
            <div className="fd-field">
              <label className="fd-field__label">{t('projects.projectName')}</label>
              <input
                type="text"
                value={formData.name}
                  onChange={e => {
                    setTouchedName(true)
                    setFormData({ ...formData, name: e.target.value })
                  }}
                placeholder="Nom del projecte (opcional)"
                className="fd-field__input"
              />
            </div>
          </div>

          {createMode === 'report' ? (
            <div className="fd-modal__mode">
              <input
                ref={reportInputRef}
                type="file"
                accept=".md"
                className="fd-modal__file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleReportFile(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                className="fd-modal__dropzone"
                onClick={() => reportInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleReportFile(f)
                }}
              >
                <span>Arrossega l’informe .md aquí o fes clic</span>
              </button>
              {reportFile ? (
                <div className="fd-modal__preview fd-modal__preview--compact">
                  <div className="fd-modal__preview-meta">
                    <div className="fd-modal__preview-asin">{reportParsed.asin || '—'}</div>
                    <div className="fd-modal__preview-title">{reportParsed.title || formData.name || '—'}</div>
                  </div>
                  {reportParsed.thumb_url ? (
                    <img className="fd-modal__preview-img" src={reportParsed.thumb_url} alt="" />
                  ) : (
                    <div className="fd-modal__preview-img fd-modal__preview-img--placeholder" />
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="fd-modal__research-claude">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!modalAsin}
              onClick={async () => {
                if (!modalAsin) return
                const { generateClaudeResearchPrompt } = await import('../lib/generateClaudeResearchPrompt')
                const prompt = generateClaudeResearchPrompt({ asin: modalAsin, marketplace: modalMarketplace })
                setNewProjectClaudePrompt(prompt)
                showToast('Prompt generat', 'success')
              }}
            >
              Generar Prompt Claude
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!modalAsin}
              onClick={async () => {
                if (!modalAsin) return
                const { generateClaudeResearchPrompt } = await import('../lib/generateClaudeResearchPrompt')
                const text = newProjectClaudePrompt || generateClaudeResearchPrompt({ asin: modalAsin, marketplace: modalMarketplace })
                downloadPrompt(text, modalAsin)
              }}
            >
              Descarregar Prompt
            </Button>
          </div>

          <div className="fd-modal__codes">
            <div className="fd-modal__code-row">
              <div className="fd-modal__code-item">
                <div className="fd-modal__code-label">
                  <Hash size={14} color="var(--muted-1)" />
                  <span>{t('projects.projectCode')}</span>
                </div>
                <span className="fd-modal__code-value">
                  {generatingCode ? (
                    <Loader size={16} className="fd-spin" />
                  ) : (
                    projectCodes.projectCode || '—'
                  )}
                </span>
              </div>
              <div className="fd-modal__code-item">
                <div className="fd-modal__code-label">
                  <Tag size={14} color="var(--muted-1)" />
                  <span>{t('projects.productSku')}</span>
                </div>
                <span className="fd-modal__code-value fd-modal__code-value--accent">
                  {generatingCode ? (
                    <Loader size={16} className="fd-spin" />
                  ) : (
                    projectCodes.sku || '—'
                  )}
                </span>
              </div>
            </div>
            <p className="fd-modal__hint">
              ℹ️ {t('projects.codesAutoGenerated')}
            </p>
          </div>

          <div className="fd-field">
            <label className="fd-field__label">
              {t('projects.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={e => {
                setTouchedDescription(true)
                setFormData({ ...formData, description: e.target.value })
              }}
              placeholder={t('projects.descriptionPlaceholder')}
              rows={3}
              className="fd-field__input fd-field__textarea"
            />
          </div>



          <div className="fd-modal__footer">
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={handleClose}
            >
              {t('common.cancel', 'Cancel·lar')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={
                loading ||
                generatingCode ||
                !projectCodes.projectCode ||
                (createMode === 'asin' ? !extractAsin(asinOrUrl) : !reportFile || !reportParsed.asin)
              }
            >
              {loading ? (
                <>
                  <Loader size={18} className="fd-spin" />
                  {creatingFolders ? t('projects.creatingFolders') : t('common.creating')}
                </>
              ) : (
                t('projects.createProject')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

