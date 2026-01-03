import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { 
  Plus, 
  Search, 
  Filter,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { deleteProject } from '../lib/supabase'
import Header from '../components/Header'
import NewProjectModal from '../components/NewProjectModal'

const PHASES = {
  1: { name: 'Recerca', icon: '🔍', color: '#6366f1' },
  2: { name: 'Viabilitat', icon: '📊', color: '#8b5cf6' },
  3: { name: 'Proveïdors', icon: '🏭', color: '#ec4899' },
  4: { name: 'Mostres', icon: '📦', color: '#f59e0b' },
  5: { name: 'Producció', icon: '⚙️', color: '#10b981' },
  6: { name: 'Listing', icon: '📝', color: '#3b82f6' },
  7: { name: 'Live', icon: '🚀', color: '#22c55e' }
}

export default function Projects() {
  const { projects, refreshProjects, darkMode, driveConnected } = useApp()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPhase, setFilterPhase] = useState(null)
  const [showDiscarded, setShowDiscarded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPhase = filterPhase ? project.current_phase === filterPhase : true
    // Per defecte, ocultar DISCARDED
    const matchesDiscarded = showDiscarded ? true : (project.decision !== 'DISCARDED')
    return matchesSearch && matchesPhase && matchesDiscarded
  })
  
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

  return (
    <div style={styles.container}>
      <Header title="Projectes" />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Toolbar */}
        <div style={{
          ...styles.toolbar,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px'
        }}>
          <div style={styles.searchContainer}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar projectes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                ...styles.searchInput,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />
          </div>

          <div style={{
            ...styles.filters,
            width: isMobile ? '100%' : 'auto',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '8px' : '12px'
          }}>
            <select
              value={filterPhase || ''}
              onChange={e => setFilterPhase(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                ...styles.filterSelect,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              <option value="">Totes les fases</option>
              {Object.entries(PHASES).map(([key, phase]) => (
                <option key={key} value={key}>
                  {phase.icon} {phase.name}
                </option>
              ))}
            </select>
            {discardedCount > 0 && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#9ca3af' : '#6b7280',
                width: isMobile ? '100%' : 'auto'
              }}>
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

          <button 
            onClick={() => {
              if (!driveConnected) return
              setShowModal(true)
            }} 
            disabled={!driveConnected}
            title={!driveConnected ? "Connecta Google Drive per crear" : ""}
            style={{
              ...styles.newButton,
              width: isMobile ? '100%' : 'auto',
              opacity: !driveConnected ? 0.5 : 1,
              cursor: !driveConnected ? 'not-allowed' : 'pointer'
            }}>
            <Plus size={18} />
            Nou Projecte
          </button>
          {!driveConnected && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
              <a href="/settings" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                Connecta Google Drive per crear
              </a>
            </div>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div style={{
            ...styles.empty,
            backgroundColor: darkMode ? '#15151f' : '#ffffff'
          }}>
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {searchTerm || filterPhase 
                ? 'No s\'han trobat projectes amb aquests filtres'
                : 'No hi ha projectes. Crea el primer!'}
            </p>
            {!searchTerm && !filterPhase && (
              <>
                <button 
                  onClick={() => {
                    if (!driveConnected) return
                    setShowModal(true)
                  }} 
                  disabled={!driveConnected}
                  title={!driveConnected ? "Connecta Google Drive per crear" : ""}
                  style={{
                    ...styles.createButton,
                    opacity: !driveConnected ? 0.5 : 1,
                    cursor: !driveConnected ? 'not-allowed' : 'pointer'
                  }}>
                  <Plus size={18} />
                  Crear Projecte
                </button>
                {!driveConnected && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    <a href="/settings" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
                      Connecta Google Drive per crear
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{
            ...styles.projectsGrid,
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
            gap: isMobile ? '12px' : '20px'
          }}>
            {filteredProjects.map(project => {
              const phase = PHASES[project.current_phase] || PHASES[1]
              const progress = ((project.current_phase) / 7) * 100
              
              return (
                <div 
                  key={project.id}
                  style={{
                    ...styles.projectCard,
                    backgroundColor: darkMode ? '#15151f' : '#ffffff'
                  }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Header */}
                  <div style={styles.cardHeader}>
                    <span style={{
                      ...styles.projectCode,
                      color: darkMode ? '#6b7280' : '#9ca3af'
                    }}>
                      {project.project_code}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button 
                        onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id) }}
                        style={styles.menuButton}
                      >
                        <MoreVertical size={18} color="#9ca3af" />
                      </button>
                      {menuOpen === project.id && (
                        <div style={{
                          ...styles.menu,
                          backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'
                        }}>
                          <button 
                            onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}/edit`) }}
                            style={styles.menuItem}
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button 
                            onClick={e => handleDelete(e, project)}
                            style={{...styles.menuItem, color: '#ef4444'}}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 style={{
                    ...styles.projectName,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {project.name}
                  </h3>

                  {/* SKU */}
                  {project.sku_internal && (
                    <span style={styles.sku}>SKU: {project.sku_internal}</span>
                  )}

                  {/* Progress bar */}
                  <div style={styles.progressContainer}>
                    <div style={styles.progressBar}>
                      <div style={{
                        ...styles.progressFill,
                        width: `${progress}%`,
                        backgroundColor: phase.color
                      }} />
                    </div>
                    <span style={styles.progressText}>{Math.round(progress)}%</span>
                  </div>

                  {/* Phase badge */}
                  <div style={styles.cardFooter}>
                    <div style={{
                      ...styles.phaseBadge,
                      backgroundColor: `${phase.color}15`,
                      color: phase.color
                    }}>
                      <span>{phase.icon}</span>
                      <span>{phase.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {project.decision === 'DISCARDED' && (
                        <button
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
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                          title="Restore project"
                        >
                          Restore
                        </button>
                      )}
                      <ArrowRight size={18} color="#9ca3af" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  searchContainer: {
    flex: 1,
    minWidth: '250px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)'
  },
  searchInput: {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    background: 'transparent'
  },
  filters: {
    display: 'flex',
    gap: '12px'
  },
  filterSelect: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  newButton: {
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
    cursor: 'pointer'
  },
  empty: {
    padding: '64px',
    textAlign: 'center',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
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
  projectCard: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  projectCode: {
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    minWidth: '140px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 10
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    color: 'inherit'
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
    color: '#6b7280',
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
    color: '#6b7280',
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
