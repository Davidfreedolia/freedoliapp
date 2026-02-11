import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader, FolderPlus, Hash, Tag, Link } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createProject, updateProject, generateProjectCode } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { logSuccess, logError } from '../lib/auditLog'
import { handleError } from '../lib/errorHandling'
import { showToast } from './Toast'
import Button from './Button'

export default function NewProjectModal({ isOpen, onClose }) {
  const { refreshProjects, driveConnected } = useApp()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const reportInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [creatingFolders, setCreatingFolders] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [createMode, setCreateMode] = useState('asin')
  const [asinOrUrl, setAsinOrUrl] = useState('')
  const [reportFile, setReportFile] = useState(null)
  const [reportParsed, setReportParsed] = useState({ asin: '', title: '', thumb_url: '' })
  const [projectCodes, setProjectCodes] = useState({ projectCode: '', sku: '' })
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

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

  if (!isOpen) return null

  const extractAsin = (value) => {
    const v = (value || '').trim()
    if (!v) return ''
    if (/^[A-Z0-9]{10}$/i.test(v)) return v.toUpperCase()
    const m = v.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i)
    return m?.[1]?.toUpperCase() || ''
  }

  const parseReport = (text) => {
    const getValues = (key) => {
      const re = new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'gmi')
      const values = []
      let match
      while ((match = re.exec(text))) {
        const v = (match[1] || '').trim()
        if (v) values.push(v)
      }
      return values
    }

    const asinValues = getValues('asin')
    const asin = asinValues
      .map(v => v.match(/[A-Z0-9]{10}/i)?.[0] || '')
      .find(v => v) || ''

    const title = getValues('title')[0] || ''

    const thumbValues = getValues('thumb_url')
    const thumb_url = thumbValues.find(v => /^https?:\/\//i.test(v)) || ''

    return { asin, title, thumb_url }
  }

  const handleReportFile = async (file) => {
    try {
      const text = await file.text()
      const parsed = parseReport(text)
      setReportParsed(parsed)
      setReportFile(file)
    } catch {
      setReportParsed({ asin: '', title: '', thumb_url: '' })
      setReportFile(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const finalAsin = createMode === 'report' ? (reportParsed?.asin || '').trim() : extractAsin(asinOrUrl)
    if (!finalAsin) return
    const finalName = formData.name.trim()
      || (createMode === 'report' ? (reportParsed?.title || '').trim() : '')
      || finalAsin
    if (!projectCodes.projectCode) {
      showToast('Error: No s\'ha pogut generar el codi de projecte', 'error')
      return
    }

    setLoading(true)
    try {
      // Crear projecte primer a Supabase (sense drive_folder_id encara)
      const newProject = await createProject({
        project_code: projectCodes.projectCode,  // PR-FRDL250001
        sku: projectCodes.sku,                    // FRDL250001
        name: finalName,
        description: formData.description.trim() || null,
        current_phase: 1,
        status: 'active',
        drive_folder_id: null  // S'assignarà després
      })

      // Audit log: projecte creat
      await logSuccess('project', 'create', newProject.id, 'Project created successfully', {
        project_code: projectCodes.projectCode,
        sku: projectCodes.sku,
        name: formData.name.trim()
      })

      // Crear carpetes a Drive si connectat (idempotent)
      let driveFolderId = null
      if (driveConnected) {
        setCreatingFolders(true)
        try {
          const folders = await driveService.ensureProjectDriveFolders({
            id: newProject.id,
            project_code: projectCodes.projectCode,
            sku: projectCodes.sku,
            name: formData.name.trim(),
            drive_folder_id: null
          })
          driveFolderId = folders.main.id
          
          // Actualitzar projecte amb drive_folder_id
          await updateProject(newProject.id, { drive_folder_id: driveFolderId })
        } catch (err) {
          // Audit log: error creant carpetes
          await logError('drive', 'ensure_folders', err, { project_id: newProject.id })
          await handleError('drive', 'ensure_folders', err, { notify: true })
        }
        setCreatingFolders(false)
      }

      await refreshProjects()
      setFormData({ name: '', description: '' })
      setProjectCodes({ projectCode: '', sku: '' })
      onClose()
      // Redirigir al Dashboard després de crear projecte
      navigate('/')
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
    setReportFile(null)
    setReportParsed({ asin: '', title: '', thumb_url: '' })
    onClose()
  }

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
                  onChange={(e) => setAsinOrUrl(e.target.value)}
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
            </div>
            <div className="fd-field">
              <label className="fd-field__label">{t('projects.projectName')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                <div className="fd-modal__preview">
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
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder={t('projects.descriptionPlaceholder')}
              rows={3}
              className="fd-field__input fd-field__textarea"
            />
          </div>

          <div className="fd-modal__drive-info">
            <FolderPlus size={14} color="var(--muted-1)" />
            <span>
              {driveConnected
                ? t('projects.driveFolderWillBeCreated', { sku: projectCodes.sku || '...' })
                : t('projects.connectDriveToCreateFolders')
              }
            </span>
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

