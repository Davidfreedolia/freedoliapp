import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Package, 
  AlertTriangle, 
  Truck, 
  Search, 
  Clock,
  ExternalLink,
  Calendar
} from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import {
  getPosWaitingManufacturer,
  getPosNotReady,
  getShipmentsInTransit,
  getResearchNoDecision,
  getStaleTracking
} from '../lib/supabase'

// Widget: Waiting Manufacturer
export function WaitingManufacturerWidget({ darkMode, limit = 10 }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const pos = await getPosWaitingManufacturer(limit)
      setData(pos || [])
    } catch (err) {
      console.error('Error carregant waiting manufacturer:', err)
    }
    setLoading(false)
  }

  const getDaysSince = (date) => {
    if (!date) return 0
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <Package size={20} color="#f59e0b" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('dashboard.waitingManufacturer.title')}
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.waitingManufacturer.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <Package size={20} color="#f59e0b" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Waiting Manufacturer ({data.length})
        </h3>
      </div>
      <div style={widgetStyles.list}>
        {data.map(po => {
          const daysSince = getDaysSince(po.packGeneratedAt)
          return (
            <div
              key={po.id}
              style={{
                ...widgetStyles.item,
                borderColor: darkMode ? '#374151' : '#e5e7eb'
              }}
            >
              <div style={widgetStyles.itemContent}>
                <div style={widgetStyles.itemHeader}>
                  <span style={{
                    ...widgetStyles.poNumber,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {po.po_number}
                  </span>
                  <span style={{
                    ...widgetStyles.daysBadge,
                    backgroundColor: daysSince > 3 ? '#fee2e2' : '#fef3c7',
                    color: daysSince > 3 ? '#991b1b' : '#92400e'
                  }}>
                    {daysSince}d
                  </span>
                </div>
                <div style={{
                  ...widgetStyles.itemText,
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}>
                  {po.projects?.name || 'Sense projecte'}
                  {po.projects?.sku_internal && ` (${po.projects.sku_internal})`}
                </div>
                <div style={{
                  ...widgetStyles.itemText,
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '12px'
                }}>
                  {po.suppliers?.name || 'Sense proveïdor'}
                </div>
              </div>
              <button
                onClick={() => navigate(`/orders`)}
                style={{
                  ...widgetStyles.actionButton,
                  backgroundColor: '#4f46e5',
                  color: '#ffffff'
                }}
              >
                Open PO
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Widget: POs Not Amazon Ready
export function PosNotAmazonReadyWidget({ darkMode, limit = 10 }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const pos = await getPosNotReady(limit)
      setData(pos || [])
    } catch (err) {
      console.error('Error carregant POs not ready:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('dashboard.posNotAmazonReady.title')}
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.posNotAmazonReady.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <AlertTriangle size={20} color="#ef4444" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          POs Not Amazon Ready ({data.length})
        </h3>
      </div>
      <div style={widgetStyles.list}>
        {data.map(po => (
          <div
            key={po.id}
            style={{
              ...widgetStyles.item,
              borderColor: darkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div style={widgetStyles.itemContent}>
              <div style={widgetStyles.itemHeader}>
                <span style={{
                  ...widgetStyles.poNumber,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {po.po_number}
                </span>
                <span style={{
                  ...widgetStyles.missingBadge,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b'
                }}>
                  Missing {po.missingCount}
                </span>
              </div>
              <div style={{
                ...widgetStyles.itemText,
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}>
                {po.project?.name || 'Sense projecte'}
                {po.project?.sku_internal && ` (${po.project.sku_internal})`}
              </div>
              {po.missing && po.missing.length > 0 && (
                <div style={{
                  ...widgetStyles.missingFields,
                  color: darkMode ? '#fca5a5' : '#dc2626',
                  fontSize: '12px'
                }}>
                  {po.missing.slice(0, 2).join(', ')}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/orders`)}
              style={{
                ...widgetStyles.actionButton,
                backgroundColor: '#ef4444',
                color: '#ffffff'
              }}
            >
              Fix
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Widget: Shipments In Transit
export function ShipmentsInTransitWidget({ darkMode, limit = 10 }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const shipments = await getShipmentsInTransit(limit)
      setData(shipments || [])
      setTableExists(true)
    } catch (err) {
      console.error('Error carregant shipments:', err)
      if (err.code === '42P01') {
        setTableExists(false)
      }
    }
    setLoading(false)
  }

  const getDaysToEta = (etaDate) => {
    if (!etaDate) return null
    const days = Math.floor((new Date(etaDate) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  if (!tableExists) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <Truck size={20} color="#3b82f6" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('dashboard.shipmentsInTransit.title')}
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.shipmentsInTransit.tableNotExists')}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <Truck size={20} color="#3b82f6" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Shipments In Transit
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            No hi ha enviaments en trànsit
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <Truck size={20} color="#3b82f6" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Shipments In Transit ({data.length})
        </h3>
      </div>
      <div style={widgetStyles.list}>
        {data.map(shipment => {
          const daysToEta = getDaysToEta(shipment.eta_date)
          return (
            <div
              key={shipment.id}
              style={{
                ...widgetStyles.item,
                borderColor: darkMode ? '#374151' : '#e5e7eb'
              }}
            >
              <div style={widgetStyles.itemContent}>
                <div style={widgetStyles.itemHeader}>
                  <span style={{
                    ...widgetStyles.poNumber,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {shipment.po_number}
                  </span>
                  {daysToEta !== null && (
                    <span style={{
                      ...widgetStyles.daysBadge,
                      backgroundColor: daysToEta < 0 ? '#fee2e2' : '#dbeafe',
                      color: daysToEta < 0 ? '#991b1b' : '#1e40af'
                    }}>
                      {daysToEta < 0 ? `${Math.abs(daysToEta)}d late` : `${daysToEta}d to ETA`}
                    </span>
                  )}
                </div>
                <div style={{
                  ...widgetStyles.itemText,
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}>
                  {shipment.carrier || 'Sense carrier'}
                </div>
                {shipment.tracking_number && (
                  <div style={{
                    ...widgetStyles.itemText,
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    Tracking: {shipment.tracking_number}
                  </div>
                )}
                {shipment.pro_number && (
                  <div style={{
                    ...widgetStyles.itemText,
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    PRO: {shipment.pro_number}
                  </div>
                )}
                {shipment.eta_date && (
                  <div style={{
                    ...widgetStyles.itemText,
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={12} />
                    ETA: {new Date(shipment.eta_date).toLocaleDateString('ca-ES')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Widget: Research No Decision
export function ResearchNoDecisionWidget({ darkMode, limit = 10 }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const projects = await getResearchNoDecision(limit)
      setData(projects || [])
    } catch (err) {
      console.error('Error carregant research no decision:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <Search size={20} color="#8b5cf6" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('dashboard.researchNoDecision.title')}
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.researchNoDecision.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <Search size={20} color="#8b5cf6" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Research No Decision ({data.length})
        </h3>
      </div>
      <div style={widgetStyles.list}>
        {data.map(project => (
          <div
            key={project.id}
            style={{
              ...widgetStyles.item,
              borderColor: darkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div style={widgetStyles.itemContent}>
              <div style={widgetStyles.itemHeader}>
                <span style={{
                  ...widgetStyles.poNumber,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {project.name}
                </span>
                <span style={{
                  ...widgetStyles.badge,
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed'
                }}>
                  No decision
                </span>
              </div>
              <div style={{
                ...widgetStyles.itemText,
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}>
                {project.sku_internal && `SKU: ${project.sku_internal}`}
                {!project.sku_internal && project.project_code && `Code: ${project.project_code}`}
              </div>
            </div>
            <button
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{
                ...widgetStyles.actionButton,
                backgroundColor: '#8b5cf6',
                color: '#ffffff'
              }}
            >
              Open Project
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Widget: Stale Tracking
export function StaleTrackingWidget({ darkMode, limit = 10, staleDays = 7 }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [staleDays])

  const loadData = async () => {
    setLoading(true)
    try {
      const pos = await getStaleTracking(limit, staleDays)
      setData(pos || [])
    } catch (err) {
      console.error('Error carregant stale tracking:', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{
        ...widgetStyles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={widgetStyles.header}>
          <Clock size={20} color="#f59e0b" />
          <h3 style={{
            ...widgetStyles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('dashboard.staleTracking.title')}
          </h3>
        </div>
        <div style={widgetStyles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('dashboard.staleTracking.empty')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      ...widgetStyles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={widgetStyles.header}>
        <Clock size={20} color="#f59e0b" />
        <h3 style={{
          ...widgetStyles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Stale Tracking ({data.length})
        </h3>
      </div>
      <div style={widgetStyles.list}>
        {data.map(po => (
          <div
            key={po.id}
            style={{
              ...widgetStyles.item,
              borderColor: darkMode ? '#374151' : '#e5e7eb'
            }}
          >
            <div style={widgetStyles.itemContent}>
              <div style={widgetStyles.itemHeader}>
                <span style={{
                  ...widgetStyles.poNumber,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  {po.po_number}
                </span>
                <span style={{
                  ...widgetStyles.daysBadge,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b'
                }}>
                  {po.daysStale}d stale
                </span>
              </div>
              <div style={{
                ...widgetStyles.itemText,
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {po.tracking_number}
              </div>
              {po.projects && (
                <div style={{
                  ...widgetStyles.itemText,
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontSize: '12px'
                }}>
                  {po.projects.name}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/orders`)}
              style={{
                ...widgetStyles.actionButton,
                backgroundColor: '#f59e0b',
                color: '#ffffff'
              }}
            >
              Open PO
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const widgetStyles = {
  container: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '24px',
    textAlign: 'center'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
    gap: '12px'
  },
  itemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  poNumber: {
    fontSize: '14px',
    fontWeight: '600'
  },
  itemText: {
    fontSize: '13px'
  },
  daysBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  missingBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  missingFields: {
    fontSize: '12px',
    marginTop: '4px'
  },
  actionButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s'
  }
}

