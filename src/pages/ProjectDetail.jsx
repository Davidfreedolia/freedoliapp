import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  ChevronRight, 
  Check,
  Upload,
  FileText,
  FolderOpen,
  ExternalLink,
  Plus,
  AlertCircle,
  ClipboardList,
  ShoppingCart,
  Package
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getProject, updateProject, getDocuments, createDocument } from '../lib/supabase'
import { driveService, PROJECT_SUBFOLDERS } from '../lib/googleDrive'
import Header from '../components/Header'
import FileUploader from '../components/FileUploader'
import FileBrowser from '../components/FileBrowser'

const PHASES = [
  { id: 1, name: 'Recerca', icon: '🔍', color: '#6366f1', description: 'Investigació de producte i mercat' },
  { id: 2, name: 'Viabilitat', icon: '📊', color: '#8b5cf6', description: 'Anàlisi de costos i rentabilitat' },
  { id: 3, name: 'Proveïdors', icon: '🏭', color: '#ec4899', description: 'Cerca i negociació amb fabricants' },
  { id: 4, name: 'Mostres', icon: '📦', color: '#f59e0b', description: 'Sol·licitud i verificació de mostres' },
  { id: 5, name: 'Producció', icon: '⚙️', color: '#10b981', description: 'Fabricació i control de qualitat' },
  { id: 6, name: 'Listing', icon: '📝', color: '#3b82f6', description: 'Creació del listing a Amazon' },
  { id: 7, name: 'Live', icon: '🚀', color: '#22c55e', description: 'Producte actiu, seguiment vendes' }
]

// Mapeig fase -> carpeta Drive
const PHASE_FOLDER_MAP = {
  1: '01_Research',
  2: '01_Research', // Viabilitat també usa Research
  3: '02_Quotations',
  4: '08_Samples',
  5: '03_PurchaseOrders',
  6: '09_Listings',
  7: '09_Listings'
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { darkMode, driveConnected, refreshProjects } = useApp()
  
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectFolders, setProjectFolders] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    loadProject()
  }, [id])

  useEffect(() => {
    if (project && driveConnected) {
      loadDriveFolders()
    }
  }, [project, driveConnected])

  const loadProject = async () => {
    setLoading(true)
    try {
      const data = await getProject(id)
      setProject(data)
      const docs = await getDocuments(id)
      setDocuments(docs || [])
    } catch (err) {
      console.error('Error carregant projecte:', err)
      navigate('/projects')
    }
    setLoading(false)
  }

  const loadDriveFolders = async () => {
    try {
      // Usar ensureProjectDriveFolders per garantir idempotència
      const folders = await driveService.ensureProjectDriveFolders({
        id: project.id,
        project_code: project.project_code,
        sku: project.sku,
        name: project.name,
        drive_folder_id: project.drive_folder_id
      })
      
      setProjectFolders(folders)
      
      // Si no tenia drive_folder_id, guardar-lo ara
      if (!project.drive_folder_id && folders.main.id) {
        await updateProject(id, { drive_folder_id: folders.main.id })
        setProject({ ...project, drive_folder_id: folders.main.id })
      }
      
      // Seleccionar carpeta segons fase actual
      const folderName = PHASE_FOLDER_MAP[project.current_phase]
      if (folders.subfolders && folders.subfolders[folderName]) {
        setSelectedFolder(folders.subfolders[folderName])
      }
    } catch (err) {
      console.error('Error amb carpetes Drive:', err)
      if (err.message === 'AUTH_REQUIRED') {
        alert('Reconnecta Google Drive. La sessió ha expirat.')
      } else {
        alert('Error gestionant carpetes de Drive: ' + (err.message || 'Error desconegut'))
      }
    }
  }

  const handlePhaseChange = async (newPhase) => {
    try {
      await updateProject(id, { current_phase: newPhase })
      setProject({ ...project, current_phase: newPhase })
      await refreshProjects()
      
      // Redirigir al Dashboard després d'editar el projecte
      navigate('/')
    } catch (err) {
      console.error('Error actualitzant fase:', err)
    }
  }

  const handleUploadComplete = async (files) => {
    // Guardar referències a Supabase (evita duplicats automàticament)
    let savedCount = 0
    let errorCount = 0
    const { logSuccess, logError } = await import('../lib/auditLog')
    
    for (const file of files) {
      try {
        const doc = await createDocument({
          project_id: id,
          name: file.name,
          file_url: file.webViewLink || file.driveUrl,
          drive_file_id: file.id,
          category: getCategoryForPhase(project.current_phase),
          file_size: file.size
        })
        savedCount++
        // Audit log: document pujat correctament
        await logSuccess('document', 'upload', doc.id, 'Document uploaded to Drive', {
          project_id: id,
          file_name: file.name,
          file_size: file.size,
          drive_file_id: file.id
        })
      } catch (err) {
        console.error('Error guardant document:', err)
        errorCount++
        // Audit log: error pujant document
        await logError('document', 'upload', err, {
          project_id: id,
          file_name: file.name,
          file_size: file.size,
          drive_file_id: file.id
        })
      }
    }
    
    // Recarregar documents
    try {
      const docs = await getDocuments(id)
      setDocuments(docs || [])
    } catch (err) {
      console.error('Error recarregant documents:', err)
    }
    
    // Mostrar feedback si hi ha errors
    if (errorCount > 0) {
      alert(`${errorCount} document(s) no s'han pogut guardar correctament.`)
    }
  }

  const getCategoryForPhase = (phase) => {
    const map = {
      1: 'analysis',
      2: 'analysis',
      3: 'quotation',
      4: 'sample',
      5: 'po',
      6: 'listing',
      7: 'other'
    }
    return map[phase] || 'other'
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Carregant..." />
        <div style={styles.loading}>Carregant projecte...</div>
      </div>
    )
  }

  if (!project) return null

  const currentPhase = PHASES.find(p => p.id === project.current_phase) || PHASES[0]

  return (
    <div style={styles.container}>
      <Header title={project.name} />

      <div style={styles.content}>
        {/* Back button & Project info */}
        <div style={styles.topBar}>
          <button onClick={() => navigate('/projects')} style={styles.backButton}>
            <ArrowLeft size={18} />
            Tornar
          </button>
          <div style={styles.projectMeta}>
            <span style={styles.projectCode}>{project.project_code}</span>
            {project.sku && (
              <span style={styles.sku}>SKU: {project.sku}</span>
            )}
          </div>
        </div>

        {/* Phase Timeline */}
        <div style={{
          ...styles.timelineSection,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{
            ...styles.sectionTitle,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Progrés del Projecte
          </h3>
          
          <div style={styles.timeline}>
            {PHASES.map((phase, index) => {
              const isActive = phase.id === project.current_phase
              const isCompleted = phase.id < project.current_phase
              
              return (
                <div key={phase.id} style={styles.timelineItem}>
                  <button
                    onClick={() => handlePhaseChange(phase.id)}
                    style={{
                      ...styles.phaseButton,
                      backgroundColor: isActive ? phase.color : (isCompleted ? `${phase.color}30` : 'var(--bg-secondary)'),
                      borderColor: isActive || isCompleted ? phase.color : 'var(--border-color)',
                      color: isActive ? '#ffffff' : (isCompleted ? phase.color : '#6b7280')
                    }}
                  >
                    {isCompleted ? <Check size={20} /> : <span style={{ fontSize: '20px' }}>{phase.icon}</span>}
                  </button>
                  <span style={{
                    ...styles.phaseName,
                    color: isActive ? phase.color : (darkMode ? '#9ca3af' : '#6b7280'),
                    fontWeight: isActive ? '600' : '400'
                  }}>
                    {phase.name}
                  </span>
                  {index < PHASES.length - 1 && (
                    <div style={{
                      ...styles.timelineConnector,
                      backgroundColor: isCompleted ? phase.color : 'var(--border-color)'
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current phase info */}
          <div style={{
            ...styles.currentPhaseInfo,
            backgroundColor: `${currentPhase.color}10`,
            borderColor: currentPhase.color
          }}>
            <div style={styles.currentPhaseHeader}>
              <span style={{ fontSize: '24px' }}>{currentPhase.icon}</span>
              <div>
                <h4 style={{ margin: 0, color: currentPhase.color }}>{currentPhase.name}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{currentPhase.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Drive Integration */}
        <div style={styles.driveSection}>
          {/* Folder selector */}
          {driveConnected && projectFolders ? (
            <div style={{
              ...styles.foldersPanel,
              backgroundColor: darkMode ? '#15151f' : '#ffffff'
            }}>
              <h3 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                <FolderOpen size={20} />
                Carpetes del Projecte
              </h3>
              
              <div style={styles.foldersList}>
                {PROJECT_SUBFOLDERS.map(folderName => {
                  const folder = projectFolders.subfolders?.[folderName]
                  const isSelected = selectedFolder?.name === folderName
                  
                  return (
                    <button
                      key={folderName}
                      onClick={() => folder && setSelectedFolder(folder)}
                      disabled={!folder}
                      style={{
                        ...styles.folderButton,
                        backgroundColor: isSelected ? '#4f46e510' : 'transparent',
                        borderColor: isSelected ? '#4f46e5' : 'var(--border-color)',
                        opacity: folder ? 1 : 0.5
                      }}
                    >
                      <FolderOpen size={16} color={isSelected ? '#4f46e5' : '#6b7280'} />
                      <span style={{
                        color: isSelected ? '#4f46e5' : (darkMode ? '#ffffff' : '#111827')
                      }}>
                        {folderName.replace(/^\d+_/, '')}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Open in Drive link */}
              <a 
                href={`https://drive.google.com/drive/folders/${projectFolders.main.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.driveLink}
              >
                <ExternalLink size={14} />
                Obrir a Google Drive
              </a>
            </div>
          ) : (
            <div style={{
              ...styles.driveWarning,
              backgroundColor: darkMode ? '#15151f' : '#ffffff'
            }}>
              <AlertCircle size={20} color="#f59e0b" />
              <span>Connecta Google Drive per gestionar documents</span>
            </div>
          )}

          {/* File browser & uploader */}
          {selectedFolder && (
            <div style={styles.filesPanel}>
              <FileUploader
                folderId={selectedFolder.id}
                onUploadComplete={handleUploadComplete}
                label={`Arrossega arxius a ${selectedFolder.name?.replace(/^\d+_/, '')}`}
              />
              
              <FileBrowser
                folderId={selectedFolder.id}
                folderName={selectedFolder.name?.replace(/^\d+_/, '')}
                allowDelete={true}
              />
            </div>
          )}
        </div>

        {/* Actions per fase */}
        <div style={{
          ...styles.actionsSection,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{
            ...styles.sectionTitle,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Accions del Projecte
          </h3>
          
          <div style={styles.actionsGrid}>
            {/* Briefing - disponible des de fase 3 */}
            {project.current_phase >= 3 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#8b5cf6'}} 
                onClick={() => navigate(`/projects/${id}/briefing`)}
              >
                <ClipboardList size={18} />
                Briefing del Producte
              </button>
            )}
            
            {/* Nova Comanda - disponible des de fase 3 */}
            {project.current_phase >= 3 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#4f46e5'}} 
                onClick={() => navigate(`/orders?project=${id}`)}
              >
                <ShoppingCart size={18} />
                Crear Comanda (PO)
              </button>
            )}
            
            {/* Gestionar Stock - fase 7 */}
            {project.current_phase === 7 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#22c55e'}} 
                onClick={() => navigate(`/inventory?project=${id}`)}
              >
                <Package size={18} />
                Gestionar Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  content: {
    padding: '32px',
    overflowY: 'auto'
  },
  loading: {
    padding: '64px',
    textAlign: 'center',
    color: '#6b7280'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer'
  },
  projectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  projectCode: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4f46e5'
  },
  sku: {
    fontSize: '13px',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    color: '#6b7280'
  },
  timelineSection: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  timeline: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    marginBottom: '24px'
  },
  timelineItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
    flex: 1
  },
  phaseButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    zIndex: 1
  },
  phaseName: {
    fontSize: '12px',
    textAlign: 'center'
  },
  timelineConnector: {
    position: 'absolute',
    top: '24px',
    left: '50%',
    width: '100%',
    height: '2px'
  },
  currentPhaseInfo: {
    padding: '16px 20px',
    borderRadius: '12px',
    borderLeft: '4px solid'
  },
  currentPhaseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  driveSection: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '24px',
    marginBottom: '24px'
  },
  foldersPanel: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  foldersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '16px'
  },
  folderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: '1px solid',
    borderRadius: '8px',
    background: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  driveLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#4f46e5',
    textDecoration: 'none'
  },
  driveWarning: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    color: '#6b7280'
  },
  filesPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  actionsSection: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  actionsGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }
}
