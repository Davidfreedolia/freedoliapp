import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'

function RedirectToApp() {
  const { pathname } = useLocation()
  return <Navigate to={`/app${pathname}`} replace />
}

/** Quan estem dins /app/* i cap ruta fa match, mostrem això en lloc de redirigir a /app (evita loop). */
function NotFoundInApp() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Pàgina no trobada</h2>
      <p><code>{location.pathname}</code></p>
      <button type="button" onClick={() => navigate('/app')}>Torna al Dashboard</button>
    </div>
  )
}
import React, { Suspense, useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext'
import { useLang } from './i18n/useLang'
import { t } from './i18n/t'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import ToastContainer from './components/Toast'
import DemoModeBanner from './components/DemoModeBanner'
import ErrorBoundary from './components/ErrorBoundary'
import FloatingNotesLayer from './components/FloatingNotesLayer'
import TopNavbar from './components/TopNavbar'
import BillingBanner from './components/billing/BillingBanner'
import { useBreakpoint } from './hooks/useBreakpoint'
import { isDemoMode } from './demo/demoMode'
import { supabase, getCurrentUserId } from './lib/supabase'
import { useOnboardingStatus } from './hooks/useOnboardingStatus'
import './i18n'

// Login, Landing, Activation (no lazy)
import Login from './pages/Login'
import Landing from './pages/Landing'
import ActivationWizard from './pages/ActivationWizard'

// Lazy loading wrapper with error handling
const lazyWithErrorBoundary = (importFn, pageName) => {
  return React.lazy(() => 
    importFn().catch(error => {
      console.error(`Error loading ${pageName}:`, error)
      // Return a fallback component
      return {
        default: () => (
          <ErrorBoundary context={`lazy:${pageName}`} darkMode={false}>
            <div style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <h2>Error carregant la pàgina</h2>
                <p>No s'ha pogut carregar {pageName}</p>
                <button onClick={() => window.location.reload()}>
                  Recarregar
                </button>
              </div>
            </div>
          </ErrorBoundary>
        )
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
const Suppliers = lazyWithErrorBoundary(() => import('./pages/Suppliers'), 'Suppliers')
const Forwarders = lazyWithErrorBoundary(() => import('./pages/Forwarders'), 'Forwarders')
const Warehouses = lazyWithErrorBoundary(() => import('./pages/Warehouses'), 'Warehouses')
const Calendar = lazyWithErrorBoundary(() => import('./pages/CalendarPage'), 'Calendar')
const Diagnostics = lazyWithErrorBoundary(() => import('./pages/Diagnostics'), 'Diagnostics')
const DevSeed = lazyWithErrorBoundary(() => import('./pages/DevSeed'), 'DevSeed')
const Help = lazyWithErrorBoundary(() => import('./pages/Help'), 'Help')
const BillingLocked = lazyWithErrorBoundary(() => import('./pages/BillingLocked'), 'BillingLocked')
const BillingOverSeat = lazyWithErrorBoundary(() => import('./pages/BillingOverSeat'), 'BillingOverSeat')
const BillingSettings = lazyWithErrorBoundary(() => import('./pages/BillingSettings'), 'BillingSettings')

const ADMIN_EMAILS = new Set(['david@freedolia.com'])

function OnboardingGate({ children }) {
  const { isWorkspaceReady, activeOrgId } = useWorkspace()
  const location = useLocation()
  const { loading, requiresOnboarding } = useOnboardingStatus(activeOrgId || null)

  // No fem res fins que workspace i hook estiguin llestos
  if (!isWorkspaceReady || loading) {
    return children
  }

  const path = location.pathname
  const hasAmazonActivationFlag =
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('activation_amazon_path')

  // Usuari autenticat + org carregada + onboarding complet → root envia a /app
  if (!requiresOnboarding && path === '/' && activeOrgId) {
    return <Navigate to="/app" replace />
  }

  if (!requiresOnboarding && path === '/activation') {
    return <Navigate to="/app" replace />
  }

  // Encara cal onboarding: redirigir a /activation només quan entri a /app amb el flag d'Amazon
  if (requiresOnboarding) {
    if (path === '/activation') {
      return children
    }
    if (path.startsWith('/app') && hasAmazonActivationFlag) {
      return <Navigate to="/activation" replace />
    }
    if (path !== '/activation') {
      return <Navigate to="/activation" replace />
    }
  }

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
  const { lang } = useLang()
  const { isWorkspaceReady, activeOrgId } = useWorkspace()
  const { isMobile, isTablet } = useBreakpoint()
  const location = useLocation()
  const isProjectDetail = location.pathname.startsWith('/app/projects/') && location.pathname.split('/').length >= 4

  const [billingState, setBillingState] = useState({
    loading: true,
    allowed: true,
    org: null,
    gate: null,
    seatsUsed: 0,
    error: null,
  })
  const isBillingRoute = location.pathname === '/app/billing/locked' || location.pathname === '/app/billing/over-seat'

  useEffect(() => {
    if (!isWorkspaceReady) return
    let cancelled = false
    async function run() {
      if (isDemoMode()) {
        if (!cancelled) {
          setBillingState({
            loading: false,
            allowed: true,
            org: null,
            gate: null,
            seatsUsed: 0,
            error: null,
          })
        }
        return
      }
      const userId = await getCurrentUserId()
      if (!userId) {
        if (!cancelled) {
          setBillingState({
            loading: false,
            allowed: true,
            org: null,
            gate: null,
            seatsUsed: 0,
            error: null,
          })
        }
        return
      }
      if (!activeOrgId) {
        if (!cancelled) {
          // Sense org activa: no bloquegem per billing; ho gestiona WorkspaceContext.
          setBillingState({
            loading: false,
            allowed: true,
            org: null,
            gate: null,
            seatsUsed: 0,
            error: null,
          })
        }
        return
      }
      const { data: org, error: orgErr } = await supabase.from('orgs').select('*').eq('id', activeOrgId).single()
      if (orgErr || !org) {
        if (!cancelled) {
          // Error carregant billing/org: mostrar error lleu, però mai /billing/locked fals.
          setBillingState({
            loading: false,
            allowed: true,
            org: null,
            gate: null,
            seatsUsed: 0,
            error: orgErr || new Error('Org not found'),
          })
        }
        return
      }
      const { count } = await supabase.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', activeOrgId)
      const seatsUsed = count ?? 0
      const seatLimit = org.seat_limit ?? 1
      const status = org.billing_status
      const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null
      const now = new Date()
      const billingOk = status === 'active' || (status === 'trialing' && trialEndsAt && trialEndsAt > now) || (status == null)
      const overSeat = seatsUsed > seatLimit
      let allowed = false
      let gate = null
      if (!billingOk) gate = 'locked'
      else if (overSeat) gate = 'over_seat'
      else allowed = true
      if (!cancelled) {
        setBillingState({
          loading: false,
          allowed,
          org,
          gate,
          seatsUsed,
          error: null,
        })
      }
    }
    run()
    return () => { cancelled = true }
  }, [isWorkspaceReady, activeOrgId])

  const sidebarWidth = isMobile ? 0 : (isTablet ? 72 : (sidebarCollapsed ? 72 : 260))

  if (!isWorkspaceReady || billingState.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--page-bg)',
      }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary, #6b7280)' }}>{t(lang, 'common_loading')}</div>
      </div>
    )
  }
  if (billingState.error && !isBillingRoute) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--page-bg)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary, #6b7280)', maxWidth: 480 }}>
          <p style={{ marginBottom: 12 }}>Error carregant l'estat de billing.</p>
          <p style={{ marginBottom: 20, fontSize: 14 }}>{billingState.error.message || String(billingState.error)}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }
  if (isBillingRoute) {
    return (
      <>
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--page-bg)' }}><span style={{ color: 'var(--text-secondary)' }}>{t(lang, 'common_loading')}</span></div>}>
          <Outlet />
        </Suspense>
        <ToastContainer darkMode={darkMode} />
      </>
    )
  }
  if (!billingState.allowed) {
    const to = billingState.gate === 'over_seat' ? '/app/billing/over-seat' : '/app/billing/locked'
    return (
      <Navigate to={to} replace state={{ org: billingState.org, seatsUsed: billingState.seatsUsed }} />
    )
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--page-bg)',
      '--sidebar-w': `${sidebarWidth}px`
    }}>
      <DemoModeBanner darkMode={darkMode} />
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        width: isMobile ? '100%' : 'auto',
        paddingTop: 'var(--topbar-h)'
      }}>
        <BillingBanner />
        <TopNavbar sidebarWidth={sidebarWidth} />
        <ErrorBoundary context="app:main" darkMode={darkMode}>
          <Suspense fallback={<PageLoader darkMode={darkMode} />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <ToastContainer darkMode={darkMode} />
      {!isProjectDetail && <FloatingNotesLayer />}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <WorkspaceProvider>
          <OnboardingGate>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/activation" element={<ProtectedRoute><ActivationWizard /></ProtectedRoute>} />
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
              <Route path="/app" element={<AppContent />}>
                <Route index element={<AppPageWrap context="page:Dashboard"><Dashboard /></AppPageWrap>} />
                <Route path="projects" element={<AppPageWrap context="page:Projects"><Projects /></AppPageWrap>} />
                <Route path="projects/:id" element={<AppPageWrap context="page:ProjectDetail"><ProjectDetailRoute /></AppPageWrap>} />
                <Route path="projects/:projectId/briefing" element={<AppPageWrap context="page:Briefing"><Briefing /></AppPageWrap>} />
                <Route path="suppliers" element={<AppPageWrap context="page:Suppliers"><Suppliers /></AppPageWrap>} />
                <Route path="forwarders" element={<AppPageWrap context="page:Forwarders"><Forwarders /></AppPageWrap>} />
                <Route path="warehouses" element={<AppPageWrap context="page:Warehouses"><Warehouses /></AppPageWrap>} />
                <Route path="orders" element={<AppPageWrap context="page:Orders"><Orders /></AppPageWrap>} />
                <Route path="finances" element={<AppPageWrap context="page:Finances"><Finances /></AppPageWrap>} />
                <Route path="finances/exports" element={<AppPageWrap context="page:FinanceExports"><FinanceExports /></AppPageWrap>} />
                <Route path="finances/amazon-imports" element={<AppPageWrap context="page:AmazonImports"><AmazonImports /></AppPageWrap>} />
                <Route path="inventory" element={<AppPageWrap context="page:Inventory"><Inventory /></AppPageWrap>} />
                <Route path="analytics" element={<AppPageWrap context="page:Analytics"><Analytics /></AppPageWrap>} />
                <Route path="settings" element={<AppPageWrap context="page:Settings"><Settings /></AppPageWrap>} />
                <Route path="settings/billing" element={<AppPageWrap context="page:BillingSettings"><BillingSettings /></AppPageWrap>} />
                <Route path="help" element={<AppPageWrap context="page:Help"><Help /></AppPageWrap>} />
                <Route path="calendar" element={<AppPageWrap context="page:Calendar"><Calendar /></AppPageWrap>} />
                <Route path="diagnostics" element={<AppPageWrap context="page:Diagnostics"><Diagnostics /></AppPageWrap>} />
                <Route path="dev/seed" element={<AppPageWrap context="page:DevSeed"><DevSeed /></AppPageWrap>} />
                <Route path="billing/locked" element={<BillingLocked />} />
                <Route path="billing/over-seat" element={<BillingOverSeat />} />
                <Route path="*" element={<NotFoundInApp />} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </OnboardingGate>
        </WorkspaceProvider>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
