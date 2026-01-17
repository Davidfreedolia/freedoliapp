import { useState, useEffect, Suspense, lazy, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft, 
  Barcode,
  ChevronRight, 
  ChevronDown,
  Check,
  Upload,
  FileText,
  FolderOpen,
  ExternalLink,
  Plus,
  AlertCircle,
  ClipboardList,
  ShoppingCart,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Loader2,
  Image,
  Info,
  Calendar,
  Receipt,
  DollarSign,
  FileImage,
  Paperclip,
  StickyNote
} from 'lucide-react'
import Header from '../components/Header'
import FileUploader from '../components/FileUploader'
import FileBrowser from '../components/FileBrowser'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import ArtsFinalsSection from '../components/ArtsFinalsSection'
import CollapsibleSection from '../components/CollapsibleSection'
import PhaseChecklist from '../components/projects/PhaseChecklist'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { PHASE_STYLES, getPhaseStyle, getPhaseSurfaceStyles } from '../utils/phaseStyles'
// Dynamic imports for components that import supabase statically to avoid circular dependencies during module initialization
const IdentifiersSection = lazy(() => import('../components/IdentifiersSection'))
const ProfitabilityCalculator = lazy(() => import('../components/ProfitabilityCalculator'))
const QuickSupplierPriceEstimate = lazy(() => import('../components/QuickSupplierPriceEstimate'))
const TasksSection = lazy(() => import('../components/TasksSection'))
const QuotesSection = lazy(() => import('../components/QuotesSection'))
const DecisionLog = lazy(() => import('../components/DecisionLog'))
const AmazonReadinessBadge = lazy(() => import('../components/AmazonReadinessBadge'))
const ProjectEventsTimeline = lazy(() => import('../components/ProjectEventsTimeline'))
const CompetitiveAsinSection = lazy(() => import('../components/CompetitiveAsinSection'))

const PHASES = Object.values(PHASE_STYLES)
const PHASE_GROUPS = [
  { label: 'DISCOVERY', phases: [1, 2] },
  { label: 'SUPPLY', phases: [3, 4, 5] },
  { label: 'EXECUTION', phases: [6] },
  { label: 'LIVE', phases: [7] }
]
const PHASE_WORKFLOW_COPY = {
  1: 'Analitzant mercat i competència',
  2: 'Validant números i viabilitat real',
  3: 'Negociar proveïdors i obtenir pressupostos.',
  4: 'Validar mostres i aprovacions.',
  5: 'Producció en marxa i PO confirmada.',
  6: 'Preparar listing i identificadors Amazon.',
  7: 'Seguiment live, inventari i vendes.'
}
const PHASE_NAME_TO_ID = {
  research: 1,
  discovery: 1,
  viability: 2,
  suppliers: 3,
  provider: 3,
  samples: 4,
  production: 5,
  manufacturing: 5,
  listing: 6,
  live: 7,
  shipping: 5
}

const getPhaseIdFromProject = (project) => {
  if (!project) return 1
  if (project.current_phase) return project.current_phase
  const phaseName = (project.phase || '').toString().toLowerCase()
  return PHASE_NAME_TO_ID[phaseName] || 1
}

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

// Lazy import AppContext to avoid initializing supabase during module init
// Lazy load AppContext to avoid initializing supabase during module init
// We'll use a wrapper pattern where the outer component loads AppContext dynamically
// and the inner component uses the hook unconditionally
let AppContextModule = null
const loadAppContext = async () => {
  if (AppContextModule) return AppContextModule
  try {
    AppContextModule = await import('../context/AppContext')
    return AppContextModule
  } catch (err) {
    console.error('Error loading AppContext:', err)
    return null
  }
}

export default function ProjectDetail() {
  const [appContextModule, setAppContextModule] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadAppContext().then((module) => {
      setAppContextModule(module)
      setLoading(false)
    })
  }, [])
  
  if (loading || !appContextModule) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Carregant...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }
  
  return <ProjectDetailInner useApp={appContextModule.useApp} />
}

function ProjectDetailInner({ useApp }) {
  const { id: rawId } = useParams()
  const navigate = useNavigate()
  const { darkMode, driveConnected, refreshProjects, demoMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const { t } = useTranslation()
  const identifiersSectionRef = useRef(null)
  
  // Extreure UUID net del paràmetre de ruta (eliminar qualsevol sufix com "Fes:")
  const id = rawId?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || null
  
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projectFolders, setProjectFolders] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [documents, setDocuments] = useState([])
  const [projectSubfolders, setProjectSubfolders] = useState([])
  const [phaseProgress, setPhaseProgress] = useState({ completed: 0, total: 0, allOk: false })
  

  const loadProject = async () => {
    if (!id) {
      setError('ID de projecte no vàlid')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Import dinàmic de supabase per evitar cicles d'imports
      let getProject, getDocuments
      try {
        const supabaseModule = await import('../lib/supabase')
        getProject = supabaseModule.getProject
        getDocuments = supabaseModule.getDocuments
      } catch (importErr) {
        setError('Error carregant mòduls')
        setProject(null)
        setDocuments([])
        setLoading(false)
        return
      }
      
      const data = await getProject(id)
      if (!data) {
        setError('Projecte no trobat')
        setProject(null)
        setDocuments([])
        return
      }
      setProject(data)
      const docs = await getDocuments(id)
      setDocuments(Array.isArray(docs) ? docs : [])
    } catch (err) {
      try {
        const { formatError, notifyError } = await import('../lib/errorHandling')
        setError(formatError(err))
        notifyError(err, { context: 'ProjectDetail:loadProject' })
      } catch (importErr) {
        setError('Error carregant mòduls')
      }
      setProject(null)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Carregar PROJECT_SUBFOLDERS dinàmicament per evitar cicles d'imports
  useEffect(() => {
    import('../constants/projectDrive').then((mod) => {
      setProjectSubfolders(mod.PROJECT_SUBFOLDERS || [])
    }).catch(() => {
      setProjectSubfolders([])
    })
  }, [])

  useEffect(() => {
    if (id) {
      loadProject()
    } else {
      setLoading(false)
      setError('ID de projecte no vàlid')
    }
  }, [id])

  useEffect(() => {
    if (project && driveConnected) {
      loadDriveFolders()
    }
  }, [project, driveConnected])

  const loadDriveFolders = async () => {
    if (!project) return
    
    try {
      // Import dinàmic de driveService per evitar cicles d'imports
      let driveService
      try {
        const googleDriveModule = await import('../lib/googleDrive')
        driveService = googleDriveModule.driveService
      } catch (importErr) {
        // Drive is optional, don't crash the route
        setProjectFolders(null)
        return
      }
      
      // Usar ensureProjectDriveFolders per garantir idempotència
      const folders = await driveService.ensureProjectDriveFolders({
        id: project.id,
        project_code: project?.project_code || '',
        sku: project?.sku || '',
        name: project?.name || '',
        drive_folder_id: project?.drive_folder_id || null
      })
      
      if (folders) {
        setProjectFolders(folders)
        
        // Si no tenia drive_folder_id, guardar-lo ara
        if (!project.drive_folder_id && folders?.main?.id) {
          try {
            let updateProject
            try {
              const supabaseModule = await import('../lib/supabase')
              updateProject = supabaseModule.updateProject
            } catch (importErr) {
              // Silent fail - drive_folder_id update is not critical
              return
            }
            await updateProject(id, { drive_folder_id: folders.main.id })
            setProject({ ...project, drive_folder_id: folders.main.id })
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn('Error guardant drive_folder_id:', e)
            }
          }
        }
        
        // Seleccionar carpeta segons fase actual
        const folderName = PHASE_FOLDER_MAP[getPhaseIdFromProject(project)]
        if (folders?.subfolders && folderName && folders.subfolders[folderName]) {
          setSelectedFolder(folders.subfolders[folderName])
        }
      }
    } catch (err) {
      try {
        const { notifyError } = await import('../lib/errorHandling')
        notifyError(err, { context: 'ProjectDetail:loadDriveFolders' })
      } catch (importErr) {
        // Silent fail - Drive is optional
      }
      // Don't show alert, just log - Drive is optional
      setProjectFolders(null)
    }
  }

  const handlePhaseChange = async (newPhase) => {
    const currentPhase = getPhaseIdFromProject(project)
    const isForward = newPhase > currentPhase

    // Bloquejar canvi de fase si està DISCARDED (només endavant)
    if (project.decision === 'DISCARDED' && isForward) {
      try {
        const { showToast } = await import('../components/Toast')
        showToast('No es pot canviar la fase d\'un projecte descartat. Restaura el projecte primer.', 'warning')
      } catch (importErr) {
        // Silent fail for toast
      }
      return
    }

    // No permetre saltar fases endavant
    if (newPhase > currentPhase + 1) {
      try {
        const { showToast } = await import('../components/Toast')
        showToast('No es pot saltar fases. Avança només una fase cada cop.', 'warning')
      } catch (importErr) {
        // Silent fail for toast
      }
      return
    }
    
    try {
      let updateProject
      let supabaseClient
      let validatePhaseTransition
      try {
        const supabaseModule = await import('../lib/supabase')
        updateProject = supabaseModule.updateProject
        supabaseClient = supabaseModule.default
        const gatesModule = await import('../modules/projects/phaseGates')
        validatePhaseTransition = gatesModule.validatePhaseTransition
      } catch (importErr) {
        setError('Error carregant mòduls')
        return
      }

      if (isForward && validatePhaseTransition) {
        try {
          const { ok, missing } = await validatePhaseTransition({
            projectId: id,
            fromPhase: currentPhase,
            toPhase: newPhase,
            project,
            supabaseClient
          })

          if (!ok) {
            const uniqueMissing = Array.from(new Set(missing || [])).filter(Boolean)
            try {
              const { showToast } = await import('../components/Toast')
              const details = uniqueMissing.length > 0 ? uniqueMissing.join(', ') : 'Requisits pendents'
              showToast(`No es pot avançar de fase. Falta: ${details}`, 'warning')
            } catch (importErr) {
              // Silent fail for toast
            }
            return
          }
        } catch (gateErr) {
          try {
            const { showToast } = await import('../components/Toast')
            showToast('No es pot avançar de fase. Error validant requisits.', 'warning')
          } catch (importErr) {
            // Silent fail for toast
          }
          return
        }
      }
      
      await updateProject(id, { current_phase: newPhase })
      setProject({ ...project, current_phase: newPhase })
      await refreshProjects()
      
      // Redirigir al Dashboard després d'editar el projecte
      navigate('/')
    } catch (err) {
      try {
        const { formatError, notifyError } = await import('../lib/errorHandling')
        setError(formatError(err))
        notifyError(err, { context: 'ProjectDetail:handlePhaseChange' })
      } catch (importErr) {
        setError('Error carregant mòduls')
      }
    }
  }

  const handleRestoreProject = async () => {
    if (!confirm('Estàs segur que vols restaurar aquest projecte? Tornarà a l\'estat HOLD.')) return
    
    try {
      let updateProject
      try {
        const supabaseModule = await import('../lib/supabase')
        updateProject = supabaseModule.updateProject
      } catch (importErr) {
        setError('Error carregant mòduls')
        return
      }
      
      await updateProject(id, { decision: 'HOLD' })
      setProject({ ...project, decision: 'HOLD' })
      await refreshProjects()
      
      try {
        const { showToast } = await import('../components/Toast')
        showToast('Projecte restaurat correctament', 'success')
      } catch (importErr) {
        // Silent fail for toast
      }
    } catch (err) {
      try {
        const { formatError, notifyError } = await import('../lib/errorHandling')
        setError(formatError(err))
        notifyError(err, { context: 'ProjectDetail:handleRestore' })
      } catch (importErr) {
        setError('Error carregant mòduls')
      }
    }
  }

  // Handle project update from ArtsFinalsSection
  const handleProjectUpdated = (updatedProject) => {
    setProject(updatedProject)
    // Refresh projects list in parent context
    if (refreshProjects) {
      refreshProjects()
    }
  }

  const handleUploadComplete = async (files) => {
    // Guardar referències a Supabase (evita duplicats automàticament)
    let savedCount = 0
    let errorCount = 0
    
    // Import dinàmic de mòduls per evitar cicles d'imports
    let createDocument, getDocuments, logSuccess, logError
    try {
      const supabaseModule = await import('../lib/supabase')
      createDocument = supabaseModule.createDocument
      getDocuments = supabaseModule.getDocuments
    } catch (importErr) {
      setError('Error carregant mòduls')
      return
    }
    
    try {
      const auditLogModule = await import('../lib/auditLog')
      logSuccess = auditLogModule.logSuccess
      logError = auditLogModule.logError
    } catch (importErr) {
      // Audit log is optional, continue without it
      logSuccess = async () => {}
      logError = async () => {}
    }
    
    for (const file of files) {
      try {
        const doc = await createDocument({
          project_id: id,
          name: file.name,
          file_url: file.webViewLink || file.driveUrl,
          drive_file_id: file.id,
          category: getCategoryForPhase(getPhaseIdFromProject(project)),
          file_size: file.size
        })
        savedCount++
        // Audit log: document pujat correctament
        try {
          await logSuccess('document', 'upload', doc.id, 'Document uploaded to Drive', {
            project_id: id,
            file_name: file.name,
            file_size: file.size,
            drive_file_id: file.id
          })
        } catch (auditErr) {
          // Silent fail for audit log
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Error guardant document:', err)
        }
        errorCount++
        // Audit log: error pujant document
        try {
          await logError('document', 'upload', err, {
            project_id: id,
            file_name: file.name,
            file_size: file.size,
            drive_file_id: file.id
          })
        } catch (auditErr) {
          // Silent fail for audit log
        }
      }
    }
    
    // Recarregar documents
    try {
      const docs = await getDocuments(id)
      setDocuments(docs || [])
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error recarregant documents:', err)
      }
    }
    
    // Mostrar feedback si hi ha errors
    if (errorCount > 0) {
      try {
        const { showToast } = await import('../components/Toast')
        showToast(`${errorCount} document(s) no s'han pogut guardar correctament.`, 'warning')
      } catch (importErr) {
        // Silent fail for toast
      }
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

  if (error) {
    return (
      <div style={styles.container}>
        <Header title="Error" />
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
          margin: '24px'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{
            margin: '0 0 8px',
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Error carregant el projecte
          </h2>
          <p style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={loadProject}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => navigate('/projects')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: darkMode ? '#9ca3af' : '#6b7280',
                border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Tornar a Projectes
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <Header title="Projecte no trobat" />
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
          margin: '24px'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{
            margin: '0 0 8px',
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Projecte no trobat
          </h2>
          <p style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            El projecte que busques no existeix o no tens accés.
          </p>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Tornar a Projectes
          </button>
        </div>
      </div>
    )
  }

  const phaseId = getPhaseIdFromProject(project)
  const currentPhase = getPhaseStyle(phaseId)
  const phaseSurface = getPhaseSurfaceStyles(currentPhase, { darkMode, borderWidth: 2 })
  const phaseWrapperStyle = {
    ...phaseSurface.wrapperStyle,
    borderRadius: '16px',
    padding: isMobile ? '16px' : '24px',
    marginTop: '12px'
  }
  const phaseCardStyle = {
    border: `1px solid var(--border-color)`,
    borderRadius: 'var(--radius-base)',
    ...phaseSurface.cardStyle
  }
  const currentGroup = PHASE_GROUPS.find(group => group.phases.includes(phaseId))
  const phaseSubtitle = PHASE_WORKFLOW_COPY[phaseId] || currentPhase.description
  const phaseGroupLabel = phaseId <= 2
    ? 'DISCOVERY — Market & Viability'
    : (currentGroup?.label || 'PHASE')

  return (
    <div style={styles.container}>
      <Header title={project.name} />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Banner DISCARDED */}
        {project.decision === 'DISCARDED' && (
          <div style={{
            ...styles.discardedBanner,
            backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
            borderColor: '#ef4444'
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                Aquest projecte ha estat descartat
              </strong>
              <span style={{ color: darkMode ? '#fca5a5' : '#991b1b', fontSize: '13px' }}>
                {project.discarded_reason || 'No s\'ha proporcionat una raó.'}
                {project.discarded_at && (
                  <span style={{ display: 'block', marginTop: '4px' }}>
                    Data: {new Date(project.discarded_at).toLocaleDateString('ca-ES')}
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleRestoreProject}
              style={styles.restoreButton}
            >
              {t('common.restore')} Projecte
            </button>
          </div>
        )}

        {/* Back button & Project info */}
        <div style={styles.topBar}>
          <button onClick={() => navigate('/projects')} style={styles.backButton}>
            <ArrowLeft size={18} />
            Tornar
          </button>
          <div style={styles.projectMeta}>
            <span style={styles.projectCode}>{project.project_code}</span>
            {project.sku && (
              <span style={styles.sku}>Codi intern del projecte: {project.sku}</span>
            )}
          </div>
        </div>

        <div style={phaseWrapperStyle}>
          <div style={{
            ...styles.phaseWorkspaceHeader,
            ...phaseCardStyle
          }}>
            <div style={styles.phaseWorkspaceMeta}>
              <span style={{
                ...styles.phaseGroupLabel,
                color: currentPhase.accent
              }}>
                {phaseGroupLabel}
              </span>
              <h2 style={{
                margin: '4px 0 4px',
                fontSize: isMobile ? '18px' : '20px',
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                {currentPhase.name}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: darkMode ? '#e5e7eb' : '#6b7280'
              }}>
                {phaseSubtitle}
              </p>
            </div>
            <div style={styles.phaseWorkspaceStats}>
              <div style={styles.phaseProgress}>
                <span style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  Progrés fase
                </span>
                <strong style={{ color: currentPhase.accent }}>
                  {phaseProgress.total ? `${phaseProgress.completed}/${phaseProgress.total}` : '—'}
                </strong>
              </div>
              {phaseId > 2 && (
                <button
                  onClick={() => {
                    const checklist = document.getElementById('phase-checklist')
                    if (checklist) {
                      checklist.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  style={{
                    ...styles.phaseCta,
                    backgroundColor: currentPhase.accent
                  }}
                >
                  Completa checklist
                </button>
              )}
            </div>
          </div>
          {/* 1) OVERVIEW SECTION */}
          <CollapsibleSection
            title="Resum del Projecte"
            icon={Info}
            defaultOpen={true}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            {/* Phase Timeline */}
            <div style={{
              ...styles.timelineSection,
              backgroundColor: 'transparent',
              border: 'none',
              padding: 0,
              marginBottom: '24px'
            }}>
              <h3 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#111827',
                marginBottom: '16px'
              }}>
                Progrés del Projecte
              </h3>

              <div style={styles.phaseGroupRow}>
                {PHASE_GROUPS.map((group, index) => {
                  const isCurrentGroup = group.phases.includes(phaseId)
                  return (
                    <div
                      key={group.label}
                      style={{
                        ...styles.phaseGroupItem,
                        flex: group.phases.length,
                        borderRight: index < PHASE_GROUPS.length - 1 ? `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}` : 'none'
                      }}
                    >
                      <span style={{
                        ...styles.phaseGroupText,
                        color: isCurrentGroup ? currentPhase.accent : (darkMode ? '#9ca3af' : '#6b7280')
                      }}>
                        {group.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              
              <div style={{
                ...styles.timeline,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isMobile ? '12px' : '0',
                overflowX: 'visible'
              }}>
                {PHASES.map((phase, index) => {
                  const isActive = phase.id === phaseId
                  const isCompleted = phase.id < phaseId
                  const isFuture = phase.id > phaseId
                  const PhaseIcon = phase.icon
                  
                  return (
                    <div key={phase.id} style={styles.timelineItem}>
                      <button
                        onClick={() => handlePhaseChange(phase.id)}
                        style={{
                          ...styles.phaseButton,
                          backgroundColor: isActive
                            ? phase.bg
                            : (isCompleted ? phase.bg : 'var(--bg-secondary)'),
                          borderColor: isActive || isCompleted ? phase.accent : 'var(--border-color)',
                          color: isFuture ? '#9ca3af' : phase.accent,
                          boxShadow: isActive ? `0 0 0 6px ${phase.bg}` : 'none'
                        }}
                      >
                        {isCompleted ? (
                          <Check size={20} color={phase.accent} />
                        ) : (
                          <PhaseIcon size={20} color={isFuture ? '#9ca3af' : phase.accent} />
                        )}
                      </button>
                      <span style={{
                        ...styles.phaseName,
                        color: isActive ? phase.accent : (darkMode ? '#9ca3af' : '#6b7280'),
                        fontWeight: isActive ? '600' : '400'
                      }}>
                        {phase.name}
                      </span>
                      {index < PHASES.length - 1 && !isMobile && (
                        <div style={{
                          ...styles.timelineConnector,
                          backgroundColor: isCompleted ? phase.accent : 'var(--border-color)'
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Current phase info */}
              <div style={{
                ...styles.currentPhaseInfo,
                backgroundColor: currentPhase.bg,
                borderColor: currentPhase.accent
              }}>
                <div style={styles.currentPhaseHeader}>
                  <currentPhase.icon size={24} color={currentPhase.accent} />
                  <div>
                    <h4 style={{ margin: 0, color: currentPhase.accent }}>{currentPhase.name}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{currentPhase.description}</p>
                  </div>
                </div>
              </div>

              <PhaseChecklist
                project={project}
                currentPhase={phaseId}
                projectId={id}
                darkMode={darkMode}
                id="phase-checklist"
                onProgressUpdate={setPhaseProgress}
              />
            </div>

            {/* Amazon Readiness Badge */}
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
              <AmazonReadinessBadge
                projectId={id}
                darkMode={darkMode}
                phaseId={phaseId}
                onAssignGtin={() => {
                  const targetId = phaseId >= 6
                    ? 'identifiers-section'
                    : 'competitive-asin-section'
                  const target = document.getElementById(targetId)
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                onCreatePO={() => {
                  // Navigate to Orders page with project filter - modal will open automatically if action=create
                  navigate(`/orders?project=${id}&action=create`)
                }}
                onMarkExempt={() => {
                  // Use ref to call markAsExempt method (React-controlled, no DOM manipulation)
                  if (identifiersSectionRef.current) {
                    identifiersSectionRef.current.markAsExempt()
                  }
                }}
              />
            </Suspense>

            {/* Competitive ASIN (Phase 1-2) */}
            {phaseId <= 2 && (
              <div id="competitive-asin-section" style={{ marginTop: '24px' }}>
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                  <CompetitiveAsinSection
                    projectId={id}
                    darkMode={darkMode}
                    phaseStyle={currentPhase}
                  />
                </Suspense>
              </div>
            )}

            {/* Key Actions */}
            <div style={{
              marginTop: '24px',
              padding: '20px',
            ...phaseCardStyle
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                Accions Ràpides
              </h4>
              <div style={styles.actionsGrid}>
                {/* Briefing - disponible des de fase 3 */}
                {phaseId >= 3 && (
                  <button 
                    style={{...styles.actionButton, backgroundColor: '#8b5cf6'}} 
                    onClick={() => navigate(`/projects/${id}/briefing`)}
                  >
                    <ClipboardList size={18} />
                    Briefing del Producte
                  </button>
                )}
                
                {/* Nova Comanda - disponible des de fase 3 */}
                {phaseId >= 3 && (
                  <button 
                    style={{
                      ...styles.actionButton, 
                      backgroundColor: '#4f46e5',
                      opacity: !driveConnected ? 0.5 : 1,
                      cursor: !driveConnected ? 'not-allowed' : 'pointer'
                    }} 
                    disabled={!driveConnected}
                    title={!driveConnected ? "Connecta Google Drive per crear" : ""}
                    onClick={() => {
                      if (!driveConnected) return
                      navigate(`/orders?project=${id}`)
                    }}
                  >
                    <ShoppingCart size={18} />
                    Crear Comanda (PO)
                  </button>
                )}
                
                {/* Gestionar Stock - fase 7 */}
                {phaseId === 7 && (
                  <button 
                    style={{...styles.actionButton, backgroundColor: '#22c55e', border: '1px solid #16a34a'}} 
                    onClick={() => navigate(`/inventory?project=${id}`)}
                  >
                    <Package size={18} />
                    Gestionar Stock
                  </button>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* 2) TIMELINE SECTION */}
          <CollapsibleSection
            title="Timeline"
            icon={Calendar}
            defaultOpen={true}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
              <ProjectEventsTimeline 
                projectId={id}
                projectStatus={project?.status}
                darkMode={darkMode}
                phaseStyle={currentPhase}
              />
            </Suspense>
          </CollapsibleSection>

          {/* 2.5) PRODUCT IDENTIFIERS (Listing) */}
          {phaseId >= 6 && (
            <CollapsibleSection
              title="Identificadors de producte"
              icon={Barcode}
              defaultOpen={true}
              darkMode={darkMode}
              phaseStyle={currentPhase}
            >
              <div id="identifiers-section">
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                  <IdentifiersSection
                    ref={identifiersSectionRef}
                    projectId={id}
                    darkMode={darkMode}
                    phaseStyle={currentPhase}
                    showAsin={false}
                  />
                </Suspense>
              </div>
            </CollapsibleSection>
          )}

          {/* 3) PURCHASE ORDERS SECTION */}
          <CollapsibleSection
            title="Comandes de Compra"
            icon={Receipt}
            defaultOpen={false}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            <div style={{
              padding: '16px',
            ...phaseCardStyle,
              textAlign: 'center'
            }}>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}>
                Gestiona les comandes de compra d'aquest projecte
              </p>
              <button
                onClick={() => navigate(`/orders?project=${id}`)}
                style={{
                  ...styles.actionButton,
                  backgroundColor: '#4f46e5',
                  margin: '0 auto'
                }}
              >
                <ShoppingCart size={18} />
                Veure Comandes
              </button>
            </div>
          </CollapsibleSection>

          {/* 4) EXPENSES / INCOMES SECTION */}
          <CollapsibleSection
            title="Despeses i Ingressos"
            icon={DollarSign}
            defaultOpen={false}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            <div style={{
              padding: '16px',
            ...phaseCardStyle,
              textAlign: 'center'
            }}>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}>
                Gestiona les despeses i ingressos d'aquest projecte
              </p>
              <button
                onClick={() => navigate(`/finances?project=${id}`)}
                style={{
                  ...styles.actionButton,
                  backgroundColor: '#4f46e5',
                  margin: '0 auto'
                }}
              >
                <DollarSign size={18} />
                Veure Finances
              </button>
            </div>
          </CollapsibleSection>

          {/* 5) ARTS FINALS SECTION */}
          {project && (
            <CollapsibleSection
              title="Arts Finals"
              icon={FileImage}
              defaultOpen={false}
              darkMode={darkMode}
              phaseStyle={currentPhase}
            >
              <ArtsFinalsSection
                project={project}
                darkMode={darkMode}
                onProjectUpdated={handleProjectUpdated}
              />
            </CollapsibleSection>
          )}

          {/* 6) DOCUMENTS / ATTACHMENTS SECTION */}
          {(driveConnected && projectFolders) && (
            <CollapsibleSection
              title="Documents i Adjunts"
              icon={Paperclip}
              defaultOpen={false}
              darkMode={darkMode}
              phaseStyle={currentPhase}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '200px 1fr' : '280px 1fr'),
                gap: isMobile ? '16px' : '24px'
              }}>
                {/* Folder selector */}
                <div style={{
                  ...styles.foldersPanel,
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0
                }}>
                  <h4 style={{
                    ...styles.sectionTitle,
                    color: darkMode ? '#ffffff' : '#111827',
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}>
                    <FolderOpen size={16} />
                    Carpetes del Projecte
                  </h4>
                  
                  <div style={styles.foldersList}>
                    {(projectSubfolders || []).map(folderName => {
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

                {/* File browser & uploader */}
                {selectedFolder ? (
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
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    fontSize: '14px'
                  }}>
                    Selecciona una carpeta per veure els documents
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 7) NOTES / MISC SECTION */}
          <CollapsibleSection
            title="Notes i Miscel·lània"
            icon={StickyNote}
            defaultOpen={false}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            {/* Tasks Section */}
            <div style={{ marginBottom: '24px' }}>
              <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                <TasksSection 
                  entityType="project" 
                  entityId={id} 
                  darkMode={darkMode} 
                />
              </Suspense>
            </div>

            {/* Decision Block - Visible a fase Research (1) */}
            {phaseId === 1 && (
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                ...phaseCardStyle
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  Decision
                </h4>
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                  <DecisionLog 
                    entityType="project" 
                    entityId={id} 
                    darkMode={darkMode}
                    allowedDecisions={[
                      { value: 'go', label: 'GO', icon: CheckCircle2, color: '#10b981' },
                      { value: 'hold', label: 'HOLD', icon: Clock, color: '#f59e0b' },
                      { value: 'discarded', label: 'DISCARDED', icon: XCircle, color: '#ef4444' }
                    ]}
                  />
                </Suspense>
              </div>
            )}

            {/* Quick Supplier Price Estimate - Visible a fase Research (1) */}
            {phaseId === 1 && (
              <div style={{ marginBottom: '24px' }}>
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                  <QuickSupplierPriceEstimate 
                    projectId={id} 
                    darkMode={darkMode}
                    onCopyToProfitability={(priceInEUR) => {
                      window.dispatchEvent(new CustomEvent('copyPriceToCOGS', { 
                        detail: { price: priceInEUR } 
                      }))
                    }}
                  />
                </Suspense>
              </div>
            )}

            {/* Quick Profitability Calculator - Visible a fase Research (1) */}
            {phaseId === 1 && (
              <div style={{ marginBottom: '24px' }}>
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                    <ProfitabilityCalculator projectId={id} darkMode={darkMode} showAsinCapture={false} />
                </Suspense>
              </div>
            )}

            {/* Supplier Quotes Section - Visible desde fase 2 (Viabilitat) */}
            {phaseId >= 2 && (
              <div style={{ marginBottom: '24px' }}>
                <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                  <QuotesSection projectId={id} darkMode={darkMode} />
                </Suspense>
              </div>
            )}
          </CollapsibleSection>
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
  discardedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid',
    marginBottom: '24px'
  },
  restoreButton: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
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
  phaseWorkspaceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  phaseWorkspaceMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  phaseWorkspaceStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  phaseProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  phaseCta: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  phaseGroupLabel: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.08em'
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
  phaseGroupRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  phaseGroupItem: {
    display: 'flex',
    justifyContent: 'center',
    padding: '6px 8px'
  },
  phaseGroupText: {
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.06em'
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
  // driveSection moved inside component to use isMobile/isTablet
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
    border: '1px solid #3730a3',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }
}
