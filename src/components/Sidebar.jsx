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
  ChevronsRight,
  X,
  Menu
} from 'lucide-react'
import Button from './Button'
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
  const [hoveredPath, setHoveredPath] = useState(null)

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
          src={logoError ? "/logo.png" : "/logo-dark.png"} 
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
      <nav style={styles.nav} className="sidebar-scroll">
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
              setHoveredPath(item.path)
            }}
            onMouseLeave={() => setHoveredPath(null)}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive
                ? 'var(--nav-highlight-strong)'
                : (hoveredPath === item.path ? 'var(--nav-highlight)' : 'transparent'),
              color: isActive ? 'var(--nav-fg)' : 'var(--nav-fg-muted)',
              borderLeft: 'none',
              padding: shouldCollapse ? '12px 0' : '12px 16px',
              borderRadius: shouldCollapse ? '12px' : '10px',
              justifyContent: shouldCollapse ? 'center' : 'flex-start'
            })}
          >
            <item.icon size={shouldCollapse ? 24 : 20} color="var(--nav-icon)" />
            {!shouldCollapse && <span>{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {isDesktop && (
        <div className="sidebar-toggle">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expandir' : 'Col·lapsar'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar-toggle__button"
          >
            <ChevronsRight
              size={24}
              strokeWidth={3.0}
              className={`sidebar-toggle__icon ${sidebarCollapsed ? 'is-collapsed' : ''}`}
            />
          </Button>
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <>
        {/* Botó menu mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileOpen(true)}
          style={styles.mobileMenuButton}
        >
          <Menu size={22} />
        </Button>

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
                backgroundColor: 'var(--nav-bg)',
                transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.sidebarInner}>{sidebarContent}</div>
            </aside>
          </div>
        )}
      </>
    )
  }

  return (
    <aside style={{
      ...styles.sidebar,
      width: shouldCollapse ? '72px' : '260px'
    }}>
      <div style={styles.sidebarInner}>{sidebarContent}</div>
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
    color: 'var(--nav-fg)',
    backgroundColor: 'var(--nav-bg)',
    borderRight: 'var(--sidebar-edge)',
    boxShadow: 'var(--sidebar-shadow)',
    overflow: 'visible'
  },
  sidebarInner: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
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
    overflowY: 'auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    outline: 'none',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 1000,
    padding: '10px',
    border: 'var(--sidebar-edge)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-soft)',
    backgroundColor: 'var(--nav-bg)',
    color: 'var(--nav-icon)'
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
    color: 'var(--nav-icon)',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
