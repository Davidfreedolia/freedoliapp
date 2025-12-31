import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import React, { Suspense } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import ToastContainer from './components/Toast'
import { useBreakpoint } from './hooks/useBreakpoint'
import './i18n'

// Login (no lazy, es carrega primer)
import Login from './pages/Login'

// Pàgines principals: lazy loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Projects = React.lazy(() => import('./pages/Projects'))
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'))
const Orders = React.lazy(() => import('./pages/Orders'))
const Briefing = React.lazy(() => import('./pages/Briefing'))
const Finances = React.lazy(() => import('./pages/Finances'))
const Inventory = React.lazy(() => import('./pages/Inventory'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Analytics = React.lazy(() => import('./pages/Analytics'))
const Suppliers = React.lazy(() => import('./pages/Suppliers'))
const Forwarders = React.lazy(() => import('./pages/Forwarders'))
const Warehouses = React.lazy(() => import('./pages/Warehouses'))

function AppContent() {
  const { sidebarCollapsed, darkMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()

  // Calcular margin-left segons breakpoint
  const getMarginLeft = () => {
    if (isMobile) return '0' // Mobile: sidebar és drawer, no ocupa espai
    if (isTablet) return '72px' // Tablet: icon-only
    return sidebarCollapsed ? '72px' : '260px' // Desktop: controlat per sidebarCollapsed
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc'
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: getMarginLeft(),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        width: isMobile ? '100%' : 'auto'
      }}>
        <Suspense fallback={<PageLoader darkMode={darkMode} />}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/briefing"
              element={
                <ProtectedRoute>
                  <Briefing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forwarders"
              element={
                <ProtectedRoute>
                  <Forwarders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouses"
              element={
                <ProtectedRoute>
                  <Warehouses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finances"
              element={
                <ProtectedRoute>
                  <Finances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <ToastContainer darkMode={darkMode} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
