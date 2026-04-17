import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import React, { Suspense, useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext'
import { useTranslation } from 'react-i18next'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import ToastContainer from './components/Toast'
import DemoModeBanner from './components/DemoModeBanner'
import ErrorBoundary from './components/ErrorBoundary'
import FloatingNotesLayer from './components/FloatingNotesLayer'
import HelpAssistant from './components/assistant/HelpAssistant'
import TopNavbar from './components/TopNavbar'
import BillingBanner from './components/billing/BillingBanner'
import WorkspaceLimitAlert from './components/billing/WorkspaceLimitAlert'
import MarginCompressionAlertStrip from './components/profit/MarginCompressionAlertStrip'
import StockoutAlertStrip from './components/inventory/StockoutAlertStrip'
import { useBreakpoint } from './hooks/useBreakpoint'
import { useWorkspaceUsage } from './hooks/useWorkspaceUsage'
import { useOrgBilling } from './hooks/useOrgBilling'
import { createStripeCheckoutSession } from './lib/billingApi'
import { isDemoMode } from './demo/demoMode'
import { isScreenshotMode } from './lib/ui/screenshotMode'
import { isSeatLimitDisabled } from './lib/featureFlags'
import { supabase } from './lib/supabase'
import { useOnboardingStatus } from './hooks/useOnboardingStatus'
import i18n from './i18n'

function RedirectToApp() {
  const { pathname } = useLocation()
  return <Navigate to={`/app${pathname}`} replace />
}

/** Inside /app/* when no route matches (avoids redirect loop to /app). */
function NotFoundInApp() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div className="layout-fullstate">
      <div className="layout-fullstate__card">
        <h2 className="layout-fullstate__title">{t('shell.notFoundTitle')}</h2>
        <p className="layout-fullstate__message"><code>{location.pathname}</code></p>
        <div className="layout-fullstate__actions">
          <button type="button" className="data-state__action" onClick={() => navigate('/app')}>
            {t('shell.notFoundBack')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Login, Landing, Activation (no lazy)
import Login from './pages/Login'
import Landing from './pages/Landing'
import AmazonFbaDashboard from './pages/seo/AmazonFbaDashboard'
import PurchaseOrderManagement from './pages/seo/PurchaseOrderManagement'
import SupplierManagementSystem from './pages/seo/SupplierManagementSystem'
import ActivationWizard from './pages/ActivationWizard'
import Trial from './pages/Trial'
import LegalIndex from './pages/legal/LegalIndex'
import Privacy from './pages/legal/Privacy'
import Terms from './pages/legal/Terms'
import Cookies from './pages/legal/Cookies'
import DPA from './pages/legal/DPA'
import CookieBanner from './components/legal/CookieBanner'

// Lazy loading wrapper with error handling
const lazyWithErrorBoundary = (importFn, pageName) => {
  return React.lazy(() =>
    importFn().catch((error) => {
      console.error(`Error loading ${pageName}:`, error)
      return {
        default: function LazyChunkErrorFallback() {
          return (
            <ErrorBoundary context={`lazy:${pageName}`} darkMode={false}>
              <LayoutStateScreen
                title={i18n.t('shell.lazyLoadTitle')}
                message={i18n.t('shell.lazyLoadMessage', { page: pageName })}
                actions={(
                  <button type="button" className="data-state__action" onClick={() => window.location.reload()}>
                    {i18n.t('shell.reload')}
                  </button>
                )}
              />
            </ErrorBoundary>
          )
        },
      }
    })
  )
}

// Pàgines principals: lazy loading amb error handling
const Dashboard = lazyWithErrorBoundary(() => import('./pages/Dashboard'), 'Dashboard')
const Projects = lazyWithErrorBoundary(() => import('./pages/Projects'), 'Projects')
const ProjectDetailRoute = lazyWithErrorBoundary(() => import('./pages/ProjectDetailRoute'), 'ProjectDetailRoute')
const Orders = lazyWithErrorBoundary(() => import('./pages/Orders'), 'Orders')
const Briefing = lazyWithErrorBoundary(() => import('./pages/Briefing'), 'Briefing')
const Finances = lazyWithErrorBoundary(() => import('./pages/Finances'), 'Finances')
const FinanceExports = lazyWithErrorBoundary(() => import('./pages/FinanceExports'), 'FinanceExports')
const AmazonImports = lazyWithErrorBoundary(() => import('./pages/AmazonImports'), 'AmazonImports')
const Inventory = lazyWithErrorBoundary(() => import('./pages/Inventory'), 'Inventory')
const Settings = lazyWithErrorBoundary(() => import('./pages/Settings'), 'Settings')
const Analytics = lazyWithErrorBoundary(() => import('./pages/Analytics'), 'Analytics')
const DecisionDashboard = lazyWithErrorBoundary(() => import('./pages/DecisionDashboard'), 'DecisionDashboard')
const Profit = lazyWithErrorBoundary(() => import('./pages/Profit'), 'Profit')
const Cashflow = lazyWithErrorBoundary(() => import('./pages/Cashflow'), 'Cashflow')
const OperationsPlanning = lazyWithErrorBoundary(() => import('./pages/OperationsPlanning'), 'OperationsPlanning')
const Suppliers = lazyWithErrorBoundary(() => import('./pages/Suppliers'), 'Suppliers')
const Forwarders = lazyWithErrorBoundary(() => import('./pages/Forwarders'), 'Forwarders')
const Warehouses = lazyWithErrorBoundary(() => import('./pages/Warehouses'), 'Warehouses')
const Calendar = lazyWithErrorBoundary(() => import('./pages/CalendarPage'), 'Calendar')
const Diagnostics = lazyWithErrorBoundary(() => import('./pages/Diagnostics'), 'Diagnostics')
const DevSeed = lazyWithErrorBoundary(() => import('./pages/DevSeed'), 'DevSeed')
const Help = lazyWithErrorBoundary(() => import('./pages/Help'), 'Help')
const BillingLocked = lazyWithErrorBoundary(() => import('./pages/BillingLocked'), 'BillingLocked')
const BillingOverSeat = lazyWithErrorBoundary(() => import('./pages/BillingOverSeat'), 'BillingOverSeat')
const Billing = lazyWithErrorBoundary(() => import('./pages/Billing'), 'Billing')
const AmazonSnapshot = lazyWithErrorBoundary(() => import('./pages/AmazonSnapshot'), 'AmazonSnapshot')
const AdminConsole = lazyWithErrorBoundary(() => import('./pages/AdminConsole'), 'AdminConsole')
const Decisions = lazyWithErrorBoundary(() => import('./pages/Decisions'), 'Decisions')
const Research = lazyWithErrorBoundary(() => import('./pages/Research'), 'Research')
const DataImport = lazyWithErrorBoundary(() => import('./pages/DataImport'), 'DataImport')
const AutomationInboxPage = lazyWithErrorBoundary(() => import('./pages/automations/AutomationInboxPage'), 'AutomationInboxPage')
const AutomationProposalDetailPage = lazyWithErrorBoundary(() => import('./pages/automations/AutomationProposalDetailPage'), 'AutomationProposalDetailPage')
const AutomationActivityPage = lazyWithErrorBoundary(() => import('./pages/automations/AutomationActivityPage'), 'AutomationActivityPage')
const AutomationAnalyticsPage = lazyWithErrorBoundary(() => import('./pages/automations/AutomationAnalyticsPage'), 'AutomationAnalyticsPage')
const TaskInbox = lazyWithErrorBoundary(() => import('./pages/TaskInbox'), 'TaskInbox')
const Docs = lazyWithErrorBoundary(() => import('./pages/Docs'), 'Docs')
const SupplierDetail = lazyWithErrorBoundary(() => import('./pages/SupplierDetail'), 'SupplierDetail')
const ForwarderDetail = lazyWithErrorBoundary(() => import('./pages/ForwarderDetail'), 'ForwarderDetail')

const ADMIN_EMAILS = new Set(['david@freedolia.com'])
const gateTs = () => new Date().toISOString()
const gateLog = (phase, payload = {}) => console.info('[OnboardingGate]', { ts: gateTs(), phase, ...payload })
const gateWarn = (phase, payload = {}) => console.warn('[OnboardingGate]', { ts: gateTs(), phase, ...payload })

function LayoutStateScreen({ title, message, children, actions }) {
  return (
    <div className="layout-fullstate">
      <div className="layout-fullstate__card">
        {title ? <h2 className="layout-fullstate__title">{title}</h2> : null}
        {message ? <p className="layout-fullstate__message">{message}</p> : null}
        {children}
        {actions ? <div className="layout-fullstate__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

/** D23 — Protect admin route: only users whose email is in ADMIN_EMAILS can access. */
function AdminGate({ children }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const email = session?.user?.email ?? ''
      setAllowed(ADMIN_EMAILS.has(email))
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setAllowed(false)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <LayoutStateScreen message={t('common.loading')} />
  }
  if (!allowed) {
    return <Navigate to="/app" replace />
  }
  return children
}

function OnboardingGate({ children }) {
  const { t } = useTranslation()
  const { isWorkspaceReady, activeOrgId } = useWorkspace()
  const location = useLocation()
  const { loading, requiresOnboarding, error, refetch } = useOnboardingStatus(activeOrgId || null)
  const path = location.pathname

  useEffect(() => {
    gateLog('state.snapshot', {
      path,
      isWorkspaceReady,
      activeOrgId,
      loading,
      requiresOnboarding,
      hasError: Boolean(error),
      errorMessage: error?.message ?? null,
      hasAmazonActivationFlag:
        typeof sessionStorage !== 'undefined'
          ? Boolean(sessionStorage.getItem('activation_amazon_path'))
          : false,
    })
  }, [path, isWorkspaceReady, activeOrgId, loading, requiresOnboarding, error])

  // Esperem que workspace i hook estiguin llestos (mai retornem blank)
  if (!isWorkspaceReady || loading) {
    gateLog('render.loading', {
      isWorkspaceReady,
      activeOrgId,
      path,
      hook: { loading, requiresOnboarding },
    })
    return <LayoutStateScreen message={t('common.loading')} />
  }

  // Read failure ≠ "missing org_activation": don't bounce to /activation; allow /activation so wizard can still run.
  if (activeOrgId && error) {
    if (path === '/activation') {
      gateWarn('render.activationAllowedDespiteError', {
        activeOrgId,
        path,
        message: error?.message,
      })
      return children
    }
    gateWarn('render.onboardingReadError', {
      activeOrgId,
      path,
      message: error?.message,
    })
    return (
      <LayoutStateScreen
        title={t('gate.onboardingStatusErrorTitle')}
        message={t('gate.onboardingStatusErrorHint')}
        actions={(
          <button type="button" className="data-state__action" onClick={refetch}>
            {t('common.retry')}
          </button>
        )}
      >
        {error?.message ? <p className="layout-fullstate__message">{error.message}</p> : null}
      </LayoutStateScreen>
    )
  }

  const hasAmazonActivationFlag =
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('activation_amazon_path')

  // P0.CRITICAL — si hi ha usuari però cap org activa, no deixem entrar a /app sense passar per activation.
  if (!activeOrgId && path.startsWith('/app') && path !== '/activation') {
    gateWarn('redirect.toActivation.noActiveOrgId', {
      isWorkspaceReady,
      activeOrgId,
      path,
    })
    return <Navigate to="/activation" replace />
  }

  // Usuari autenticat + org carregada + onboarding complet → root envia a /app
  if (!requiresOnboarding && path === '/' && activeOrgId) {
    gateLog('redirect.toApp.onboardingDoneFromRoot', {
      isWorkspaceReady,
      activeOrgId,
      path,
      requiresOnboarding,
    })
    return <Navigate to="/app" replace />
  }

  if (!requiresOnboarding && path === '/activation' && activeOrgId) {
    gateLog('redirect.toApp.onboardingDoneFromActivation', {
      isWorkspaceReady,
      activeOrgId,
      path,
      requiresOnboarding,
    })
    return <Navigate to="/app" replace />
  }

  // Encara cal onboarding: redirigir a /activation només quan entri a /app amb el flag d'Amazon
  if (requiresOnboarding) {
    if (path === '/activation') {
      gateLog('render.children.activationRequired', {
        isWorkspaceReady,
        activeOrgId,
        path,
        requiresOnboarding,
      })
      return children
    }
    if (path.startsWith('/app') && hasAmazonActivationFlag) {
      gateWarn('redirect.toActivation.requiresOnboarding.amazonFlag', {
        isWorkspaceReady,
        activeOrgId,
        path,
        requiresOnboarding,
        hasAmazonActivationFlag,
      })
      return <Navigate to="/activation" replace />
    }
    if (path !== '/activation') {
      gateWarn('redirect.toActivation.requiresOnboarding', {
        isWorkspaceReady,
        activeOrgId,
        path,
        requiresOnboarding,
        hasAmazonActivationFlag,
      })
      return <Navigate to="/activation" replace />
    }
  }

  gateLog('render.children.fallthrough', {
    isWorkspaceReady,
    activeOrgId,
    path,
    hook: { loading, requiresOnboarding },
    hasAmazonActivationFlag,
  })
  return children
}

/** Wrapper per a pàgines dins /app: usa darkMode del context i embolcalla ProtectedRoute + ErrorBoundary. */
function AppPageWrap({ children, context }) {
  const { darkMode } = useApp()
  return (
    <ProtectedRoute>
      <ErrorBoundary context={context} darkMode={darkMode}>
        {children}
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

function AppContent() {
  const { sidebarCollapsed, darkMode } = useApp()
  const { t } = useTranslation()
  const { isWorkspaceReady, activeOrgId } = useWorkspace()
  const { usage, isLoading: usageLoading } = useWorkspaceUsage()
  const { loading: billingLoading, billing, isTrialExpired } = useOrgBilling(activeOrgId ?? null)
  const { isMobile, isTablet } = useBreakpoint()
  const location = useLocation()
  const isProjectDetail = location.pathname.startsWith('/app/projects/') && location.pathname.split('/').length >= 4

  const handleUpgradeForLimit = async () => {
    if (!activeOrgId) return
    try {
      const data = await createStripeCheckoutSession(activeOrgId, 'growth')
      if (data?.url) window.location.href = data.url
    } catch (err) {
      console.warn('Upgrade checkout failed', err)
    }
  }

  const [billingState, setBillingState] = useState({
    loading: true,
    allowed: true,
    org: null,
    gate: null,
    seatsUsed: 0,
    error: null,
  })
  const isBillingRoute = location.pathname === '/app/billing/locked' || location.pathname === '/app/billing/over-seat'

  // S3.1.B4: Gate uses canonical usage + billing (useWorkspaceUsage, useOrgBilling) instead of orgs.billing_status / orgs.seat_limit.
  useEffect(() => {
    if (!isWorkspaceReady) return
    if (isDemoMode()) {
      setBillingState({ loading: false, allowed: true, org: null, gate: null, seatsUsed: 0, error: null })
      return
    }
    if (!activeOrgId) {
      setBillingState({ loading: false, allowed: true, org: null, gate: null, seatsUsed: 0, error: null })
      return
    }
    if (usageLoading || billingLoading) {
      setBillingState((prev) => (prev.loading ? prev : { ...prev, loading: true }))
      return
    }
    const locked = !isSeatLimitDisabled() && (billing
      ? (billing.status === 'past_due' || billing.status === 'canceled' || isTrialExpired)
      : false)
    // BETA: seat limit disabled via VITE_DISABLE_SEAT_LIMIT (frontend only —
    // backend still enforces). See src/lib/featureFlags.js.
    const overSeat = !isSeatLimitDisabled() && (usage?.limitsReached?.includes('seats')) === true
    const allowed = !locked && !overSeat
    const gate = locked ? 'locked' : overSeat ? 'over_seat' : null
    const seatsUsed = usage?.seats?.used ?? 0
    setBillingState({ loading: false, allowed, org: null, gate, seatsUsed, error: null })
  }, [isWorkspaceReady, activeOrgId, usageLoading, billingLoading, usage, billing, isTrialExpired])

  const sidebarWidth = isMobile ? 0 : (isTablet ? 64 : (sidebarCollapsed ? 64 : 240))

  if (!isWorkspaceReady || billingState.loading) {
    console.log('[DiagWhiteScreen][AppContent] render -> loader branch', {
      path: location.pathname,
      isWorkspaceReady,
      activeOrgId,
      billingState: { loading: billingState.loading, allowed: billingState.allowed, gate: billingState.gate, error: Boolean(billingState.error) },
    })
    return <LayoutStateScreen message={t('common.loading')} />
  }
  if (billingState.error && !isBillingRoute) {
    console.log('[DiagWhiteScreen][AppContent] render -> billing error branch', {
      path: location.pathname,
      isBillingRoute,
      billingState: { loading: billingState.loading, allowed: billingState.allowed, gate: billingState.gate, error: String(billingState.error?.message ?? billingState.error) },
    })
    return (
      <LayoutStateScreen
        title={t('gate.billingStateErrorTitle')}
        message={billingState.error.message || String(billingState.error)}
        actions={(
          <button type="button" className="data-state__action" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </button>
        )}
      />
    )
  }
  if (isBillingRoute) {
    console.log('[DiagWhiteScreen][AppContent] render -> billing route branch (render Outlet inside Suspense)', {
      path: location.pathname,
      activeOrgId,
      billingState: { loading: billingState.loading, allowed: billingState.allowed, gate: billingState.gate },
    })
    return (
      <>
        <Suspense fallback={<PageLoader darkMode={darkMode} fullScreen />}>
          <Outlet />
        </Suspense>
        <ToastContainer darkMode={darkMode} />
      </>
    )
  }
  if (!billingState.allowed) {
    const to = billingState.gate === 'over_seat' ? '/app/billing/over-seat' : '/app/billing/locked'
    console.log('[DiagWhiteScreen][AppContent] render -> Navigate billing lock (not allowed)', {
      path: location.pathname,
      to,
      activeOrgId,
      billingState: { allowed: billingState.allowed, gate: billingState.gate, seatsUsed: billingState.seatsUsed },
    })
    return (
      <Navigate to={to} replace state={{ org: billingState.org, seatsUsed: billingState.seatsUsed }} />
    )
  }

  console.log('[DiagWhiteScreen][AppContent] render -> main layout branch (render Outlet inside Suspense)', {
    path: location.pathname,
    isWorkspaceReady,
    activeOrgId,
    billingState: { loading: billingState.loading, allowed: billingState.allowed, gate: billingState.gate },
  })
  return (
    <div
      className="layout-shell"
      style={{
        '--sidebar-w': `${sidebarWidth}px`
      }}
    >
      <DemoModeBanner darkMode={darkMode} />
      <Sidebar />
      <main
        className="layout-shell__main"
        style={{
          marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
          transition: 'margin-left 0.3s ease',
          width: isMobile ? '100%' : 'auto'
        }}
      >
        <BillingBanner />
        <WorkspaceLimitAlert usage={usage} onUpgrade={handleUpgradeForLimit} />
        <TopNavbar sidebarWidth={sidebarWidth} />
        <MarginCompressionAlertStrip />
        <StockoutAlertStrip />
        <ErrorBoundary context="app:main" darkMode={darkMode}>
          <Suspense fallback={<PageLoader darkMode={darkMode} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <ToastContainer darkMode={darkMode} />
      {!isProjectDetail && <FloatingNotesLayer />}
      <HelpAssistant darkMode={darkMode} />
    </div>
  )
}

function CookieBannerWrapper() {
  const location = useLocation()
  return <CookieBanner locationPathname={location.pathname} />
}

function ScreenshotModeBodyClass() {
  const location = useLocation()

  useEffect(() => {
    if (isScreenshotMode()) {
      document.body.classList.add('screenshot-mode')
    } else {
      document.body.classList.remove('screenshot-mode')
    }
  }, [location])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <AppProvider>
          <CookieBannerWrapper />
          <ScreenshotModeBodyClass />
          <Routes>
            {/* ── Pàgines públiques — sense OnboardingGate ── */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/amazon-fba-dashboard" element={<AmazonFbaDashboard />} />
            <Route path="/purchase-order-management" element={<PurchaseOrderManagement />} />
            <Route path="/supplier-management-system" element={<SupplierManagementSystem />} />
            <Route path="/login" element={<Login />} />
            <Route path="/trial" element={<Trial />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/dpa" element={<DPA />} />
            <Route path="/legal" element={<LegalIndex />} />
            {/* ── Pàgines protegides — amb OnboardingGate ── */}
            <Route path="/activation" element={<OnboardingGate><ProtectedRoute><ActivationWizard /></ProtectedRoute></OnboardingGate>} />
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/projects/*" element={<RedirectToApp />} />
            <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="/orders" element={<Navigate to="/app/orders" replace />} />
            <Route path="/finances" element={<Navigate to="/app/finances" replace />} />
            <Route path="/inventory" element={<Navigate to="/app/inventory" replace />} />
            <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
            <Route path="/suppliers" element={<Navigate to="/app/suppliers" replace />} />
            <Route path="/forwarders" element={<Navigate to="/app/forwarders" replace />} />
            <Route path="/warehouses" element={<Navigate to="/app/warehouses" replace />} />
            <Route path="/help" element={<Navigate to="/app/help" replace />} />
            <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
            <Route path="/diagnostics" element={<Navigate to="/app/diagnostics" replace />} />
            <Route path="/dev/seed" element={<Navigate to="/app/dev/seed" replace />} />
            <Route path="/app" element={<OnboardingGate><AppContent /></OnboardingGate>}>
                <Route index element={<AppPageWrap context="page:Dashboard"><Dashboard /></AppPageWrap>} />
                <Route path="snapshot" element={<AppPageWrap context="page:AmazonSnapshot"><AmazonSnapshot /></AppPageWrap>} />
                <Route path="projects" element={<AppPageWrap context="page:Projects"><Projects /></AppPageWrap>} />
                <Route path="projects/:id" element={<AppPageWrap context="page:ProjectDetail"><ProjectDetailRoute /></AppPageWrap>} />
                <Route path="projects/:projectId/briefing" element={<AppPageWrap context="page:Briefing"><Briefing /></AppPageWrap>} />
                <Route path="suppliers" element={<AppPageWrap context="page:Suppliers"><Suppliers /></AppPageWrap>} />
                <Route path="suppliers/:id" element={<AppPageWrap context="page:SupplierDetail"><SupplierDetail /></AppPageWrap>} />
                <Route path="forwarders" element={<AppPageWrap context="page:Forwarders"><Forwarders /></AppPageWrap>} />
                <Route path="forwarders/:id" element={<AppPageWrap context="page:ForwarderDetail"><ForwarderDetail /></AppPageWrap>} />
                <Route path="warehouses" element={<AppPageWrap context="page:Warehouses"><Warehouses /></AppPageWrap>} />
                <Route path="orders" element={<AppPageWrap context="page:Orders"><Orders /></AppPageWrap>} />
                <Route path="finances" element={<AppPageWrap context="page:Finances"><Finances /></AppPageWrap>} />
                <Route path="finances/exports" element={<AppPageWrap context="page:FinanceExports"><FinanceExports /></AppPageWrap>} />
                <Route path="finances/amazon-imports" element={<AppPageWrap context="page:AmazonImports"><AmazonImports /></AppPageWrap>} />
                <Route path="inventory" element={<AppPageWrap context="page:Inventory"><Inventory /></AppPageWrap>} />
                <Route path="analytics" element={<AppPageWrap context="page:Analytics"><Analytics /></AppPageWrap>} />
                <Route path="decision-dashboard" element={<AppPageWrap context="page:DecisionDashboard"><DecisionDashboard /></AppPageWrap>} />
                <Route path="profit" element={<AppPageWrap context="page:Profit"><Profit /></AppPageWrap>} />
                <Route path="cash" element={<AppPageWrap context="page:Cashflow"><Cashflow /></AppPageWrap>} />
                <Route path="operations" element={<AppPageWrap context="page:OperationsPlanning"><OperationsPlanning /></AppPageWrap>} />
                <Route path="decisions" element={<AppPageWrap context="page:Decisions"><Decisions /></AppPageWrap>} />
                <Route path="research" element={<AppPageWrap context="page:Research"><Research /></AppPageWrap>} />
                <Route path="import" element={<AppPageWrap context="page:DataImport"><DataImport /></AppPageWrap>} />
                <Route path="automations" element={<AppPageWrap context="page:AutomationInbox"><AutomationInboxPage /></AppPageWrap>} />
                <Route path="automations/analytics" element={<AppPageWrap context="page:AutomationAnalytics"><AutomationAnalyticsPage /></AppPageWrap>} />
                <Route path="automations/activity" element={<AppPageWrap context="page:AutomationActivity"><AutomationActivityPage /></AppPageWrap>} />
                <Route path="automations/:proposalId" element={<AppPageWrap context="page:AutomationProposalDetail"><AutomationProposalDetailPage /></AppPageWrap>} />
                <Route path="admin" element={<AdminGate><AppPageWrap context="page:AdminConsole"><AdminConsole /></AppPageWrap></AdminGate>} />
                <Route path="settings" element={<AppPageWrap context="page:Settings"><Settings /></AppPageWrap>} />
                <Route path="settings/billing" element={<Navigate to="/app/billing" replace />} />
                <Route path="billing" element={<AppPageWrap context="page:Billing"><Billing /></AppPageWrap>} />
                <Route path="help" element={<AppPageWrap context="page:Help"><Help /></AppPageWrap>} />
                <Route path="calendar" element={<AppPageWrap context="page:Calendar"><Calendar /></AppPageWrap>} />
                <Route path="inbox" element={<AppPageWrap context="page:TaskInbox"><TaskInbox /></AppPageWrap>} />
                <Route path="diagnostics" element={<AppPageWrap context="page:Diagnostics"><Diagnostics /></AppPageWrap>} />
                <Route path="dev/seed" element={<AppPageWrap context="page:DevSeed"><DevSeed /></AppPageWrap>} />
                <Route path="docs/*" element={<AppPageWrap context="page:Docs"><Docs /></AppPageWrap>} />
                <Route path="billing/locked" element={<BillingLocked />} />
                <Route path="billing/over-seat" element={<BillingOverSeat />} />
                <Route path="*" element={<NotFoundInApp />} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
        </AppProvider>
      </WorkspaceProvider>
    </BrowserRouter>
  )
}

export default App

