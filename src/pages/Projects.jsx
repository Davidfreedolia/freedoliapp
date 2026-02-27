import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  XCircle,
  RotateCw,
  Package,
  FolderKanban
} from 'lucide-react'
import { PHASE_STYLES, getPhaseMeta } from '../utils/phaseStyles'
import { useApp } from '../context/AppContext'
import { deleteProject, supabase, getCurrentUserId } from '../lib/supabase'
import { getDemoMode } from '../lib/demoModeFilter'
import { computeProjectBusinessSnapshot } from '../lib/businessSnapshot'
import { computeProjectStockSignal } from '../lib/stockSignal'
import { computeCommercialGate } from '../lib/phaseGates'
import Header from '../components/Header'
import NewProjectModal from '../components/NewProjectModal'
import Button from '../components/Button'
import PageGutter from '../components/ui/PageGutter'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'
import { useProjectsListState } from '../hooks/useProjectsListState'
import ProjectDriveExplorer from '../components/projects/ProjectDriveExplorer'
import MarketplaceTag, { MarketplaceTagGroup } from '../components/MarketplaceTag'
import PhaseMark from '../components/Phase/PhaseMark'

export default function Projects() {
  const { refreshProjects, darkMode } = useApp()
  const { data: projects, loading: loadingListState, error: listStateError, refetch, noOrg } = useProjectsListState()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterPhase, setFilterPhase] = useState(null)
  const [mpFilter, setMpFilter] = useState([])
  const [showMpAdd, setShowMpAdd] = useState(false)
  const [showDiscarded, setShowDiscarded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [viewMode, setViewMode] = useLayoutPreference('layout:projects', 'grid')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const isLoadingProjects = loadingListState
  const [businessByProjectId, setBusinessByProjectId] = useState({})
  const [stockByProjectId, setStockByProjectId] = useState({})

  // Concurrency control: only latest load can commit state
  const loadSeqRef = useRef(0)
  const businessLoadSeqRef = useRef(0)
  const stockLoadSeqRef = useRef(0)
  const mountedRef = useRef(false)

  // PHASE_STYLES is an object. We need a deterministic, always-iterable list.
  const PHASES_LIST = useMemo(() => {
    return Object.values(PHASE_STYLES).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0))
  }, [])

  const effectiveViewMode = isMobile ? 'list' : viewMode
  const loadProjects = async ({ showSpinner = true } = {}) => {
    setLoadError(null)
    await refetch()
    if (listStateError && mountedRef.current) {
      setLoadError(listStateError?.message || 'Error carregant projectes')
    }
  }

  const availableMarketplaces = useMemo(() => {
    const codes = new Set()
    projects.forEach((project) => {
      const items = Array.isArray(project?.marketplace_tags)
        ? project.marketplace_tags
        : Array.isArray(project?.marketplaces)
          ? project.marketplaces
          : Array.isArray(project?.marketplace_codes)
            ? project.marketplace_codes
            : (project?.marketplace ? [project.marketplace] : [])
      items.forEach((item) => {
        if (typeof item === 'object') {
          if (item.is_active === false) return
          const code = (item.marketplace_code || item.code || item.marketplace || '').toString().trim().toUpperCase()
          if (code) codes.add(code)
        } else if (item) {
          codes.add(item.toString().trim().toUpperCase())
        }
      })
    })
    return Array.from(codes).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const toggleMarketplace = (code) => {
    setMpFilter((prev) => (
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    ))
  }
  const isMpSelected = (code) => mpFilter.includes(code)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchInput('')
        setSearchTerm('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const highlightText = (text, term) => {
    const value = (text ?? '').toString()
    const q = (term ?? '').toString().trim()
    if (!q) return value

    const lower = value.toLowerCase()
    const qLower = q.toLowerCase()

    const idx = lower.indexOf(qLower)
    if (idx === -1) return value

    const before = value.slice(0, idx)
    const hit = value.slice(idx, idx + q.length)
    const after = value.slice(idx + q.length)

    return (
      <>
        {before}
        <mark
          style={{
            background: 'rgba(242, 108, 108, 0.18)',
            color: 'var(--text-1)',
            padding: '0 3px',
            borderRadius: 6,
            fontWeight: 700,
          }}
        >
          {hit}
        </mark>
        {after}
      </>
    )
  }

  const getAsinValue = (project) => {
    return (
      project?.asin ||
      project?.asin_code ||
      project?.amazon_asin ||
      project?.asin_id ||
      project?.main_asin ||
      null
    )
  }

  const filteredProjects = projects.filter(project => {
    const term = searchTerm.trim().toLowerCase()

    let matchesSearch = true
    if (term.length) {
      const fields = [
        project.name,
        project.project_code,
        project.sku,
        project.asin,
      ]

      matchesSearch = fields
        .filter(Boolean)
        .some((value) =>
          value.toString().toLowerCase().includes(term)
        )
    }
    const matchesPhase = filterPhase ? project.current_phase === filterPhase : true
    // Per defecte, ocultar DISCARDED
    const matchesDiscarded = showDiscarded ? true : (project.decision !== 'DISCARDED')
    let matchesMarketplace = true
    if (mpFilter.length) {
      const items = Array.isArray(project?.marketplace_tags)
        ? project.marketplace_tags
        : Array.isArray(project?.marketplaces)
          ? project.marketplaces
          : Array.isArray(project?.marketplace_codes)
            ? project.marketplace_codes
            : (project?.marketplace ? [project.marketplace] : [])
      if (!items.length) {
        matchesMarketplace = false
      } else {
        const activeCodes = new Set()
        items.forEach((item) => {
          if (typeof item === 'object') {
            if (item.is_active === false) return
            const code = (item.marketplace_code || item.code || item.marketplace || '').toString().trim().toUpperCase()
            if (code) activeCodes.add(code)
          } else if (item) {
            activeCodes.add(item.toString().trim().toUpperCase())
          }
        })
        matchesMarketplace = mpFilter.some((code) => activeCodes.has(code))
      }
    }
    return matchesSearch && matchesPhase && matchesDiscarded && matchesMarketplace
  })
  const discardedCount = projects.filter(p => p.decision === 'DISCARDED').length
  const totalCount = projects.length
  const filteredCount = filteredProjects.length
  const isFiltering =
    !!searchTerm.trim() || !!filterPhase || mpFilter.length > 0 || (discardedCount > 0 && showDiscarded)
  useEffect(() => {
    if (!filteredProjects.length) {
      setSelectedProjectId(null)
      return
    }
    if (!selectedProjectId || !filteredProjects.some(p => p.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0].id)
    }
  }, [filteredProjects, selectedProjectId])

  useEffect(() => {
    mountedRef.current = true
    refetch()
    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  useEffect(() => {
    if (listStateError) {
      setLoadError(listStateError?.message || 'Error carregant projectes')
      console.error('[Projects] load failed', {
        error: listStateError,
        status: listStateError?.status,
        message: listStateError?.message,
        details: listStateError?.details
      })
    } else {
      setLoadError(null)
    }
  }, [listStateError])

  // Business snapshot: 3 queries for all projects (POs, expenses, incomes)
  useEffect(() => {
    if (!projects?.length) {
      setBusinessByProjectId({})
      return
    }
    const seq = ++businessLoadSeqRef.current
    const ids = projects.map((p) => p.id).filter(Boolean)
    if (!ids.length) {
      setBusinessByProjectId({})
      return
    }
    let cancelled = false
    ;(async () => {
      const userId = await getCurrentUserId()
      const demoMode = await getDemoMode()
      if (cancelled || !mountedRef.current || seq !== businessLoadSeqRef.current) return
      const [poRes, expRes, incRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('project_id,total_amount,items')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .in('project_id', ids),
        supabase
          .from('expenses')
          .select('project_id,amount')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .in('project_id', ids),
        supabase
          .from('incomes')
          .select('project_id,amount')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .in('project_id', ids)
      ])
      if (cancelled || !mountedRef.current || seq !== businessLoadSeqRef.current) return
      const poRows = poRes.data || []
      const expenseRows = expRes.data || []
      const incomeRows = incRes.data || []
      const byId = {}
      for (const project of projects) {
        if (!project?.id) continue
        const projectPo = poRows.filter((r) => r.project_id === project.id)
        const projectExp = expenseRows.filter((r) => r.project_id === project.id)
        const projectInc = incomeRows.filter((r) => r.project_id === project.id)
        byId[project.id] = computeProjectBusinessSnapshot({
          project,
          poRows: projectPo,
          expenseRows: projectExp,
          incomeRows: projectInc
        })
      }
      if (mountedRef.current && seq === businessLoadSeqRef.current) {
        setBusinessByProjectId(byId)
      }
    })()
    return () => { cancelled = true }
  }, [projects])

  // Stock signal: try-chain (inventory / project_stock / inventory_movements) + sales 30d + POs
  useEffect(() => {
    if (!projects?.length) {
      setStockByProjectId({})
      return
    }
    const seq = ++stockLoadSeqRef.current
    const ids = projects.map((p) => p.id).filter(Boolean)
    if (!ids.length) {
      setStockByProjectId({})
      return
    }
    let cancelled = false
    ;(async () => {
      const userId = await getCurrentUserId()
      const demoMode = await getDemoMode()
      if (cancelled || !mountedRef.current || seq !== stockLoadSeqRef.current) return

      let stockRowsByProject = {}
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysIso = thirtyDaysAgo.toISOString()

      // Try-chain: stock source (inventory -> project_stock)
      const stockTables = [
        { table: 'inventory', columns: 'project_id,total_units,quantity,qty,units' },
        { table: 'project_stock', columns: 'project_id,quantity,qty,units,total_units' }
      ]
      for (const { table, columns } of stockTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select(columns)
            .eq('user_id', userId)
            .in('project_id', ids)
          if (error) throw error
          const rows = data || []
          for (const r of rows) {
            const pid = r.project_id
            if (!pid) continue
            if (!stockRowsByProject[pid]) stockRowsByProject[pid] = []
            stockRowsByProject[pid].push(r)
          }
          if (Object.keys(stockRowsByProject).length > 0) break
        } catch (e) {
          const code = e?.code || e?.error?.code || ''
          if (code === '42P01' || (e?.message && /relation|does not exist|undefined table/i.test(e.message))) continue
          break
        }
      }

      // Sales last 30d (optional)
      let salesRowsByProject = {}
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('project_id,qty,quantity,units,created_at,date')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .in('project_id', ids)
          .gte('created_at', thirtyDaysIso)
        if (!error && data) {
          for (const r of data) {
            const pid = r.project_id
            if (!pid) continue
            const created = r.created_at || r.date
            if (created && new Date(created) >= thirtyDaysAgo) {
              if (!salesRowsByProject[pid]) salesRowsByProject[pid] = []
              salesRowsByProject[pid].push(r)
            }
          }
        }
      } catch (_) {}

      if (cancelled || !mountedRef.current || seq !== stockLoadSeqRef.current) return

      // POs minimal (for computeProjectStockSignal; reuse for items if needed)
      let poRowsByProject = {}
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('project_id,items')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .in('project_id', ids)
        if (!error && data) {
          for (const r of data) {
            const pid = r.project_id
            if (!pid) continue
            if (!poRowsByProject[pid]) poRowsByProject[pid] = []
            poRowsByProject[pid].push(r)
          }
        }
      } catch (_) {}

      const byId = {}
      for (const project of projects) {
        if (!project?.id) continue
        byId[project.id] = computeProjectStockSignal({
          project,
          stockRows: stockRowsByProject[project.id] || [],
          salesRows: salesRowsByProject[project.id] || [],
          poRows: poRowsByProject[project.id] || []
        })
      }
      if (mountedRef.current && seq === stockLoadSeqRef.current) {
        setStockByProjectId(byId)
      }
    })()
    return () => { cancelled = true }
  }, [projects])

  const selectedProject = filteredProjects.find(project => project.id === selectedProjectId)

  const researchPrefix = selectedProject ? `projects/${selectedProject.id}/research/` : null

  const handleDelete = async (e, project) => {
    e.stopPropagation()
    if (!confirm(`Segur que vols eliminar "${project.name}"?`)) return
    
    try {
      await deleteProject(project.id)
      await Promise.all([refreshProjects(), refetch()])
      setMenuOpen(null)
    } catch (err) {
      console.error('Error eliminant:', err)
      alert('Error eliminant el projecte')
    }
  }

  const handleClose = async (e, project) => {
    e.stopPropagation()
    try {
      const { updateProject } = await import('../lib/supabase')
      const { showToast } = await import('../components/Toast')
      await updateProject(project.id, { status: 'closed' })
      showToast('Projecte tancat', 'success')
      await Promise.all([refreshProjects(), refetch()])
      setMenuOpen(null)
    } catch (err) {
      console.error('Error tancant projecte:', err)
      const { showToast } = await import('../components/Toast')
      showToast('Error tancant projecte: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const handleReopen = async (e, project) => {
    e.stopPropagation()
    try {
      const { updateProject } = await import('../lib/supabase')
      const { showToast } = await import('../components/Toast')
      await updateProject(project.id, { status: 'active' })
      showToast('Projecte reobert', 'success')
      await Promise.all([refreshProjects(), refetch()])
      setMenuOpen(null)
    } catch (err) {
      console.error('Error reobrint projecte:', err)
      const { showToast } = await import('../components/Toast')
      showToast('Error reobrint projecte: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const renderProjectCard = (project, { isPreview = false, enablePreviewSelect = false, disableNavigation = false } = {}) => {
    const currentPhaseId = project?.phase_id ?? project?.phaseId ?? project?.current_phase ?? 1
    const activeMeta = getPhaseMeta(currentPhaseId)
    const ratio = project?.progress_ratio
    const progress = ratio != null && Number.isFinite(ratio)
      ? (ratio <= 1 ? ratio * 100 : ratio)
      : (currentPhaseId / 7) * 100
    const progressValue = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
    const isBlocked = !!project?.is_blocked
    const blockedReason = (project?.blocked_reason ?? '').toString().trim()
    const isSelected = project.id === selectedProjectId
    const skuValue = project.sku_internal || '—'
    const asinValue = getAsinValue(project)
    const createdLabel = project?.created_at
      ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—'
    const docsCount = project?.docs_count ?? project?.documents_count ?? project?.files_count ?? project?.drive_files_count ?? 0
    // Compute canClose and canReopen based on status
    const canClose = project.status && ['draft', 'active'].includes(project.status)
    const canReopen = project.status && ['closed', 'archived'].includes(project.status)
    const thumbnailUrl = project?.main_image_url || project?.asin_image_url || project?.asin_image || project?.image_url || project?.image
    const marketplaceItems = Array.isArray(project?.marketplace_tags)
      ? project.marketplace_tags
      : Array.isArray(project?.marketplaces)
        ? project.marketplaces
        : Array.isArray(project?.marketplace_codes)
          ? project.marketplace_codes
          : (project?.marketplace ? [project.marketplace] : [])
    const activeMarketplaces = marketplaceItems.filter((m) => (
      typeof m === 'object' ? m.is_active !== false : true
    ))

    return (
      <div
        key={project.id}
        data-project-card="true"
        data-project-id={project.id}
        data-phase-id={currentPhaseId}
        className="ui-card ui-card--interactive projects-card__card"
        style={{
          ...styles.projectCard,
          ...(isSelected && !isPreview ? styles.projectCardSelected : null),
          ...(isPreview ? styles.projectCardPreview : null),
          backgroundColor: 'var(--surface-bg)',
          border: 'none',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: 'var(--radius-ui)'
        }}
        onClick={isPreview ? undefined : () => {
          setSelectedProjectId(project.id)
          if (effectiveViewMode === 'split') return
          if (disableNavigation) return
          navigate(`/app/projects/${project.id}`)
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedProjectId(project.id) : undefined}
      >
        <div className="projects-card__body">
          <div className="projects-card__header" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div className="projects-card__thumbWrap" title={thumbnailUrl ? undefined : 'ASIN image not available yet'}>
                {thumbnailUrl && (
                  <img
                    className="projects-card__thumb"
                    src={thumbnailUrl}
                    alt={project.asin ? `ASIN ${project.asin}` : 'ASIN'}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.parentElement?.querySelector('.projects-card__thumbFallback')
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                )}
                <div
                  className="projects-card__thumbFallback"
                  style={{ display: thumbnailUrl ? 'none' : 'flex' }}
                  title="ASIN image not available yet"
                >
                  <Package size={18} />
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 className="projects-card__title">
                  {highlightText(project.name, searchTerm)}
                </h3>
                <div className="projects-card__meta">
                  {project?.project_code ? (
                    <>
                      <span style={{ fontWeight: 600 }}>
                        {highlightText(project.project_code, searchTerm)}
                      </span>
                      <span style={{ opacity: 0.7 }}> · </span>
                    </>
                  ) : null}
                  <span>SKU: {highlightText(skuValue, searchTerm)}</span>
                  <span style={{ opacity: 0.7 }}> · </span>
                  <span>Created: {createdLabel}</span>
                  <span style={{ opacity: 0.7 }}> · </span>
                  <span>Docs: {docsCount}</span>
                  {asinValue ? (
                    <>
                      <span style={{ opacity: 0.7 }}> · </span>
                      <span>ASIN: {highlightText(asinValue, searchTerm)}</span>
                    </>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <PhaseMark phaseId={currentPhaseId} size={16} />
                  {(() => {
                    const snap = businessByProjectId[project.id]
                    if (!snap) return null
                    const { roi_percent, badge } = snap
                    const toneVar = badge.tone === 'success' ? 'var(--success-1)' : badge.tone === 'warn' ? 'var(--warning-1)' : badge.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)'
                    const label = roi_percent != null ? `ROI ${Math.round(roi_percent)}% · ${badge.label}` : `— · ${badge.label}`
                    return (
                      <span
                        style={{
                          fontSize: 12,
                          padding: '4px 8px',
                          border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg-2)',
                          borderRadius: 999,
                          color: toneVar,
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                        title={`Invertit: ${snap.invested_total.toFixed(0)} · Unit: ${snap.unit_cost != null ? snap.unit_cost.toFixed(2) : '—'}`}
                      >
                        {label}
                      </span>
                    )
                  })()}
                  {(() => {
                    const stock = stockByProjectId[project.id]
                    if (!stock) return null
                    const toneVar = stock.tone === 'success' ? 'var(--success-1)' : stock.tone === 'warn' ? 'var(--warning-1)' : stock.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)'
                    return (
                      <span
                        style={{
                          fontSize: 12,
                          padding: '4px 8px',
                          border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg-2)',
                          borderRadius: 999,
                          color: toneVar,
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                        title={stock.badgeTextSecondary}
                      >
                        {stock.badgeTextPrimary}
                      </span>
                    )
                  })()}
                  {(() => {
                    const b = businessByProjectId[project.id]
                    const s = stockByProjectId[project.id]
                    const phaseId = project.phase ?? project.phase_id ?? project.current_phase
                    const gate = computeCommercialGate({ phaseId, businessSnapshot: b, stockSnapshot: s })
                    if (gate.gateId === 'NONE') return null
                    const toneVar = gate.tone === 'success' ? 'var(--success-1)' : gate.tone === 'warn' ? 'var(--warning-1)' : gate.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)'
                    const shortId = gate.gateId === 'PRODUCTION' ? 'PROD' : gate.gateId === 'LISTING' ? 'LIST' : 'LIVE'
                    return (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          border: '1px solid var(--border-1)',
                          background: 'var(--surface-bg-2)',
                          borderRadius: 999,
                          color: toneVar,
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                        title={gate.reasons.length ? gate.reasons.join(' · ') : ''}
                      >
                        {shortId}: {gate.label}
                      </span>
                    )
                  })()}
                  {isBlocked && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        border: '1px solid var(--danger-1)',
                        background: 'var(--surface-bg-2)',
                        borderRadius: 999,
                        color: 'var(--danger-1)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      BLOCKED
                    </span>
                  )}
                </div>
                {blockedReason ? (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={blockedReason}>
                    {blockedReason}
                  </div>
                ) : null}
                {activeMarketplaces.length ? (
                  <div className="project-card__marketplaces">
                    <span className="project-card__marketplacesLabel">Marketplaces actius</span>
                    <div className="project-card__marketplacesTags">
                      {activeMarketplaces.map((m, idx) => {
                        const code = typeof m === 'string'
                          ? m
                          : (m.marketplace_code || m.code || m.marketplace)
                        return (
                          <MarketplaceTag
                            key={`${code || 'market'}-${idx}`}
                            code={code}
                            isPrimary={typeof m === 'object' ? !!m.is_primary : false}
                            stockState={typeof m === 'object' ? (m.stock_state || 'none') : 'none'}
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {!isPreview && (
              <div className="projects-card__menu">
                <div style={{ position: 'relative' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id) }}
                    style={styles.menuButton}
                  >
                    <MoreVertical size={18} color="var(--muted-1)" />
                  </Button>
                  {menuOpen === project.id && (
                    <div className="ui-popover" style={styles.menu}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => { e.stopPropagation(); navigate(`/app/projects/${project.id}/edit`) }}
                        style={styles.menuItem}
                      >
                        <Edit size={14} /> Editar
                      </Button>
                      {canClose && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleClose(e, project)}
                          style={styles.menuItem}
                        >
                          <XCircle size={14} /> Tancar
                        </Button>
                      )}
                      {canReopen && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleReopen(e, project)}
                          style={styles.menuItem}
                        >
                          <RotateCw size={14} /> Reobrir
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={e => handleDelete(e, project)}
                        style={styles.menuItemDanger}
                      >
                        <Trash2 size={14} /> Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="projects-card__progress">
            <div style={styles.progressContainer}>
              <div
                className="projects-card__progressTrack"
                data-progress-track="true"
                style={styles.progressBar}
              >
                <div
                  className="projects-card__progressFill"
                  data-progress-fill="true"
                  style={{
                    ...styles.progressFill,
                    width: `${progressValue}%`,
                    backgroundColor: activeMeta.color
                  }}
                />
              </div>
              <span style={styles.progressText}>{Math.round(progressValue)}%</span>
            </div>
          </div>

          {!isPreview && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              {project.decision === 'DISCARDED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation()
                    try {
                      const { updateProject } = await import('../lib/supabase')
                      const { showToast } = await import('../components/Toast')
                      await updateProject(project.id, { decision: 'HOLD' })
                      showToast('Projecte restaurat', 'success')
                      await Promise.all([refreshProjects(), refetch()])
                    } catch (err) {
                      const { showToast } = await import('../components/Toast')
                      showToast('Error: ' + (err.message || 'Error desconegut'), 'error')
                    }
                  }}
                  style={{ height: '28px' }}
                  title="Restaurar projecte"
                >
                  Restaura
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }


  return (
    <div style={styles.container} className="projects-page" data-page="projects">
      <PageGutter>
        <Header
          title={
            <span className="page-title-with-icon">
              <FolderKanban size={22} />
              Projectes
            </span>
          }
        />

        <div style={{ ...styles.content, padding: 0 }}>
        {/* Toolbar */}
        <div style={styles.toolbar} className="toolbar-row projects-toolbar__row">
          <div style={styles.toolbarLeft} className="toolbar-group">
            <div style={{ ...styles.controlPill, ...styles.searchPill }}>
              <Search size={18} style={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar projectes..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={styles.searchInput}
              />
              <span style={styles.countBadge}>
                {isFiltering ? `${filteredCount}/${totalCount}` : `${totalCount}`}
              </span>
              {searchInput.trim().length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput('')
                    setSearchTerm('')
                  }}
                  title="Clear (Esc)"
                >
                  Clear
                </Button>
              ) : null}
            </div>

            <div
              className="projects-filter"
              style={{
                height: 44,
                borderRadius: 12,
                border: '1px solid var(--border-1)',
                background: 'var(--surface-1)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px'
              }}
            >
              <select
                value={filterPhase || ''}
                onChange={(e) => setFilterPhase(e.target.value ? parseInt(e.target.value) : null)}
                className="projects-filter__select"
              >
                <option value="">Totes les fases</option>
                {PHASES_LIST.map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            </div>

            {availableMarketplaces.length ? (
              <div
                data-marketplace-filter="true"
                data-selected-count={mpFilter.length}
                className="projects-marketplace-filter"
                title="Filtra per marketplace"
              >
                <span className="projects-marketplace-filter__label">Marketplace</span>

                {mpFilter.length ? (
                  <div className="projects-marketplace-filter__chips">
                    {mpFilter.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleMarketplace(code)}
                        className="projects-marketplace-filter__chip"
                        data-mp-chip="true"
                        title={`Treure filtre ${code}`}
                      >
                        <span className="projects-marketplace-filter__chipText">{code}</span>
                        <span className="projects-marketplace-filter__chipX" aria-hidden="true" title="Eliminar">
                          ✕
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="projects-marketplace-filter__empty">Tots</span>
                )}

                <div className="projects-marketplace-filter__add">
                  <button
                    type="button"
                    className="projects-marketplace-filter__addBtn"
                    onClick={() => setShowMpAdd(true)}
                    title="Afegir marketplace"
                  >
                    + Afegir
                  </button>
                  {showMpAdd && availableMarketplaces.some((c) => !mpFilter.includes(c)) ? (
                    <select
                      value=""
                      className="projects-marketplace-filter__select"
                      onChange={(e) => {
                        const v = (e.target.value || '').toString().trim()
                        if (v) toggleMarketplace(v)
                        setShowMpAdd(false)
                        e.target.value = ''
                      }}
                      onBlur={() => setShowMpAdd(false)}
                      title="Afegir marketplace al filtre"
                    >
                      <option value="" disabled>+ Afegir</option>
                      {availableMarketplaces
                        .filter((c) => !mpFilter.includes(c))
                        .map((code) => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                    </select>
                  ) : null}
                </div>

                {mpFilter.length ? (
                  <button
                    type="button"
                    onClick={() => setMpFilter([])}
                    className="projects-marketplace-filter__clear"
                    title="Netejar filtres"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}

            {discardedCount > 0 && (
              <label style={styles.filterToggle}>
                <input
                  type="checkbox"
                  checked={showDiscarded}
                  onChange={e => setShowDiscarded(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Mostrar descartats ({discardedCount})
              </label>
            )}
          </div>
          <div style={styles.toolbarRight} className="toolbar-group">
            <div style={styles.viewControls}>
              <LayoutSwitcher
                value={effectiveViewMode}
                onChange={setViewMode}
                compact={isMobile}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setShowModal(true)
              }} 
              style={{ width: isMobile ? '100%' : 'auto' }}
              className="projects-toolbar__new btn-primary"
            >
              <Plus size={18} />
              Nou projecte
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoadingProjects ? (
          <div style={{
            ...styles.empty,
            backgroundColor: 'var(--surface-bg)'
          }}>
            <p style={{ color: 'var(--muted-1)' }}>Carregant projectes…</p>
          </div>
        ) : noOrg ? (
          <div style={{ ...styles.empty, backgroundColor: 'var(--surface-bg)' }}>
            <p style={{ color: 'var(--muted-1)' }}>No hi ha Workspace actiu / no tens org assignada.</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>Configura el teu workspace a Configuració.</p>
            <Button variant="primary" onClick={() => navigate('/app/settings')}>
              Anar a Configuració
            </Button>
          </div>
        ) : loadError ? (
          <div style={{ ...styles.empty, backgroundColor: 'var(--surface-bg)' }}>
            <p style={{ color: 'var(--muted-1)' }}>No s’han pogut carregar els projectes.</p>
            <Button variant="secondary" onClick={() => loadProjects({ showSpinner: true })}>
              Reintenta
            </Button>
            {import.meta.env.DEV && listStateError && (listStateError?.status ?? listStateError?.message) && (
              <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted-1)', fontFamily: 'monospace' }}>
                {[listStateError?.status, listStateError?.message].filter(Boolean).join(' — ')}
              </p>
            )}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{
            ...styles.empty,
            backgroundColor: 'var(--surface-bg)'
          }}>
            <p style={{ color: 'var(--muted-1)' }}>
              {searchTerm || filterPhase 
                ? 'No s\'han trobat projectes amb aquests filtres'
                : 'No hi ha projectes. Crea el primer!'}
            </p>
            {!searchTerm && !filterPhase && (
              <>
                <Button 
                  onClick={() => {
                    setShowModal(true)
                  }} 
                >
                  <Plus size={18} />
          Nou projecte
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {effectiveViewMode === 'grid' && (
              <div style={{
                ...styles.projectsGrid,
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
                gap: isMobile ? '10px' : '14px'
              }}>
        {filteredProjects.map(project => renderProjectCard(project, { enablePreviewSelect: false }))}
              </div>
            )}
            {effectiveViewMode === 'list' && (
              <div style={styles.projectsList}>
        {filteredProjects.map(project => renderProjectCard(project, { enablePreviewSelect: false }))}
              </div>
            )}
            {viewMode === 'split' && (
              <div className="projects-split__layout">
                <div className="projects-split__left">
                  {filteredProjects.map(project => renderProjectCard(project, { enablePreviewSelect: true }))}
                </div>

                <aside className="projects-split__right">
                  <div className="projects-split__sticky">
                    {!selectedProject ? (
                      <div className="projects-drive__box">
                        <div className="projects-drive__boxHeader">
                          <div className="projects-drive__boxTitle">Drive del projecte</div>
                        </div>
                        <div style={{ padding: 12, color: 'var(--muted-1)' }}>
                          Selecciona un projecte per veure el Drive.
                        </div>
                      </div>
                    ) : (
                      <ProjectDriveExplorer
                        projectFolders={null}
                        darkMode={darkMode}
                        readOnly={true}
                        fixedFolderId={researchPrefix}
                      />
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
        </div>
      </PageGutter>

      <NewProjectModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={refetch}
      />
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    marginBottom: '24px'
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'nowrap',
    overflowX: 'auto',
  },
  controlPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    height: 40,
    padding: '0 12px',
    borderRadius: 12,
    border: '1px solid var(--border-1)',
    background: 'var(--surface-bg)',
    boxShadow: 'none',
  },
  searchPill: {
    minWidth: 320,
    flex: '1 1 340px',
  },
  searchIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    color: 'var(--muted-1)',
  },
  countBadge: {
    background: 'var(--surface-bg-2)',
    color: 'var(--muted-1)',
    border: '1px solid var(--border-1)',
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  searchGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'nowrap'
  },
  searchContainer: {
    flex: '0 0 auto',
    width: '320px',
    minWidth: '240px'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-1)',
    fontSize: 14,
    width: '100%',
  },
  viewControls: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  filters: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'nowrap'
  },
  filterButton: {
    height: 'var(--btn-h-sm)'
  },
  toolbarRight: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
    flexWrap: 'nowrap'
  },
  filterSelect: {
    height: 'var(--btn-h-sm)',
    padding: '0 12px',
    borderRadius: 'var(--btn-radius)',
    border: '1px solid var(--btn-secondary-border)',
    backgroundColor: 'var(--btn-ghost-bg)',
    color: 'var(--btn-secondary-fg)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    boxShadow: 'var(--btn-shadow)'
  },
  filterToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    height: 'var(--btn-h-sm)',
    padding: '0 var(--btn-pad-x)',
    borderRadius: 'var(--btn-radius)',
    border: '1px solid var(--btn-secondary-border)',
    backgroundColor: 'var(--btn-ghost-bg)',
    color: 'var(--btn-secondary-fg)',
    boxShadow: 'var(--btn-shadow)',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  newButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-fg)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  empty: {
    padding: '64px',
    textAlign: 'center',
    borderRadius: '16px',
    border: 'none',
    boxShadow: 'var(--shadow-soft)'
  },
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 24px',
    backgroundColor: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-fg)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '14px'
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 360px) 1fr',
    gap: '20px'
  },
  splitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  splitPreview: {
    position: 'sticky',
    top: '96px',
    alignSelf: 'flex-start'
  },
  splitEmpty: {
    padding: '24px',
    borderRadius: '16px',
    backgroundColor: 'var(--surface-bg)',
    boxShadow: 'var(--shadow-soft)',
    color: 'var(--muted)'
  },
  projectCard: {
    padding: '12px',
    borderRadius: 'var(--radius-ui)',
    border: 'none'
  },
  projectCardSelected: {
    boxShadow: 'var(--shadow-soft-hover)',
    transform: 'translateY(-1px)'
  },
  projectCardPreview: {
    cursor: 'default'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  cardHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  projectCode: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  menuButton: {
    padding: '0',
    width: 'var(--btn-h-sm)',
    minWidth: 'var(--btn-h-sm)'
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    minWidth: '160px',
    zIndex: 10
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'flex-start',
    padding: '0 var(--btn-pad-x)',
    fontSize: '13px'
  },
  menuItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'flex-start',
    padding: '0 var(--btn-pad-x)',
    fontSize: '13px'
  },
  projectName: {
    margin: '0 0 8px 0',
    fontSize: '17px',
    fontWeight: '600'
  },
  sku: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--muted-1)',
    marginBottom: '16px'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '0',
    width: '100%'
  },
  progressBar: {
    flex: 1,
    height: '5px',
    backgroundColor: 'var(--surface-bg-2)',
    border: '1px solid var(--border-1)',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    minWidth: '2px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--muted-1)',
    minWidth: '32px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
}
