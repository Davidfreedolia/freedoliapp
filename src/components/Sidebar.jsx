import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  Calendar as CalendarIcon,
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
      // Prefetch Projects i ProjectDetailRoute - ProjectDetailRoute normalment s'obre després de Projects
      import('../pages/Projects.jsx').catch(() => {})
      import('../pages/ProjectDetailRoute.jsx').catch(() => {})
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
    case '/calendar':
      import('../pages/Calendar.jsx').catch(() => {})
      break
    default:
      break
  }
}

// Flag per evitar múltiples prefetches
const prefetchedRoutes = new Set()

const menuItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
  { path: '/projects', icon: FolderKanban, labelKey: 'sidebar.projects' },
  { path: '/suppliers', icon: Users, labelKey: 'sidebar.suppliers' },
  { path: '/forwarders', icon: Truck, labelKey: 'sidebar.forwarders' },
  { path: '/warehouses', icon: Warehouse, labelKey: 'sidebar.warehouses' },
  { path: '/orders', icon: FileText, labelKey: 'sidebar.orders' },
  { path: '/finances', icon: Receipt, labelKey: 'sidebar.finances' },
  { path: '/inventory', icon: Package, labelKey: 'sidebar.inventory' },
  { path: '/calendar', icon: CalendarIcon, labelKey: 'sidebar.calendar' },
  { path: '/analytics', icon: TrendingUp, labelKey: 'sidebar.analytics' },
  { path: '/settings', icon: Settings, labelKey: 'sidebar.settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, darkMode } = useApp()
  const { isMobile, isTablet, isDesktop } = useBreakpoint()
  const { t } = useTranslation()
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
              backgroundColor: isActive ? 'rgba(107, 199, 181, 0.16)' : 'transparent',
              color: isActive ? '#F4F7F3' : 'rgba(244, 247, 243, 0.8)',
              borderLeft: shouldCollapse ? '0' : (isActive ? '3px solid var(--color-accent)' : '3px solid transparent'),
              padding: shouldCollapse ? '12px 0' : '12px 16px',
              borderRadius: shouldCollapse ? '12px' : '10px',
              justifyContent: shouldCollapse ? 'center' : 'flex-start'
            })}
          >
            <item.icon size={shouldCollapse ? 24 : 20} />
            {!shouldCollapse && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {isDesktop && (
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expandir' : 'Col·lapsar'}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            ...styles.centerToggle,
            left: shouldCollapse ? '50%' : '100%',
            transform: shouldCollapse ? 'translateX(-50%)' : 'translateX(-50%)'
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
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
          style={styles.mobileMenuButton}
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
                backgroundColor: '#1F4E5F',
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
      backgroundColor: '#1F4E5F'
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
    zIndex: 100,
    color: '#F4F7F3'
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
  centerToggle: {
    position: 'absolute',
    top: '50%',
    zIndex: 200,
    width: '36px',
    height: '36px',
    borderRadius: '999px',
    border: '1px solid rgba(244, 247, 243, 0.22)',
    backgroundColor: 'rgba(244, 247, 243, 0.10)',
    color: '#F4F7F3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 16px rgba(31, 78, 95, 0.20)',
    backdropFilter: 'blur(6px)'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 1000,
    padding: '10px',
    border: '1px solid rgba(244, 247, 243, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(31, 78, 95, 0.2)',
    backgroundColor: '#1F4E5F',
    color: '#F4F7F3'
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
    color: '#F4F7F3',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
