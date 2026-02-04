import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Truck, 
  Factory, 
  Ship, 
  Warehouse, 
  Package,
  Clock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getProjects, getPurchaseOrders } from '../lib/supabase'
import Button from './Button'

// Estats del flux logístic (simplificat per dashboard)
const LOGISTICS_STAGES = [
  { id: 'production', name: 'Producció', icon: Factory, color: 'var(--brand-primary)', colorSoft: 'var(--brand-primary-soft)' },
  { id: 'pickup', name: 'Recollida', icon: Truck, color: 'var(--brand-amber)', colorSoft: 'var(--brand-amber-soft)' },
  { id: 'in_transit', name: 'En trànsit', icon: Ship, color: 'var(--brand-amber)', colorSoft: 'var(--brand-amber-soft)' },
  { id: 'customs', name: 'Duanes', icon: Package, color: 'var(--brand-amber)', colorSoft: 'var(--brand-amber-soft)' },
  { id: 'amazon_fba', name: 'Amazon FBA', icon: Warehouse, color: 'var(--brand-green)', colorSoft: 'var(--brand-green-soft)' }
]

const LOGISTICS_STATUS_LABELS = {
  production: 'Producció',
  pickup: 'Recollida',
  in_transit: 'En trànsit',
  customs: 'Duanes',
  amazon_fba: 'Amazon FBA'
}

export default function LogisticsTrackingWidget({ darkMode, embedded = false, hideHeader = false }) {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [ordersByProject, setOrdersByProject] = useState({})
  const [loading, setLoading] = useState(true)
  const [showOnlyStale, setShowOnlyStale] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar projectes actius (excloure DISCARDED)
      const allProjects = await getProjects()
      const activeProjects = (allProjects || []).filter(p => 
        p.status === 'active' && p.decision !== 'DISCARDED'
      )
      setProjects(activeProjects)

      // Carregar comandes amb tracking
      const orders = await getPurchaseOrders()
      const ordersWithTracking = (orders || []).filter(o => 
        o.logistics_status && !['cancelled', 'received'].includes(o.status)
      )

      // Agrupar per projecte (agafar la PO més recent per projecte)
      const grouped = {}
      ordersWithTracking.forEach(order => {
        if (order.project_id) {
          if (!grouped[order.project_id] || 
              new Date(order.created_at) > new Date(grouped[order.project_id].created_at)) {
            grouped[order.project_id] = order
          }
        }
      })
      setOrdersByProject(grouped)
    } catch (err) {
      console.error('Error carregant dades de tracking:', err)
    }
    setLoading(false)
  }

  const getStatusInfo = (status) => {
    const stage = LOGISTICS_STAGES.find(s => s.id === status)
    if (!stage) {
      return { name: status || 'Pendent', color: 'var(--muted-1)', colorSoft: 'var(--surface-2)', icon: Clock }
    }
    return stage
  }

  const getProgressPercentage = (status) => {
    const index = LOGISTICS_STAGES.findIndex(s => s.id === status)
    if (index === -1) return 0
    return ((index + 1) / LOGISTICS_STAGES.length) * 100
  }

  // Calcular dies des de l'última actualització
  const getDaysSinceUpdate = (logisticsUpdatedAt) => {
    if (!logisticsUpdatedAt) return null
    const now = new Date()
    const updated = new Date(logisticsUpdatedAt)
    const diffTime = now - updated
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Determinar si és "stale" (>14 dies) o "needs update" (>7 dies)
  const getUpdateStatus = (logisticsUpdatedAt) => {
    const days = getDaysSinceUpdate(logisticsUpdatedAt)
    if (days === null) return null
    if (days > 14) return 'stale' // Vermell
    if (days > 7) return 'needs_update' // Taronja
    return 'current' // Actualitzat
  }

  // Filtrar projectes segons si són "stale" o no
  const getFilteredProjects = () => {
    const projectsWithTracking = projects.filter(p => ordersByProject[p.id])
    
    if (!showOnlyStale) return projectsWithTracking
    
    return projectsWithTracking.filter(project => {
      const order = ordersByProject[project.id]
      const status = getUpdateStatus(order.logistics_updated_at)
      return status === 'stale' || status === 'needs_update'
    })
  }

  if (loading) {
    return (
      <div style={{
        ...(embedded ? styles.sectionEmbedded : styles.section),
        ...(embedded ? null : { backgroundColor: 'var(--surface-1)' })
      }}>
        {!hideHeader && (
          <div style={styles.sectionHeader}>
          <h2 style={{
            ...styles.sectionTitle,
            color: 'var(--text-1)'
          }}>
            <Truck size={20} />
            Tracking Logístic
          </h2>
          </div>
        )}
        <div style={styles.loading}>Carregant...</div>
      </div>
    )
  }

  const filteredProjects = getFilteredProjects()

  if (filteredProjects.length === 0 && !showOnlyStale) {
    return (
      <div style={{
        ...(embedded ? styles.sectionEmbedded : styles.section),
        ...(embedded ? null : { backgroundColor: 'var(--surface-1)' })
      }}>
        {!hideHeader && (
          <div style={styles.sectionHeader}>
          <h2 style={{
            ...styles.sectionTitle,
            color: 'var(--text-1)'
          }}>
            <Truck size={20} />
            Tracking Logístic
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/orders')}
            className="tracking-view-all"
          >
            Veure totes <ArrowRight size={16} />
          </Button>
          </div>
        )}
        <div style={styles.empty}>
          <p>{showOnlyStale ? 'No hi ha comandes pendents d\'actualització' : 'No hi ha comandes amb tracking actiu'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...(embedded ? styles.sectionEmbedded : styles.section),
      ...(embedded ? null : { backgroundColor: 'var(--surface-1)' })
    }}>
      {!hideHeader && (
        <div style={styles.sectionHeader}>
        <h2 style={{
          ...styles.sectionTitle,
          color: 'var(--text-1)'
        }}>
          <Truck size={20} />
          Tracking Logístic
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowOnlyStale(!showOnlyStale)}
            className={`tracking-filter-button ${showOnlyStale ? 'is-active' : ''}`}
          >
            <AlertTriangle size={14} />
            Només pendents
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/orders')}
            className="tracking-view-all"
          >
            Veure totes <ArrowRight size={16} />
          </Button>
        </div>
        </div>
      )}

      <div style={styles.projectsList} className="tracking-list">
        {filteredProjects.map(project => {
          const order = ordersByProject[project.id]
          const statusInfo = getStatusInfo(order.logistics_status)
          const StatusIcon = statusInfo.icon
          const progress = getProgressPercentage(order.logistics_status)
          const updateStatus = getUpdateStatus(order.logistics_updated_at)
          const daysSinceUpdate = getDaysSinceUpdate(order.logistics_updated_at)

          return (
            <div 
              key={project.id}
              style={styles.projectCard}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
                <div style={styles.projectHeader}>
                <div style={styles.projectInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      ...styles.projectName,
                      color: 'var(--text-1)'
                    }}>
                      {project.name}
                    </span>
                      {!embedded && updateStatus === 'stale' && (
                        <span className="status-pill pill--danger" style={styles.updateBadge}>
                          <AlertTriangle size={12} />
                          Stale
                        </span>
                      )}
                      {!embedded && updateStatus === 'needs_update' && (
                        <span className="status-pill pill--warn" style={styles.updateBadge}>
                          <AlertTriangle size={12} />
                          Needs update
                        </span>
                      )}
                  </div>
                  <span style={{
                    ...styles.projectCode,
                    color: 'var(--muted-1)'
                  }}>
                    {project.project_code}
                  </span>
                  {daysSinceUpdate !== null && (
                    <span style={{
                      ...styles.lastUpdateText,
                      color: 'var(--muted-1)'
                    }}>
                      Última actualització: fa {daysSinceUpdate} {daysSinceUpdate === 1 ? 'dia' : 'dies'}
                    </span>
                  )}
                </div>
                {!embedded && (
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: statusInfo.colorSoft || 'var(--surface-2)',
                    color: statusInfo.color
                  }}>
                    <StatusIcon size={14} />
                    {statusInfo.name}
                  </div>
                )}
              </div>

              {/* Barra de progrés */}
              <div style={styles.progressContainer} className="tracking-timeline">
                <div style={styles.stagesIndicator} className="tracking-stages">
                  {LOGISTICS_STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon
                    const isCompleted = idx < LOGISTICS_STAGES.findIndex(s => s.id === order.logistics_status)
                    const isCurrent = stage.id === order.logistics_status
                    
                    return (
                      <div key={stage.id} style={styles.stageDot}>
                        <div style={{
                          ...styles.stageIcon,
                          backgroundColor: isCompleted || isCurrent ? stage.colorSoft : 'var(--surface-2)',
                          borderColor: isCompleted || isCurrent ? stage.color : 'var(--border-1)'
                        }}>
                          <StageIcon size={10} color={isCompleted || isCurrent ? stage.color : 'var(--muted-1)'} />
                        </div>
                        {!embedded && idx < LOGISTICS_STAGES.length - 1 && (
                          <div style={{
                            ...styles.stageConnector,
                            backgroundColor: isCompleted ? stage.color : 'var(--border-1)'
                          }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tracking number */}
              {order.tracking_number && (
                <div style={styles.trackingInfo}>
                  <span style={styles.trackingLabel}>Tracking:</span>
                  <span style={{
                    ...styles.trackingNumber,
                    color: 'var(--muted-1)'
                  }}>
                    {order.tracking_number}
                  </span>
                </div>
              )}

              {!embedded && (
                <ArrowRight size={18} color="var(--muted-1)" style={styles.arrowIcon} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  section: {
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    marginBottom: '32px'
  },
  sectionEmbedded: {
    borderRadius: 0,
    border: 'none',
    overflow: 'visible',
    marginBottom: 0
  },
  sectionHeader: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--muted-1)'
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--muted-1)'
  },
  projectsList: {
    display: 'flex',
    flexDirection: 'column'
  },
  projectCard: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    position: 'relative'
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  projectInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  projectName: {
    fontSize: '15px',
    fontWeight: '600'
  },
  projectCode: {
    fontSize: '12px',
    fontWeight: '500'
  },
  lastUpdateText: {
    fontSize: '11px',
    fontWeight: '400',
    marginTop: '2px'
  },
  updateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    flexShrink: 0
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--border-1)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  stagesIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  stageDot: {
    display: 'flex',
    alignItems: 'center',
    flex: 1
  },
  stageIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  stageConnector: {
    flex: 1,
    height: '2px',
    margin: '0 4px'
  },
  trackingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px'
  },
  trackingLabel: {
    fontWeight: '500',
    color: 'var(--muted-1)'
  },
  trackingNumber: {
    fontFamily: 'monospace',
    fontWeight: '500'
  },
  arrowIcon: {
    position: 'absolute',
    right: '24px',
    top: '50%',
    transform: 'translateY(-50%)'
  }
}



