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
  Receipt,
  DollarSign,
  StickyNote,
  Search,
  Calculator,
  Factory,
  Rocket,
  Lock
} from 'lucide-react'
import Header from '../components/Header'
import PageGutter from '../components/ui/PageGutter'
import MarketplaceTag, { MarketplaceTagGroup } from '../components/MarketplaceTag'
import StatusBadge from '../components/StatusBadge'
import FileUploader from '../components/FileUploader'
import ProjectDriveExplorer from '../components/projects/ProjectDriveExplorer'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import CollapsibleSection from '../components/CollapsibleSection'
import PhaseChecklist from '../components/projects/PhaseChecklist'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useNotes } from '../hooks/useNotes'
import { PHASE_STYLES, getPhaseStyle, getPhaseSurfaceStyles, getPhaseMeta } from '../utils/phaseStyles'
import PhaseMark from '../components/Phase/PhaseMark'
import { getModalStyles } from '../utils/responsiveStyles'
import Button from '../components/Button'
// Dynamic imports for components that import supabase statically to avoid circular dependencies during module initialization
const IdentifiersSection = lazy(() => import('../components/IdentifiersSection'))
const ProfitabilityCalculator = lazy(() => import('../components/ProfitabilityCalculator'))
const QuickSupplierPriceEstimate = lazy(() => import('../components/QuickSupplierPriceEstimate'))
const QuotesSection = lazy(() => import('../components/QuotesSection'))
const DecisionLog = lazy(() => import('../components/DecisionLog'))
const AmazonReadinessBadge = lazy(() => import('../components/AmazonReadinessBadge'))
const CompetitiveAsinSection = lazy(() => import('../components/CompetitiveAsinSection'))
const ViabilityCalculator = lazy(() => import('../components/projects/ViabilityCalculator'))

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
    return null
  }
}

export default function ProjectDetail() {
  const [appContextModule, setAppContextModule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const loadSeqRef = useRef(0)
  const mountedRef = useRef(false)
  
  useEffect(() => {
    mountedRef.current = true
    const seq = ++loadSeqRef.current
    setLoading(true)
    setLoadError(null)
    loadAppContext().then((module) => {
      if (!mountedRef.current || seq !== loadSeqRef.current) return
      if (!module) {
        setLoadError('No s’ha pogut carregar el mòdul principal.')
        setAppContextModule(null)
      } else {
      setAppContextModule(module)
      }
      setLoading(false)
    }).catch(() => {
      if (!mountedRef.current || seq !== loadSeqRef.current) return
      setLoadError('No s’ha pogut carregar el mòdul principal.')
      setAppContextModule(null)
      setLoading(false)
    })
    return () => { mountedRef.current = false }
  }, [])
  
  if (loading) {
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

  if (!appContextModule) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--app-bg)'
      }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-1)' }}>
            {loadError || 'Error carregant.'}
          </p>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                const seq = ++loadSeqRef.current
                setLoading(true)
                setLoadError(null)
                loadAppContext().then((module) => {
                  if (!mountedRef.current || seq !== loadSeqRef.current) return
                  if (!module) {
                    setLoadError('No s’ha pogut carregar el mòdul principal.')
                    setAppContextModule(null)
                  } else {
                    setAppContextModule(module)
                  }
                  setLoading(false)
                }).catch(() => {
                  if (!mountedRef.current || seq !== loadSeqRef.current) return
                  setLoadError('No s’ha pogut carregar el mòdul principal.')
                  setAppContextModule(null)
                  setLoading(false)
                })
              }}
            >
              Reintenta
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return <ProjectDetailInner useApp={appContextModule.useApp} />
}

function PhaseSection({ phaseId, currentPhaseId, phaseStyle, darkMode, children }) {
  const [isOpen, setIsOpen] = useState(phaseId <= currentPhaseId)
  const [isHovered, setIsHovered] = useState(false)
  const isCurrent = phaseId === currentPhaseId
  const isPast = phaseId < currentPhaseId
  const isFuture = phaseId > currentPhaseId
  const phaseMeta = getPhaseMeta(phaseId)
  const PhaseIcon = phaseMeta.icon
  const phaseColor = phaseMeta.color
  const sectionBorder = darkMode ? 'rgba(148, 163, 184, 0.24)' : 'rgba(15, 23, 42, 0.08)'
  const sectionBg = darkMode ? '#111827' : '#ffffff'

  useEffect(() => {
    if (phaseId === currentPhaseId) {
      setIsOpen(true)
    }
  }, [phaseId, currentPhaseId])

  return (
    <section
      data-phase-section={phaseId}
      style={{
      ...styles.phaseSection,
      borderColor: sectionBorder,
        borderTopColor: sectionBorder,
        backgroundColor: isHovered ? 'var(--surface-bg-2)' : sectionBg,
        boxShadow: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={styles.phaseSectionHeader}
        aria-expanded={isOpen}
      >
          <div style={styles.phaseSectionHeaderText} className="phase-panel__headerText">
            <div className="phase-panel__title">
              <PhaseMark phaseId={phaseId} size={18} />
            </div>
          <span
            className="phase-panel__subtitle"
            style={{
            fontSize: '13px',
            color: darkMode ? '#9ca3af' : '#6b7280'
            }}
          >
            {phaseMeta.description}
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
      </Button>
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
  const { darkMode, refreshProjects, demoMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const { t } = useTranslation()
  const identifiersSectionRef = useRef(null)
  const researchFileInputRef = useRef(null)
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  // Extreure UUID net del paràmetre de ruta (eliminar qualsevol sufix com "Fes:")
  const id = rawId?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || null
  
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [marketplaceTags, setMarketplaceTags] = useState([])
  const [marketplaceTagsLoading, setMarketplaceTagsLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [phaseProgress, setPhaseProgress] = useState({ completed: 0, total: 0, allOk: false })
  const [phaseBlockMessage, setPhaseBlockMessage] = useState(null)
  const [phaseBlockVisible, setPhaseBlockVisible] = useState(false)
  const [viabilitySnapshot, setViabilitySnapshot] = useState(null)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState(null)
  const [createForm, setCreateForm] = useState(null)
  const [createSaving, setCreateSaving] = useState(false)
  const [expenseCategories, setExpenseCategories] = useState([])
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [researchAsinInput, setResearchAsinInput] = useState('')
  const [researchSnapshot, setResearchSnapshot] = useState({
    asin: '',
    url: '',
    title: '',
    thumbUrl: '',
    price: '',
    weight: '',
    dims: ''
  })
  const [researchChecks, setResearchChecks] = useState({
    demand: false,
    competition: false,
    simple: false,
    improvable: false
  })
  const [researchEvidence, setResearchEvidence] = useState({
    demand: '',
    competition: '',
    simple: '',
    improvable: ''
  })
  const [researchTouched, setResearchTouched] = useState(false)
  const [researchOverrideOpen, setResearchOverrideOpen] = useState(false)
  const [researchDecision, setResearchDecision] = useState(null)
  const [researchMsg, setResearchMsg] = useState(null)
  const [researchImport, setResearchImport] = useState(null)
  const { notes, loading: notesLoading } = useNotes()
  const loadSeqRef = useRef(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  

  const loadProject = async () => {
    const seq = ++loadSeqRef.current
    if (!id) {
      if (mountedRef.current && seq === loadSeqRef.current) {
      setError('ID de projecte no vàlid')
      setLoading(false)
      }
      return
    }

    if (mountedRef.current && seq === loadSeqRef.current) {
    setLoading(true)
    setError(null)
    }
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
        if (mountedRef.current && seq === loadSeqRef.current) {
        setError('Projecte no trobat')
        setProject(null)
        setDocuments([])
          setLoading(false)
        }
        return
      }
      if (mountedRef.current && seq === loadSeqRef.current) setProject(data)
      const docs = await getDocuments(id)
      if (mountedRef.current && seq === loadSeqRef.current) {
      setDocuments(Array.isArray(docs) ? docs : [])
      }
    } catch (err) {
      try {
        const { formatError, notifyError } = await import('../lib/errorHandling')
        setError(formatError(err))
        notifyError(err, { context: 'ProjectDetail:loadProject' })
      } catch (importErr) {
        setError('Error carregant mòduls')
      }
      if (mountedRef.current && seq === loadSeqRef.current) {
      setProject(null)
      setDocuments([])
      }
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) setLoading(false)
    }
  }

  const extractAsin = (value) => {
    const v = (value || '').trim()
    if (!v) return ''
    if (/^[A-Z0-9]{10}$/i.test(v)) return v.toUpperCase()
    const m = v.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i)
    return m?.[1]?.toUpperCase() || ''
  }

  const buildAmazonUrl = (asin) => asin ? `https://www.amazon.es/dp/${asin}` : ''

  const parseResearchReport = (text) => {
    const getLineValue = (prefix) => {
      const re = new RegExp(`^${prefix}\\s*:\\s*(.*)$`, 'mi')
      const m = text.match(re)
      return m ? (m[1] || '').trim() : 'NOT_AVAILABLE'
    }

    const asin = getLineValue('asin')
    const product_url = getLineValue('product_url')
    const title = getLineValue('title')
    const thumb_url = getLineValue('thumb_url')
    const decision = getLineValue('decision')

    const hasHeader = /^#\s*RESEARCH REPORT\s*—\s*ASIN\s+/mi.test(text)
    const hasSnapshot = /^##\s*PRODUCT_SNAPSHOT/mi.test(text)
    const hasFinal = /^##\s*FINAL_DECISION/mi.test(text)

    const asinOk = /^[A-Z0-9]{10}$/.test(asin)
    const urlOk = product_url && product_url !== 'NOT_AVAILABLE' && /^https?:\/\//i.test(product_url)
    const decisionOk = ['PASS', 'PASS_WITH_IMPROVEMENTS', 'NO_PASS'].includes(decision)

    const ok = hasHeader && hasSnapshot && hasFinal && asinOk && urlOk && decisionOk && title !== 'NOT_AVAILABLE'

    return {
      ok,
      errors: [
        !hasHeader ? 'Falta capçalera # RESEARCH REPORT — ASIN …' : null,
        !hasSnapshot ? 'Falta secció PRODUCT_SNAPSHOT' : null,
        !hasFinal ? 'Falta secció FINAL_DECISION' : null,
        !asinOk ? 'ASIN invàlid' : null,
        !urlOk ? 'URL invàlida' : null,
        !decisionOk ? 'Decision invàlida' : null,
        title === 'NOT_AVAILABLE' ? 'Title buit' : null
      ].filter(Boolean),
      data: { asin, product_url, title, thumb_url, decision, rawText: text }
    }
  }

  const hasEvidence = (key) => {
    const v = (researchEvidence?.[key] || '').trim()
    return v.length >= 8
  }

  const researchChecksReady = useMemo(() => {
    return ['demand', 'competition', 'simple', 'improvable'].every((k) => hasEvidence(k))
  }, [researchEvidence])

  const researchStoragePrefix = useMemo(() => {
    if (!id) return null
    return `projects/${id}/research/`
  }, [id])

  const researchAllChecksOk = useMemo(() => {
    return !!(researchChecks.demand && researchChecks.competition && researchChecks.simple && researchChecks.improvable)
  }, [researchChecks])

  const researchHasAsin = useMemo(() => {
    return !!(researchSnapshot.asin && /^[A-Z0-9]{10}$/.test(researchSnapshot.asin))
  }, [researchSnapshot.asin])

  const researchHasReport = !!researchImport

  const persistResearch = (next) => {
    if (!id) return
    try {
      localStorage.setItem(`research_${id}`, JSON.stringify(next))
    } catch (_) {}
  }

  const loadResearch = () => {
    if (!id) return
    try {
      const raw = localStorage.getItem(`research_${id}`)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return
      if (parsed.snapshot) setResearchSnapshot(prev => ({ ...prev, ...parsed.snapshot }))
      if (parsed.checks) setResearchChecks(prev => ({ ...prev, ...parsed.checks }))
      if (parsed.evidence) setResearchEvidence(prev => ({ ...prev, ...parsed.evidence }))
      if (parsed.decision) setResearchDecision(parsed.decision)
      if (parsed.asinInput) setResearchAsinInput(parsed.asinInput)
    } catch (_) {}
  }

  const setMsg = (type, text) => {
    setResearchMsg({ type, text })
    window.setTimeout(() => setResearchMsg(null), type === 'success' ? 1600 : 2200)
  }

  const handleAsinLoad = () => {
    setResearchTouched(true)
    const asin = extractAsin(researchAsinInput)
    if (!asin) {
      setMsg('error', 'ASIN o URL no vàlids')
      return
    }
    const url = buildAmazonUrl(asin)
    const defaultThumb = thumbnailUrl || ''
    const pickFirst = (...vals) => {
      for (const v of vals) {
        if (v === 0) return 0
        if (typeof v === 'string' && v.trim()) return v.trim()
        if (typeof v === 'number' && Number.isFinite(v)) return String(v)
      }
      return ''
    }
    const projectTitle = pickFirst(project?.name, project?.title, '')
    const projectPrice = pickFirst(
      project?.selling_price,
      project?.price,
      project?.amazon_price,
      ''
    )
    const projectWeight = pickFirst(
      project?.package_weight,
      project?.weight,
      project?.weight_kg,
      project?.package_weight_kg,
      ''
    )
    const projectDims = pickFirst(
      project?.package_dims,
      project?.dims,
      project?.dimensions,
      ''
    )
    const nextSnapshot = {
      ...researchSnapshot,
      asin,
      url: researchSnapshot.url?.trim() ? researchSnapshot.url : url,
      thumbUrl: (researchSnapshot.thumbUrl || '').trim() ? researchSnapshot.thumbUrl : defaultThumb,
      title: (researchSnapshot.title || '').trim() ? researchSnapshot.title : projectTitle,
      price: (researchSnapshot.price || '').trim() ? researchSnapshot.price : projectPrice,
      weight: (researchSnapshot.weight || '').trim() ? researchSnapshot.weight : projectWeight,
      dims: (researchSnapshot.dims || '').trim() ? researchSnapshot.dims : projectDims
    }
    setResearchSnapshot(nextSnapshot)
    const next = {
      asinInput: researchAsinInput,
      snapshot: nextSnapshot,
      checks: researchChecks,
      evidence: researchEvidence,
      decision: researchDecision
    }
    persistResearch(next)
    setMsg('success', 'ASIN carregat')
  }

  const saveResearch = () => {
    const next = {
      asinInput: researchAsinInput,
      snapshot: researchSnapshot,
      checks: researchChecks,
      evidence: researchEvidence,
      decision: researchDecision
    }
    persistResearch(next)
    setMsg('success', 'Guardat (local)')
  }

  const resetResearch = () => {
    setResearchAsinInput('')
    setResearchSnapshot({ asin: '', url: '', title: '', thumbUrl: '', price: '', weight: '', dims: '' })
    setResearchChecks({ demand: false, competition: false, simple: false, improvable: false })
    setResearchEvidence({ demand: '', competition: '', simple: '', improvable: '' })
    setResearchDecision(null)
    setResearchTouched(false)
    setResearchOverrideOpen(false)
    setResearchMsg(null)
    try { if (id) localStorage.removeItem(`research_${id}`) } catch (_) {}
  }

  const markResearchDecision = (pass, forced = false) => {
    if (!researchHasAsin) {
      setMsg('error', 'Primer defineix l’ASIN')
      return
    }
    const decision = { pass: !!pass, forced: !!forced, at: Date.now() }
    setResearchDecision(decision)
    const next = {
      asinInput: researchAsinInput,
      snapshot: researchSnapshot,
      checks: researchChecks,
      evidence: researchEvidence,
      decision
    }
    persistResearch(next)
    setMsg('success', pass ? (forced ? 'PASSA (forçat)' : 'PASSA') : 'NO PASSA')
  }

  const handleImportResearchFile = async (file) => {
    if (researchStoragePrefix) {
      try {
        const { storageService } = await import('../lib/storageService')
        await storageService.uploadFile(`${researchStoragePrefix}${file.name}`, file)
        // Notify Explorer to refresh after upload (same as dropzone)
        if (handleUploadComplete) {
          await handleUploadComplete([{
            name: file.name,
            path: `${researchStoragePrefix}${file.name}`,
            size: file.size
          }])
        }
      } catch (err) {
        try {
          const { showToast } = await import('../components/Toast')
          showToast('Permís denegat: no tens accés a aquest projecte o el path no és vàlid.', 'warning')
        } catch {}
        return
      }
    }
    const text = await file.text()
    const parsed = parseResearchReport(text)

    if (!parsed.ok) {
      try {
        const { showToast } = await import('../components/Toast')
        showToast(`Informe invàlid: ${parsed.errors[0]}`, 'warning')
      } catch {}
      return
    }

    setResearchImport(parsed.data)

    try {
      localStorage.setItem(`research_import_${id}`, JSON.stringify(parsed.data))
    } catch {}

    try {
      const { showToast } = await import('../components/Toast')
      showToast('Informe importat correctament', 'success')
    } catch {}
  }

  const copyResearchPayload = async () => {
    if (!researchImport) return
    const payload = {
      asin: researchImport.asin,
      product_url: researchImport.product_url,
      title: researchImport.title,
      thumb_url: researchImport.thumb_url,
      decision: researchImport.decision
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      const { showToast } = await import('../components/Toast')
      showToast('Payload copiat', 'success')
    } catch {}
  }

  useEffect(() => {
    if (id) {
      loadProject()
    } else {
      setLoading(false)
      setError('ID de projecte no vàlid')
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    loadResearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!id) return
    try {
      const stored = localStorage.getItem(`research_import_${id}`)
      if (stored) setResearchImport(JSON.parse(stored))
    } catch {}
  }, [id])

  // M3 — fetch marketplace TAGS for this project (UI-only mapping, no new business logic)
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const loadMarketplaceTags = async () => {
      setMarketplaceTagsLoading(true)
      try {
        const { supabase } = await import('../lib/supabase')

        const { data, error } = await supabase
          .from('v_project_marketplace_tags')
          .select('marketplace_code,is_primary,stock_state,is_active')
          .eq('project_id', id)
          .eq('is_active', true)
          .order('is_primary', { ascending: false })
          .order('marketplace_code', { ascending: true })

        if (error) throw error
        if (cancelled) return

        // Fallback deterministic (contract): ES primary, stock_state none
        const safe = Array.isArray(data) && data.length
          ? data
          : [{ marketplace_code: 'ES', is_primary: true, stock_state: 'none', is_active: true }]

        setMarketplaceTags(safe)
      } catch (e) {
        if (cancelled) return
        // On error, keep deterministic fallback (no heuristics)
        setMarketplaceTags([{ marketplace_code: 'ES', is_primary: true, stock_state: 'none', is_active: true }])
      } finally {
        if (!cancelled) setMarketplaceTagsLoading(false)
      }
    }

    loadMarketplaceTags()
    return () => { cancelled = true }
  }, [id])

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

  const openCreateModal = (type) => {
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
          file_url: file.path,
          drive_file_id: null,
          category: getCategoryForPhase(getPhaseIdFromProject(project)),
          file_size: file.size
        })
        savedCount++
        // Audit log: document pujat correctament
        try {
          await logSuccess('document', 'upload', doc.id, 'Document uploaded', {
            project_id: id,
            file_name: file.name,
            file_size: file.size
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
            file_size: file.size
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

  const normalizePhaseStyle = (phaseStyle) => phaseStyle

  const getPhaseStyleForUI = (phase) => normalizePhaseStyle(getPhaseStyle(phase))
  const phaseId = getPhaseIdFromProject(project)
  const currentPhase = getPhaseStyleForUI(phaseId)
  const phaseSurface = getPhaseSurfaceStyles(currentPhase, { darkMode, borderWidth: 2 })
  const phaseWrapperStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0',
    padding: isMobile ? '12px' : '18px',
    marginTop: '0',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
    boxShadow: 'none'
  }
  const phaseCardStyle = {
    border: 'none',
    borderRadius: 'var(--radius-base)',
    boxShadow: 'var(--shadow-soft)',
    ...phaseSurface.cardStyle
  }
  const currentGroup = PHASE_GROUPS.find(group => group.phases.includes(phaseId))
  const phaseSubtitle = PHASE_WORKFLOW_COPY[phaseId] || currentPhase.description
  const phaseGroupLabel = currentGroup?.label || 'PHASE'
  const nextPhaseId = phaseId < 7 ? phaseId + 1 : null
  const projectTitle = project?.name || '—'
  const [activeFolderLabel, setActiveFolderLabel] = useState('')
  const nextPhaseLabel = nextPhaseId ? getPhaseStyle(nextPhaseId).name : null
  const [sectionSearchTerm, setSectionSearchTerm] = useState('')
  const [showSectionDropdown, setShowSectionDropdown] = useState(false)
  const sectionSearchRef = useRef(null)
  const sectionHighlightTimeoutRef = useRef(null)
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

  // Section search: list of phases
  const phaseSections = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7].map(pid => {
      const meta = getPhaseMeta(pid)
      return {
        id: pid,
        name: meta.name || meta.label || `Fase ${pid}`,
        description: meta.description || ''
      }
    })
  }, [])

  const filteredSections = useMemo(() => {
    if (!sectionSearchTerm.trim()) return []
    const term = sectionSearchTerm.toLowerCase().trim()
    return phaseSections.filter(section => 
      section.name.toLowerCase().includes(term) ||
      section.description.toLowerCase().includes(term)
    )
  }, [sectionSearchTerm, phaseSections])

  const scrollToSection = (phaseId) => {
    const section = document.querySelector(`[data-phase-section="${phaseId}"]`)
    if (!section) return
    
    // Open section if closed
    const button = section.querySelector('button[aria-expanded]')
    if (button && button.getAttribute('aria-expanded') === 'false') {
      button.click()
    }
    
    // Scroll smoothly
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    
    // Highlight
    section.classList.add('section-highlight')
    if (sectionHighlightTimeoutRef.current) {
      clearTimeout(sectionHighlightTimeoutRef.current)
    }
    sectionHighlightTimeoutRef.current = setTimeout(() => {
      section.classList.remove('section-highlight')
    }, 1500)
    
    setSectionSearchTerm('')
    setShowSectionDropdown(false)
  }

  const handleSectionSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSectionDropdown(false)
      setSectionSearchTerm('')
      sectionSearchRef.current?.blur()
    } else if (e.key === 'Enter' && filteredSections.length > 0) {
      e.preventDefault()
      scrollToSection(filteredSections[0].id)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sectionSearchRef.current && !sectionSearchRef.current.contains(e.target)) {
        setShowSectionDropdown(false)
      }
    }
    if (showSectionDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSectionDropdown])

  useEffect(() => {
    if (!id) return
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
            <Button variant="primary" size="sm" onClick={loadProject}>
              Reintentar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>
              Tornar a Projectes
            </Button>
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
          <Button variant="primary" size="sm" onClick={() => navigate('/projects')}>
            Tornar a Projectes
          </Button>
        </div>
      </div>
    )
  }

  const renderPhaseContent = (sectionPhaseId) => {
    switch (sectionPhaseId) {
      case 1:
  return (
          <>
            <div style={{ display: 'grid', gap: 10, paddingTop: 2 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <input
                  type="text"
                  value={researchAsinInput}
                  onChange={(e) => { setResearchTouched(true); setResearchAsinInput(e.target.value) }}
                  placeholder="ASIN o URL Amazon"
                  style={{
                    flex: '1 1 420px',
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--border-1)',
                    background: 'var(--surface-bg)',
                    color: 'var(--text-1)',
                    padding: '0 10px',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={saveResearch}
                    disabled={!researchTouched && !researchHasAsin}
                    className="btn-success"
                  >
                    Guardar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={resetResearch}
                    disabled={!researchTouched && !researchHasAsin && !researchDecision}
                    className="btn-danger"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {researchMsg && (
      <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: researchMsg.type === 'success' ? 'var(--success-1)' : 'var(--danger-1)'
                }}>
                  {researchMsg.text}
                </div>
              )}

              {/* Informe de recerca → Drive (import + upload) */}
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    border: '2px dashed var(--border-1)',
                    borderRadius: 10,
                    padding: 8,
                    background: 'var(--surface-bg-2)'
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--muted-1)', marginBottom: 4 }}>
                    Informe de recerca
                  </div>

                  {!researchStoragePrefix ? (
                    <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                      Carpeta no disponible.
                    </div>
                  ) : (
                    <>
                      <input
                        ref={researchFileInputRef}
                        type="file"
                        accept=".md,.txt"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleImportResearchFile(f)
                          e.target.value = ''
                        }}
                      />
                      {!researchHasReport ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!researchStoragePrefix}
                              title="Importa un RESEARCH_REPORT (.md)"
                              onClick={() => researchFileInputRef.current?.click()}
                            >
                              Importar informe
                            </Button>
                          </div>
                          <FileUploader
                            folderId={researchStoragePrefix}
                            onUploadComplete={handleUploadComplete}
                            label="Arrossega l’informe aquí"
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: '1px solid var(--border-1)',
                            background: 'var(--surface-bg)'
                          }}
                        >
                          <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                            <strong style={{ color: 'var(--text-1)' }}>Informe importat ✓</strong>
                            {researchImport?.asin ? ` · ASIN ${researchImport.asin}` : ''}
                            {researchImport?.decision ? ` · ${researchImport.decision}` : ''}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => researchFileInputRef.current?.click()}
                          >
                            Reemplaçar informe
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {researchHasAsin ? (
        <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '100px 1fr',
                  gap: 10,
                  alignItems: 'start'
                }}>
            <div style={{
                    width: 100,
                    height: 100,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'var(--surface-bg-2)',
                    border: '1px solid var(--border-1)',
                    display: 'grid',
                    placeItems: 'center'
                  }}>
                    {(researchSnapshot.thumbUrl || '').trim() ? (
                      <img
                        src={researchSnapshot.thumbUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <Image size={18} color="var(--muted-1)" />
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                      <strong style={{ color: 'var(--text-1)' }}>{researchSnapshot.asin}</strong>
                      {' · '}
                      <a href={researchSnapshot.url || buildAmazonUrl(researchSnapshot.asin)} target="_blank" rel="noreferrer" style={{ color: 'var(--text-1)' }}>
                        Amazon
                      </a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                      <input
                        type="text"
                        value={researchSnapshot.title}
                        onChange={(e) => { setResearchTouched(true); setResearchSnapshot({ ...researchSnapshot, title: e.target.value }) }}
                        placeholder="Títol (base)"
                        style={{
                          height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg)', color: 'var(--text-1)', padding: '0 10px', outline: 'none'
                        }}
                      />
                      <input
                        type="text"
                        value={researchSnapshot.price}
                        onChange={(e) => { setResearchTouched(true); setResearchSnapshot({ ...researchSnapshot, price: e.target.value }) }}
                        placeholder="Preu aprox. (ex: 19.99)"
                        style={{
                          height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg)', color: 'var(--text-1)', padding: '0 10px', outline: 'none'
                        }}
                      />
                      <input
                        type="text"
                        value={researchSnapshot.weight}
                        onChange={(e) => { setResearchTouched(true); setResearchSnapshot({ ...researchSnapshot, weight: e.target.value }) }}
                        placeholder="Pes aprox. (ex: 1.2 kg)"
                        style={{
                          height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg)', color: 'var(--text-1)', padding: '0 10px', outline: 'none'
                        }}
                      />
                      <input
                        type="text"
                        value={researchSnapshot.dims}
                        onChange={(e) => { setResearchTouched(true); setResearchSnapshot({ ...researchSnapshot, dims: e.target.value }) }}
                        placeholder="Mides aprox. (ex: 40×30×10 cm)"
                        style={{
                          height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg)', color: 'var(--text-1)', padding: '0 10px', outline: 'none'
                        }}
                      />
                    </div>

                    <input
                      type="text"
                      value={researchSnapshot.thumbUrl}
                      onChange={(e) => { setResearchTouched(true); setResearchSnapshot({ ...researchSnapshot, thumbUrl: e.target.value }) }}
                      placeholder="Thumb URL (opcional: enganxa si vols sobreescriure)"
                      style={{
                        height: 34, borderRadius: 10, border: '1px solid var(--border-1)',
                        background: 'var(--surface-bg)', color: 'var(--text-1)', padding: '0 10px', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
                {[
                  { key: 'demand', label: 'Demanda' },
                  { key: 'competition', label: 'Competència' },
                  { key: 'simple', label: 'Risc' },
                  { key: 'improvable', label: 'Millora' }
                ].map((c) => {
                  const okEvidence = hasEvidence(c.key)
                return (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-1)' }}>
                        <input
                          type="checkbox"
                          checked={!!researchChecks[c.key]}
                          disabled={!okEvidence}
                          onChange={(e) => {
                            setResearchTouched(true)
                            setResearchChecks({ ...researchChecks, [c.key]: e.target.checked })
                          }}
                        />
                        OK
                      </label>
                      <div style={{ minWidth: 120, fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                        {c.label}
                      </div>
                      <input
                        type="text"
                        value={researchEvidence[c.key] || ''}
                        onChange={(e) => {
                          setResearchTouched(true)
                          const next = { ...researchEvidence, [c.key]: e.target.value }
                          setResearchEvidence(next)
                          if (e.target.value.trim().length < 8 && researchChecks[c.key]) {
                            setResearchChecks((prev) => ({ ...prev, [c.key]: false }))
                          }
                        }}
                        placeholder="Link o nota breu (mín. 8 caràcters)"
                      style={{
                          flex: 1,
                          height: 34,
                          borderRadius: 10,
                          border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg)',
                          color: 'var(--text-1)',
                          padding: '0 10px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => markResearchDecision(true, false)}
                  disabled={!researchHasAsin || !researchChecksReady || !researchAllChecksOk}
                  title={!researchHasAsin ? 'Primer defineix l’ASIN' : (!researchChecksReady ? 'Falten evidències' : (!researchAllChecksOk ? 'Falten checks' : 'PASSA'))}
                >
                  PASSA
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => markResearchDecision(false, false)}
                  disabled={!researchHasAsin}
                  title={!researchHasAsin ? 'Primer defineix l’ASIN' : 'NO PASSA'}
                >
                  NO PASSA
                </Button>

                {researchHasAsin && researchChecksReady && !researchAllChecksOk && (
                  <Button variant="ghost" size="sm" onClick={() => setResearchOverrideOpen(true)} title="Forçar PASSA (override)">
                    <Lock size={16} /> Forçar PASSA
                  </Button>
                )}

                {researchDecision && (
                  <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                    Estat: <strong style={{ color: 'var(--text-1)' }}>{researchDecision.pass ? 'PASSA' : 'NO PASSA'}</strong>
                    {researchDecision.forced ? ' (forçat)' : ''}
                  </div>
                )}
              </div>
            </div>

            {researchOverrideOpen && (
              <div style={modalStyles.overlay} onClick={() => setResearchOverrideOpen(false)}>
                <div
                  style={{ ...modalStyles.modal, backgroundColor: darkMode ? '#111827' : '#ffffff' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={modalStyles.header || styles.createModalHeader}>
                    <h3 style={{ margin: 0, fontSize: 16 }}>Forçar PASSA</h3>
                    <Button variant="ghost" size="sm" onClick={() => setResearchOverrideOpen(false)} aria-label="Tancar">×</Button>
                  </div>
                  <div style={modalStyles.body || styles.createModalBody}>
                    <div style={{ fontSize: 13, color: darkMode ? '#d1d5db' : '#374151', lineHeight: 1.5 }}>
                      Estàs marcant la fase com <strong>PASSA</strong> sense complir tots els checks.
                      Això és un override manual.
                    </div>
                    <div style={styles.createModalFooter}>
                      <Button variant="secondary" size="sm" onClick={() => setResearchOverrideOpen(false)}>Cancel·lar</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setResearchOverrideOpen(false)
                          markResearchDecision(true, true)
                        }}
                      >
                        Confirmar override
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </>
        )
      case 2:
        return (
          <div style={{ marginBottom: '24px' }}>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
              <ProfitabilityCalculator projectId={id} darkMode={darkMode} showAsinCapture={false} />
            </Suspense>
                  </div>
                )
      case 3:
        return (
          <>
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
            <div style={{ marginBottom: '24px' }}>
              <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant...</div>}>
                <QuotesSection projectId={id} darkMode={darkMode} />
              </Suspense>
          </div>
          </>
        )
      case 4:
        return (
          <div style={styles.phasePlaceholder}>
            Sense widgets específics encara per aquesta fase.
          </div>
        )
      case 5:
        return (
          <>
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
                  style={{
                    ...styles.actionButton,
                    backgroundColor: '#4f46e5',
                    margin: '0 auto'
                  }}
                >
                  <ShoppingCart size={18} />
                  Veure Comandes
                </Button>
                </div>
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
                  style={{
                    ...styles.actionButton,
                    backgroundColor: '#4f46e5',
                    margin: '0 auto'
                  }}
                >
                  <DollarSign size={18} />
                  Veure Finances
                </Button>
                </div>
            </CollapsibleSection>
          </>
        )
      case 6:
        return (
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
        )
      case 7:
        return (
          <CollapsibleSection
            title="Decision"
            icon={StickyNote}
            defaultOpen={false}
            darkMode={darkMode}
            phaseStyle={currentPhase}
          >
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
                    { value: 'go', label: 'GO', icon: CheckCircle2, color: '#4f46e5' },
                    { value: 'hold', label: 'HOLD', icon: Clock, color: '#f59e0b' },
                    { value: 'discarded', label: 'DISCARDED', icon: XCircle, color: '#ef4444' }
                  ]}
                />
              </Suspense>
                  </div>
          </CollapsibleSection>
        )
      default:
        return null
    }
  }

  const PHASE_LABELS = {
    1: 'RESEARCH',
    2: 'VIABILITY',
    3: 'SUPPLIERS',
    4: 'SAMPLES',
    5: 'PRODUCTION',
    6: 'LISTING',
    7: 'LIVE',
  }
  const phaseLabel = PHASE_LABELS[project?.current_phase] || `PHASE ${project?.current_phase || '—'}`
  const thumbnailUrl = project?.asin_image_url || project?.main_image_url || project?.asin_image || project?.image_url || project?.image || null
  const effectiveThumbUrl = (researchSnapshot?.thumbUrl || '').trim() || thumbnailUrl || null
  const btnStateStyle = (state) => {
    if (state === 'inactive') return { opacity: 0.45, cursor: 'not-allowed' }
    if (state === 'drive') return { opacity: 0.65, cursor: 'pointer' }
    return { opacity: 1, cursor: 'pointer' }
  }

  const handleCreatePO = () => navigate(`/orders?project=${id}`)
  const handleCreateExpense = () => openCreateModal('expense')
  const handleAddDocument = () => {
    const target = document.getElementById('documents-section')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={styles.container} className="project-detail-page">
      <PageGutter>
        <div style={{ ...styles.content, padding: 0 }}>
        {/* P-D1 — Project Header */}
        <div className="project-header ui-card" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 18px',
          marginBottom: 8,
          background: 'var(--surface-bg)',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: 'var(--radius-ui)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Left: Thumb + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                overflow: 'hidden',
                flex: '0 0 auto',
                background: 'var(--surface-bg-2)',
                border: '1px solid var(--border-1)',
                display: 'grid',
                placeItems: 'center'
              }}
              aria-label="Project thumbnail"
            >
              {effectiveThumbUrl ? (
                <img
                  src={effectiveThumbUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <Package size={18} color="var(--muted-1)" />
              )}
                    </div>

            {/* Title + Meta */}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, lineHeight: 1.2 }}>{project.name}</h2>
              <div style={{ marginTop: 2, opacity: 0.8 }}>
                <strong>{project.project_code}</strong>
                <span style={{ opacity: 0.6 }}> · </span>
                <span>{project.sku_internal || '—'}</span>
                </div>

              {/* Marketplace TAGS */}
              <div style={{ marginTop: 5 }}>
                <div className="project-card__marketplaces">
                  <span className="project-card__marketplacesLabel">Marketplaces actius</span>
                  <div className="project-card__marketplacesTags">
                    <MarketplaceTagGroup>
                      {(marketplaceTags || [{ marketplace_code: 'ES', is_primary: true, stock_state: 'none' }]).map((m) => (
                        <MarketplaceTag
                          key={`${m.marketplace_code}-${m.is_primary ? 'p' : 's'}`}
                          code={m.marketplace_code}
                          isPrimary={!!m.is_primary}
                          stockState={(m.stock_state || 'none')}
                        />
                      ))}
                    </MarketplaceTagGroup>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Status + Phase */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={project.status} decision={project.decision} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                <span>{phaseLabel}</span>
                <span>{project.current_phase}/7</span>
              </div>
              {(() => {
                const cur = project?.current_phase || 0
                const pct = Math.max(0, Math.min(100, Math.round((cur / 7) * 100)))
                const meta = getPhaseMeta(cur)

                return (
                  <div
                    style={{
                      width: '100%',
                      height: 5,
                      borderRadius: 999,
                      background: 'var(--surface-bg-2)',
                      border: '1px solid var(--border-1)',
                      overflow: 'hidden',
                    }}
                    data-progress-track="true"
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 999,
                        background: meta.color,
                      }}
                      data-progress-fill="true"
                      data-phase-id={cur}
                    />
                  </div>
                )
              })()}
              <div style={{ marginTop: 6, overflowX: 'auto' }}>
                {(() => {
                  const cur = project?.current_phase || 0
                  const steps = [1, 2, 3, 4, 5, 6, 7]

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 'max-content' }}>
                      {steps.map((phaseId, idx) => {
                        const isDone = cur > phaseId
                        const isCurrent = cur === phaseId

                        return (
                          <div key={phaseId} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: idx === steps.length - 1 ? '0 0 auto' : '1 1 auto' }}>
                            <span
                              title={getPhaseMeta(phaseId).label}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--surface-bg)',
                                border: '1px solid var(--border-1)'
                              }}
                            >
                              <PhaseMark phaseId={phaseId} size={16} showLabel={false} />
                  </span>

                            {idx < steps.length - 1 ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  height: 2,
                                  flex: 1,
                                  borderRadius: 999,
                                  background: isDone ? 'var(--success-1)' : 'var(--border-1)',
                                  opacity: isDone ? 0.9 : 0.6
                                }}
                              />
                            ) : null}
                  </div>
                        )
                      })}
                </div>
                  )
                })()}
            </div>
            </div>
          </div>
        </div>

        <div className="project-actions actionbar--turquoise" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: isMobile ? 8 : 12,
          padding: '8px 0',
          marginBottom: 8,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Left: Section Quick Search */}
          <div 
            ref={sectionSearchRef}
            className="actionbar__search"
            style={{ 
              position: 'relative',
              flex: isMobile ? '1 1 100%' : '0 0 auto'
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  color: 'var(--muted-1)',
                  pointerEvents: 'none'
                }} 
              />
              <input
                type="text"
                placeholder="Cerca secció..."
                value={sectionSearchTerm}
                onChange={(e) => {
                  setSectionSearchTerm(e.target.value)
                  setShowSectionDropdown(e.target.value.trim().length > 0)
                }}
                onFocus={() => {
                  if (sectionSearchTerm.trim().length > 0) {
                    setShowSectionDropdown(true)
                  }
                }}
                onKeyDown={handleSectionSearchKeyDown}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '0 10px 0 34px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-1)',
                  background: 'var(--surface-bg)',
                  color: 'var(--text-1)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
            {showSectionDropdown && filteredSections.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--surface-bg)',
                  border: '1px solid var(--border-1)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-soft)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-1)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-bg-2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{section.name}</span>
                    {section.description && (
                      <span style={{ fontSize: '11px', color: 'var(--muted-1)' }}>
                        {section.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="actionbar__buttons" style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
            flex: isMobile ? '1 1 100%' : '0 0 auto'
          }}>
            <Button
              variant="secondary"
              size="sm"
              disabled
              style={btnStateStyle('inactive')}
              className="btn-secondary"
            >
              Crear Proveïdor
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled
              style={btnStateStyle('inactive')}
              className="btn-secondary"
            >
              Crear Transitari
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled
              style={btnStateStyle('inactive')}
              className="btn-secondary"
            >
              Crear Magatzem
            </Button>
            <Button
              variant="primary"
              size="sm"
              style={btnStateStyle('active')}
              onClick={handleCreatePO}
              className="btn-primary"
            >
              Crear Comanda (PO)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              style={btnStateStyle('active')}
              onClick={handleCreateExpense}
              className="btn-secondary"
            >
              Crear Despesa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              style={btnStateStyle('active')}
              onClick={handleAddDocument}
              className="btn-ghost"
            >
              + Document
            </Button>
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
            <Button
              variant="primary"
              size="sm"
              onClick={handleRestoreProject}
              style={styles.restoreButton}
            >
              {t('common.restore')} Projecte
            </Button>
          </div>
        )}

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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotesPanel(false)}
                  style={{ padding: '4px', minWidth: 'unset' }}
                  aria-label="Tancar"
                >
                  ×
                </Button>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateModalType(null)}
                  style={modalStyles.closeButton || styles.createModalClose}
                  aria-label="Tancar"
                >
                  ×
                </Button>
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreateModalType(null)}
                    style={styles.createCancel}
                  >
                    Cancel·lar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateSave}
                    style={styles.createSubmit}
                    disabled={createSaving}
                  >
                    {createSaving ? 'Guardant...' : 'Crear'}
                  </Button>
              </div>
            </div>
            </div>
          </div>
        )}

        <div className="project-split__layout">
          <div className="project-split__left">
        <div style={phaseWrapperStyle}>
          <div
            data-testid="phase-gate-block-banner"
            data-revealed={phaseBlockVisible ? 'true' : 'false'}
            aria-hidden={phaseBlockVisible ? 'false' : 'true'}
            style={{
              ...styles.phaseGateBanner,
              borderColor: 'var(--border-color)',
              borderLeft: `3px solid ${currentPhase.accent}`,
              backgroundColor: darkMode ? '#111827' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              display: phaseBlockVisible ? 'flex' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color={currentPhase.accent} />
              <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{phaseBlockMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhaseBlockMessage(null)
                setPhaseBlockVisible(false)
              }}
              style={styles.phaseGateBannerClose}
              aria-label="Tancar"
            >
              ×
            </Button>
          </div>


        <PhaseSection
          phaseId={1}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(1)}
          darkMode={darkMode}
        >
          {renderPhaseContent(1)}
        </PhaseSection>

        <PhaseSection
          phaseId={2}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(2)}
          darkMode={darkMode}
        >
          {renderPhaseContent(2)}
        </PhaseSection>

        <PhaseSection
          phaseId={3}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(3)}
          darkMode={darkMode}
        >
          {renderPhaseContent(3)}
        </PhaseSection>

        <PhaseSection
          phaseId={4}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(4)}
          darkMode={darkMode}
        >
          {renderPhaseContent(4)}
        </PhaseSection>

        <PhaseSection
          phaseId={5}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(5)}
          darkMode={darkMode}
        >
          {renderPhaseContent(5)}
        </PhaseSection>

        <PhaseSection
          phaseId={6}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(6)}
          darkMode={darkMode}
        >
          {renderPhaseContent(6)}
        </PhaseSection>

        <PhaseSection
          phaseId={7}
          currentPhaseId={phaseId}
          phaseStyle={getPhaseStyleForUI(7)}
          darkMode={darkMode}
        >
          {renderPhaseContent(7)}
        </PhaseSection>
                </div>
          </div>

          <aside className="project-split__right">
            <div className="project-split__sticky">
              <div className="projects-split__panel">
                <div className="projects-split__panelHeader" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="projects-panel__title">{projectTitle}</div>
                    <div className="projects-panel__subtitle">{activeFolderLabel || '—'}</div>
                </div>
              </div>

                {researchImport && (
                  <div style={{ padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                      Informe: <strong style={{ color: 'var(--text-1)' }}>{researchImport.asin}</strong> · {researchImport.decision}
                </div>
                    <Button variant="ghost" size="sm" onClick={copyResearchPayload}>
                      Copiar payload
                    </Button>
                </div>
              )}

              <ProjectDriveExplorer
            projectId={id}
            darkMode={darkMode}
                onUploadComplete={handleUploadComplete}
                onActivePathChange={setActiveFolderLabel}
                fixedFolderId={phaseId === 1 ? researchStoragePrefix : null}
              />
            </div>
            </div>
          </aside>
        </div>
        </div>
      </PageGutter>
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
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid',
    marginBottom: '18px'
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
    borderRadius: '14px',
    border: '1px solid',
    borderTopWidth: '1px',
    padding: '10px 12px',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-soft)'
  },
  phaseSectionHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
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
    gap: '8px',
    color: '#6b7280'
  },
  phaseSectionTitle: {
    fontSize: '15px',
    fontWeight: '600'
  },
  phaseSectionBody: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
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
    padding: '12px',
    borderRadius: '10px',
    border: '1px dashed var(--border-color)',
    color: '#6b7280',
    fontSize: '13px'
  },
  phaseStickyContainer: {
    position: 'sticky',
    top: '10px',
    zIndex: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid',
    boxShadow: 'var(--shadow-soft)',
    marginBottom: '18px'
  },
  phaseCurrentBar: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '12px'
  },
  phaseCurrentTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    width: '100%'
  },
  phaseCurrentInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
    minWidth: 0
  },
  phaseCurrentMeta: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    flexShrink: 0
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
    fontWeight: '600',
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
    backgroundColor: 'var(--surface-bg)',
    borderRadius: '16px',
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
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
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: 'var(--surface-bg)'
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
    backgroundColor: 'var(--surface-bg)',
    border: '1px solid rgba(31, 78, 95, 0.16)',
    borderRadius: '10px',
    fontSize: '14px',
    color: 'var(--text)',
    cursor: 'pointer'
  },
  notesButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'var(--surface-bg)',
    border: '1px solid rgba(31, 78, 95, 0.16)',
    borderRadius: '10px',
    fontSize: '13px',
    color: 'var(--text)',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid',
    marginBottom: '14px'
  },
  phaseGateBannerClose: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '18px',
    lineHeight: 1
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
  currentPhaseInfo: {
    padding: '16px 20px',
    borderRadius: '12px',
    borderTop: '3px solid',
    boxShadow: 'var(--shadow-soft)'
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
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
    backgroundColor: 'var(--surface-bg)'
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
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
    backgroundColor: 'var(--surface-bg)',
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
    border: 'none',
    boxShadow: 'var(--shadow-soft)',
    backgroundColor: 'var(--surface-bg)'
  },
  
}
