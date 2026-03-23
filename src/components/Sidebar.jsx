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
  DollarSign,
  Wallet,
  ClipboardList,
  Calendar as CalendarIcon,
  Inbox,
  Settings,
  ChevronLeft,
  X,
  Menu,
  Workflow,
  HelpCircle,
  Bug,
  ShieldCheck,
  CreditCard,
  Link2
} from 'lucide-react'
import Button from './Button'
import { useApp } from '../context/AppContext'
import { useBreakpoint } from '../hooks/useBreakpoint'

// Prefetch functions per rutes probables
// Carrega el chunk abans que es necessiti per millorar UX
// Utilitza els mateixos imports dinàmics que React.lazy() a App.jsx per garantir compatibilitat
const prefetchRoute = (path) => {
  const base = path.replace(/^\/app/, '') || '/'
  switch (base) {
    case '':
    case '/':
      import('../pages/Dashboard.jsx').catch(() => {})
      break
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
    case '/finances/exports':
      import('../pages/FinanceExports.jsx').catch(() => {})
      break
    case '/finances/amazon-imports':
      import('../pages/AmazonImports.jsx').catch(() => {})
      break
    case '/inventory':
      import('../pages/Inventory.jsx').catch(() => {})
      break
    case '/analytics':
      import('../pages/Analytics.jsx').catch(() => {})
      break
    case '/decision-dashboard':
      import('../pages/DecisionDashboard.jsx').catch(() => {})
      break
    case '/decisions':
      import('../pages/Decisions.jsx').catch(() => {})
      break
    case '/profit':
      import('../pages/Profit.jsx').catch(() => {})
      break
    case '/cash':
      import('../pages/Cashflow.jsx').catch(() => {})
      break
    case '/operations':
      import('../pages/OperationsPlanning.jsx').catch(() => {})
      break
    case '/settings':
      import('../pages/Settings.jsx').catch(() => {})
      break
    case '/calendar':
      import('../pages/Calendar.jsx').catch(() => {})
      break
    case '/inbox':
      import('../pages/TaskInbox.jsx').catch(() => {})
      break
    case '/automations':
      import('../pages/automations/AutomationInboxPage.jsx').catch(() => {})
      break
    case '/billing':
      import('../pages/Billing.jsx').catch(() => {})
      break
    case '/help':
      import('../pages/Help.jsx').catch(() => {})
      break
    case '/diagnostics':
      import('../pages/Diagnostics.jsx').catch(() => {})
      break
    case '/admin':
      import('../pages/AdminConsole.jsx').catch(() => {})
      break
    default:
      break
  }
}

// Flag per evitar múltiples prefetches
const prefetchedRoutes = new Set()

// Canonical app brand logo (single source of truth; see public/brand/freedoliapp/README.md)
const BRAND_LOGO_URL = '/brand/freedoliapp/logo/logo_master.png'

// Grouped sidebar: one coherent operating system (Operations, Inventory, Finance, Intelligence, System)
const SIDEBAR_GROUPS = [
  {
    id: 'operations',
    labelKey: 'nav.groupOperations',
    items: [
      { path: '/app', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { path: '/app/projects', icon: FolderKanban, labelKey: 'nav.projects' },
      { path: '/app/suppliers', icon: Users, labelKey: 'nav.suppliers' },
      { path: '/app/forwarders', icon: Truck, labelKey: 'nav.forwarders' },
      { path: '/app/orders', icon: FileText, labelKey: 'nav.orders' },
      { path: '/app/operations', icon: ClipboardList, labelKey: 'nav.operationsPlanning' },
      { path: '/app/calendar', icon: CalendarIcon, labelKey: 'nav.calendar' },
      { path: '/app/inbox', icon: Inbox, labelKey: 'nav.taskInbox' },
    ],
  },
  {
    id: 'inventory',
    labelKey: 'nav.groupInventory',
    items: [
      { path: '/app/inventory', icon: Package, labelKey: 'nav.inventory' },
      { path: '/app/warehouses', icon: Warehouse, labelKey: 'nav.warehouses' },
    ],
  },
  {
    id: 'finance',
    labelKey: 'nav.groupFinance',
    items: [
      { path: '/app/profit', icon: DollarSign, labelKey: 'nav.profit' },
      { path: '/app/cash', icon: Wallet, labelKey: 'nav.cashflow' },
      { path: '/app/finances', icon: Receipt, labelKey: 'nav.finances', end: true },
      { path: '/app/finances/amazon-imports', icon: Link2, labelKey: 'nav.amazonImports' },
    ],
  },
  {
    id: 'intelligence',
    labelKey: 'nav.groupIntelligence',
    items: [
      { path: '/app/decision-dashboard', icon: TrendingUp, labelKey: 'nav.decisionDashboard' },
      { path: '/app/decisions', icon: Inbox, labelKey: 'nav.decisions' },
      { path: '/app/automations', icon: Workflow, labelKey: 'nav.automations' },
      { path: '/app/analytics', icon: TrendingUp, labelKey: 'nav.analytics' },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.groupSystem',
    items: [
      { path: '/app/billing', icon: CreditCard, labelKey: 'nav.billing' },
      { path: '/app/settings', icon: Settings, labelKey: 'nav.settings' },
      { path: '/app/help', icon: HelpCircle, labelKey: 'nav.help' },
      { path: '/app/diagnostics', icon: Bug, labelKey: 'nav.diagnostics' },
      { path: '/app/admin', icon: ShieldCheck, labelKey: 'nav.admin' },
    ],
  },
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

  const handleLogoError = () => {
    if (!logoError) setLogoError(true)
  }

  const handleCloseDrawer = () => {
    setMobileOpen(false)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        ...styles.logoContainer,
        position: 'relative',
        justifyContent: shouldCollapse ? 'center' : 'flex-start',
        padding: shouldCollapse ? '18px 12px 12px' : '22px 20px 14px'
      }}>
        <img 
          src={BRAND_LOGO_URL}
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

      {/* Menú — grouped by product area */}
      <nav style={styles.nav} className="sidebar-scroll">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.id} style={styles.group}>
            {!shouldCollapse && (
              <div style={styles.groupHeader} aria-hidden="true">
                {t(group.labelKey)}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end === true}
                onClick={() => {
                  if (isMobile) setMobileOpen(false)
                }}
                onMouseEnter={() => {
                  if (!prefetchedRoutes.has(item.path) && item.path !== '/app') {
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
                  border: `1px solid ${isActive ? 'rgba(110, 203, 195, 0.22)' : 'transparent'}`,
                  padding: shouldCollapse ? '11px 0' : '11px 14px',
                  borderRadius: shouldCollapse ? '10px' : '12px',
                  justifyContent: shouldCollapse ? 'center' : 'flex-start'
                })}
              >
                <item.icon size={shouldCollapse ? 24 : 20} color="var(--nav-icon)" />
                {!shouldCollapse && (
                  <span style={styles.navItemLabel}>
                    {t(item.labelKey)}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {isDesktop && (
        <div className="sidebar-toggle sidebar-collapse">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expandir' : 'Col·lapsar'}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar-toggle__button"
          >
            <ChevronLeft
              size={18}
              className={`sidebar-toggle__icon ${sidebarCollapsed ? 'is-collapsed' : ''}`}
            />
            <span className="sidebar-toggle__label">
              {sidebarCollapsed ? 'Expand' : 'Collapse'}
            </span>
          </Button>
        </div>
      )}

      <div style={{ padding: '12px 16px', marginTop: 'auto', fontSize: 10, color: 'var(--nav-fg-muted)', opacity: 0.8 }}>
        FREEDOLIAPP v2.0.0
      </div>
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
              className="sidebar"
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
    <aside className="sidebar" style={{
      ...styles.sidebar,
      width: shouldCollapse ? '72px' : '260px'
    }}>
      <div style={styles.sidebarInner}>{sidebarContent}</div>
    </aside>
  )
}

const styles = {
  sidebar: {
    top: '12px',
    bottom: '12px',
    height: 'calc(100vh - 24px)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    transition: 'width 0.3s ease',
    zIndex: 100,
    color: 'var(--nav-fg)',
    backgroundColor: 'var(--nav-bg)',
    border: 'var(--sidebar-edge)',
    borderLeft: 'none',
    borderRadius: '0 var(--layout-radius-lg) var(--layout-radius-lg) 0',
    boxShadow: 'var(--sidebar-shadow)',
    overflow: 'hidden'
  },
  sidebarInner: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
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
    padding: '10px 10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    transition: 'background-color 0.15s ease, color 0.15s ease'
  },
  navItemLabel: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    minWidth: 0
  },
  group: {
    marginBottom: '14px'
  },
  groupHeader: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--nav-fg-muted)',
    padding: '6px 12px 4px',
    marginBottom: '2px'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '14px',
    left: '16px',
    zIndex: 1000,
    padding: '10px',
    border: '1px solid var(--topbar-btn-border)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-soft-2)',
    backgroundColor: 'var(--topbar-btn-bg)',
    color: 'var(--nav-icon)'
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(31, 51, 51, 0.18)',
    zIndex: 999,
    transition: 'opacity 0.3s ease'
  },
  drawer: {
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    boxShadow: 'var(--sidebar-shadow)'
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
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}
