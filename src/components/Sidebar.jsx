import { useState, useEffect } from 'react'
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
  ChevronRight,
  X,
  Menu
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import DriveStatus from './DriveStatus'
import { useBreakpoint } from '../hooks/useBreakpoint'

// Prefetch functions per rutes probables
// Carrega el chunk abans que es necessiti per millorar UX
// Utilitza els mateixos imports dinàmics que React.lazy() a App.jsx per garantir compatibilitat
const prefetchRoute = (path) => {
  switch (path) {
    case '/orders':
      import('../pages/Orders.jsx').catch(() => {})
      break
    case '/projects':
      // Prefetch Projects i ProjectDetail - ProjectDetail normalment s'obre després de Projects
      import('../pages/Projects.jsx').catch(() => {})
      import('../pages/ProjectDetail.jsx').catch(() => {})
      break
    case '/suppliers':
      import('../pages/Suppliers.jsx').catch(() => {})
      break
    case '/forwarders':
      import('../pages/Forwarders.jsx').catch(() => {})
      break
    case '/warehouses':
      import('../pages/Warehouses.jsx').catch(() => {})
      break
    case '/finances':
      import('../pages/Finances.jsx').catch(() => {})
      break
    case '/inventory':
      import('../pages/Inventory.jsx').catch(() => {})
      break
    case '/analytics':
      import('../pages/Analytics.jsx').catch(() => {})
      break
    case '/settings':
      import('../pages/Settings.jsx').catch(() => {})
      break
    default:
      break
  }
}

// Flag per evitar múltiples prefetches
const prefetchedRoutes = new Set()

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
  const { isMobile, isTablet, isDesktop } = useBreakpoint()
  const [logoError, setLogoError] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // En mobile, sidebar sempre col·lapsat (drawer)
  // En tablet, sempre icon-only
  // En desktop, controlat per sidebarCollapsed
  const shouldCollapse = isMobile ? true : (isTablet ? true : sidebarCollapsed)
  const isDrawer = isMobile

  useEffect(() => {
    // En desktop, no mostrar drawer
    if (isDesktop) {
      setMobileOpen(false)
    }
  }, [isDesktop])

  const handleLogoError = (e) => {
    if (darkMode && !logoError) {
      setLogoError(true)
      e.target.src = "/logo.png"
    }
  }

  const handleCloseDrawer = () => {
    setMobileOpen(false)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        ...styles.logoContainer,
        position: 'relative'
      }}>
        <img 
          src={darkMode && !logoError ? "/logo-dark.png" : "/logo.png"} 
          alt="Freedolia" 
          onError={handleLogoError}
          style={{
            ...styles.logo,
            width: shouldCollapse ? '40px' : '140px'
          }}
        />
        {isMobile && (
          <button
            onClick={handleCloseDrawer}
            style={styles.closeButton}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Estat Google Drive */}
      {!shouldCollapse && (
        <div style={styles.driveContainer}>
          <DriveStatus compact={false} />
        </div>
      )}
      {shouldCollapse && (
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
            onClick={() => {
              // Tancar drawer en mobile quan es clica un item
              if (isMobile) {
                setMobileOpen(false)
              }
            }}
            onMouseEnter={() => {
              // Prefetch rutes quan es fa hover (només una vegada per ruta)
              if (!prefetchedRoutes.has(item.path) && item.path !== '/') {
                prefetchedRoutes.add(item.path)
                prefetchRoute(item.path)
              }
            }}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive 
                ? (darkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)')
                : 'transparent',
              color: isActive
                ? '#4f46e5'
                : (darkMode ? '#9ca3af' : '#6b7280'),
              justifyContent: shouldCollapse ? 'center' : 'flex-start'
            })}
          >
            <item.icon size={20} />
            {!shouldCollapse && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle collapse (només desktop) */}
      {isDesktop && (
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={styles.collapseButton}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        {/* Botó menu mobile */}
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            ...styles.mobileMenuButton,
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
            color: darkMode ? '#ffffff' : '#111827'
          }}
        >
          <Menu size={24} />
        </button>

        {/* Drawer overlay */}
        {mobileOpen && (
          <div
            style={styles.drawerOverlay}
            onClick={handleCloseDrawer}
          >
            <aside
              style={{
                ...styles.sidebar,
                ...styles.drawer,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </aside>
          </div>
        )}
      </>
    )
  }

  return (
    <aside style={{
      ...styles.sidebar,
      width: shouldCollapse ? '72px' : '260px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff'
    }}>
      {sidebarContent}
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
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#6b7280'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 1000,
    padding: '10px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    transition: 'opacity 0.3s ease'
  },
  drawer: {
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
