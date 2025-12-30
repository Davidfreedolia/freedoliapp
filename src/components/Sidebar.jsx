import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Truck,
  Warehouse,
  FileText, 
  Receipt,
  Package,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import DriveStatus from './DriveStatus'

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderKanban, label: 'Projectes' },
  { path: '/suppliers', icon: Users, label: 'Proveïdors' },
  { path: '/forwarders', icon: Truck, label: 'Transitaris' },
  { path: '/warehouses', icon: Warehouse, label: 'Magatzems' },
  { path: '/orders', icon: FileText, label: 'Comandes' },
  { path: '/finances', icon: Receipt, label: 'Finances' },
  { path: '/inventory', icon: Package, label: 'Inventari' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Configuració' },
]

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, darkMode } = useApp()
  const [logoError, setLogoError] = useState(false)

  const handleLogoError = (e) => {
    if (darkMode && !logoError) {
      setLogoError(true)
      e.target.src = "/logo.png"
    }
  }

  return (
    <aside style={{
      ...styles.sidebar,
      width: sidebarCollapsed ? '72px' : '260px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff'
    }}>
      {/* Logo */}
      <div style={styles.logoContainer}>
        <img 
          src={darkMode && !logoError ? "/logo-dark.png" : "/logo.png"} 
          alt="Freedolia" 
          onError={handleLogoError}
          style={{
            ...styles.logo,
            width: sidebarCollapsed ? '40px' : '140px'
          }}
        />
      </div>

      {/* Estat Google Drive */}
      {!sidebarCollapsed && (
        <div style={styles.driveContainer}>
          <DriveStatus compact={false} />
        </div>
      )}
      {sidebarCollapsed && (
        <div style={styles.driveContainerCompact}>
          <DriveStatus compact={true} />
        </div>
      )}

      {/* Menú */}
      <nav style={styles.nav}>
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive 
                ? (darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)')
                : 'transparent',
              color: isActive
                ? '#4f46e5'
                : (darkMode ? '#9ca3af' : '#6b7280'),
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
            })}
          >
            <item.icon size={20} />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle collapse */}
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          ...styles.collapseButton,
          backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}

const styles = {
  sidebar: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    transition: 'width 0.3s ease',
    zIndex: 100
  },
  logoContainer: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'center'
  },
  logo: {
    height: 'auto',
    objectFit: 'contain',
    transition: 'width 0.3s ease'
  },
  driveContainer: {
    padding: '16px'
  },
  driveContainerCompact: {
    padding: '12px',
    display: 'flex',
    justifyContent: 'center'
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  collapseButton: {
    margin: '16px',
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
