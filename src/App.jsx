import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

function RedirectToApp() {
  const { pathname } = useLocation()
  return <Navigate to={`/app${pathname}`} replace />
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

function AppContent() {
  const { sidebarCollapsed, darkMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const location = useLocation()
  const isProjectDetail = location.pathname.startsWith('/app/projects/') && location.pathname.split('/').length >= 4

  const [billingState, setBillingState] = useState({ loading: true, allowed: true, org: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (isDemoMode()) {
        if (!cancelled) setBillingState({ loading: false, allowed: true, org: null })
        return
      }
      const userId = await getCurrentUserId()
      if (!userId) {
        if (!cancelled) setBillingState({ loading: false, allowed: true, org: null })
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
        if (!cancelled) setBillingState({ loading: false, allowed: true, org })
        return
      }
      const { data: membershipRow, error: memErr } = await supabase
        .from('org_memberships')
        .select('*, orgs(*)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      if (memErr || !membershipRow) {
        if (!cancelled) setBillingState({ loading: false, allowed: false, org: null })
        return
      }
      const org = membershipRow.orgs ?? membershipRow.org ?? null
      if (!org) {
        if (!cancelled) setBillingState({ loading: false, allowed: false, org: null })
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
      if (!cancelled) setBillingState({ loading: false, allowed, org })
    }
    run()
    return () => { cancelled = true }
  }, [])

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
            <Routes>
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary context="page:Dashboard" darkMode={darkMode}>
                      <Dashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/projects"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary context="page:Projects" darkMode={darkMode}>
                      <Projects />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/projects/:id"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary context="page:ProjectDetail" darkMode={darkMode}>
                      <ProjectDetailRoute />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
            <Route
              path="/app/projects/:projectId/briefing"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Briefing" darkMode={darkMode}>
                    <Briefing />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/suppliers"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Suppliers" darkMode={darkMode}>
                    <Suppliers />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/forwarders"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Forwarders" darkMode={darkMode}>
                    <Forwarders />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/warehouses"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Warehouses" darkMode={darkMode}>
                    <Warehouses />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/orders"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Orders" darkMode={darkMode}>
                    <Orders />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/finances"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Finances" darkMode={darkMode}>
                    <Finances />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/inventory"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Inventory" darkMode={darkMode}>
                    <Inventory />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/analytics"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Analytics" darkMode={darkMode}>
                    <Analytics />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/settings"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Settings" darkMode={darkMode}>
                    <Settings />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/help"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Help" darkMode={darkMode}>
                    <Help />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/calendar"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Calendar" darkMode={darkMode}>
                    <Calendar />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/diagnostics"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:Diagnostics" darkMode={darkMode}>
                    <Diagnostics />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/dev/seed"
              element={
                <ProtectedRoute>
                  <ErrorBoundary context="page:DevSeed" darkMode={darkMode}>
                    <DevSeed />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
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
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/landing" element={<Landing />} />
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
          <Route path="/app/*" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
