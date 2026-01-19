import { useState, useEffect, Suspense, lazy, useRef, useMemo } from 'react'
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
  AlertTriangle,
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
import { useNotes } from '../hooks/useNotes'
import { PHASE_STYLES, getPhaseStyle, getPhaseSurfaceStyles } from '../utils/phaseStyles'
import { getModalStyles } from '../utils/responsiveStyles'
import Button from '../components/Button'
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
const ViabilityCalculator = lazy(() => import('../components/projects/ViabilityCalculator'))

const PHASES = Object.values(PHASE_STYLES)
const PHASE_GROUPS = [
  { label: 'DISCOVERY', phases: [1, 2] },
  { label: 'SOURCING', phases: [3, 4, 5] },
  { label: 'LAUNCH', phases: [6, 7] }
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

function PhaseSection({ phaseId, currentPhaseId, phaseStyle, darkMode, children }) {
  const [isOpen, setIsOpen] = useState(phaseId <= currentPhaseId)
  const isCurrent = phaseId === currentPhaseId
  const isPast = phaseId < currentPhaseId
  const isFuture = phaseId > currentPhaseId
  const sectionBorder = isCurrent ? phaseStyle.accent : (darkMode ? '#2a2a3a' : '#e5e7eb')
  const sectionBg = isCurrent ? phaseStyle.bg : (darkMode ? '#111827' : '#ffffff')

  useEffect(() => {
    if (phaseId === currentPhaseId) {
      setIsOpen(true)
    }
  }, [phaseId, currentPhaseId])

  return (
    <section style={{
      ...styles.phaseSection,
      borderColor: sectionBorder,
      backgroundColor: sectionBg
    }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={styles.phaseSectionHeader}
        aria-expanded={isOpen}
      >
        <div style={styles.phaseSectionHeaderText}>
          <span style={{
            ...styles.phaseSectionTitle,
            color: isCurrent ? phaseStyle.accent : (darkMode ? '#e5e7eb' : '#111827')
          }}>
            {phaseStyle.name}
          </span>
          <span style={{
            fontSize: '13px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            {phaseStyle.description}
          </span>
        </div>
        <div style={styles.phaseSectionHeaderMeta}>
          {isPast && (
            <span style={styles.phasePastChip}>
              ✓ Completada
            </span>
          )}
          {isFuture && (
            <span style={styles.phasePreviewChip}>Preview</span>
          )}
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>
      {isOpen && (
        <div style={{
          ...styles.phaseSectionBody,
          opacity: isFuture ? 0.6 : 1,
          pointerEvents: isFuture ? 'none' : 'auto'
        }}>
          {children}
        </div>
      )}
    </section>
  )
}

function ProjectDetailInner({ useApp }) {
  const { id: rawId } = useParams()
  const navigate = useNavigate()
  const { darkMode, driveConnected, refreshProjects, demoMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const { t } = useTranslation()
  const identifiersSectionRef = useRef(null)
  const modalStyles = getModalStyles(isMobile, darkMode)
  
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
  const [phaseBlockMessage, setPhaseBlockMessage] = useState(null)
  const [phaseBlockVisible, setPhaseBlockVisible] = useState(false)
  const [nextGateState, setNextGateState] = useState({ loading: false, missing: [] })
  const [viabilitySnapshot, setViabilitySnapshot] = useState(null)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState(null)
  const [createForm, setCreateForm] = useState(null)
  const [createSaving, setCreateSaving] = useState(false)
  const [expenseCategories, setExpenseCategories] = useState([])
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const { notes, loading: notesLoading } = useNotes()
  

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

  useEffect(() => {
    if (!createMenuOpen) return
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-create-menu]')) {
        setCreateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [createMenuOpen])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const supabaseModule = await import('../lib/supabase')
        const supabaseClient = supabaseModule.default
        const { data } = await supabaseClient
          .from('finance_categories')
          .select('*')
          .order('name', { ascending: true })
        const expenseCats = (data || []).filter(cat => cat.type === 'expense')
        setExpenseCategories(expenseCats)
      } catch (err) {
        setExpenseCategories([])
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (createModalType !== 'expense' || !createForm) return
    if (!createForm.category_id && expenseCategories.length > 0) {
      setCreateForm({ ...createForm, category_id: expenseCategories[0].id })
    }
  }, [createModalType, createForm, expenseCategories])

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

  const openCreateModal = (type) => {
    if (!driveConnected && (type === 'supplier' || type === 'warehouse' || type === 'forwarder')) {
      import('../components/Toast').then(({ showToast }) => {
        showToast('Connecta Google Drive per crear aquest element.', 'warning')
      }).catch(() => {})
      return
    }
    const baseExpenseCategory = expenseCategories[0]?.id || null
    const today = new Date().toISOString().split('T')[0]
    const templates = {
      supplier: {
        name: '',
        type: 'manufacturer',
        contact_name: '',
        email: '',
        phone: '',
        country: 'China',
        city: '',
        notes: ''
      },
      warehouse: {
        name: '',
        type: 'custom',
        address: '',
        city: '',
        country: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        notes: ''
      },
      forwarder: {
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        country: 'Xina',
        city: '',
        notes: ''
      },
      expense: {
        project_id: id,
        category_id: baseExpenseCategory,
        description: '',
        amount: '',
        currency: 'EUR',
        date: today,
        payment_status: 'pending',
        notes: ''
      }
    }
    setCreateForm(templates[type] || null)
    setCreateModalType(type)
  }

  const handleCreateSave = async () => {
    if (!createModalType || !createForm) return
    setCreateSaving(true)
    try {
      const supabaseModule = await import('../lib/supabase')
      const { createSupplier, createWarehouse, createForwarder, getCurrentUserId } = supabaseModule
      if (createModalType === 'supplier') {
        if (!createForm.name?.trim()) {
          throw new Error('El nom és obligatori')
        }
        await createSupplier(createForm)
        const { showToast } = await import('../components/Toast')
        showToast('Proveïdor creat correctament', 'success')
      }
      if (createModalType === 'warehouse') {
        if (!createForm.name?.trim()) {
          throw new Error('El nom és obligatori')
        }
        await createWarehouse(createForm)
        const { showToast } = await import('../components/Toast')
        showToast('Magatzem creat correctament', 'success')
      }
      if (createModalType === 'forwarder') {
        if (!createForm.name?.trim()) {
          throw new Error('El nom és obligatori')
        }
        await createForwarder(createForm)
        const { showToast } = await import('../components/Toast')
        showToast('Transitari creat correctament', 'success')
      }
      if (createModalType === 'expense') {
        if (!createForm.amount || !createForm.category_id) {
          throw new Error('Import i categoria són obligatoris')
        }
        const supabaseClient = supabaseModule.default
        const userId = await getCurrentUserId()
        const category = expenseCategories.find(cat => cat.id === createForm.category_id)
        if (!category) {
          throw new Error('Categoria no vàlida')
        }
        const amount = Math.abs(parseFloat(createForm.amount))
        const { error } = await supabaseClient.from('expenses').insert([{
          project_id: createForm.project_id || null,
          category_id: createForm.category_id,
          category: category.name,
          description: createForm.description,
          amount: amount,
          currency: createForm.currency,
          expense_date: createForm.date,
          payment_status: createForm.payment_status,
          notes: createForm.notes,
          user_id: userId
        }])
        if (error) throw error
        const { showToast } = await import('../components/Toast')
        showToast('Despesa creada correctament', 'success')
      }
      setCreateModalType(null)
      setCreateForm(null)
    } catch (err) {
      try {
        const { showToast } = await import('../components/Toast')
        showToast(err.message || 'Error creant element', 'error')
      } catch (importErr) {}
    } finally {
      setCreateSaving(false)
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
            const details = uniqueMissing.length > 0
              ? uniqueMissing.map(item => `• ${item}`).join(' ')
              : '• Requisits pendents'
            const blockMessage = `No es pot avançar de fase ${details}`
            if (typeof window !== 'undefined') {
              window.__phaseGateLastBlock = {
                at: Date.now(),
                fromPhase: currentPhase,
                toPhase: newPhase,
                missing: uniqueMissing,
                message: blockMessage
              }
            }
            try {
              const { showToast } = await import('../components/Toast')
              if (showToast) {
                showToast(blockMessage, 'warning')
              }
            } catch (importErr) {}
            setPhaseBlockMessage(blockMessage)
            setPhaseBlockVisible(true)
            return
          }
        } catch (gateErr) {
          const blockMessage = 'No es pot avançar de fase. Error validant requisits.'
          if (typeof window !== 'undefined') {
            window.__phaseGateLastBlock = {
              at: Date.now(),
              fromPhase: currentPhase,
              toPhase: newPhase,
              missing: [],
              message: blockMessage
            }
          }
          try {
            const { showToast } = await import('../components/Toast')
            if (showToast) {
              showToast(blockMessage, 'warning')
          }
          } catch (importErr) {}
          setPhaseBlockMessage(blockMessage)
          setPhaseBlockVisible(true)
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
  const phaseGroupLabel = currentGroup?.label || 'PHASE'
  const nextPhaseId = phaseId < 7 ? phaseId + 1 : null
  const nextPhaseLabel = nextPhaseId ? getPhaseStyle(nextPhaseId).name : null
  const computeViabilitySummary = (values) => {
    if (!values) return null
    const toNumber = (value) => {
      const normalized = value?.toString().replace(',', '.') || ''
      const numeric = Number.parseFloat(normalized)
      return Number.isFinite(numeric) ? numeric : 0
    }
    const sellingPrice = toNumber(values.selling_price)
    const vatPercent = toNumber(values.vat_percent)
    const revenueNetVat = vatPercent > 0 ? sellingPrice / (1 + vatPercent / 100) : sellingPrice
    const estimatedCogs = toNumber(values.estimated_cogs)
    const fbaFee = toNumber(values.fba_fee_estimate)
    const shippingToFba = toNumber(values.shipping_to_fba_per_unit)
    const ppc = toNumber(values.ppc_per_unit)
    const returnRate = toNumber(values.return_rate_percent)
    const otherCosts = toNumber(values.other_costs_per_unit)
    const returnsCost = sellingPrice * (returnRate / 100)
    const totalCosts = estimatedCogs + fbaFee + shippingToFba + ppc + otherCosts + returnsCost
    const profitPerUnit = revenueNetVat - totalCosts
    const netMarginPercent = revenueNetVat > 0 ? (profitPerUnit / revenueNetVat) * 100 : 0
    return { revenueNetVat, totalCosts, profitPerUnit, netMarginPercent }
  }
  const viabilitySummary = useMemo(() => {
    if (!viabilitySnapshot) return null
    if (viabilitySnapshot.computed) return viabilitySnapshot.computed
    return computeViabilitySummary(viabilitySnapshot.values)
  }, [viabilitySnapshot])
  const hasViabilitySummary = phaseId === 2 && viabilitySummary

  useEffect(() => {
    if (!id) return
    try {
      const stored = localStorage.getItem(`viability_${id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed) {
          setViabilitySnapshot(prev => (prev?.values === parsed ? prev : { values: parsed }))
        }
      }
    } catch (err) {
      // ignore
    }
  }, [id])
  const nextMissing = Array.isArray(nextGateState.missing) ? nextGateState.missing : []
  const hasNextMissing = !nextGateState.loading && nextMissing.length > 0
  const missingPreview = hasNextMissing ? nextMissing.slice(0, 3).join(' · ') : ''

  useEffect(() => {
    let isMounted = true
    const loadNextGate = async () => {
      if (!project || !nextPhaseId) {
        if (isMounted) setNextGateState({ loading: false, missing: [] })
        return
      }
      setNextGateState(prev => ({ ...prev, loading: true }))
      try {
        const gatesModule = await import('../modules/projects/phaseGates')
        const supabaseModule = await import('../lib/supabase')
        const { validatePhaseTransition } = gatesModule
        const supabaseClient = supabaseModule.default
        if (validatePhaseTransition) {
          const { missing } = await validatePhaseTransition({
            projectId: id,
            fromPhase: phaseId,
            toPhase: nextPhaseId,
            project,
            supabaseClient
          })
          if (isMounted) {
            setNextGateState({ loading: false, missing: missing || [] })
          }
        } else if (isMounted) {
          setNextGateState({ loading: false, missing: [] })
        }
      } catch (err) {
        if (isMounted) setNextGateState({ loading: false, missing: [] })
      }
    }
    loadNextGate()
    return () => {
      isMounted = false
    }
  }, [project, id, phaseId, nextPhaseId])

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

  return (
    <div style={styles.container}>
      <Header title={project.name} />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        <div style={{
          ...styles.phaseStickyContainer,
          borderColor: darkMode ? '#1f2937' : '#e5e7eb',
          backgroundColor: darkMode ? '#0f172a' : '#ffffff'
        }}>
          <div style={styles.phaseTimelineSticky}>
            <div style={{
              ...styles.phaseNavBar,
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              overflowX: isMobile ? 'auto' : 'visible'
            }}>
              {PHASES.map((phase, index) => {
                const isActive = phase.id === phaseId
                const isCompleted = phase.id < phaseId
                const isFuture = phase.id > phaseId
                const PhaseIcon = phase.icon

                return (
                  <button
                    key={phase.id}
                    onClick={() => handlePhaseChange(phase.id)}
                    style={{
                      ...styles.phaseNavButton,
                      borderColor: isActive ? phase.accent : (darkMode ? '#2a2a3a' : '#e5e7eb'),
                      backgroundColor: isActive
                        ? phase.bg
                        : (isCompleted ? (darkMode ? '#111827' : '#f8fafc') : 'transparent'),
                      color: isFuture ? (darkMode ? '#6b7280' : '#9ca3af') : phase.accent
                    }}
                  >
                    <span style={styles.phaseNavIcon}>
                      {isCompleted ? (
                        <Check size={14} color={phase.accent} />
                      ) : (
                        <PhaseIcon size={14} color={isFuture ? (darkMode ? '#6b7280' : '#9ca3af') : phase.accent} />
                      )}
                    </span>
                    <span style={{
                      ...styles.phaseNavLabel,
                      fontWeight: isActive ? '700' : '500',
                      color: isActive ? phase.accent : (darkMode ? '#e5e7eb' : '#374151')
                    }}>
                      {phase.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div style={styles.phaseCurrentBar}>
            <div style={styles.phaseCurrentInfo}>
              <span style={{
                ...styles.phaseStatusChip,
                color: currentPhase.accent,
                borderColor: currentPhase.accent
              }}>
                {phaseGroupLabel}
              </span>
              <div>
                <div style={{
                  ...styles.phaseStatusTitle,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {currentPhase.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}>
                  {phaseSubtitle}
                </div>
              </div>
            </div>
            <div style={styles.phaseCurrentMeta}>
              <div style={styles.phaseStatusCenter}>
                <span style={{
                  fontSize: '12px',
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}>
                  Checklist
                </span>
                <strong style={{ color: currentPhase.accent }}>
                  {phaseProgress.total ? `${phaseProgress.completed}/${phaseProgress.total}` : '—'}
                </strong>
              </div>
              {nextPhaseLabel ? (
                <div style={styles.phaseStatusNext}>
                  <span style={{
                    fontSize: '12px',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Següent fase
                  </span>
                  <div style={styles.phaseStatusNextRow}>
                    <ChevronRight size={16} color={currentPhase.accent} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}>
                      {nextPhaseLabel}
                    </span>
                    {hasNextMissing && (
                      <span style={{
                        ...styles.phaseStatusWarning,
                        borderColor: '#f59e0b',
                        color: '#f59e0b'
                      }}>
                        {nextMissing.length} pendent{nextMissing.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {hasNextMissing && (
                    <>
                      <div style={{
                        fontSize: '12px',
                        color: darkMode ? '#e5e7eb' : '#6b7280'
                      }}>
                        {missingPreview}
                        {nextMissing.length > 3 ? '…' : ''}
                      </div>
                      <button
                        onClick={() => {
                          const checklist = document.getElementById('phase-checklist')
                          if (checklist) {
                            checklist.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }}
                        style={styles.phaseStatusAction}
                      >
                        Veure pendents
                      </button>
                    </>
                  )}
                  {hasViabilitySummary && (
                    <div style={styles.phaseViabilitySummary}>
                      Viabilitat: {viabilitySummary.profitPerUnit.toFixed(2)}€ · {viabilitySummary.netMarginPercent.toFixed(1)}%
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.phaseStatusNext}>
                  <span style={{
                    fontSize: '12px',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Estat
                  </span>
                  <div style={styles.phaseStatusNextRow}>
                    <CheckCircle2 size={16} color={currentPhase.accent} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}>
                      Totes les fases completes
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div style={styles.phaseActionsBar}>
              {phaseId >= 3 && (
                <Button
                  variant={phaseId >= 3 ? 'ghost' : 'primary'}
                  size="sm"
                  onClick={() => navigate(`/projects/${id}/briefing`)}
                >
                  <ClipboardList size={16} />
                  Briefing
                </Button>
              )}
              {phaseId >= 3 && (
                <Button
                  variant={phaseId === 7 ? 'ghost' : 'primary'}
                  size="sm"
                  disabled={!driveConnected}
                  onClick={() => {
                    if (!driveConnected) return
                    navigate(`/orders?project=${id}`)
                  }}
                >
                  <ShoppingCart size={16} />
                  Crear PO
                </Button>
              )}
              {phaseId === 7 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/inventory?project=${id}`)}
                >
                  <Package size={16} />
                  Gestor stock
                </Button>
              )}
              <div style={styles.createMenuWrapper} data-create-menu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateMenuOpen(prev => !prev)}
                >
                  <Plus size={16} />
                  Crear...
                  <ChevronDown size={14} />
                </Button>
                {createMenuOpen && (
                  <div style={{
                    ...styles.createMenu,
                    backgroundColor: darkMode ? '#111827' : '#ffffff',
                    borderColor: darkMode ? '#1f2937' : '#e5e7eb'
                  }}>
                    <button
                      style={{
                        ...styles.createMenuItem,
                        color: darkMode ? '#e5e7eb' : '#374151'
                      }}
                      onClick={() => {
                        setCreateMenuOpen(false)
                        openCreateModal('supplier')
                      }}
                    >
                      + Proveïdor
                    </button>
                    <button
                      style={{
                        ...styles.createMenuItem,
                        color: darkMode ? '#e5e7eb' : '#374151'
                      }}
                      onClick={() => {
                        setCreateMenuOpen(false)
                        openCreateModal('warehouse')
                      }}
                    >
                      + Magatzem
                    </button>
                    <button
                      style={{
                        ...styles.createMenuItem,
                        color: darkMode ? '#e5e7eb' : '#374151'
                      }}
                      onClick={() => {
                        setCreateMenuOpen(false)
                        openCreateModal('forwarder')
                      }}
                    >
                      + Transitari
                    </button>
                    <button
                      style={{
                        ...styles.createMenuItem,
                        color: darkMode ? '#e5e7eb' : '#374151'
                      }}
                      onClick={() => {
                        setCreateMenuOpen(false)
                        openCreateModal('expense')
                      }}
                    >
                      + Despesa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
          <button
            style={styles.notesButton}
            onClick={() => setShowNotesPanel(true)}
          >
            <StickyNote size={16} />
            Notes
          </button>
        </div>

        {showNotesPanel && (
          <div style={styles.notesOverlay} onClick={() => setShowNotesPanel(false)}>
            <div
              style={{
                ...styles.notesModal,
                backgroundColor: darkMode ? '#111827' : '#ffffff',
                borderColor: darkMode ? '#2a2a3a' : '#e5e7eb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={styles.notesHeader}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Notes</h3>
                    <button
                  onClick={() => setShowNotesPanel(false)}
                      style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: darkMode ? '#e5e7eb' : '#6b7280',
                    fontSize: '18px'
                  }}
                  aria-label="Tancar"
                >
                  ×
                    </button>
              </div>
              {notesLoading && (
                <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  Carregant notes...
                </div>
              )}
              {!notesLoading && (!notes || notes.length === 0) && (
                <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  No hi ha notes actives.
                  </div>
              )}
              {!notesLoading && notes && notes.length > 0 && (
                <div style={styles.notesList}>
                  {notes.map(note => (
                    <div
                      key={note.id}
                      style={{
                        ...styles.notesItem,
                        backgroundColor: darkMode ? '#0f172a' : '#f9fafb',
                        borderColor: darkMode ? '#1f2937' : '#e5e7eb'
                      }}
                    >
                      {note.title && (
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {note.title}
            </div>
                      )}
                      <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {note.content || '—'}
                </div>
              </div>
                  ))}
            </div>
              )}
            </div>
          </div>
        )}

        {createModalType && createForm && (
          <div style={modalStyles.overlay} onClick={() => setCreateModalType(null)}>
            <div
              style={{
                ...modalStyles.modal,
                backgroundColor: darkMode ? '#111827' : '#ffffff'
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={modalStyles.header || styles.createModalHeader}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                  {createModalType === 'supplier' && 'Crear Proveïdor'}
                  {createModalType === 'warehouse' && 'Crear Magatzem'}
                  {createModalType === 'forwarder' && 'Crear Transitari'}
                  {createModalType === 'expense' && 'Crear Despesa'}
                </h3>
                <button
                  onClick={() => setCreateModalType(null)}
                  style={modalStyles.closeButton || styles.createModalClose}
                  aria-label="Tancar"
                >
                  ×
                    </button>
              </div>
              <div style={modalStyles.body || styles.createModalBody}>
                {createModalType === 'supplier' && (
                  <div style={styles.createFormGrid}>
                    <label style={styles.createLabel}>
                      Nom
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Tipus
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                        style={styles.createInput}
                      >
                        <option value="manufacturer">Fabricant</option>
                        <option value="trading">Trading Company</option>
                        <option value="agent">Agent</option>
                        <option value="freight">Transitari</option>
                      </select>
                    </label>
                    <label style={styles.createLabel}>
                      Contacte
                      <input
                        type="text"
                        value={createForm.contact_name}
                        onChange={(e) => setCreateForm({ ...createForm, contact_name: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Email
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      País
                      <input
                        type="text"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Ciutat
                      <input
                        type="text"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                  </div>
                )}

                {createModalType === 'warehouse' && (
                  <div style={styles.createFormGrid}>
                    <label style={styles.createLabel}>
                      Nom
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Tipus
                      <select
                        value={createForm.type}
                        onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                        style={styles.createInput}
                      >
                        <option value="custom">Personalitzat</option>
                        <option value="amazon_fba">Amazon FBA</option>
                        <option value="amazon_fbm">Amazon FBM</option>
                        <option value="3pl">3PL</option>
                        <option value="own">Magatzem propi</option>
                      </select>
                    </label>
                    <label style={styles.createLabel}>
                      País
                      <input
                        type="text"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Ciutat
                      <input
                        type="text"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Adreça
                      <input
                        type="text"
                        value={createForm.address}
                        onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                  </div>
                )}

                {createModalType === 'forwarder' && (
                  <div style={styles.createFormGrid}>
                    <label style={styles.createLabel}>
                      Nom
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Contacte
                      <input
                        type="text"
                        value={createForm.contact_name}
                        onChange={(e) => setCreateForm({ ...createForm, contact_name: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Email
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      País
                      <input
                        type="text"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Ciutat
                      <input
                        type="text"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
            </div>
                )}

                {createModalType === 'expense' && (
                  <div style={styles.createFormGrid}>
                    <label style={styles.createLabel}>
                      Categoria
                      <select
                        value={createForm.category_id || ''}
                        onChange={(e) => setCreateForm({ ...createForm, category_id: e.target.value })}
                        style={styles.createInput}
                      >
                        <option value="">Selecciona categoria</option>
                        {expenseCategories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </label>
                    <label style={styles.createLabel}>
                      Import (EUR)
                      <input
                        type="number"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Data
                      <input
                        type="date"
                        value={createForm.date}
                        onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                    <label style={styles.createLabel}>
                      Descripció
                      <input
                        type="text"
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        style={styles.createInput}
                      />
                    </label>
                </div>
                )}

                <div style={styles.createModalFooter}>
                  <button
                    onClick={() => setCreateModalType(null)}
                    style={styles.createCancel}
                  >
                    Cancel·lar
                  </button>
                  <button
                    onClick={handleCreateSave}
                    style={styles.createSubmit}
                    disabled={createSaving}
                  >
                    {createSaving ? 'Guardant...' : 'Crear'}
                  </button>
              </div>
            </div>
            </div>
          </div>
        )}

        <div style={phaseWrapperStyle}>
          <div
            data-testid="phase-gate-block-banner"
            data-revealed={phaseBlockVisible ? 'true' : 'false'}
            aria-hidden={phaseBlockVisible ? 'false' : 'true'}
            style={{
              ...styles.phaseGateBanner,
              borderColor: currentPhase.accent,
              backgroundColor: currentPhase.bg,
              color: darkMode ? '#ffffff' : '#111827',
              display: phaseBlockVisible ? 'flex' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color={currentPhase.accent} />
              <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{phaseBlockMessage}</span>
            </div>
            <button
              onClick={() => {
                setPhaseBlockMessage(null)
                setPhaseBlockVisible(false)
              }}
              style={styles.phaseGateBannerClose}
              aria-label="Tancar"
            >
              ×
            </button>
          </div>
        <PhaseSection
          phaseId={1}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(1)}
          darkMode={darkMode}
        >
          <CollapsibleSection
            title="Resum del Projecte"
            icon={Info}
            defaultOpen={true}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            <div style={{
              ...styles.timelineSection,
              backgroundColor: 'transparent',
              border: 'none',
              padding: 0,
              marginBottom: '24px'
            }}>
            <PhaseChecklist
              project={project}
                currentPhase={phaseId}
              projectId={id}
              darkMode={darkMode}
                id="phase-checklist"
                onProgressUpdate={setPhaseProgress}
            />
          </div>

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
                navigate(`/orders?project=${id}&action=create`)
              }}
              onMarkExempt={() => {
                if (identifiersSectionRef.current) {
                  identifiersSectionRef.current.markAsExempt()
                }
              }}
            />
          </Suspense>

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

          </CollapsibleSection>

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

          {phaseId === 1 && (
            <div style={{ marginBottom: '24px' }}>
              <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                <ProfitabilityCalculator projectId={id} darkMode={darkMode} showAsinCapture={false} />
              </Suspense>
            </div>
          )}
        </PhaseSection>

        <PhaseSection
          phaseId={2}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(2)}
          darkMode={darkMode}
        >
          <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
            <ViabilityCalculator
              projectId={id}
              darkMode={darkMode}
              phaseStyle={getPhaseStyle(2)}
              onSave={(payload) => setViabilitySnapshot(payload)}
            />
          </Suspense>
        </PhaseSection>

        <PhaseSection
          phaseId={3}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(3)}
          darkMode={darkMode}
        >
          <div style={{ marginBottom: '24px' }}>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
              <QuotesSection projectId={id} darkMode={darkMode} />
            </Suspense>
          </div>
        </PhaseSection>

        <PhaseSection
          phaseId={4}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(4)}
          darkMode={darkMode}
        >
          <div style={styles.phasePlaceholder}>
            Sense widgets específics encara per aquesta fase.
          </div>
        </PhaseSection>

        <PhaseSection
          phaseId={5}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(5)}
          darkMode={darkMode}
        >
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
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/orders?project=${id}`)}
              >
                <ShoppingCart size={16} />
                Veure Comandes
              </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
            title="Documents i Adjunts"
            icon={Paperclip}
          defaultOpen={false}
          darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            {!driveConnected && (
              <div style={styles.driveWarning}>
                <AlertCircle size={18} color="#f59e0b" />
                <div style={{ flex: 1 }}>
                  Connecta Google Drive per gestionar els documents del projecte.
                </div>
                <Button
                  variant="warning-soft"
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  Connectar
                </Button>
          </div>
            )}
            {driveConnected && projectFolders && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '200px 1fr' : '280px 1fr'),
              gap: isMobile ? '16px' : '24px'
            }}>
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
            )}
            {driveConnected && !projectFolders && (
              <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                Carregant carpetes de Drive...
              </div>
            )}
          </CollapsibleSection>

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
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/finances?project=${id}`)}
              >
                <DollarSign size={16} />
                Veure Finances
              </Button>
            </div>
          </CollapsibleSection>
        </PhaseSection>

        <PhaseSection
          phaseId={6}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(6)}
          darkMode={darkMode}
        >
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
        </PhaseSection>

        <PhaseSection
          phaseId={7}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyle(7)}
          darkMode={darkMode}
        >
          <CollapsibleSection
            title="Tasques i Notes"
            icon={StickyNote}
            defaultOpen={false}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
            <div style={{ marginBottom: '24px' }}>
              <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                <TasksSection 
                  entityType="project" 
                  entityId={id} 
                  darkMode={darkMode} 
                />
              </Suspense>
            </div>
        </CollapsibleSection>
        </PhaseSection>
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
  phaseSection: {
    borderRadius: '16px',
    border: '1px solid',
    padding: '12px 16px',
    marginBottom: '20px'
  },
  phaseSectionHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    background: 'transparent',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    cursor: 'pointer'
  },
  phaseSectionHeaderText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  phaseSectionHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#6b7280'
  },
  phaseSectionTitle: {
    fontSize: '16px',
    fontWeight: '700'
  },
  phaseSectionBody: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  phasePreviewChip: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
    backgroundColor: '#f3f4f6'
  },
  phasePastChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid #d1d5db',
    color: '#6b7280',
    backgroundColor: '#f9fafb'
  },
  phasePlaceholder: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px dashed var(--border-color)',
    color: '#6b7280',
    fontSize: '13px'
  },
  phaseStickyContainer: {
    position: 'sticky',
    top: '12px',
    zIndex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1px solid',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
    marginBottom: '24px'
  },
  phaseTimelineSticky: {
    display: 'flex',
    alignItems: 'center'
  },
  phaseCurrentBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  phaseCurrentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  phaseCurrentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  phaseActionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  createMenuWrapper: {
    position: 'relative'
  },
  createMenu: {
    position: 'absolute',
    top: '42px',
    right: 0,
    minWidth: '180px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
    padding: '6px',
    zIndex: 10
  },
  createMenuItem: {
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    color: '#374151',
    cursor: 'pointer',
    borderRadius: '8px'
  },
  createModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  createModalClose: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px'
  },
  createModalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  createFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  },
  createLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280'
  },
  createInput: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px'
  },
  createModalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  createCancel: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: 'transparent',
    cursor: 'pointer'
  },
  createSubmit: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #4f46e5',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    cursor: 'pointer'
  },
  phaseStatusChip: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid'
  },
  phaseStatusTitle: {
    fontSize: '14px',
    fontWeight: '600'
  },
  phaseStatusCenter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'center',
    minWidth: '90px'
  },
  phaseStatusRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  phaseStatusNext: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-end'
  },
  phaseStatusNextRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  phaseStatusWarning: {
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid',
    borderRadius: '999px',
    padding: '2px 8px'
  },
  phaseStatusAction: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4f46e5',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer'
  },
  phaseViabilitySummary: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#10b981'
  },
  notesOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  notesModal: {
    width: 'min(640px, 90vw)',
    maxHeight: '80vh',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  notesHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  notesItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#f9fafb'
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
  notesButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    fontSize: '13px',
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
  phaseNavBar: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    paddingBottom: '4px',
    scrollSnapType: 'x mandatory'
  },
  phaseNavButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid',
    background: 'transparent',
    fontSize: '13px',
    cursor: 'pointer',
    scrollSnapAlign: 'center',
    whiteSpace: 'nowrap'
  },
  phaseNavIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  phaseNavLabel: {
    fontSize: '13px'
  },
  phaseGroupsWrapper: {
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  phaseGroupBlock: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '16px',
    flex: 1,
    minWidth: '220px'
  },
  phaseGroupCard: {
    flex: 1,
    borderRadius: '14px',
    border: '1px solid',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  phaseGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  phaseGroupChip: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid',
    background: 'transparent'
  },
  phaseGroupPhases: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  phaseGroupDivider: {
    width: '1px',
    backgroundColor: 'var(--border-color)'
  },
  phaseGateBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
    marginBottom: '20px'
  },
  phaseGateBannerClose: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '18px',
    lineHeight: 1
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
  
}
