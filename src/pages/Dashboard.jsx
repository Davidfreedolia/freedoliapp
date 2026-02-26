import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useBlockedProjects } from '../hooks/useBlockedProjects'
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
  FileText,
  Factory,
  TrendingUp,
  LineChart,
  BarChart3,
  Table2,
  Sun,
  Moon,
  Bell,
  Rocket,
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
import { getDemoMode } from '../lib/demoModeFilter'
import { computeProjectBusinessSnapshot } from '../lib/businessSnapshot'
import { computeProjectStockSignal } from '../lib/stockSignal'
import { computeCommercialGate } from '../lib/phaseGates'
import { buildProjectAlerts, ALERT_SEVERITY, scoreAlert } from '../lib/businessAlerts'
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
import { getPhaseMeta } from '../utils/phaseStyles'
import PhaseMark from '../components/Phase/PhaseMark'
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
  const { data: blockedProjects } = useBlockedProjects()
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
  const [financeView, setFinanceView] = useState('bar')

  // Executive dashboard (C4)
  const [execLoading, setExecLoading] = useState(true)
  const [execError, setExecError] = useState(null)
  const [execData, setExecData] = useState({
    kpis: null,
    risk: [],
    focus: [],
    alerts: null
  })
  const [alertsFilter, setAlertsFilter] = useState('all')
  const execMountedRef = useRef(true)
  const execLoadSeqRef = useRef(0)

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

  useEffect(() => {
    execMountedRef.current = true
    return () => { execMountedRef.current = false }
  }, [])

  // Executive dashboard data (C4): bulk fetch + KPIs + risk + focus
  useEffect(() => {
    let cancelled = false
    const seq = ++execLoadSeqRef.current
    setExecLoading(true)
    setExecError(null)
    ;(async () => {
      try {
        const userId = await getCurrentUserId()
        const demoMode = await getDemoMode()
        if (cancelled || !execMountedRef.current) return

        const { data: projects } = await supabase
          .from('projects')
          .select('id,name,sku,phase,phase_id,current_phase,selling_price,amazon_price,price,marketplace_tags,created_at')
          .eq('user_id', userId)
          .eq('is_demo', demoMode)
          .order('created_at', { ascending: false })

        const ids = (projects || []).map(p => p.id).filter(Boolean)
        if (ids.length === 0) {
          if (execMountedRef.current && seq === execLoadSeqRef.current) {
            setExecData({
              kpis: { invested_total_all: 0, income_30d_all: 0, weighted_roi_pct: null, at_risk_count: 0 },
              risk: [],
              focus: [],
              alerts: { all: [], counts: { criticalCount: 0, warningCount: 0, infoCount: 0 } }
            })
            setExecLoading(false)
          }
          return
        }

        const thirtyDaysIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        let stockRowsByProject = {}
        const stockTables = [
          { table: 'inventory', columns: 'project_id,quantity,qty,units,total_units' },
          { table: 'project_stock', columns: 'project_id,quantity,qty,units,total_units' }
        ]
        for (const { table, columns } of stockTables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select(columns)
              .eq('user_id', userId)
              .eq('is_demo', demoMode)
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

        let salesRowsByProject = {}
        try {
          const { data, error } = await supabase
            .from('sales')
            .select('project_id,qty,quantity,units,created_at')
            .eq('user_id', userId)
            .eq('is_demo', demoMode)
            .in('project_id', ids)
            .gte('created_at', thirtyDaysIso)
          if (!error && data) {
            for (const r of data) {
              const pid = r.project_id
              if (!pid) continue
              if (!salesRowsByProject[pid]) salesRowsByProject[pid] = []
              salesRowsByProject[pid].push(r)
            }
          }
        } catch (_) {}

        const [poRes, expRes, incRes] = await Promise.all([
          supabase.from('purchase_orders').select('project_id,total_amount,items').eq('user_id', userId).eq('is_demo', demoMode).in('project_id', ids),
          supabase.from('expenses').select('project_id,amount').eq('user_id', userId).eq('is_demo', demoMode).in('project_id', ids),
          supabase.from('incomes').select('project_id,amount,created_at').eq('user_id', userId).eq('is_demo', demoMode).in('project_id', ids).gte('created_at', thirtyDaysIso)
        ])

        if (cancelled || !execMountedRef.current || seq !== execLoadSeqRef.current) return

        const poById = {}
        const expById = {}
        const incById = {}
        ;(poRes.data || []).forEach(r => { const id = r.project_id; if (id) { if (!poById[id]) poById[id] = []; poById[id].push(r) } })
        ;(expRes.data || []).forEach(r => { const id = r.project_id; if (id) { if (!expById[id]) expById[id] = []; expById[id].push(r) } })
        ;(incRes.data || []).forEach(r => { const id = r.project_id; if (id) { if (!incById[id]) incById[id] = []; incById[id].push(r) } })

        const rows = []
        for (const project of projects || []) {
          if (!project.id) continue
          const id = project.id
          const business = computeProjectBusinessSnapshot({
            project,
            poRows: poById[id] || [],
            expenseRows: expById[id] || [],
            incomeRows: incById[id] || []
          })
          const stock = computeProjectStockSignal({
            project,
            stockRows: stockRowsByProject[id] || [],
            salesRows: salesRowsByProject[id] || [],
            poRows: poById[id] || []
          })
          const phaseId = project.phase ?? project.phase_id ?? project.current_phase
          const gate = computeCommercialGate({ phaseId, businessSnapshot: business, stockSnapshot: stock })
          rows.push({ project, business, stock, gate })
        }

        const invested_total_all = rows.reduce((s, r) => s + (r.business?.invested_total || 0), 0)
        const income_30d_all = rows.reduce((s, r) => s + (r.business?.incomes_total || 0), 0)
        const denom = invested_total_all
        const weighted_roi_pct = denom > 0 ? ((income_30d_all - invested_total_all) / denom) * 100 : null
        const at_risk_count = rows.filter(r => {
          const g = r.gate
          const st = r.stock
          if (g && (g.status === 'blocked' || g.status === 'warning')) return true
          if (st && (st.badgeTextPrimary === 'SENSE STOCK' || st.badgeTextPrimary === 'CRÍTIC')) return true
          return false
        }).length

        const kpis = { invested_total_all, income_30d_all, weighted_roi_pct, at_risk_count }

        const riskScore = (row) => {
          let s = 0
          if (row.gate?.status === 'blocked') s += 100
          if (row.gate?.status === 'warning') s += 60
          if (row.stock?.badgeTextPrimary === 'SENSE STOCK') s += 90
          if (row.stock?.badgeTextPrimary === 'CRÍTIC') s += 70
          if (row.stock?.badgeTextPrimary === 'MIG STOCK') s += 40
          if (row.business?.roi_percent != null && row.business.roi_percent < 0) s += 50
          if (row.business?.roi_percent == null) s += 10
          return s
        }
        const risk = rows
          .map(r => ({ ...r, riskScore: riskScore(r) }))
          .filter(r => r.riskScore > 0)
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 10)

        const focus = rows
          .filter(r => r.gate?.status === 'ok' && r.business?.roi_percent != null && r.business.roi_percent >= 25 && (r.stock?.tone === 'success' || r.stock?.badgeTextPrimary === 'STOCK OK'))
          .sort((a, b) => (b.business?.roi_percent ?? 0) - (a.business?.roi_percent ?? 0) || (b.business?.invested_total ?? 0) - (a.business?.invested_total ?? 0))
          .slice(0, 5)

        const allAlerts = rows.flatMap(r => buildProjectAlerts({
          project: r.project,
          business: r.business,
          stock: r.stock,
          gate: r.gate
        }))
        const sortedAlerts = [...allAlerts].sort((a, b) => scoreAlert(b) - scoreAlert(a)).slice(0, 20)
        const criticalCount = allAlerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL).length
        const warningCount = allAlerts.filter(a => a.severity === ALERT_SEVERITY.WARNING).length
        const infoCount = allAlerts.filter(a => a.severity === ALERT_SEVERITY.INFO).length
        const alerts = { all: sortedAlerts, counts: { criticalCount, warningCount, infoCount } }

        if (execMountedRef.current && seq === execLoadSeqRef.current) {
          setExecData({ kpis, risk, focus, alerts })
        }
      } catch (err) {
        console.error('Executive dashboard load error:', err)
        if (execMountedRef.current && seq === execLoadSeqRef.current) {
          setExecError(err?.message || 'Error carregant dashboard executiu')
        }
      } finally {
        if (execMountedRef.current && seq === execLoadSeqRef.current) {
          setExecLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
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

  const totalProjects = stats.totalProjects || 0
  const activeProjects = stats.activeProjects || 0
  const completedProjects = stats.completedProjects || 0
  const pendingProjects = Math.max(totalProjects - completedProjects - activeProjects, 0)
  const safeTotal = totalProjects > 0 ? totalProjects : 1

  const statCards = [
    {
      label: 'Total Projectes',
      value: totalProjects,
      icon: FolderKanban,
      iconClass: 'dash-stat-icon--projects',
      ringClass: 'dash-ring--projects',
      ringType: 'total'
    },
    {
      label: 'Actius',
      value: activeProjects,
      icon: PlayCircle,
      iconClass: 'dash-stat-icon--active',
      ringClass: 'dash-ring--active',
      ringType: 'active'
    },
    {
      label: 'Completats',
      value: completedProjects,
      icon: CheckCircle2,
      iconClass: 'dash-stat-icon--done',
      ringClass: 'dash-ring--done',
      ringType: 'done'
    },
    {
      label: 'Invertit',
      value: `${stats.totalInvested.toLocaleString('ca-ES', { minimumFractionDigits: 2 })} €`,
      icon: Wallet,
      iconClass: 'dash-stat-icon--money',
      ringClass: 'dash-ring--money',
      ringType: 'money'
    }
  ]
  
  // Contador de projectes descartats (clicable)
  const discardedCount = stats.discardedProjects || 0

  const getOrderStatusInfo = (status) => {
    const statuses = {
      draft: { name: 'Esborrany', pillClass: 'pill--warn' },
      sent: { name: 'Enviat', pillClass: 'pill--warn' },
      confirmed: { name: 'Confirmat', pillClass: 'pill--warn' },
      partial_paid: { name: t('dashboard.partialPaid'), pillClass: 'pill--warn' },
      paid: { name: 'Pagat', pillClass: 'pill--ok' },
      in_production: { name: 'En producció', pillClass: 'pill--warn' },
      shipped: { name: 'Enviat', pillClass: 'pill--ok' },
      received: { name: 'Rebut', pillClass: 'pill--ok' },
      cancelled: { name: 'Cancel·lat', pillClass: 'pill--danger' }
    }
    return statuses[status] || statuses.draft
  }


  // Gràfica de finances senzilla
  const maxValue = financialData.length > 0
    ? Math.max(...financialData.map(d => Math.max(d.income, d.expenses)), 1)
    : 1

  return (
    <div style={styles.container} className="page-dashboard">
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
            variant="secondary"
            size="sm"
            onClick={() => setShowCustomizeModal(true)}
            style={styles.iconButton}
            title="Personalitzar Dashboard"
          >
            <Sliders size={20} color="var(--text-1)" />
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
            borderColor: 'var(--brand-primary)',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            <Sliders size={14} color="var(--brand-primary)" />
            <span>{t('dashboard.editMode')}</span>
          </div>
        )}

        {/* Requereix atenció — Projectes bloquejats */}
        {blockedProjects.length >= 1 && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 'var(--radius-ui)',
            border: '1px solid var(--border-1)',
            background: 'var(--surface-bg-2)'
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: 'var(--text-1)' }}>Requereix atenció</div>
            <div style={{ fontSize: 12, color: 'var(--muted-1)', marginBottom: 10 }}>Projectes bloquejats</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {blockedProjects.slice(0, 5).map((p) => {
                const ratio = p?.progress_ratio
                const pct = ratio != null && Number.isFinite(ratio)
                  ? Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : ratio)))
                  : 0
                const reason = (p?.blocked_reason ?? '').toString().trim()
                return (
                  <li key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                      <Link to={`/app/projects/${p.id}`} style={{ fontWeight: 500, color: 'var(--text-1)', textDecoration: 'none', minWidth: 0, flex: '1 1 auto' }}>
                        {p.name || '—'}
                      </Link>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-1)', flexShrink: 0 }}>{pct}%</span>
                    </div>
                    {reason ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={reason}
                      >
                        {reason}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {blockedProjects.length > 5 && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <Link to="/app/projects" style={{ color: 'var(--primary-1)', fontWeight: 500 }}>Veure tots a Projectes</Link>
              </div>
            )}
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="dash-top-row" style={styles.statsGrid}>
          {statCards.map((stat, index) => {
            const ringStyle = stat.ringType === 'total'
              ? {
                  '--a': `${activeProjects / safeTotal}turn`,
                  '--d': `${completedProjects / safeTotal}turn`,
                  '--p': `${pendingProjects / safeTotal}turn`
                }
              : {
                  '--p': `${stat.ringType === 'active'
                    ? activeProjects / safeTotal
                    : stat.ringType === 'done'
                      ? completedProjects / safeTotal
                      : 0.6}turn`
                }

            return (
              <div
                key={index}
                className={`dash-stat-card ${darkMode ? 'dash-stat-card--dark' : 'dash-stat-card--light'}`}
              >
                <div className={`dash-stat-icon ${stat.iconClass || ''}`.trim()}>
                  <stat.icon size={18} />
                </div>
                <div className="dash-stat-info" style={styles.statInfo}>
                  <span className="dash-stat-value">{stat.value}</span>
                  <span className="dash-stat-label">{stat.label}</span>
                </div>
                <div
                  className={`dash-ring ${stat.ringClass || ''} ${stat.ringType === 'total' ? 'dash-ring--total' : ''}`.trim()}
                  style={ringStyle}
                  aria-hidden="true"
                />
              </div>
            )
          })}
          {!loadingGtinCoverage && (
            <>
              <div className={`dash-stat-card ${darkMode ? 'dash-stat-card--dark' : 'dash-stat-card--light'}`}>
                <div className="dash-stat-icon dash-stat-icon--barcode">
                  <Barcode size={18} />
                </div>
                <div className="dash-stat-info" style={styles.statInfo}>
                  <span className="dash-stat-value">{gtinCoverage.missingGtin}</span>
                  <span className="dash-stat-label">SKUs sense GTIN</span>
                </div>
              </div>
              <div className={`dash-stat-card ${darkMode ? 'dash-stat-card--dark' : 'dash-stat-card--light'}`}>
                <div className="dash-stat-icon dash-stat-icon--barcode">
                  <Barcode size={18} />
                </div>
                <div className="dash-stat-info" style={styles.statInfo}>
                  <span className="dash-stat-value">{gtinCoverage.availableCodes}</span>
                  <span className="dash-stat-label">Codis al pool</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Discarded Projects Counter */}
        {discardedCount > 0 && (
          <div style={{
            ...styles.discardedCounter,
            backgroundColor: darkMode ? '#15151f' : '#ffffff',
            borderColor: darkMode ? '#374151' : '#e5e7eb'
          }}>
            <AlertTriangle size={16} color="var(--muted-1)" />
            <span style={{
              fontSize: '13px',
              color: 'var(--muted-1)'
            }}>
              Projectes descartats: {discardedCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/projects?showDiscarded=true')}
              className="dashboard-view-all"
            >
              Veure →
            </Button>
          </div>
        )}

        {/* Dashboard tagline (C6) */}
        <p style={{ margin: '0 0 12px 0', fontSize: 14, opacity: 0.85, color: 'var(--muted-1)' }}>
          Operational control for your Amazon business.
        </p>

        {/* Executive dashboard (C4): KPI row + Risk Radar + Money Focus */}
        {execLoading && (
          <div style={{ padding: '16px 0', color: 'var(--muted-1)', fontSize: 14 }}>Loading executive dashboard…</div>
        )}
        {execError && (
          <div style={{ padding: '16px 0', color: 'var(--danger-1)', fontSize: 14 }}>{execError}</div>
        )}
        {!execLoading && !execError && execData.kpis != null && (
          <>
            {totalProjects === 0 && (
              <div style={{
                padding: '16px',
                marginBottom: 16,
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)',
                color: 'var(--muted-1)',
                fontSize: 14
              }}>
                No active projects yet. Create your first project to start tracking ROI, stock and gates.
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: 12,
                flex: 1,
                minWidth: 0
              }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>Invested</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>€{(execData.kpis.invested_total_all || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>Income (30d)</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>€{(execData.kpis.income_30d_all || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>ROI weighted</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{execData.kpis.weighted_roi_pct != null ? `${execData.kpis.weighted_roi_pct.toFixed(1)}%` : '—'}</div>
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>At risk</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{execData.kpis.at_risk_count ?? 0}</div>
              </div>
              </div>
              {/* Quick Actions (C6) */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" onClick={() => navigate('/app/projects')}>New Project</Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/orders')}>New PO</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/app/settings')}>Settings</Button>
              </div>
            </div>

            {/* Alerts Panel (C5) */}
            {execData.alerts && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    <Bell size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Alerts
                  </h2>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--danger-1)', color: '#fff', fontWeight: 600 }}>Critical: {execData.alerts.counts.criticalCount}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--warning-1)', color: '#fff', fontWeight: 600 }}>Warning: {execData.alerts.counts.warningCount}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--muted-1)', color: 'var(--surface-bg)', fontWeight: 600 }}>Info: {execData.alerts.counts.infoCount}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {['all', 'critical', 'warning'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAlertsFilter(f)}
                      style={{
                        fontSize: 12,
                        padding: '6px 12px',
                        border: '1px solid var(--border-1)',
                        borderRadius: 'var(--radius-ui)',
                        background: alertsFilter === f ? 'var(--surface-bg)' : 'transparent',
                        color: alertsFilter === f ? 'var(--text-1)' : 'var(--muted-1)',
                        cursor: 'pointer',
                        fontWeight: alertsFilter === f ? 600 : 400
                      }}
                    >
                      {f === 'all' ? 'All' : f === 'critical' ? 'Critical' : 'Warning'}
                    </button>
                  ))}
                </div>
                {execData.alerts.counts.criticalCount === 0 && execData.alerts.counts.warningCount === 0 && execData.alerts.counts.infoCount === 0 ? (
                  <div style={{ padding: '16px 0', color: 'var(--muted-1)', fontSize: 13 }}>No alerts. You're unusually safe today.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {execData.alerts.all
                      .filter(a => alertsFilter === 'all' || (alertsFilter === 'critical' && a.severity === 'critical') || (alertsFilter === 'warning' && a.severity === 'warning'))
                      .map((alert) => (
                        <div
                          key={alert.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            border: '1px solid var(--border-1)',
                            borderRadius: 'var(--radius-ui)',
                            background: 'var(--surface-bg)'
                          }}
                        >
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: alert.tone === 'danger' ? 'var(--danger-1)' : alert.tone === 'warn' ? 'var(--warning-1)' : 'var(--muted-1)',
                            border: `1px solid ${alert.tone === 'danger' ? 'var(--danger-1)' : alert.tone === 'warn' ? 'var(--warning-1)' : 'var(--muted-1)'}`
                          }}>
                            {alert.severity}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.title}</div>
                            {alert.detail && <div style={{ fontSize: 12, color: 'var(--muted-1)', marginTop: 2 }}>{alert.detail}</div>}
                          </div>
                          <Link to={alert.action.href} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{alert.action.label}</Link>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div style={{
              ...styles.section,
              backgroundColor: darkMode ? '#15151f' : '#ffffff',
              marginBottom: 16
            }}>
              <h2 style={{ ...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827', marginBottom: 12 }}>
                <AlertTriangle size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Risk Radar
              </h2>
              {execData.risk.length === 0 ? (
                <div style={styles.empty}><p>No risks detected.</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Project</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Gate</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>ROI</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {execData.risk.map((row) => (
                        <tr key={row.project.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <Link to={`/projects/${row.project.id}`} style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                              {row.project.name}{row.project.sku ? ` · ${row.project.sku}` : ''}
                            </Link>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {row.gate.gateId !== 'NONE' && (
                              <span style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                border: '1px solid var(--border-1)',
                                background: 'var(--surface-bg-2)',
                                borderRadius: 999,
                                color: row.gate.tone === 'success' ? 'var(--success-1)' : row.gate.tone === 'warn' ? 'var(--warning-1)' : row.gate.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)',
                                fontWeight: 600
                              }}>
                                {row.gate.gateId === 'PRODUCTION' ? 'PROD' : row.gate.gateId === 'LISTING' ? 'LIST' : 'LIVE'}: {row.gate.label}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {row.business && (
                              <span style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                border: '1px solid var(--border-1)',
                                background: 'var(--surface-bg-2)',
                                borderRadius: 999,
                                color: row.business.badge?.tone === 'success' ? 'var(--success-1)' : row.business.badge?.tone === 'warn' ? 'var(--warning-1)' : row.business.badge?.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)',
                                fontWeight: 600
                              }}>
                                {row.business.roi_percent != null ? `ROI ${Math.round(row.business.roi_percent)}%` : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {row.stock && (
                              <span style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                border: '1px solid var(--border-1)',
                                background: 'var(--surface-bg-2)',
                                borderRadius: 999,
                                color: row.stock.tone === 'success' ? 'var(--success-1)' : row.stock.tone === 'warn' ? 'var(--warning-1)' : row.stock.tone === 'danger' ? 'var(--danger-1)' : 'var(--muted-1)',
                                fontWeight: 600
                              }}>
                                {row.stock.badgeTextPrimary}
                                {row.stock.badgeTextSecondary && row.stock.badgeTextSecondary !== '—' ? ` · ${row.stock.badgeTextSecondary}` : ''}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{
              ...styles.section,
              backgroundColor: darkMode ? '#15151f' : '#ffffff',
              marginBottom: 16
            }}>
              <h2 style={{ ...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827', marginBottom: 12 }}>
                <TrendingUp size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Money Focus
              </h2>
              {execData.focus.length === 0 ? (
                <div style={styles.empty}><p>No scale-ready projects yet.</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Project</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>ROI</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Stock</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px' }}>Invested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {execData.focus.map((row) => (
                        <tr key={row.project.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <Link to={`/projects/${row.project.id}`} style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                              {row.project.name}{row.project.sku ? ` · ${row.project.sku}` : ''}
                            </Link>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              fontSize: 11,
                              padding: '4px 8px',
                              border: '1px solid var(--border-1)',
                              background: 'var(--surface-bg-2)',
                              borderRadius: 999,
                              color: 'var(--success-1)',
                              fontWeight: 600
                            }}>
                              ROI {Math.round(row.business?.roi_percent ?? 0)}%
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>{row.stock?.badgeTextPrimary ?? '—'}</td>
                          <td style={{ padding: '8px 12px' }}>€{(row.business?.invested_total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Comandes en curs + Tracking Logístic */}
        {dashboardWidgets.orders_in_progress && (
          <SafeWidget widgetName="Orders In Progress" darkMode={darkMode}>
            <div
              className="dash-merged-widget"
              style={{
                ...styles.section,
                backgroundColor: darkMode ? '#15151f' : '#ffffff'
              }}
            >
              <div style={styles.sectionHeader}>
                <h2 style={{
                  ...styles.sectionTitle,
                  color: darkMode ? '#ffffff' : '#111827'
                }}>
                  <Package size={20} className="dash-widget-icon--orders" />
                  {t('dashboard.ordersInProgress.title')}
                </h2>
            <Button
              variant="secondary"
                  size="sm"
                  onClick={() => navigate('/app/orders')}
              className="dashboard-view-all"
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
                    const projectName = order.project?.name || order.project_name || t('dashboard.noProject')
                    const thumbnailUrl = order.asin_image_url || order.image_url
                    const phaseId = order?.phase_id ?? order?.phaseId ?? order?.current_phase ?? 1
                    const phaseMeta = getPhaseMeta(phaseId)
                    const progressPct = typeof order?.progress === 'number'
                      ? Math.max(0, Math.min(100, order.progress))
                      : Math.max(0, Math.min(100, ((phaseId - 1) / 6) * 100))

                    return (
                      <div
                        key={order.id}
                        data-order-id={order.id}
                        data-phase-id={phaseId}
                        style={styles.orderItem}
                      >
                        <div style={styles.orderInfo}>
                          <div className="dashboard-order-row">
                            <div className="order-thumb">
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={projectName}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="order-thumb__placeholder" aria-hidden />
                              )}
                            </div>
                            <div className="order-content">
                              <div style={{ marginBottom: 6 }}>
                                <PhaseMark phaseId={phaseId} size={16} />
                              </div>
                              <button
                                type="button"
                                className="dashboard-link"
                                onClick={() => navigate(`/app/projects/${order.project_id}`)}
                              >
                                [{order.project?.project_code || 'PR'}] {order.project?.name || t('dashboard.noProject')}
                              </button>
                              <button
                                type="button"
                                className="dashboard-link"
                                onClick={() => navigate(`/app/orders/${order.id}`)}
                              >
                                {order.po_number}
                              </button>
                            </div>
                          </div>
                          <div className="order-timeline">
                            {[
                              { key: 'project', Icon: Package },
                              { key: 'po', Icon: FileText },
                              { key: 'production', Icon: Factory },
                              { key: 'shipping', Icon: Truck },
                              { key: 'launch', Icon: Rocket },
                            ].map((step, idx) => {
                              const status =
                                idx < order.current_step_index
                                  ? 'is-done'
                                  : idx === order.current_step_index
                                  ? 'is-current'
                                  : 'is-pending'

                              return (
                                <span
                                  key={step.key}
                                  className={`order-step ${status}`}
                                  title={step.key}
                                >
                                  <step.Icon className="order-step__icon" style={{ color: phaseMeta.color }} />
                                </span>
                              )
                            })}
                          </div>
                          <div className="dash-progress__track" data-progress-track="true">
                            <div
                              className="dash-progress__fill"
                              data-progress-fill="true"
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: phaseMeta.color
                              }}
                            />
                          </div>
                        </div>
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
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/orders')}
              className="dashboard-view-all"
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
                  style={{
                    ...styles.orderItem,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '8px'
                  }}
                >
                  <div className="dashboard-order-row">
                    <button
                      type="button"
                      className="dashboard-link"
                      onClick={() => navigate(`/app/projects/${po.project_id || po.projects?.id || ''}`)}
                    >
                      [{po.projects?.project_code || 'PR'}] {po.projects?.name || t('dashboard.noProject')}
                    </button>
                    <button
                      type="button"
                      className="dashboard-link"
                      onClick={() => navigate(`/app/orders/${po.id}`)}
                    >
                      {po.po_number}
                    </button>
                  </div>
                  <div className="po-checklist">
                    <span className="fd-badge fd-badge--neutral">Etiquetatge</span>
                    <span className="fd-badge fd-badge--neutral">Packaging</span>
                    <span className="fd-badge fd-badge--neutral">FNSKU</span>
                    <span className="fd-badge fd-badge--neutral">Cartons</span>
                  </div>
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
              <div className="finance-toggle">
                <Button
                  variant={financeView === 'line' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFinanceView('line')}
                >
                  <LineChart size={16} />
                </Button>
                <Button
                  variant={financeView === 'bar' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFinanceView('bar')}
                >
                  <BarChart3 size={16} />
                </Button>
                <Button
                  variant={financeView === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFinanceView('table')}
                >
                  <Table2 size={16} />
                </Button>
              </div>
            </div>
            {financeView === 'bar' ? (
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
                          backgroundColor: 'var(--brand-green)'
                        }} />
                        <div style={{
                          ...styles.bar,
                          height: `${(data.expenses / maxValue) * 100}%`,
                          backgroundColor: 'var(--brand-primary)',
                          marginTop: '4px'
                        }} />
                      </div>
                      <div style={styles.barLabel}>
                        {new Date(data.month + '-01').toLocaleDateString('ca-ES', { month: 'short', year: '2-digit' })}
                      </div>
                      <div style={styles.barValues}>
                        <span style={{ color: 'var(--brand-green)', fontSize: '11px' }}>
                          +{data.income.toLocaleString('ca-ES', { maximumFractionDigits: 0 })}€
                        </span>
                        <span style={{ color: 'var(--brand-primary)', fontSize: '11px' }}>
                          -{data.expenses.toLocaleString('ca-ES', { maximumFractionDigits: 0 })}€
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={styles.chartLegend}>
                  <div style={styles.legendItem}>
                    <div style={{ ...styles.legendColor, backgroundColor: 'var(--brand-green)' }} />
                    <span>Ingressos</span>
                  </div>
                  <div style={styles.legendItem}>
                    <div style={{ ...styles.legendColor, backgroundColor: 'var(--brand-primary)' }} />
                    <span>Despeses</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="finance-placeholder">Coming soon</div>
            )}
          </div>
          </SafeWidget>
        )}

        {/* Daily Ops Widgets with Grid Layout (Desktop/Tablet) */}
        {false && (
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
                    border: editLayout ? '2px dashed var(--brand-primary)' : '1px solid',
                    borderColor: editLayout ? 'var(--brand-primary)' : (darkMode ? '#374151' : '#e5e7eb'),
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
                          backgroundColor: 'var(--brand-primary)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'move',
                          zIndex: 10
                        }}
                        title={t('dashboard.dragToMove')}
                      >
                        <Sliders size={14} color="var(--surface-1)" />
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
        {false && (
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
  statInfo: {
    display: 'flex',
    flexDirection: 'column'
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
    color: 'var(--muted-1)',
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
    color: 'var(--muted-1)'
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px'
  }
}
