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
import { PHASE_STYLES, getPhaseStyle } from '../utils/phaseStyles'
import { useApp } from '../context/AppContext'
import { deleteProject } from '../lib/supabase'
import Header from '../components/Header'
import NewProjectModal from '../components/NewProjectModal'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'
import ProjectDriveExplorer from '../components/projects/ProjectDriveExplorer'

export default function Projects() {
  const { projects, refreshProjects, driveConnected, darkMode } = useApp()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPhase, setFilterPhase] = useState(null)
  const [showDiscarded, setShowDiscarded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [viewMode, setViewMode] = useLayoutPreference('layout:projects', 'grid')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [projectFolders, setProjectFolders] = useState(null)

  // Concurrency control: only latest load can commit state
  const loadSeqRef = useRef(0)
  const mountedRef = useRef(false)
  const driveServiceRef = useRef(null)
  const driveLoadSeqRef = useRef(0)

  // PHASE_STYLES is an object. We need a deterministic, always-iterable list.
  const PHASES_LIST = useMemo(() => {
    return Object.values(PHASE_STYLES).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0))
  }, [])

  const effectiveViewMode = isMobile ? 'list' : viewMode
  const loadProjects = async ({ showSpinner = true } = {}) => {
    const seq = ++loadSeqRef.current
    if (showSpinner) setIsLoadingProjects(true)
    setLoadError(null)
    try {
      await refreshProjects()
    } catch (err) {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setLoadError(err?.message || 'Error carregant projectes')
      }
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setIsLoadingProjects(false)
      }
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPhase = filterPhase ? project.current_phase === filterPhase : true
    // Per defecte, ocultar DISCARDED
    const matchesDiscarded = showDiscarded ? true : (project.decision !== 'DISCARDED')
    return matchesSearch && matchesPhase && matchesDiscarded
  })
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
    loadProjects({ showSpinner: true })
    return () => {
      mountedRef.current = false
    }
  }, [])

  const selectedProject = filteredProjects.find(project => project.id === selectedProjectId)
  
  const discardedCount = projects.filter(p => p.decision === 'DISCARDED').length

  useEffect(() => {
    if (!selectedProject || !driveConnected) {
      setProjectFolders(null)
      return
    }
    const seq = ++driveLoadSeqRef.current
    const loadDriveFolders = async () => {
      let driveService
      try {
        const googleDriveModule = await import('../lib/googleDrive')
        driveService = googleDriveModule.driveService
      } catch (importErr) {
        if (seq === driveLoadSeqRef.current) setProjectFolders(null)
        return
      }
      if (seq !== driveLoadSeqRef.current) return
      driveServiceRef.current = driveService
      try {
        const folders = await driveService.ensureProjectDriveFolders({
          id: selectedProject.id,
          project_code: selectedProject?.project_code || '',
          sku: selectedProject?.sku || '',
          name: selectedProject?.name || '',
          drive_folder_id: selectedProject?.drive_folder_id || null
        })
        if (seq !== driveLoadSeqRef.current) return
        setProjectFolders(folders || null)
        if (!selectedProject.drive_folder_id && folders?.main?.id) {
          try {
            const supabaseModule = await import('../lib/supabase')
            const updateProject = supabaseModule.updateProject
            await updateProject(selectedProject.id, { drive_folder_id: folders.main.id })
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn('Error guardant drive_folder_id:', e)
            }
          }
        }
      } catch (err) {
        if (seq === driveLoadSeqRef.current) setProjectFolders(null)
      }
    }
    loadDriveFolders()
  }, [selectedProject, driveConnected])

  const handleDelete = async (e, project) => {
    e.stopPropagation()
    if (!confirm(`Segur que vols eliminar "${project.name}"?`)) return
    
    try {
      await deleteProject(project.id)
      await refreshProjects()
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
      await refreshProjects()
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
      await refreshProjects()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error reobrint projecte:', err)
      const { showToast } = await import('../components/Toast')
      showToast('Error reobrint projecte: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const renderProjectCard = (project, { isPreview = false, enablePreviewSelect = false, disableNavigation = false } = {}) => {
    const phase = getPhaseStyle(project.current_phase)
    const progress = ((project.current_phase) / 7) * 100
    const progressValue = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
    const isSelected = project.id === selectedProjectId
    const skuValue = project.sku_internal || '—'
    const createdLabel = project?.created_at
      ? new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—'
    const docsCount = project?.docs_count ?? project?.documents_count ?? project?.files_count ?? project?.drive_files_count ?? 0
    const metadataLine = `SKU: ${skuValue} · Created: ${createdLabel} · Docs: ${docsCount}`
    // Compute canClose and canReopen based on status
    const canClose = project.status && ['draft', 'active'].includes(project.status)
    const canReopen = project.status && ['closed', 'archived'].includes(project.status)
    const thumbnailUrl = project?.main_image_url || project?.asin_image_url || project?.asin_image || project?.image_url || project?.image

    return (
      <div
        key={project.id}
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
          navigate(`/projects/${project.id}`)
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedProjectId(project.id) : undefined}
      >
        <div className="projects-card__body">
          <div className="projects-card__header" style={{ alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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
                <h3 className="projects-card__title">{project.name}</h3>
                <div className="projects-card__meta">{metadataLine}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {PHASES_LIST.map((p) => {
                    const Icon = p.icon
                    const isCurrent = p.id === project.current_phase
                    return (
                      <span
                        key={p.id}
                        title={isCurrent ? 'Current phase' : undefined}
                        style={{ color: 'var(--muted-1)', opacity: isCurrent ? 1 : 0.45 }}
                      >
                        <Icon size={14} />
                      </span>
                    )
                  })}
                </div>
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
                        onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}/edit`) }}
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
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${progressValue}%`,
                  backgroundColor: 'var(--muted-1)'
                }} />
              </div>
              <span style={styles.progressText}>{Math.round(progressValue)}%</span>
              <div style={{ marginTop: 6, width: '100%' }}>
                <div style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--surface-bg-2)',
                  border: '1px solid var(--border-1)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress || 0}%`,
                    borderRadius: 999,
                    background: 'var(--muted-1)'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {!isPreview && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
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
                      await refreshProjects()
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
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <FolderKanban size={22} />
            Projectes
          </span>
        }
      />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Toolbar */}
        <div style={styles.toolbar} className="toolbar-row projects-toolbar__row">
          <div style={styles.searchGroup} className="toolbar-group">
            <div style={styles.searchContainer} className="toolbar-search">
              <Search size={18} color="var(--muted-1)" />
              <input
                type="text"
                placeholder="Buscar projectes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filters} className="toolbar-group projects-toolbar__filters">
            <div className="toolbar-filterSelect" title="Filtre per fase">
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterPhase || ''}
                onChange={e => setFilterPhase(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Totes les fases</option>
                {PHASES_LIST.map(phase => (
                  <option key={phase.id} value={phase.id}>{phase.name}</option>
                ))}
              </select>
            </div>
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

          <div className="toolbar-group view-controls">
            <LayoutSwitcher
              value={effectiveViewMode}
              onChange={setViewMode}
              compact={isMobile}
            />
          </div>
          <div style={styles.toolbarRight} className="toolbar-group">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (!driveConnected) return
                setShowModal(true)
              }} 
              disabled={!driveConnected}
              title={!driveConnected ? 'Connecta Google Drive per crear' : ''}
              style={{ width: isMobile ? '100%' : 'auto' }}
              className="projects-toolbar__new"
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
        ) : loadError ? (
          <div style={{ ...styles.empty, backgroundColor: 'var(--surface-bg)' }}>
            <p style={{ color: 'var(--muted-1)' }}>No s’han pogut carregar els projectes.</p>
            <Button variant="secondary" onClick={() => loadProjects({ showSpinner: true })}>
              Reintenta
            </Button>
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
                    if (!driveConnected) return
                    setShowModal(true)
                  }} 
                  disabled={!driveConnected}
          title={!driveConnected ? 'Connecta Google Drive per crear' : ''}
                  style={{
                    opacity: !driveConnected ? 0.5 : 1,
                    cursor: !driveConnected ? 'not-allowed' : 'pointer'
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
                gap: isMobile ? '12px' : '20px'
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
                        projectFolders={projectFolders}
                        driveServiceRef={driveServiceRef}
                        driveConnected={driveConnected}
                        darkMode={darkMode}
                      />
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>

      <NewProjectModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
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
    marginBottom: '24px'
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
    flex: 1,
    minWidth: 0
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
    gap: '20px'
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
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
    padding: '16px',
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
    gap: '12px',
    marginBottom: '16px',
    width: '100%'
  },
  progressBar: {
    flex: 1,
    height: '8px',
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
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--muted-1)',
    minWidth: '36px'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
}
