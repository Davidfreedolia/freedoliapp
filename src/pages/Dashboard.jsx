import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
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
  AlertTriangle,
  Save,
  X,
  Sliders,
  Check,
  StickyNote
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPurchaseOrders, getDashboardPreferences, getPosNotReady, getProjectsMissingGtin, getUnassignedGtinCodes, getPosWaitingManufacturer, updateDashboardPreferences, getCurrentUserId } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import NewProjectModal from '../components/NewProjectModal'
import LogisticsTrackingWidget from '../components/LogisticsTrackingWidget'
import CustomizeDashboardModal from '../components/CustomizeDashboardModal'
import {
  WaitingManufacturerWidget,
  PosNotAmazonReadyWidget,
  ShipmentsInTransitWidget,
  ResearchNoDecisionWidget,
  StaleTrackingWidget
} from '../components/DailyOpsWidgets'
import TasksWidget from '../components/TasksWidget'
import AlertsBadge from '../components/AlertsBadge'
import SafeWidget from '../components/SafeWidget'
import Button from '../components/Button'
import { safeArray } from '../lib/safeArray'
import { 
  generateLayoutFromEnabled, 
  validateLayout,
  WIDGET_IDS,
  snapToAllowedSize
} from '../utils/dashboardLayout'
import { showToast } from '../components/Toast'

export default function Dashboard() {
  const { stats, darkMode, setDarkMode, sidebarCollapsed } = useApp()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    activity_feed: false,
    tasks: true,
    // Daily Ops widgets
    waiting_manufacturer_ops: true,
    pos_not_amazon_ready: true,
    shipments_in_transit: true,
    research_no_decision: true,
    stale_tracking: true
  })
  const [widgetOrder, setWidgetOrder] = useState([
    'waiting_manufacturer_ops',
    'pos_not_amazon_ready',
    'shipments_in_transit',
    'research_no_decision',
    'stale_tracking'
  ])
  const [staleDays, setStaleDays] = useState(7)
  const [loadingPreferences, setLoadingPreferences] = useState(true)
  const [gtinCoverage, setGtinCoverage] = useState({ missingGtin: 0, availableCodes: 0 })
  const [loadingGtinCoverage, setLoadingGtinCoverage] = useState(true)
  const [posWaitingManufacturer, setPosWaitingManufacturer] = useState([])
  const [loadingWaitingManufacturer, setLoadingWaitingManufacturer] = useState(true)
  const [editLayout, setEditLayout] = useState(false)
  const [layout, setLayout] = useState([])
  const [gridWidth, setGridWidth] = useState(1200)

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
      // Prefetch Orders i ProjectDetailRoute (les més usades després del Dashboard)
      import('./Orders.jsx').catch(() => {})
      import('./ProjectDetailRoute.jsx').catch(() => {})
    }, 2000)

    return () => clearTimeout(idlePrefetchTimer)
  }, [])
  
  // Calculate grid width dynamically
  useEffect(() => {
    if (isMobile) return
    
    const calculateWidth = () => {
      const sidebarWidth = isTablet ? 72 : (sidebarCollapsed ? 72 : 260)
      const padding = 64 // 32px each side
      const width = Math.max(window.innerWidth - sidebarWidth - padding, 800)
      setGridWidth(width)
    }
    
    calculateWidth()
    window.addEventListener('resize', calculateWidth)
    return () => window.removeEventListener('resize', calculateWidth)
  }, [isMobile, isTablet, sidebarCollapsed])

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
      const orders = await getPurchaseOrders().catch(() => [])
      // Filtrar comandes que estan en curs (no cancel·lades ni completades)
      const inProgress = safeArray(orders).filter(order => 
        order?.status && !['cancelled', 'received'].includes(order.status)
      )
      setOrdersInProgress(inProgress.slice(0, 5)) // Mostrar les 5 primeres
    } catch (err) {
      console.error('Error carregant comandes:', err)
      setOrdersInProgress([])
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadPosNotReady = async () => {
    setLoadingPosNotReady(true)
    try {
      const notReady = await getPosNotReady(5).catch(() => [])
      setPosNotReady(safeArray(notReady))
    } catch (err) {
      console.error('Error carregant POs not ready:', err)
      setPosNotReady([])
    } finally {
      setLoadingPosNotReady(false)
    }
  }

  const loadPosWaitingManufacturer = async () => {
    setLoadingWaitingManufacturer(true)
    try {
      const waiting = await getPosWaitingManufacturer(5).catch(() => [])
      setPosWaitingManufacturer(safeArray(waiting))
    } catch (err) {
      console.error('Error carregant POs waiting manufacturer:', err)
      setPosWaitingManufacturer([])
    } finally {
      setLoadingWaitingManufacturer(false)
    }
  }

  const loadingPrefsRef = useRef(false)
  
  const loadDashboardPreferences = async () => {
    // Prevent multiple simultaneous loads
    if (loadingPrefsRef.current) return
    loadingPrefsRef.current = true
    
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
          activity_feed: prefs.widgets.activity_feed === true,
          // Daily Ops widgets
          waiting_manufacturer_ops: prefs.enabledWidgets?.waiting_manufacturer_ops !== false,
          pos_not_amazon_ready: prefs.enabledWidgets?.pos_not_amazon_ready !== false,
          shipments_in_transit: prefs.enabledWidgets?.shipments_in_transit !== false,
          research_no_decision: prefs.enabledWidgets?.research_no_decision !== false,
          stale_tracking: prefs.enabledWidgets?.stale_tracking !== false,
          tasks: prefs.widgets?.tasks !== false,
        })
      }
      if (prefs?.widgetOrder) {
        setWidgetOrder(prefs.widgetOrder)
      }
      if (prefs?.staleDays) {
        setStaleDays(prefs.staleDays)
      }
      
      // Load layout - only set if different to prevent re-renders
      if (prefs?.layout && validateLayout(prefs.layout)) {
        setLayout(prevLayout => {
          // Only update if layout actually changed
          const layoutStr = JSON.stringify(prevLayout)
          const prefsStr = JSON.stringify(prefs.layout)
          if (layoutStr === prefsStr) return prevLayout
          return prefs.layout
        })
      } else {
        // Generate default layout - use prefs values, not state
        const enabledWidgets = {
          waiting_manufacturer_ops: prefs?.enabledWidgets?.waiting_manufacturer_ops !== false,
          pos_not_amazon_ready: prefs?.enabledWidgets?.pos_not_amazon_ready !== false,
          shipments_in_transit: prefs?.enabledWidgets?.shipments_in_transit !== false,
          research_no_decision: prefs?.enabledWidgets?.research_no_decision !== false,
          stale_tracking: prefs?.enabledWidgets?.stale_tracking !== false,
          tasks: prefs?.widgets?.tasks !== false,
          sticky_notes: prefs?.widgets?.sticky_notes !== false
        }
        const defaultLayout = generateLayoutFromEnabled(enabledWidgets)
        setLayout(prevLayout => {
          const layoutStr = JSON.stringify(prevLayout)
          const defaultStr = JSON.stringify(defaultLayout)
          if (layoutStr === defaultStr) return prevLayout
          return defaultLayout
        })
      }
    } catch (err) {
      console.error('Error carregant preferències dashboard:', err)
    } finally {
      setLoadingPreferences(false)
      loadingPrefsRef.current = false
    }
  }
  
  // Debounce layout changes to prevent infinite loops
  const layoutChangeTimeoutRef = React.useRef(null)
  
  const handleLayoutChange = (newLayout) => {
    if (!editLayout) return
    
    // Clear previous timeout
    if (layoutChangeTimeoutRef.current) {
      clearTimeout(layoutChangeTimeoutRef.current)
    }
    
    // Debounce layout updates
    layoutChangeTimeoutRef.current = setTimeout(() => {
      // Snap to allowed sizes (1x1, 2x1, 2x2)
      const snappedLayout = newLayout.map(item => {
        // Snap width and height to allowed sizes
        const snapped = snapToAllowedSize(item.w, item.h)
        return {
          ...item,
          w: snapped.w,
          h: snapped.h
        }
      })
      setLayout(snappedLayout)
    }, 100) // 100ms debounce
  }
  
  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current)
      }
    }
  }, [])
  
  // Removed unused handleSaveLayout - using handleToggleEditMode instead
  
  const handleResetLayout = () => {
    const enabledWidgets = {
      waiting_manufacturer_ops: dashboardWidgets.waiting_manufacturer_ops !== false,
      pos_not_amazon_ready: dashboardWidgets.pos_not_amazon_ready !== false,
      shipments_in_transit: dashboardWidgets.shipments_in_transit !== false,
      research_no_decision: dashboardWidgets.research_no_decision !== false,
      stale_tracking: dashboardWidgets.stale_tracking !== false,
      tasks: dashboardWidgets.tasks !== false,
    }
    const defaultLayout = generateLayoutFromEnabled(enabledWidgets)
    setLayout(defaultLayout)
  }

  const handleToggleEditMode = async () => {
    if (editLayout) {
      // Si está en edit mode, guardar automáticamente y salir
      try {
        await updateDashboardPreferences({ layout })
        setEditLayout(false)
        showToast(t('dashboard.layoutSaved'), 'success')
      } catch (err) {
        console.error('Error guardant layout:', err)
        showToast(t('dashboard.layoutSaveError'), 'error')
      }
    } else {
      // Si no está en edit mode, entrar
      setEditLayout(true)
    }
  }

  const handlePreferencesSave = (newWidgets) => {
    setDashboardWidgets(newWidgets)
  }

  const loadFinancialData = async () => {
    try {
      // Get demo mode setting
      const { getDemoMode } = await import('../lib/demoModeFilter')
      const demoMode = await getDemoMode()
      
      const userId = await getCurrentUserId()
      const [expensesRes, incomesRes] = await Promise.all([
        supabase.from('expenses').select('amount, expense_date').eq('user_id', userId).eq('is_demo', demoMode).order('expense_date', { ascending: false }),
        supabase.from('incomes').select('amount, income_date').eq('user_id', userId).eq('is_demo', demoMode).order('income_date', { ascending: false })
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

  // Removed unused recentProjects

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
      partial_paid: { name: t('dashboard.partialPaid'), color: '#f59e0b' },
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
      {/* Edit Layout Controls - Only visible when editing, no duplicate topbar */}
      {editLayout && !isMobile && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px 32px',
          gap: '12px',
          backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
          borderBottom: `1px solid ${darkMode ? '#1f1f2e' : '#e5e7eb'}`
        }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleToggleEditMode}
            style={styles.iconButton}
            title={t('dashboard.done')}
          >
            <Check size={20} />
          </Button>
          
          {/* Reset Layout */}
          {editLayout && !isMobile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetLayout}
              style={styles.iconButton}
              title="Restaurar layout per defecte"
            >
              <X size={20} color="#ffffff" />
            </Button>
          )}
          
          {/* Personalitzar Dashboard - Using Sliders icon to avoid duplicate Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCustomizeModal(true)}
            style={styles.iconButton}
            title="Personalitzar Dashboard"
          >
            <Sliders size={20} color={darkMode ? '#9ca3af' : '#6b7280'} />
          </Button>
        </div>
      )}

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Edit Mode Badge */}
        {editLayout && !isMobile && (
          <div style={{
            ...styles.editModeBadge,
            backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6',
            borderColor: '#4f46e5',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            <Sliders size={14} color="#4f46e5" />
            <span>{t('dashboard.editMode')}</span>
          </div>
        )}
        
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects?showDiscarded=true')}
              style={{
                ...styles.discardedLink,
                color: '#4f46e5'
              }}
            >
              Veure →
            </Button>
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px', 
              padding: '20px',
              overflowX: 'visible'
            }}>
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
                  gridColumn: isMobile ? 'span 1' : 'span 2',
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
          <SafeWidget widgetName="Logistics Tracking" darkMode={darkMode}>
            <LogisticsTrackingWidget darkMode={darkMode} />
          </SafeWidget>
        )}

        {/* Comandes en curs */}
        {dashboardWidgets.orders_in_progress && (
        <SafeWidget widgetName="Orders In Progress" darkMode={darkMode}>
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
              {t('dashboard.ordersInProgress.title')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/orders')}
              style={styles.viewAllButton}
            >
              {t('dashboard.ordersInProgress.viewAll')} <ArrowRight size={16} />
            </Button>
          </div>

          {loadingOrders ? (
            <div style={styles.loading}>{t('dashboard.ordersInProgress.loading')}</div>
          ) : ordersInProgress.length === 0 ? (
            <div style={styles.empty}>
              <p>{t('dashboard.ordersInProgress.empty')}</p>
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
                        {order.project?.name || t('dashboard.noProject')}
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
        </SafeWidget>
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
              {t('dashboard.posNotReady.title')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/orders')}
              style={styles.viewAllButton}
            >
              {t('dashboard.posNotReady.viewAll')} <ArrowRight size={16} />
            </Button>
          </div>

          {loadingPosNotReady ? (
            <div style={styles.loading}>{t('dashboard.posNotReady.loading')}</div>
          ) : posNotReady.length === 0 ? (
            <div style={styles.empty}>
              <p>{t('dashboard.posNotReady.empty')}</p>
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
                      {po.projects?.name || t('dashboard.noProject')}
                    </span>
                  </div>
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: '#f59e0b15',
                    color: '#f59e0b'
                  }}>
                    {t('dashboard.posNotReady.missing')} {po.missingCount}
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
          <SafeWidget widgetName="Finance Chart" darkMode={darkMode}>
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
            <div style={{
              ...styles.chartContainer,
              overflowX: isMobile ? 'auto' : 'visible',
              width: '100%'
            }}>
              <div style={{
                ...styles.chartBars,
                minWidth: isMobile ? '400px' : 'auto'
              }}>
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
          </SafeWidget>
        )}

        {/* Daily Ops Widgets with Grid Layout (Desktop/Tablet) */}
        {!loadingPreferences && !isMobile && layout.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={60}
              width={gridWidth}
              isDraggable={editLayout}
              isResizable={editLayout}
              onLayoutChange={handleLayoutChange}
              compactType={null}
              preventCollision={false}
              resizeHandles={['se']}
              draggableHandle=".widget-drag-handle"
              style={{
                backgroundColor: 'transparent'
              }}
            >
              {layout.map(item => {
                const widgetId = item.i
                if (!dashboardWidgets[widgetId]) return null
                
                let widgetComponent = null
                switch (widgetId) {
                  case WIDGET_IDS.WAITING_MANUFACTURER:
                    widgetComponent = (
                      <WaitingManufacturerWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    )
                    break
                  case WIDGET_IDS.NOT_AMAZON_READY:
                    widgetComponent = (
                      <PosNotAmazonReadyWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    )
                    break
                  case WIDGET_IDS.SHIPMENTS_IN_TRANSIT:
                    widgetComponent = (
                      <ShipmentsInTransitWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    )
                    break
                  case WIDGET_IDS.RESEARCH_NO_DECISION:
                    widgetComponent = (
                      <ResearchNoDecisionWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    )
                    break
                  case WIDGET_IDS.STALE_TRACKING:
                    widgetComponent = (
                      <StaleTrackingWidget
                        darkMode={darkMode}
                        limit={10}
                        staleDays={staleDays}
                      />
                    )
                    break
                  case WIDGET_IDS.TASKS:
                    widgetComponent = (
                      <TasksWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    )
                    break
                  default:
                    return null
                }
                
                if (!widgetComponent) return null
                
                const widgetName = widgetId === WIDGET_IDS.WAITING_MANUFACTURER ? 'Waiting Manufacturer' :
                                  widgetId === WIDGET_IDS.NOT_AMAZON_READY ? 'POs Not Amazon Ready' :
                                  widgetId === WIDGET_IDS.SHIPMENTS_IN_TRANSIT ? 'Shipments In Transit' :
                                  widgetId === WIDGET_IDS.RESEARCH_NO_DECISION ? 'Research No Decision' :
                                  widgetId === WIDGET_IDS.STALE_TRACKING ? 'Stale Tracking' :
                                  widgetId === WIDGET_IDS.TASKS ? 'Tasks' : 'Widget'

                return (
                  <div key={item.i} style={{
                    backgroundColor: darkMode ? '#15151f' : '#ffffff',
                    borderRadius: '8px',
                    padding: '16px',
                    border: editLayout ? '2px dashed #4f46e5' : '1px solid',
                    borderColor: editLayout ? '#4f46e5' : (darkMode ? '#374151' : '#e5e7eb'),
                    height: '100%',
                    overflow: 'auto',
                    boxSizing: 'border-box',
                    position: 'relative',
                    cursor: editLayout ? 'move' : 'default'
                  }}>
                    {editLayout && (
                      <div 
                        className="widget-drag-handle"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#4f46e5',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 10
                        }}
                        title={t('dashboard.dragToMove')}
                      >
                        <Sliders size={14} color="#ffffff" />
                      </div>
                    )}
                    <SafeWidget widgetName={widgetName} darkMode={darkMode}>
                      {widgetComponent}
                    </SafeWidget>
                  </div>
                )
              })}
            </GridLayout>
          </div>
        )}
        
        {/* Mobile: Simple grid (no drag) */}
        {!loadingPreferences && isMobile && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            marginTop: '32px'
          }}>
            {widgetOrder.map(widgetId => {
              if (!dashboardWidgets[widgetId]) return null
              
              switch (widgetId) {
                case 'waiting_manufacturer_ops':
                  return (
                    <SafeWidget key={widgetId} widgetName="Waiting Manufacturer" darkMode={darkMode}>
                      <WaitingManufacturerWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    </SafeWidget>
                  )
                case 'pos_not_amazon_ready':
                  return (
                    <SafeWidget key={widgetId} widgetName="POs Not Amazon Ready" darkMode={darkMode}>
                      <PosNotAmazonReadyWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    </SafeWidget>
                  )
                case 'shipments_in_transit':
                  return (
                    <SafeWidget key={widgetId} widgetName="Shipments In Transit" darkMode={darkMode}>
                      <ShipmentsInTransitWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    </SafeWidget>
                  )
                case 'research_no_decision':
                  return (
                    <SafeWidget key={widgetId} widgetName="Research No Decision" darkMode={darkMode}>
                      <ResearchNoDecisionWidget
                        darkMode={darkMode}
                        limit={10}
                      />
                    </SafeWidget>
                  )
                case 'stale_tracking':
                  return (
                    <SafeWidget key={widgetId} widgetName="Stale Tracking" darkMode={darkMode}>
                      <StaleTrackingWidget
                        darkMode={darkMode}
                        limit={10}
                        staleDays={staleDays}
                      />
                    </SafeWidget>
                  )
                default:
                  return null
              }
            })}
            {dashboardWidgets.tasks && (
              <SafeWidget widgetName="Tasks" darkMode={darkMode}>
                <TasksWidget darkMode={darkMode} limit={10} />
              </SafeWidget>
            )}
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
  // Removed actionButton - duplicate actions removed
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
  editModeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
    transition: 'all 0.2s ease'
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
