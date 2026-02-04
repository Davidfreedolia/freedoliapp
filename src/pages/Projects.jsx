import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { 
  Plus, 
  Search, 
  Filter,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit,
  XCircle,
  RotateCw
} from 'lucide-react'
import { PHASE_STYLES, getPhaseStyle } from '../utils/phaseStyles'
import { useApp } from '../context/AppContext'
import { deleteProject } from '../lib/supabase'
import Header from '../components/Header'
import NewProjectModal from '../components/NewProjectModal'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import StatusBadge from '../components/StatusBadge'
import { useLayoutPreference } from '../hooks/useLayoutPreference'

export default function Projects() {
  const { projects, refreshProjects, driveConnected } = useApp()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPhase, setFilterPhase] = useState(null)
  const [showDiscarded, setShowDiscarded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [layout, setLayout] = useLayoutPreference('layout:projects', 'grid')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const PHASES = PHASE_STYLES

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

  const effectiveLayout = isMobile ? 'list' : layout
  const selectedProject = filteredProjects.find(project => project.id === selectedProjectId)
  
  const discardedCount = projects.filter(p => p.decision === 'DISCARDED').length

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

  const renderProjectCard = (project, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const phase = getPhaseStyle(project.current_phase)
    const progress = ((project.current_phase) / 7) * 100
    const PhaseIcon = phase.icon
    const isSelected = project.id === selectedProjectId

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
          navigate(`/projects/${project.id}`)
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedProjectId(project.id) : undefined}
      >
        <div className="projects-card__body">
          <div className="projects-card__header">
            <div className="projects-card__headerMeta">
              <span className="projects-card__id">{project.project_code}</span>
              <StatusBadge status={project.status} decision={project.decision} />
            </div>
            {!isPreview && (
              <div className="projects-card__actions">
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

          <h3 className="projects-card__title">{project.name}</h3>

          <div className="projects-card__meta">
            {project.sku_internal && <span>SKU: {project.sku_internal}</span>}
            {project.fnsku && <span>FNSKU: {project.fnsku}</span>}
            {project.asin && <span>ASIN: {project.asin}</span>}
          </div>

          <div className="projects-card__progress">
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                  backgroundColor: phase.accent
                }} />
              </div>
              <span style={styles.progressText}>{Math.round(progress)}%</span>
            </div>
          </div>

          <div className="projects-card__actions">
            <div style={{
              ...styles.phaseBadge,
              backgroundColor: phase.bg,
              color: phase.accent,
              border: `1px solid ${phase.accent}`
            }}>
              <PhaseIcon size={14} />
              <span>{phase.name}</span>
            </div>
            {!isPreview && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                        showToast('Project restored', 'success')
                        await refreshProjects()
                      } catch (err) {
                        const { showToast } = await import('../components/Toast')
                        showToast('Error: ' + (err.message || 'Unknown error'), 'error')
                      }
                    }}
                    style={{ height: '28px' }}
                    title="Restore project"
                  >
                    Restore
                  </Button>
                )}
                <ArrowRight size={18} color="var(--muted-1)" />
              </div>
            )}
          </div>
        </div>

        <div className="projects-card__thumbWrap">
          {thumbnailUrl ? (
            <img
              className="projects-card__thumb"
              src={thumbnailUrl}
              alt={project.asin ? `ASIN ${project.asin}` : 'ASIN'}
            />
          ) : (
            <div className="projects-card__thumbFallback">ASIN</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header title="Projectes" />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Toolbar */}
        <div style={styles.toolbar} className="toolbar-row">
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

          <div style={styles.filters} className="toolbar-group">
            <Button
              variant="secondary"
              size="sm"
              style={styles.filterButton}
            >
              <Filter size={14} />
              Filtres
            </Button>
            <select
              value={filterPhase || ''}
              onChange={e => setFilterPhase(e.target.value ? parseInt(e.target.value) : null)}
              style={styles.filterSelect}
            >
              <option value="">Totes les fases</option>
              {Object.entries(PHASES).map(([key, phase]) => (
                <option key={key} value={key}>
                  {phase.name}
                </option>
              ))}
            </select>
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
              value={effectiveLayout}
              onChange={setLayout}
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
              title={!driveConnected ? "Connecta Google Drive per crear" : ""}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <Plus size={18} />
              Nou Projecte
            </Button>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
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
                  title={!driveConnected ? "Connecta Google Drive per crear" : ""}
                  style={{
                    opacity: !driveConnected ? 0.5 : 1,
                    cursor: !driveConnected ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus size={18} />
                  Crear Projecte
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {effectiveLayout === 'grid' && (
              <div style={{
                ...styles.projectsGrid,
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
                gap: isMobile ? '12px' : '20px'
              }}>
                {filteredProjects.map(project => renderProjectCard(project))}
              </div>
            )}
            {effectiveLayout === 'list' && (
              <div style={styles.projectsList}>
                {filteredProjects.map(project => renderProjectCard(project))}
              </div>
            )}
            {effectiveLayout === 'split' && (
              <div style={styles.splitLayout}>
                <div style={styles.splitList}>
                  {filteredProjects.map(project => renderProjectCard(project, { enablePreviewSelect: true }))}
                </div>
                <div style={styles.splitPreview}>
                  {selectedProject ? (
                    renderProjectCard(selectedProject, { isPreview: true })
                  ) : (
                    <div style={styles.splitEmpty}>Selecciona un projecte</div>
                  )}
                </div>
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
    padding: '20px',
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
    marginBottom: '16px'
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
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
  phaseBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500'
  }
}
