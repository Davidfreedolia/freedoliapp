import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { 
  FolderKanban, 
  PlayCircle, 
  CheckCircle2, 
  Wallet,
  ArrowRight,
  Users,
  Truck,
  Warehouse,
  Plus,
  Package,
  TrendingUp,
  Sun,
  Moon,
  Bell,
  Settings,
  Barcode,
  AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPurchaseOrders, getDashboardPreferences, getPosNotReady, getProjectsMissingGtin, getUnassignedGtinCodes, getPosWaitingManufacturer } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import NewProjectModal from '../components/NewProjectModal'
import LogisticsTrackingWidget from '../components/LogisticsTrackingWidget'
import CustomizeDashboardModal from '../components/CustomizeDashboardModal'

export default function Dashboard() {
  const { stats, projects, loading, darkMode, setDarkMode } = useApp()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [ordersInProgress, setOrdersInProgress] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [financialData, setFinancialData] = useState([])
  const [posNotReady, setPosNotReady] = useState([])
  const [loadingPosNotReady, setLoadingPosNotReady] = useState(true)
  const [dashboardWidgets, setDashboardWidgets] = useState({
    logistics_tracking: true,
    finance_chart: true,
    orders_in_progress: true,
    pos_not_ready: true,
    waiting_manufacturer: true,
    activity_feed: false
  })
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [gtinCoverage, setGtinCoverage] = useState({ missingGtin: 0, availableCodes: 0 })
  const [loadingGtinCoverage, setLoadingGtinCoverage] = useState(true)
  const [posWaitingManufacturer, setPosWaitingManufacturer] = useState([])
  const [loadingWaitingManufacturer, setLoadingWaitingManufacturer] = useState(true)

  useEffect(() => {
    loadDashboardPreferences()
    loadOrdersInProgress()
    loadFinancialData()
    loadGtinCoverage()
    loadPosNotReady()
    loadPosWaitingManufacturer()

    // Prefetch rutes probables després de 2s idle (opcional)
    // Millora UX pre-carregant pàgines que probablement s'utilitzaran
    const idlePrefetchTimer = setTimeout(() => {
      // Prefetch Orders i ProjectDetail (les més usades després del Dashboard)
      import('./Orders.jsx').catch(() => {})
      import('./ProjectDetail.jsx').catch(() => {})
    }, 2000)

    return () => clearTimeout(idlePrefetchTimer)
  }, [])

  const loadGtinCoverage = async () => {
    setLoadingGtinCoverage(true)
    try {
      const [missingGtin, availableCodes] = await Promise.all([
        getProjectsMissingGtin(),
        getUnassignedGtinCodes()
      ])
      setGtinCoverage({
        missingGtin: missingGtin?.length || 0,
        availableCodes: availableCodes?.length || 0
      })
    } catch (err) {
      console.error('Error carregant GTIN coverage:', err)
    }
    setLoadingGtinCoverage(false)
  }

  const loadOrdersInProgress = async () => {
    setLoadingOrders(true)
    try {
      const orders = await getPurchaseOrders()
      // Filtrar comandes que estan en curs (no cancel·lades ni completades)
      const inProgress = (orders || []).filter(order => 
        !['cancelled', 'received'].includes(order.status)
      )
      setOrdersInProgress(inProgress.slice(0, 5)) // Mostrar les 5 primeres
    } catch (err) {
      console.error('Error carregant comandes:', err)
    }
    setLoadingOrders(false)
  }

  const loadPosNotReady = async () => {
    setLoadingPosNotReady(true)
    try {
      const notReady = await getPosNotReady(5)
      setPosNotReady(notReady || [])
    } catch (err) {
      console.error('Error carregant POs not ready:', err)
    }
    setLoadingPosNotReady(false)
  }

  const loadPosWaitingManufacturer = async () => {
    setLoadingWaitingManufacturer(true)
    try {
      const waiting = await getPosWaitingManufacturer(5)
      setPosWaitingManufacturer(waiting || [])
    } catch (err) {
      console.error('Error carregant POs waiting manufacturer:', err)
    }
    setLoadingWaitingManufacturer(false)
  }

  const loadDashboardPreferences = async () => {
    setLoadingPreferences(true)
    try {
      const prefs = await getDashboardPreferences()
      if (prefs?.widgets) {
        setDashboardWidgets({
          logistics_tracking: prefs.widgets.logistics_tracking !== false,
          finance_chart: prefs.widgets.finance_chart !== false,
          orders_in_progress: prefs.widgets.orders_in_progress !== false,
          pos_not_ready: prefs.widgets.pos_not_ready !== false,
          waiting_manufacturer: prefs.widgets.waiting_manufacturer !== false,
          activity_feed: prefs.widgets.activity_feed === true
        })
      }
    } catch (err) {
      console.error('Error carregant preferències dashboard:', err)
    }
    setLoadingPreferences(false)
  }

  const handlePreferencesSave = (newWidgets) => {
    setDashboardWidgets(newWidgets)
  }

  const loadFinancialData = async () => {
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        supabase.from('expenses').select('amount, expense_date').order('expense_date', { ascending: false }),
        supabase.from('incomes').select('amount, income_date').order('income_date', { ascending: false })
      ])
      
      const expenses = expensesRes.data || []
      const incomes = incomesRes.data || []
      
      // Agrupar per mes
      const monthly = {}
      expenses.forEach(e => {
        if (e.expense_date) {
          const month = e.expense_date.substring(0, 7) // YYYY-MM
          if (!monthly[month]) monthly[month] = { income: 0, expenses: 0 }
          monthly[month].expenses += parseFloat(e.amount || 0)
        }
      })
      incomes.forEach(i => {
        if (i.income_date) {
          const month = i.income_date.substring(0, 7) // YYYY-MM
          if (!monthly[month]) monthly[month] = { income: 0, expenses: 0 }
          monthly[month].income += parseFloat(i.amount || 0)
        }
      })
      
      const sorted = Object.keys(monthly).sort().slice(-6) // Últims 6 mesos
      setFinancialData(sorted.map(month => ({
        month,
        ...monthly[month],
        profit: monthly[month].income - monthly[month].expenses
      })))
    } catch (err) {
      console.error('Error carregant dades financeres:', err)
    }
  }

  // Excloure DISCARDED dels projectes recents
  const recentProjects = projects
    .filter(p => p.decision !== 'DISCARDED')
    .slice(0, 5)

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
  
  // Contador de projectes descartats (clicable)
  const discardedCount = stats.discardedProjects || 0

  const getOrderStatusInfo = (status) => {
    const statuses = {
      draft: { name: 'Esborrany', color: '#6b7280' },
      sent: { name: 'Enviat', color: '#3b82f6' },
      confirmed: { name: 'Confirmat', color: '#8b5cf6' },
      partial_paid: { name: 'Pagat parcial', color: '#f59e0b' },
      paid: { name: 'Pagat', color: '#22c55e' },
      in_production: { name: 'En producció', color: '#ec4899' },
      shipped: { name: 'Enviat', color: '#06b6d4' },
      received: { name: 'Rebut', color: '#10b981' },
      cancelled: { name: 'Cancel·lat', color: '#ef4444' }
    }
    return statuses[status] || statuses.draft
  }


  // Gràfica de finances senzilla
  const maxValue = financialData.length > 0
    ? Math.max(...financialData.map(d => Math.max(d.income, d.expenses)), 1)
    : 1

  return (
    <div style={styles.container}>
      {/* Botons d'accions ràpides en lloc del Header */}
      <div style={{
        ...styles.headerActions,
        backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
        borderColor: darkMode ? '#2a2a3a' : '#e5e7eb',
        flexDirection: isMobile ? 'column' : 'row',
        padding: isMobile ? '12px' : '0 32px',
        gap: isMobile ? '8px' : '0'
      }}>
        <div style={{
          ...styles.quickActionsHeader,
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '100%' : 'auto',
          gap: isMobile ? '8px' : '12px'
        }}>
          <button
            onClick={() => setShowNewProjectModal(true)}
            style={{
              ...styles.actionButton,
              backgroundColor: darkMode ? '#15151f' : '#f3f4f6',
              color: darkMode ? '#ffffff' : '#111827',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}
          >
            <Plus size={16} />
            <FolderKanban size={18} color="#4f46e5" />
            Nou Projecte
          </button>
          {!isMobile && (
            <>
              <button
                onClick={() => navigate('/suppliers')}
                style={{
                  ...styles.actionButton,
                  backgroundColor: darkMode ? '#15151f' : '#f3f4f6',
                  color: darkMode ? '#ffffff' : '#111827'
                }}
              >
                <Plus size={16} />
                <Users size={18} color="#22c55e" />
                Nou Proveïdor
              </button>
              <button
                onClick={() => navigate('/forwarders')}
                style={{
                  ...styles.actionButton,
                  backgroundColor: darkMode ? '#15151f' : '#f3f4f6',
                  color: darkMode ? '#ffffff' : '#111827'
                }}
              >
                <Plus size={16} />
                <Truck size={18} color="#f59e0b" />
                Nou Transitari
              </button>
              <button
                onClick={() => navigate('/warehouses')}
                style={{
                  ...styles.actionButton,
                  backgroundColor: darkMode ? '#15151f' : '#f3f4f6',
                  color: darkMode ? '#ffffff' : '#111827'
                }}
              >
                <Plus size={16} />
                <Warehouse size={18} color="#3b82f6" />
                Nou Magatzem
              </button>
            </>
          )}
        </div>
        
        <div style={styles.headerActionsRight}>
          {/* Personalitzar Dashboard */}
          <button 
            onClick={() => setShowCustomizeModal(true)}
            style={{
              ...styles.iconButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
            }}
            title="Personalitzar Dashboard"
          >
            <Settings size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
          </button>

          {/* Notificacions */}
          <button style={{
            ...styles.iconButton,
            backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
          }}>
            <Bell size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
          </button>

          {/* Toggle Dark Mode */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{
              ...styles.iconButton,
              backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
            }}
          >
            {darkMode ? (
              <Sun size={20} color="#fbbf24" />
            ) : (
              <Moon size={20} color="#6b7280" />
            )}
          </button>
        </div>
      </div>

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Stats Grid */}
        <div style={{
          ...styles.statsGrid,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: isMobile ? '12px' : '20px'
        }}>
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

        {/* Discarded Projects Counter */}
        {discardedCount > 0 && (
          <div style={{
            ...styles.discardedCounter,
            backgroundColor: darkMode ? '#15151f' : '#ffffff',
            borderColor: darkMode ? '#374151' : '#e5e7eb'
          }}>
            <AlertTriangle size={16} color="#6b7280" />
            <span style={{
              fontSize: '13px',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              Projectes descartats: {discardedCount}
            </span>
            <button
              onClick={() => navigate('/projects?showDiscarded=true')}
              style={{
                ...styles.discardedLink,
                color: '#4f46e5'
              }}
            >
              Veure →
            </button>
          </div>
        )}

        {/* GTIN Coverage KPI */}
        {!loadingGtinCoverage && (
          <div style={{
            ...styles.section,
            backgroundColor: darkMode ? '#15151f' : '#ffffff'
          }}>
            <div style={styles.sectionHeader}>
              <h2 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                <Barcode size={20} />
                GTIN Coverage
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '20px' }}>
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: gtinCoverage.missingGtin > 0 ? '#f59e0b' : (darkMode ? '#374151' : '#e5e7eb'),
                backgroundColor: gtinCoverage.missingGtin > 0 ? '#fef3c7' : (darkMode ? '#1f1f2e' : '#f9fafb')
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={18} color={gtinCoverage.missingGtin > 0 ? '#f59e0b' : '#6b7280'} />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    SKUs sense GTIN
                  </span>
                </div>
                <span style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: gtinCoverage.missingGtin > 0 ? '#f59e0b' : (darkMode ? '#ffffff' : '#111827')
                }}>
                  {gtinCoverage.missingGtin}
                </span>
              </div>
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: gtinCoverage.availableCodes < gtinCoverage.missingGtin ? '#ef4444' : (darkMode ? '#374151' : '#e5e7eb'),
                backgroundColor: gtinCoverage.availableCodes < gtinCoverage.missingGtin ? '#fee2e2' : (darkMode ? '#1f1f2e' : '#f9fafb')
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Barcode size={18} color={gtinCoverage.availableCodes < gtinCoverage.missingGtin ? '#ef4444' : '#22c55e'} />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Codis disponibles al pool
                  </span>
                </div>
                <span style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: gtinCoverage.availableCodes < gtinCoverage.missingGtin ? '#ef4444' : (darkMode ? '#ffffff' : '#111827')
                }}>
                  {gtinCoverage.availableCodes}
                </span>
              </div>
              {gtinCoverage.availableCodes < gtinCoverage.missingGtin && (
                <div style={{
                  gridColumn: 'span 2',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#991b1b" />
                    <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '500' }}>
                      ⚠️ Alerta: Hi ha menys codis disponibles ({gtinCoverage.availableCodes}) que SKUs pendents ({gtinCoverage.missingGtin})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tracking Logístic Widget */}
        {dashboardWidgets.logistics_tracking && !loadingPreferences && (
          <LogisticsTrackingWidget darkMode={darkMode} />
        )}

        {/* Comandes en curs */}
        {dashboardWidgets.orders_in_progress && (
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <div style={styles.sectionHeader}>
            <h2 style={{
              ...styles.sectionTitle,
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              <Package size={20} />
              Comandes en curs
            </h2>
            <button 
              onClick={() => navigate('/orders')}
              style={styles.viewAllButton}
            >
              Veure totes <ArrowRight size={16} />
            </button>
          </div>

          {loadingOrders ? (
            <div style={styles.loading}>Carregant...</div>
          ) : ordersInProgress.length === 0 ? (
            <div style={styles.empty}>
              <p>No hi ha comandes en curs</p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {ordersInProgress.map(order => {
                const statusInfo = getOrderStatusInfo(order.status)
                return (
                  <div 
                    key={order.id}
                    style={styles.orderItem}
                    onClick={() => navigate(`/orders`)}
                  >
                    <div style={styles.orderInfo}>
                      <span style={{
                        ...styles.orderNumber,
                        color: darkMode ? '#ffffff' : '#111827'
                      }}>
                        {order.po_number}
                      </span>
                      <span style={{
                        ...styles.orderProject,
                        color: darkMode ? '#6b7280' : '#9ca3af'
                      }}>
                        {order.project?.name || 'Sense projecte'}
                      </span>
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: `${statusInfo.color}15`,
                      color: statusInfo.color
                    }}>
                      {statusInfo.name}
                    </div>
                    <ArrowRight size={18} color="#9ca3af" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {/* POs not ready */}
        {dashboardWidgets.pos_not_ready && (
        <div style={{
          ...styles.section,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <div style={styles.sectionHeader}>
            <h2 style={{
              ...styles.sectionTitle,
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              <AlertTriangle size={20} />
              POs no llestes per Amazon
            </h2>
            <button 
              onClick={() => navigate('/orders')}
              style={styles.viewAllButton}
            >
              Veure totes <ArrowRight size={16} />
            </button>
          </div>

          {loadingPosNotReady ? (
            <div style={styles.loading}>Carregant...</div>
          ) : posNotReady.length === 0 ? (
            <div style={styles.empty}>
              <p>Totes les POs estan llestes per Amazon! 🎉</p>
            </div>
          ) : (
            <div style={styles.ordersList}>
              {posNotReady.map(po => (
                <div 
                  key={po.id}
                  style={styles.orderItem}
                  onClick={() => navigate(`/orders`)}
                >
                  <div style={styles.orderInfo}>
                    <span style={{
                      ...styles.orderNumber,
                      color: darkMode ? '#ffffff' : '#111827'
                    }}>
                      {po.po_number}
                    </span>
                    <span style={{
                      ...styles.orderProject,
                      color: darkMode ? '#6b7280' : '#9ca3af'
                    }}>
                      {po.projects?.name || 'Sense projecte'}
                    </span>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: '#f59e0b15',
                    color: '#f59e0b'
                  }}>
                    Missing {po.missingCount}
                  </div>
                  <ArrowRight size={18} color="#9ca3af" />
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Gràfica de finances */}
        {dashboardWidgets.finance_chart && financialData.length > 0 && (
          <div style={{
            ...styles.section,
            backgroundColor: darkMode ? '#15151f' : '#ffffff'
          }}>
            <div style={styles.sectionHeader}>
              <h2 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                <TrendingUp size={20} />
                Analítica de Finances
              </h2>
            </div>
            <div style={styles.chartContainer}>
              <div style={styles.chartBars}>
                {financialData.map((data, index) => (
                  <div key={index} style={styles.chartBarGroup}>
                    <div style={styles.barLabels}>
                      <div style={{
                        ...styles.bar,
                        height: `${(data.income / maxValue) * 100}%`,
                        backgroundColor: '#22c55e'
                      }} />
                      <div style={{
                        ...styles.bar,
                        height: `${(data.expenses / maxValue) * 100}%`,
                        backgroundColor: '#ef4444',
                        marginTop: '4px'
                      }} />
                    </div>
                    <div style={styles.barLabel}>
                      {new Date(data.month + '-01').toLocaleDateString('ca-ES', { month: 'short', year: '2-digit' })}
                    </div>
                    <div style={styles.barValues}>
                      <span style={{ color: '#22c55e', fontSize: '11px' }}>
                        +{data.income.toLocaleString('ca-ES', { maximumFractionDigits: 0 })}€
                      </span>
                      <span style={{ color: '#ef4444', fontSize: '11px' }}>
                        -{data.expenses.toLocaleString('ca-ES', { maximumFractionDigits: 0 })}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.chartLegend}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendColor, backgroundColor: '#22c55e' }} />
                  <span>Ingressos</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendColor, backgroundColor: '#ef4444' }} />
                  <span>Despeses</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <NewProjectModal 
        isOpen={showNewProjectModal} 
        onClose={() => setShowNewProjectModal(false)} 
      />

      <CustomizeDashboardModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        onSave={handlePreferencesSave}
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
  headerActions: {
    height: '70px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid'
  },
  quickActionsHeader: {
    display: 'flex',
    gap: '12px',
    flex: 1
  },
  headerActionsRight: {
    display: 'flex',
    gap: '12px'
  },
  iconButton: {
    width: '40px',
    height: '40px',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
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
  discardedCounter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid',
    marginBottom: '24px'
  },
  discardedLink: {
    background: 'none',
    border: 'none',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline'
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
  viewAllButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '6px',
    padding: '6px 12px',
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
  ordersList: {
    display: 'flex',
    flexDirection: 'column'
  },
  orderItem: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  orderInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  orderNumber: {
    fontSize: '15px',
    fontWeight: '500'
  },
  orderProject: {
    fontSize: '12px',
    fontWeight: '500'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500'
  },
  chartContainer: {
    padding: '24px'
  },
  chartBars: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    height: '200px',
    marginBottom: '16px'
  },
  chartBarGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  barLabels: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '2px'
  },
  bar: {
    width: '100%',
    minHeight: '4px',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease'
  },
  barLabel: {
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500'
  },
  barValues: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '11px',
    textAlign: 'center'
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    paddingTop: '16px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px'
  }
}
