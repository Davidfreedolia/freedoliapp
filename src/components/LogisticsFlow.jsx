import { useState, useEffect } from 'react'
import { 
  Factory, 
  Truck, 
  Ship, 
  Warehouse, 
  Package, 
  ChevronRight,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  X,
  Save
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// Estats del flux
const FLOW_STATES = {
  pending: { label: 'Pendent', color: '#9ca3af', icon: Clock },
  in_progress: { label: 'En curs', color: '#f59e0b', icon: AlertCircle },
  completed: { label: 'Completat', color: '#22c55e', icon: CheckCircle }
}

// Etapes del flux logístic
const LOGISTICS_STAGES = [
  { id: 'production', name: 'Producció', icon: Factory, color: '#8b5cf6', description: 'Fabricant produeix la comanda' },
  { id: 'pickup', name: 'Recollida', icon: Truck, color: '#f59e0b', description: 'Transitari recull de fàbrica' },
  { id: 'forwarder_warehouse', name: 'Magatzem Transitari', icon: Warehouse, color: '#3b82f6', description: 'Consolidació i preparació' },
  { id: 'shipping', name: 'Enviament', icon: Ship, color: '#06b6d4', description: 'Transport internacional' },
  { id: 'customs', name: 'Duanes', icon: Package, color: '#ec4899', description: 'Despatx aduaner' },
  { id: 'amazon', name: 'Amazon FBA', icon: Package, color: '#ff9900', description: 'Lliurat a magatzem Amazon' }
]

export default function LogisticsFlow({ orderId, projectId, compact = false }) {
  const { darkMode } = useApp()
  const [flowData, setFlowData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    if (orderId) {
      loadFlowData()
    }
  }, [orderId])

  const loadFlowData = async () => {
    setLoading(true)
    try {
      // Intentar carregar dades existents
      const { data, error } = await supabase
        .from('logistics_flow')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (data) {
        setFlowData(data)
        setEditData(data.stages || {})
      } else {
        // Crear flux per defecte
        const defaultStages = {}
        LOGISTICS_STAGES.forEach(stage => {
          defaultStages[stage.id] = {
            status: 'pending',
            date: null,
            location: '',
            notes: ''
          }
        })
        setFlowData({ stages: defaultStages })
        setEditData(defaultStages)
      }
    } catch (err) {
      console.log('No logistics flow yet, creating default')
      const defaultStages = {}
      LOGISTICS_STAGES.forEach(stage => {
        defaultStages[stage.id] = {
          status: 'pending',
          date: null,
          location: '',
          notes: ''
        }
      })
      setFlowData({ stages: defaultStages })
      setEditData(defaultStages)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    try {
      const payload = {
        order_id: orderId,
        project_id: projectId,
        stages: editData,
        updated_at: new Date().toISOString()
      }

      if (flowData?.id) {
        await supabase.from('logistics_flow').update(payload).eq('id', flowData.id)
      } else {
        await supabase.from('logistics_flow').insert(payload)
      }

      setFlowData({ ...flowData, stages: editData })
      setEditing(false)
    } catch (err) {
      console.error('Error guardant flux:', err)
      alert('Error guardant el flux logístic')
    }
  }

  const updateStage = (stageId, field, value) => {
    setEditData(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [field]: value
      }
    }))
  }

  const getCurrentStage = () => {
    const stages = flowData?.stages || editData
    for (let i = LOGISTICS_STAGES.length - 1; i >= 0; i--) {
      const stage = LOGISTICS_STAGES[i]
      if (stages[stage.id]?.status === 'completed') {
        return i + 1 < LOGISTICS_STAGES.length ? LOGISTICS_STAGES[i + 1] : stage
      }
      if (stages[stage.id]?.status === 'in_progress') {
        return stage
      }
    }
    return LOGISTICS_STAGES[0]
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        Carregant flux logístic...
      </div>
    )
  }

  const stages = editing ? editData : (flowData?.stages || {})
  const currentStage = getCurrentStage()

  // Vista compacta (per llistes)
  if (compact) {
    const completedCount = LOGISTICS_STAGES.filter(s => stages[s.id]?.status === 'completed').length
    const progress = (completedCount / LOGISTICS_STAGES.length) * 100

    return (
      <div style={styles.compactContainer}>
        <div style={styles.compactHeader}>
          <span style={{ color: currentStage.color, fontWeight: '500', fontSize: '13px' }}>
            {currentStage.name}
          </span>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            {completedCount}/{LOGISTICS_STAGES.length}
          </span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%`, backgroundColor: currentStage.color }} />
        </div>
        <div style={styles.compactStages}>
          {LOGISTICS_STAGES.map((stage, idx) => {
            const stageData = stages[stage.id] || {}
            const StageIcon = stage.icon
            const isCompleted = stageData.status === 'completed'
            const isInProgress = stageData.status === 'in_progress'
            
            return (
              <div key={stage.id} style={styles.compactStage}>
                <div style={{
                  ...styles.compactIcon,
                  backgroundColor: isCompleted ? `${stage.color}20` : (isInProgress ? `${stage.color}10` : '#f3f4f6'),
                  borderColor: isCompleted || isInProgress ? stage.color : '#e5e7eb'
                }}>
                  <StageIcon size={12} color={isCompleted || isInProgress ? stage.color : '#9ca3af'} />
                </div>
                {idx < LOGISTICS_STAGES.length - 1 && (
                  <div style={{
                    ...styles.compactConnector,
                    backgroundColor: isCompleted ? stage.color : '#e5e7eb'
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Vista completa
  return (
    <div style={{
      ...styles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={{ ...styles.title, color: darkMode ? '#ffffff' : '#111827' }}>
          <Ship size={20} color="#3b82f6" />
          Flux Logístic
        </h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={styles.editBtn}>
            <Edit size={14} /> Editar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setEditing(false); setEditData(flowData?.stages || {}) }} style={styles.cancelBtn}>
              <X size={14} /> Cancel·lar
            </button>
            <button onClick={handleSave} style={styles.saveBtn}>
              <Save size={14} /> Guardar
            </button>
          </div>
        )}
      </div>

      {/* Flow visualization */}
      <div style={styles.flowContainer}>
        {LOGISTICS_STAGES.map((stage, idx) => {
          const stageData = stages[stage.id] || {}
          const StageIcon = stage.icon
          const StatusIcon = FLOW_STATES[stageData.status || 'pending'].icon
          const isCompleted = stageData.status === 'completed'
          const isInProgress = stageData.status === 'in_progress'
          const isCurrent = stage.id === currentStage.id

          return (
            <div key={stage.id} style={styles.stageWrapper}>
              {/* Stage node */}
              <div style={{
                ...styles.stageNode,
                backgroundColor: isCompleted ? `${stage.color}15` : (isInProgress ? `${stage.color}10` : (darkMode ? '#1f1f2e' : '#f9fafb')),
                borderColor: isCompleted || isInProgress ? stage.color : (darkMode ? '#374151' : '#e5e7eb'),
                boxShadow: isCurrent ? `0 0 0 3px ${stage.color}30` : 'none'
              }}>
                <div style={{
                  ...styles.stageIconWrapper,
                  backgroundColor: stage.color
                }}>
                  <StageIcon size={20} color="#ffffff" />
                </div>
                
                <div style={styles.stageInfo}>
                  <div style={styles.stageHeader}>
                    <span style={{ ...styles.stageName, color: darkMode ? '#ffffff' : '#111827' }}>
                      {stage.name}
                    </span>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: `${FLOW_STATES[stageData.status || 'pending'].color}15`,
                      color: FLOW_STATES[stageData.status || 'pending'].color
                    }}>
                      <StatusIcon size={12} />
                      {FLOW_STATES[stageData.status || 'pending'].label}
                    </div>
                  </div>
                  
                  <p style={styles.stageDescription}>{stage.description}</p>

                  {editing ? (
                    <div style={styles.editFields}>
                      <select
                        value={stageData.status || 'pending'}
                        onChange={e => updateStage(stage.id, 'status', e.target.value)}
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
                      >
                        <option value="pending">Pendent</option>
                        <option value="in_progress">En curs</option>
                        <option value="completed">Completat</option>
                      </select>
                      <input
                        type="date"
                        value={stageData.date || ''}
                        onChange={e => updateStage(stage.id, 'date', e.target.value)}
                        placeholder="Data"
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
                      />
                      <input
                        type="text"
                        value={stageData.location || ''}
                        onChange={e => updateStage(stage.id, 'location', e.target.value)}
                        placeholder="Ubicació"
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={styles.stageDetails}>
                      {stageData.date && (
                        <span style={styles.detailItem}>
                          <Calendar size={12} /> {stageData.date}
                        </span>
                      )}
                      {stageData.location && (
                        <span style={styles.detailItem}>
                          <MapPin size={12} /> {stageData.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector */}
              {idx < LOGISTICS_STAGES.length - 1 && (
                <div style={styles.connector}>
                  <div style={{
                    ...styles.connectorLine,
                    backgroundColor: isCompleted ? stage.color : '#e5e7eb'
                  }} />
                  <ChevronRight size={16} color={isCompleted ? stage.color : '#d1d5db'} />
                  <div style={{
                    ...styles.connectorLine,
                    backgroundColor: isCompleted ? LOGISTICS_STAGES[idx + 1].color : '#e5e7eb'
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(FLOW_STATES).map(([key, state]) => (
          <div key={key} style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: state.color }} />
            <span style={{ color: '#6b7280', fontSize: '12px' }}>{state.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#4f46e510',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  cancelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  flowContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '24px 20px',
    overflowX: 'auto',
    gap: '0'
  },
  stageWrapper: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0
  },
  stageNode: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid',
    minWidth: '200px',
    maxWidth: '220px'
  },
  stageIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  stageInfo: {
    flex: 1,
    minWidth: 0
  },
  stageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '4px'
  },
  stageName: {
    fontSize: '14px',
    fontWeight: '600'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    flexShrink: 0
  },
  stageDescription: {
    margin: '0 0 8px',
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: '1.4'
  },
  stageDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280'
  },
  editFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  input: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    fontSize: '12px',
    outline: 'none'
  },
  connector: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px'
  },
  connectorLine: {
    width: '12px',
    height: '2px'
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '12px 20px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  // Compact styles
  compactContainer: {
    padding: '8px 0'
  },
  compactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  },
  compactStages: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  compactStage: {
    display: 'flex',
    alignItems: 'center',
    flex: 1
  },
  compactIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  compactConnector: {
    flex: 1,
    height: '2px',
    margin: '0 4px'
  }
}
