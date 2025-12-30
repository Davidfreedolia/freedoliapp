import { useNavigate } from 'react-router-dom'
import { 
  FolderKanban, 
  PlayCircle, 
  CheckCircle2, 
  Wallet,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'

export default function Dashboard() {
  const { stats, projects, loading, darkMode } = useApp()
  const navigate = useNavigate()

  const recentProjects = projects.slice(0, 5)

  const statCards = [
    {
      label: 'Total Projectes',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: '#4f46e5'
    },
    {
      label: 'Actius',
      value: stats.activeProjects,
      icon: PlayCircle,
      color: '#22c55e'
    },
    {
      label: 'Completats',
      value: stats.completedProjects,
      icon: CheckCircle2,
      color: '#8b5cf6'
    },
    {
      label: 'Invertit',
      value: `${stats.totalInvested.toLocaleString('ca-ES', { minimumFractionDigits: 2 })} €`,
      icon: Wallet,
      color: '#f59e0b'
    }
  ]

  const getPhaseInfo = (phase) => {
    const phases = {
      1: { name: 'Recerca', icon: '🔍', color: '#6366f1' },
      2: { name: 'Viabilitat', icon: '📊', color: '#8b5cf6' },
      3: { name: 'Proveïdors', icon: '🏭', color: '#ec4899' },
      4: { name: 'Mostres', icon: '📦', color: '#f59e0b' },
      5: { name: 'Producció', icon: '⚙️', color: '#10b981' },
      6: { name: 'Listing', icon: '📝', color: '#3b82f6' },
      7: { name: 'Live', icon: '🚀', color: '#22c55e' }
    }
    return phases[phase] || phases[1]
  }

  return (
    <div style={styles.container}>
      <Header title="Dashboard" />

      <div style={styles.content}>
        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <div 
              key={index}
              style={{
                ...styles.statCard,
                backgroundColor: darkMode ? '#15151f' : '#ffffff'
              }}
            >
              <div style={{
                ...styles.statIcon,
                backgroundColor: `${stat.color}15`
              }}>
                <stat.icon size={24} color={stat.color} />
              </div>
              <div style={styles.statInfo}>
                <span style={{
                  ...styles.statValue,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {stat.value}
                </span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Projectes recents */}
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <div style={styles.sectionHeader}>
            <h2 style={{
              ...styles.sectionTitle,
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              <Clock size={20} />
              Projectes Recents
            </h2>
            <button 
              onClick={() => navigate('/projects')}
              style={styles.viewAllButton}
            >
              Veure tots <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div style={styles.loading}>Carregant...</div>
          ) : recentProjects.length === 0 ? (
            <div style={styles.empty}>
              <p>No hi ha projectes encara</p>
              <button 
                onClick={() => navigate('/projects')}
                style={styles.createButton}
              >
                Crear primer projecte
              </button>
            </div>
          ) : (
            <div style={styles.projectsList}>
              {recentProjects.map(project => {
                const phase = getPhaseInfo(project.current_phase)
                return (
                  <div 
                    key={project.id}
                    style={styles.projectItem}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div style={styles.projectInfo}>
                      <span style={{
                        ...styles.projectCode,
                        color: darkMode ? '#6b7280' : '#9ca3af'
                      }}>
                        {project.project_code}
                      </span>
                      <span style={{
                        ...styles.projectName,
                        color: darkMode ? '#ffffff' : '#111827'
                      }}>
                        {project.name}
                      </span>
                    </div>
                    <div style={{
                      ...styles.phaseBadge,
                      backgroundColor: `${phase.color}15`,
                      color: phase.color
                    }}>
                      <span>{phase.icon}</span>
                      <span>{phase.name}</span>
                    </div>
                    <ArrowRight size={18} color="#9ca3af" />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <h3 style={{
            ...styles.quickTitle,
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Accions ràpides
          </h3>
          <div style={styles.actionsGrid}>
            <button 
              onClick={() => navigate('/projects')}
              style={{
                ...styles.actionButton,
                backgroundColor: darkMode ? '#15151f' : '#ffffff'
              }}
            >
              <FolderKanban size={20} color="#4f46e5" />
              <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>Nou Projecte</span>
            </button>
            <button 
              onClick={() => navigate('/suppliers')}
              style={{
                ...styles.actionButton,
                backgroundColor: darkMode ? '#15151f' : '#ffffff'
              }}
            >
              <TrendingUp size={20} color="#22c55e" />
              <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>Nou Proveïdor</span>
            </button>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280'
  },
  section: {
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    marginBottom: '32px'
  },
  sectionHeader: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-color)'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  viewAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280'
  },
  createButton: {
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
  projectsList: {
    display: 'flex',
    flexDirection: 'column'
  },
  projectItem: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  projectInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  projectCode: {
    fontSize: '12px',
    fontWeight: '500'
  },
  projectName: {
    fontSize: '15px',
    fontWeight: '500'
  },
  phaseBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  quickActions: {
    marginTop: '8px'
  },
  quickTitle: {
    fontSize: '13px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '16px'
  },
  actionsGrid: {
    display: 'flex',
    gap: '16px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 24px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
}
