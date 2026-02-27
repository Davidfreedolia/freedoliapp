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
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import ToastContainer from './components/Toast'
import DemoModeBanner from './components/DemoModeBanner'
import ErrorBoundary from './components/ErrorBoundary'
import FloatingNotesLayer from './components/FloatingNotesLayer'
import TopNavbar from './components/TopNavbar'
import BillingBlockedScreen from './components/BillingBlockedScreen'
import { useBreakpoint } from './hooks/useBreakpoint'
import { isDemoMode } from './demo/demoMode'
import { supabase, getCurrentUserId } from './lib/supabase'
import './i18n'

// Login i Landing (no lazy)
import Login from './pages/Login'
import Landing from './pages/Landing'

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

const ADMIN_EMAILS = new Set(['david@freedolia.com'])

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
  const { sidebarCollapsed, darkMode, setActiveOrgId } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const location = useLocation()
  const isProjectDetail = location.pathname.startsWith('/app/projects/') && location.pathname.split('/').length >= 4

  const [billingState, setBillingState] = useState({ loading: true, allowed: true, org: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (isDemoMode()) {
        if (!cancelled) {
          setBillingState({ loading: false, allowed: true, org: null })
          setActiveOrgId(null)
        }
        return
      }
      const userId = await getCurrentUserId()
      if (!userId) {
        if (!cancelled) {
          setBillingState({ loading: false, allowed: true, org: null })
          setActiveOrgId(null)
        }
        return
      }
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const userEmail = (authUser?.email ?? '').toLowerCase()
      if (ADMIN_EMAILS.has(userEmail)) {
        const { data: membershipRow } = await supabase
          .from('org_memberships')
          .select('*, orgs(*)')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()
        const org = membershipRow?.orgs ?? membershipRow?.org ?? null
        if (!cancelled) {
          setBillingState({ loading: false, allowed: true, org })
          setActiveOrgId(org?.id ?? null)
        }
        return
      }
      const { data: membershipRow, error: memErr } = await supabase
        .from('org_memberships')
        .select('*, orgs(*)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      if (memErr || !membershipRow) {
        if (!cancelled) {
          setBillingState({ loading: false, allowed: false, org: null })
          setActiveOrgId(null)
        }
        return
      }
      const org = membershipRow.orgs ?? membershipRow.org ?? null
      if (!org) {
        if (!cancelled) {
          setBillingState({ loading: false, allowed: false, org: null })
          setActiveOrgId(null)
        }
        return
      }
      let allowed = false
      if (import.meta.env.DEV) {
        allowed = true
      } else if (org.plan_id === 'core-dev') {
        allowed = true
      } else {
        const status = org.billing_status
        const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null
        const now = new Date()
        if (status === 'active') allowed = true
        else if (status === 'trialing' && trialEndsAt && trialEndsAt > now) allowed = true
        else if (status === 'trialing' && trialEndsAt && trialEndsAt <= now) allowed = false
        else if (status === 'past_due' || status === 'canceled') allowed = false
        else if (status == null) allowed = true
      }
      if (!cancelled) {
        setBillingState({ loading: false, allowed, org })
        setActiveOrgId(org?.id ?? null)
      }
    }
    run()
    return () => { cancelled = true }
  }, [setActiveOrgId])

  const sidebarWidth = isMobile ? 0 : (isTablet ? 72 : (sidebarCollapsed ? 72 : 260))

  if (billingState.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--page-bg)',
      }}>
        <div style={{ fontSize: 16, color: 'var(--text-secondary, #6b7280)' }}>Carregant...</div>
      </div>
    )
  }
  if (!billingState.allowed) {
    return (
      <BillingBlockedScreen
        org={billingState.org}
        hasBillingPage
      />
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
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
            <Route path="inventory" element={<AppPageWrap context="page:Inventory"><Inventory /></AppPageWrap>} />
            <Route path="analytics" element={<AppPageWrap context="page:Analytics"><Analytics /></AppPageWrap>} />
            <Route path="settings" element={<AppPageWrap context="page:Settings"><Settings /></AppPageWrap>} />
            <Route path="help" element={<AppPageWrap context="page:Help"><Help /></AppPageWrap>} />
            <Route path="calendar" element={<AppPageWrap context="page:Calendar"><Calendar /></AppPageWrap>} />
            <Route path="diagnostics" element={<AppPageWrap context="page:Diagnostics"><Diagnostics /></AppPageWrap>} />
            <Route path="dev/seed" element={<AppPageWrap context="page:DevSeed"><DevSeed /></AppPageWrap>} />
            <Route path="*" element={<NotFoundInApp />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
