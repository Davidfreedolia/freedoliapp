import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Suppliers from './pages/Suppliers'
import Forwarders from './pages/Forwarders'
import Warehouses from './pages/Warehouses'
import Orders from './pages/Orders'
import Briefing from './pages/Briefing'
import Finances from './pages/Finances'
import Inventory from './pages/Inventory'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function AppContent() {
  const { sidebarCollapsed, darkMode } = useApp()

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: darkMode ? '#0a0a0f' : '#f8f9fc'
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: sidebarCollapsed ? '72px' : '260px',
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/briefing" element={<Briefing />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/forwarders" element={<Forwarders />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
