import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader, FolderPlus, Hash, Tag } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createProject, updateProject, generateProjectCode } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { logSuccess, logError } from '../lib/auditLog'
import { handleError } from '../lib/errorHandling'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

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
  const { refreshProjects, darkMode, driveConnected } = useApp()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const [loading, setLoading] = useState(false)
  const [creatingFolders, setCreatingFolders] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [projectCodes, setProjectCodes] = useState({ projectCode: '', sku: '' })
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // Generar codi automàticament quan s'obre el modal
  useEffect(() => {
    if (isOpen) {
      loadNextCode()
    }
  }, [isOpen])

  const loadNextCode = async () => {
    setGeneratingCode(true)
    try {
      const codes = await generateProjectCode()
      setProjectCodes(codes)
    } catch (err) {
      console.error('Error generant codi:', err)
    }
    setGeneratingCode(false)
  }

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (!projectCodes.projectCode) {
      alert('Error: No s\'ha pogut generar el codi de projecte')
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
    <div style={{
      ...styles.overlay,
      ...modalStyles.overlay
    }} onClick={handleClose}>
      <div 
        style={{
          ...styles.modal,
          ...modalStyles.modal
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={{
            ...styles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Nou Projecte
          </h2>
          <button onClick={handleClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* Codis generats automàticament */}
          <div style={{
            ...styles.codesContainer,
            backgroundColor: darkMode ? '#1f1f2e' : '#f0f9ff',
            borderColor: darkMode ? '#2a2a3a' : '#bae6fd'
          }}>
            <div style={styles.codeRow}>
              <div style={styles.codeItem}>
                <div style={styles.codeLabel}>
                  <Hash size={14} color="#4f46e5" />
                  <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Codi Projecte</span>
                </div>
                <span style={{
                  ...styles.codeValue,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {generatingCode ? (
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    projectCodes.projectCode || '—'
                  )}
                </span>
              </div>
              <div style={styles.codeItem}>
                <div style={styles.codeLabel}>
                  <Tag size={14} color="#22c55e" />
                  <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>SKU Producte</span>
                </div>
                <span style={{
                  ...styles.codeValue,
                  color: '#22c55e',
                  fontWeight: '700'
                }}>
                  {generatingCode ? (
                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    projectCodes.sku || '—'
                  )}
                </span>
              </div>
            </div>
            <p style={styles.codeHint}>
              ℹ️ Els codis es generen automàticament. El SKU s'usarà per identificar el producte a Amazon i a les comandes.
            </p>
          </div>

          <div style={styles.field}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#9ca3af' : '#374151'
            }}>
              Nom del projecte *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Velvet Hangers Set"
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#2a2a3a' : '#e5e7eb'
              }}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#9ca3af' : '#374151'
            }}>
              Descripció
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Descripció breu del producte..."
              rows={3}
              style={{
                ...styles.input,
                ...styles.textarea,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#2a2a3a' : '#e5e7eb'
              }}
            />
          </div>

          {/* Info Drive */}
          <div style={{
            ...styles.driveInfo,
            backgroundColor: driveConnected 
              ? (darkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)')
              : (darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)')
          }}>
            <FolderPlus size={18} color={driveConnected ? '#22c55e' : '#ef4444'} />
            <span style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '13px' }}>
              {driveConnected 
                ? `Es crearà la carpeta "${projectCodes.sku || '...'}" a Google Drive automàticament`
                : 'Connecta Google Drive per crear carpetes automàticament'
              }
            </span>
          </div>

          {/* Fases preview */}
          <div style={styles.phasesPreview}>
            <span style={{
              fontSize: '12px',
              color: darkMode ? '#6b7280' : '#9ca3af',
              marginBottom: '8px',
              display: 'block'
            }}>
              Fases del projecte:
            </span>
            <div style={styles.phasesRow}>
              {PHASES.map((phase, index) => (
                <div key={phase.id} style={styles.phaseItem}>
                  <span style={styles.phaseIcon}>{phase.icon}</span>
                  {index < PHASES.length - 1 && (
                    <div style={styles.phaseLine} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div style={styles.buttons}>
            <button 
              type="button" 
              onClick={handleClose}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}
            >
              Cancel·lar
            </button>
            <button 
              type="submit"
              disabled={loading || generatingCode || !projectCodes.projectCode}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                opacity: (loading || generatingCode || !projectCodes.projectCode) ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {creatingFolders ? 'Creant carpetes...' : 'Creant...'}
                </>
              ) : (
                'Crear Projecte'
              )}
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
    width: '100%',
    maxWidth: '520px',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280'
  },
  form: {
    padding: '24px'
  },
  codesContainer: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid',
    marginBottom: '20px'
  },
  codeRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  codeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  codeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  },
  codeValue: {
    fontSize: '18px',
    fontWeight: '600',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center'
  },
  codeHint: {
    margin: '12px 0 0 0',
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.4'
  },
  field: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  textarea: {
    resize: 'vertical',
    minHeight: '80px'
  },
  driveInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px'
  },
  phasesPreview: {
    marginBottom: '24px'
  },
  phasesRow: {
    display: 'flex',
    alignItems: 'center'
  },
  phaseItem: {
    display: 'flex',
    alignItems: 'center'
  },
  phaseIcon: {
    fontSize: '18px'
  },
  phaseLine: {
    width: '20px',
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '0 4px'
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  button: {
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: '1px solid var(--border-color, #e5e7eb)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  buttonSecondary: {
    border: '1px solid var(--border-color, #e5e7eb)'
  },
  buttonPrimary: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: '1px solid #3730a3'
  }
}
