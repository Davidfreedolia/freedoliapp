import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useBlockedProjects } from '../hooks/useBlockedProjects'
import { useOrgDashboardMode } from '../hooks/useOrgDashboardMode'
import useT from '../hooks/useT'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { 
  ArrowRight,
  Bell,
  Factory,
  FileText,
  Package,
  Plus,
  Rocket,
  Truck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getPurchaseOrders, getDashboardPreferences, getPosNotReady, getPosWaitingManufacturer, createOrGetTaskFromOrigin } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { computeProjectBusinessSnapshot } from '../lib/businessSnapshot'
import { computeProjectStockSignal } from '../lib/stockSignal'
import { computeCommercialGate } from '../lib/phaseGates'
import { buildProjectAlerts, ALERT_SEVERITY, scoreAlert } from '../lib/businessAlerts'
import NewProjectModal from '../components/NewProjectModal'
import CustomizeDashboardModal from '../components/CustomizeDashboardModal'
import {
  WaitingManufacturerWidget,
  PosNotAmazonReadyWidget,
  ShipmentsInTransitWidget,
  ResearchNoDecisionWidget,
  StaleTrackingWidget
} from '../components/DailyOpsWidgets'
import TasksWidget from '../components/TasksWidget'
import SafeWidget from '../components/SafeWidget'
import Button from '../components/Button'
import Card from '../components/ui/Card'
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
import { useHomeDashboardData } from '../hooks/useHomeDashboardData'
import HomeKpiCard from '../components/home/HomeKpiCard'
import HomeProfitTrend from '../components/home/HomeProfitTrend'
import HomeTopAsins from '../components/home/HomeTopAsins'
import { DataError } from '../components/dataStates'
import HomeReorderCandidates from '../components/home/HomeReorderCandidates'
import HomeTopDecisions from '../components/home/HomeTopDecisions'
import { isScreenshotMode } from '../lib/ui/screenshotMode'

const formatCurrency = (amount, currency = 'EUR') =>
  (amount != null && Number.isFinite(amount))
    ? new Intl.NumberFormat('ca-ES', { style: 'currency', currency }).format(amount)
    : '—'
const formatPercent = (ratio) =>
  (ratio != null && Number.isFinite(ratio))
    ? new Intl.NumberFormat('ca-ES', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio)
    : '—'

const FIRST_VALUE_KEY = 'freedoli_first_value_seen'

export default function Dashboard() {
  const { stats, darkMode, setDarkMode, sidebarCollapsed, activeOrgId } = useApp()
  const navigate = useNavigate()
  const { data: blockedProjects } = useBlockedProjects()
  const { t } = useTranslation()
  const tCommon = useT()
  const { loading: dashboardModeLoading, hasData: dashboardHasData } = useOrgDashboardMode(activeOrgId)
  const { isMobile, isTablet } = useBreakpoint()
  const { loading: homeDataLoading, error: homeDataError, data: homeData } = useHomeDashboardData()
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [unblockTaskProjectId, setUnblockTaskProjectId] = useState(null)
  const [ordersInProgress, setOrdersInProgress] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
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
  const [posWaitingManufacturer, setPosWaitingManufacturer] = useState([])
  const [loadingWaitingManufacturer, setLoadingWaitingManufacturer] = useState(true)
  const [editLayout, setEditLayout] = useState(false)
  const [layout, setLayout] = useState([])
  const [gridWidth, setGridWidth] = useState(1200)

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

  const [showFirstValueBanner, setShowFirstValueBanner] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isScreenshotMode()) return false
    try {
      return !localStorage.getItem(FIRST_VALUE_KEY)
    } catch {
      return true
    }
  })

  useEffect(() => {
    loadDashboardPreferences()
    loadOrdersInProgress()
    loadPosNotReady()
    loadPosWaitingManufacturer()

    // Prefetch rutes probables després de 2s idle (opcional)
    const idlePrefetchTimer = setTimeout(() => {
      import('./Orders.jsx').catch(() => {})
      import('./ProjectDetailRoute.jsx').catch(() => {})
    }, 2000)

    return () => clearTimeout(idlePrefetchTimer)
  }, [activeOrgId])

  useEffect(() => {
    execMountedRef.current = true
    return () => { execMountedRef.current = false }
  }, [])

  // Executive dashboard data (C4): bulk fetch + KPIs + risk + focus (projects org-scoped)
  useEffect(() => {
    let cancelled = false
    const seq = ++execLoadSeqRef.current
    setExecLoading(true)
    setExecError(null)
    ;(async () => {
      try {
        if (!activeOrgId) {
          if (execMountedRef.current && seq === execLoadSeqRef.current) {
            setExecData({
              kpis: { invested_total_all: 0, income_30d_all: 0, weighted_roi_pct: null, at_risk_count: 0 },
              risk: [],
              focus: [],
              alerts: { all: [], counts: { criticalCount: 0, warningCount: 0, infoCount: 0 } }
            })
          }
          setExecLoading(false)
          return
        }
        if (cancelled || !execMountedRef.current) return

        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('org_id', activeOrgId)
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
        // Stock source: inventory (org-scoped). project_stock has been removed.
        const stockTables = [
          { table: 'inventory', columns: 'project_id,quantity,qty,units,total_units' }
        ]
        for (const { table, columns } of stockTables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select(columns)
              .eq('org_id', activeOrgId)
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

        // sales: org-scoped only (org_id). Schema: project_id, units_sold, sale_date, created_at, net_revenue. No user_id/is_demo.
        let salesRowsByProject = {}
        if (activeOrgId) {
          try {
            const { data, error } = await supabase
              .from('sales')
              .select('project_id,units_sold,sale_date,created_at,net_revenue')
              .eq('org_id', activeOrgId)
              .in('project_id', ids)
              .gte('sale_date', thirtyDaysIso)
            if (error) {
              if (import.meta.env.DEV) console.error('[sales] load failed', error)
            } else if (data) {
              for (const r of data) {
                const pid = r.project_id
                if (!pid) continue
                if (!salesRowsByProject[pid]) salesRowsByProject[pid] = []
                salesRowsByProject[pid].push(r)
              }
            }
          } catch (e) {
            if (import.meta.env.DEV) console.error('[sales] load failed (exception)', e)
          }
        }

        const [poRes, expRes, incRes] = await Promise.all([
          supabase.from('purchase_orders').select('project_id,total_amount,items').eq('org_id', activeOrgId).in('project_id', ids),
          supabase.from('expenses').select('project_id,amount').in('project_id', ids),
          supabase.from('incomes').select('project_id,amount,created_at').in('project_id', ids).gte('created_at', thirtyDaysIso)
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
  }, [activeOrgId])

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

  const loadOrdersInProgress = async () => {
    setLoadingOrders(true)
    try {
      const orders = await getPurchaseOrders(null, activeOrgId ?? undefined).catch(() => [])
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
      const notReady = await getPosNotReady(5, activeOrgId).catch(() => [])
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
      const prefs = await getDashboardPreferences(activeOrgId ?? undefined)
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

  const handleCreateUnblockTask = async (project) => {
    if (!activeOrgId || !project?.id) return
    setUnblockTaskProjectId(project.id)
    try {
      const title = `Unblock: ${(project.name || 'Project').slice(0, 80)}`
      const { created } = await createOrGetTaskFromOrigin(
        activeOrgId,
        { source: 'gate', source_ref_type: 'project_gate', source_ref_id: `project:${project.id}` },
        { title, entity_type: 'project', entity_id: project.id }
      )
      showToast(created ? 'Task created.' : 'Task already exists.', 'success')
    } catch (err) {
      showToast(err?.message || 'Failed to create task', 'error')
    } finally {
      setUnblockTaskProjectId(null)
    }
  }

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

  return (
    <div style={styles.container} className="page-dashboard">
      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {showFirstValueBanner && (
          <div
            style={{
              marginBottom: 24,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--border-1)',
              background: darkMode ? '#0b1120' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--text-1)' }}>
              <strong>{t('dashboard.firstValue.title')}</strong>{' '}
              <span>{t('dashboard.firstValue.subtitle')}</span>
              <br />
              <span style={{ fontSize: 13, color: 'var(--muted-1)' }}>
                {t('dashboard.firstValue.checklist')}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                try {
                  localStorage.setItem(FIRST_VALUE_KEY, '1')
                } catch (_) {}
                setShowFirstValueBanner(false)
                navigate('/app/projects')
              }}
            >
              <Plus size={16} style={{ marginRight: 6 }} />
              {t('dashboard.firstValue.cta')}
            </Button>
          </div>
        )}
        {dashboardModeLoading && (
          <div className="dash-onboard-shell">
            <p className="dash-onboard-header__subtitle">{t('common.loading')}</p>
          </div>
        )}
        {!dashboardModeLoading && !dashboardHasData && (
          <div className="dash-onboard-shell">
            <header className="dash-onboard-header">
              <h1 className="dash-onboard-header__title">{t('dashboard.modeB.title')}</h1>
              <p className="dash-onboard-header__subtitle">{t('dashboard.modeB.subtitle')}</p>
            </header>
            <div className="dash-pipeline-grid">
              <div className="dash-onboard-header dash-onboard-cta-row">
                <Button variant="primary" size="lg" onClick={() => setShowNewProjectModal(true)}>
                  {tCommon('dashboard.modeB.cta.createProduct')}
                </Button>
              </div>
              {[
                { key: 'createProduct', title: tCommon('dashboard.pipeline.createProduct.title'), desc: tCommon('dashboard.pipeline.createProduct.desc'), href: '/app/projects', primary: true },
                { key: 'viability', title: tCommon('dashboard.pipeline.viability.title'), desc: tCommon('dashboard.pipeline.viability.desc'), href: '/app/projects' },
                { key: 'quotes', title: tCommon('dashboard.pipeline.quotes.title'), desc: tCommon('dashboard.pipeline.quotes.desc'), href: '/app/projects' },
                { key: 'samples', title: tCommon('dashboard.pipeline.samples.title'), desc: tCommon('dashboard.pipeline.samples.desc'), href: '/app/projects' },
                { key: 'po', title: tCommon('dashboard.pipeline.po.title'), desc: tCommon('dashboard.pipeline.po.desc'), href: '/app/orders' },
                { key: 'shipment', title: tCommon('dashboard.pipeline.shipment.title'), desc: tCommon('dashboard.pipeline.shipment.desc'), href: '/app/orders' },
                { key: 'amazon', title: tCommon('dashboard.pipeline.amazon.title'), desc: tCommon('dashboard.pipeline.amazon.desc'), href: '/app/projects' }
              ].map((step) => (
                <Card key={step.key} className="dash-pipeline-step">
                  <h2 className="dash-pipeline-step__title">{step.title}</h2>
                  <p className="dash-pipeline-step__desc">{step.desc}</p>
                  <Button variant={step.primary ? 'primary' : 'secondary'} size="sm" onClick={() => step.key === 'createProduct' ? setShowNewProjectModal(true) : navigate(step.href)}>
                    {step.key === 'createProduct' ? tCommon('common.buttons.createProduct') : tCommon('common.buttons.open')}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
        {!dashboardModeLoading && dashboardHasData && (
          <>
          {homeDataError && (
            <div style={{ marginBottom: 16 }}>
              <DataError message={homeDataError} />
            </div>
          )}

          {/* 1. Hero / Executive summary */}
          <section style={styles.homeSection} aria-label="Hero">
            <header style={styles.homeHeader}>
              <h1 style={styles.homeTitle}>{t('dashboard.modeA.title', 'Dashboard')}</h1>
              <p style={styles.homeSubtitle}>{t('dashboard.modeA.subtitle', 'Resum del teu negoci')}</p>
            </header>
            <div style={styles.homeRow} aria-label="KPI row">
              <HomeKpiCard
                title="Net profit (30d)"
                value={formatCurrency(homeData?.kpis?.netProfit30d)}
                loading={homeDataLoading}
              />
              <HomeKpiCard
                title="Revenue (30d)"
                value={formatCurrency(homeData?.kpis?.revenue30d)}
                loading={homeDataLoading}
              />
              <HomeKpiCard
                title="Margin (30d)"
                value={formatPercent(homeData?.kpis?.margin30d)}
                loading={homeDataLoading}
              />
              <HomeKpiCard
                title="Cash now"
                value={formatCurrency(homeData?.kpis?.cashNow)}
                loading={homeDataLoading}
              />
            </div>
            <div style={{ ...styles.homeRow, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <Button variant="primary" size="sm" onClick={() => setShowNewProjectModal(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />
                {tCommon('dashboard.modeB.cta.createProduct')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/app/orders')}>
                {t('dashboard.newPO', 'New PO')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/decisions')}>
                {t('dashboard.viewDecisionsInbox', 'View Decisions Inbox')}
              </Button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted-1)', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Active projects: {stats.activeProjects ?? 0}</span>
              {discardedCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/app/projects?showDiscarded=true')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-1)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Discarded: {discardedCount} →
                </button>
              )}
            </div>
          </section>

          {/* 2. Atenció immediata — una sola capa d'alerts + projectes bloquejats */}
          <section style={{ marginBottom: 24 }} aria-label="Atenció immediata">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              <Bell size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {t('dashboard.attentionTitle', 'Atenció immediata')}
            </h2>
            {execLoading && (
              <div style={{ padding: '12px 0', color: 'var(--muted-1)', fontSize: 14 }}>{t('common.loading')}</div>
            )}
            {execError && (
              <div style={{ padding: '12px 0', color: 'var(--danger-1)', fontSize: 14 }}>{execError || t('common.errorGeneric')}</div>
            )}
            {!execLoading && !execError && execData.alerts && (
              <div style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                {(execData.alerts.counts.criticalCount + execData.alerts.counts.warningCount + execData.alerts.counts.infoCount) === 0 ? (
                  <div style={{ padding: '8px 0', color: 'var(--muted-1)', fontSize: 13 }}>{t('dashboard.noAlerts', 'No alerts. You\'re unusually safe today.')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {execData.alerts.all
                      .filter(a => alertsFilter === 'all' || (alertsFilter === 'critical' && a.severity === 'critical') || (alertsFilter === 'warning' && a.severity === 'warning'))
                      .slice(0, 10)
                      .map((alert) => (
                        <div
                          key={alert.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 12px',
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
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {['all', 'critical', 'warning'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAlertsFilter(f)}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
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
              </div>
            )}
            {blockedProjects.length >= 1 && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>{t('dashboard.blockedProjects', 'Projectes bloquejats')}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {blockedProjects.slice(0, 5).map((p) => {
                    const ratio = p?.progress_ratio
                    const pct = ratio != null && Number.isFinite(ratio) ? Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : ratio))) : 0
                    const reason = (p?.blocked_reason ?? '').toString().trim()
                    return (
                      <li key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                          <Link to={`/app/projects/${p.id}`} style={{ fontWeight: 500, color: 'var(--text-1)', textDecoration: 'none', minWidth: 0, flex: '1 1 auto' }}>
                            {p.name || '—'}
                          </Link>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-1)', flexShrink: 0 }}>{pct}%</span>
                        </div>
                        {reason && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={reason}>{reason}</div>
                        )}
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleCreateUnblockTask(p) }}
                            disabled={unblockTaskProjectId === p.id}
                            style={{ fontSize: 11, padding: '4px 8px', border: '1px solid var(--border-1)', borderRadius: 6, background: 'var(--surface-bg-2)', color: 'var(--text-1)', cursor: unblockTaskProjectId === p.id ? 'wait' : 'pointer' }}
                          >
                            {unblockTaskProjectId === p.id ? '…' : t('dashboard.createUnblockTask', 'Create unblock task')}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {blockedProjects.length > 5 && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <Link to="/app/projects" style={{ color: 'var(--primary-1)', fontWeight: 500 }}>{t('dashboard.viewAllProjects', 'Veure tots a Projectes')}</Link>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Operativa del dia */}
          <section style={{ marginBottom: 24 }} aria-label="Operativa del dia">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              {t('dashboard.operativaTitle', 'Operativa del dia')}
            </h2>
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
          </section>

          {/* 4. Next actions */}
          <section style={{ marginBottom: 24 }} aria-label="Next actions">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              {t('dashboard.nextActionsTitle', 'Next actions')}
            </h2>
            <div style={styles.homeRow}>
              <HomeReorderCandidates reorder={homeData?.reorder} loading={homeDataLoading} />
              <HomeTopDecisions />
            </div>
          </section>

          {/* 5. Performance / portfolio snapshot */}
          <section style={{ marginBottom: 24 }} aria-label="Performance">
            <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              <TrendingUp size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {t('dashboard.performanceTitle', 'Performance')}
            </h2>
            <div style={styles.homeRow}>
              <HomeProfitTrend data={homeData?.performance?.profitTrend} loading={homeDataLoading} />
              <HomeTopAsins items={homeData?.performance?.topAsins} loading={homeDataLoading} />
            </div>
            {!execLoading && !execError && (execData.risk?.length > 0 || execData.focus?.length > 0) && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 'var(--radius-ui)',
                border: '1px solid var(--border-1)',
                background: 'var(--surface-bg-2)'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-1)', marginBottom: 8 }}>{t('dashboard.portfolioSnapshot', 'Portfolio snapshot')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {execData.risk.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>At risk ({execData.risk.length})</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
                        {execData.risk.slice(0, 3).map((row) => (
                          <li key={row.project.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-1)' }}>
                            <Link to={`/app/projects/${row.project.id}`} style={{ color: 'var(--text-1)' }}>{row.project.name}</Link>
                            {row.gate?.gateId && row.gate.gateId !== 'NONE' && (
                              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted-1)' }}>{row.gate.label}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {execData.focus.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted-1)', marginBottom: 4 }}>Scale focus ({execData.focus.length})</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13 }}>
                        {execData.focus.slice(0, 3).map((row) => (
                          <li key={row.project.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-1)' }}>
                            <Link to={`/app/projects/${row.project.id}`} style={{ color: 'var(--text-1)' }}>{row.project.name}</Link>
                            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--success-1)' }}>ROI {Math.round(row.business?.roi_percent ?? 0)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        {/* Daily Ops Widgets with Grid Layout (Desktop/Tablet) — hidden for P1.1 */}
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
          </>
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
  homeSection: {
    marginBottom: 'var(--s-6)',
    maxWidth: 1200,
  },
  homeHeader: {
    marginBottom: 'var(--s-6)',
  },
  homeTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    color: 'var(--text-1, #111827)',
    letterSpacing: '-0.02em',
  },
  homeSubtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: 'var(--text-2, #6b7280)',
  },
  homeRow: {
    display: 'flex',
    gap: 'var(--s-4)',
    flexWrap: 'wrap',
    marginBottom: 'var(--s-5)',
  },
  homeReorderSlot: {
    marginTop: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px dashed var(--border-color, #e5e7eb)',
    background: 'var(--card-bg, #f9fafb)',
  },
  homeReorderSlotText: {
    fontSize: 12,
    color: 'var(--text-2, #6b7280)',
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
