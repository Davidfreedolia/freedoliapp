import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader, FolderPlus, Hash, Tag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createProject, updateProject, generateProjectCode } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { logSuccess, logError } from '../lib/auditLog'
import { handleError } from '../lib/errorHandling'
import { showToast } from './Toast'
import Button from './Button'

const PHASES = [
  { id: 1, name: 'Recerca', icon: '🔍' },
  { id: 2, name: 'Viabilitat', icon: '📊' },
  { id: 3, name: 'Proveïdors', icon: '🏭' },
  { id: 4, name: 'Mostres', icon: '📦' },
  { id: 5, name: 'Producció', icon: '⚙️' },
  { id: 6, name: 'Listing', icon: '📝' },
  { id: 7, name: 'Live', icon: '🚀' }
]

export default function NewProjectModal({ isOpen, onClose }) {
  const { refreshProjects, driveConnected } = useApp()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [creatingFolders, setCreatingFolders] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
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
        name: formData.name.trim(),
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
              {t('projects.projectName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Velvet Hangers Set"
              className="fd-field__input"
              required
              autoFocus
            />
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
            <FolderPlus size={18} color="var(--muted-1)" />
            <span>
              {driveConnected
                ? t('projects.driveFolderWillBeCreated', { sku: projectCodes.sku || '...' })
                : t('projects.connectDriveToCreateFolders')
              }
            </span>
          </div>

          <div className="fd-modal__phases">
            <span className="fd-modal__phases-label">
              {t('projects.projectPhases')}:
            </span>
            <div className="fd-modal__phases-row">
              {PHASES.map((phase, index) => (
                <div key={phase.id} className="fd-modal__phase-item">
                  <span className="fd-modal__phase-icon">{phase.icon}</span>
                  {index < PHASES.length - 1 && (
                    <div className="fd-modal__phase-line" />
                  )}
                </div>
              ))}
            </div>
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
              disabled={loading || generatingCode || !projectCodes.projectCode}
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

