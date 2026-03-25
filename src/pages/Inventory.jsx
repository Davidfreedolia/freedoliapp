import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Filter,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  Warehouse
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { supabase, getProjects } from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'
import { DataLoading, DataEmpty, DataError } from '../components/dataStates'
import { useTranslation } from 'react-i18next'

const LOOKBACK_DAYS = 30
const ACTIVE_SHIPMENT_STATUSES = new Set([
  'draft',
  'planned',
  'booked',
  'picked_up',
  'in_transit',
  'customs',
  'exception'
])

const DECISION_META = {
  reorder: {
    label: 'reorder',
    tone: '#dc2626',
    background: 'rgba(220, 38, 38, 0.12)',
    hint: 'Cobertura baixa i inbound insuficient.'
  },
  watch: {
    label: 'watch',
    tone: '#d97706',
    background: 'rgba(217, 119, 6, 0.12)',
    hint: 'Cal seguir-ho de prop abans de comprar més.'
  },
  do_not_reorder: {
    label: 'do not reorder',
    tone: '#0f766e',
    background: 'rgba(15, 118, 110, 0.12)',
    hint: 'Cobertura còmoda per ara.'
  },
  let_die: {
    label: 'let die',
    tone: '#6b7280',
    background: 'rgba(107, 114, 128, 0.14)',
    hint: 'Sense demanda recent i sense inbound rellevant.'
  }
}

function safeNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function formatNumber(value) {
  return Math.round(safeNumber(value)).toLocaleString()
}

function formatRate(value) {
  const numeric = safeNumber(value)
  if (numeric <= 0) return '0/dia'
  return `${numeric.toFixed(numeric >= 10 ? 0 : 1)}/dia`
}

function formatCoverage(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Sense consum'
  if (numeric >= 999) return 'Cobertura alta'
  return `${Math.round(numeric)} dies`
}

function formatShortDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString()
  } catch {
    return '—'
  }
}

function getDestinationLabel(shipment) {
  if (!shipment) return '—'
  if (shipment.destination_type === 'amazon_fba') {
    return shipment.destination_amazon_fc_code
      ? `Amazon FBA · ${shipment.destination_amazon_fc_code}`
      : 'Amazon FBA'
  }
  return shipment.destination_country
    ? `Warehouse · ${shipment.destination_country}`
    : 'Warehouse'
}

function deriveStockBuckets(item) {
  const amazonStock = safeNumber(item?.units_amazon_fba)
  const warehouseStock = safeNumber(item?.units_amazon_fbm)
  const inboundStock =
    safeNumber(item?.units_in_transit) +
    safeNumber(item?.units_in_forwarder) +
    safeNumber(item?.units_in_production)

  const hasLocationFields = [
    'units_amazon_fba',
    'units_amazon_fbm',
    'units_in_transit',
    'units_in_forwarder',
    'units_in_production'
  ].some((key) => item?.[key] != null)

  const fallbackStock = safeNumber(item?.quantity ?? item?.qty ?? item?.units ?? item?.total_units)
  const currentStock = hasLocationFields ? amazonStock + warehouseStock : fallbackStock

  return {
    currentStock: Math.max(0, currentStock),
    amazonStock: Math.max(0, amazonStock),
    warehouseStock: Math.max(0, warehouseStock),
    inboundStock: Math.max(0, inboundStock),
    totalVisible: Math.max(0, currentStock + inboundStock)
  }
}

function buildShipmentMap(rows) {
  const map = new Map()
  for (const row of rows || []) {
    const projectId = row?.purchase_orders?.project_id
    if (!projectId || !ACTIVE_SHIPMENT_STATUSES.has(row?.status)) continue
    if (!map.has(projectId)) map.set(projectId, [])
    map.get(projectId).push(row)
  }

  for (const [projectId, shipments] of map.entries()) {
    shipments.sort((a, b) => {
      const aTime = a?.eta_estimated ? new Date(a.eta_estimated).getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b?.eta_estimated ? new Date(b.eta_estimated).getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
    map.set(projectId, shipments)
  }

  return map
}

function decideOperationalAction({ dailySales, daysOfCoverage, futureCoverage, inboundStock, hasInboundSignal }) {
  if (dailySales <= 0) {
    return hasInboundSignal || inboundStock > 0 ? DECISION_META.watch : DECISION_META.let_die
  }

  if (daysOfCoverage <= 14 && futureCoverage <= 30) {
    return DECISION_META.reorder
  }

  if (daysOfCoverage <= 30 || futureCoverage <= 45 || hasInboundSignal || inboundStock > 0) {
    return DECISION_META.watch
  }

  return DECISION_META.do_not_reorder
}

export default function Inventory() {
  const { t } = useTranslation()
  const { darkMode, activeOrgId } = useApp()
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()

  const [inventory, setInventory] = useState([])
  const [projects, setProjects] = useState([])
  const [salesRows, setSalesRows] = useState([])
  const [shipmentRows, setShipmentRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [layout, setLayout] = useLayoutPreference('layout:inventory', 'grid')
  const [selectedInventoryId, setSelectedInventoryId] = useState(null)

  useEffect(() => {
    loadData()
  }, [activeOrgId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!activeOrgId) {
        setProjects([])
        setInventory([])
        setSalesRows([])
        setShipmentRows([])
        setLoading(false)
        return
      }

      const [projectsData, inventoryResult, salesResult, shipmentsResult] = await Promise.all([
        getProjects(true, activeOrgId),
        supabase
          .from('inventory')
          .select('*, project:projects(name, project_code)')
          .eq('org_id', activeOrgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('v_product_units_sold_day')
          .select('product_id, orders_count')
          .eq('org_id', activeOrgId)
          .gte('d', new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .lte('d', new Date().toISOString().slice(0, 10)),
        supabase
          .from('shipments')
          .select('id, status, eta_estimated, destination_type, destination_country, destination_amazon_fc_code, purchase_orders!inner(project_id)')
          .eq('org_id', activeOrgId)
      ])

      setProjects(projectsData || [])

      const { data: inventoryData, error: inventoryError } = inventoryResult
      if (inventoryError) throw inventoryError
      setInventory(inventoryData || [])

      if (salesResult?.error) {
        console.warn('[Inventory] sales rows unavailable', salesResult.error)
        setSalesRows([])
      } else {
        setSalesRows(salesResult?.data || [])
      }

      if (shipmentsResult?.error) {
        console.warn('[Inventory] inbound shipments unavailable', shipmentsResult.error)
        setShipmentRows([])
      } else {
        setShipmentRows(shipmentsResult?.data || [])
      }
    } catch (err) {
      console.error('Error carregant dades:', err)
      setError(err.message || 'Error carregant dades. Torna a intentar.')
    } finally {
      setLoading(false)
    }
  }

  const salesByProject = useMemo(() => {
    const map = new Map()
    for (const row of salesRows) {
      if (!row?.product_id) continue
      map.set(row.product_id, (map.get(row.product_id) || 0) + safeNumber(row.orders_count))
    }
    return map
  }, [salesRows])

  const shipmentsByProject = useMemo(() => buildShipmentMap(shipmentRows), [shipmentRows])

  const inventoryCards = useMemo(() => {
    return inventory.map((item) => {
      const stock = deriveStockBuckets(item)
      const soldLast30d = salesByProject.get(item.project_id) || 0
      const averageDailySales = soldLast30d > 0 ? soldLast30d / LOOKBACK_DAYS : 0
      const daysOfCoverage = averageDailySales > 0 ? stock.currentStock / averageDailySales : null
      const futureCoverage = averageDailySales > 0 ? stock.totalVisible / averageDailySales : null
      const inboundShipments = shipmentsByProject.get(item.project_id) || []
      const nextInbound = inboundShipments[0] || null
      const decision = decideOperationalAction({
        dailySales: averageDailySales,
        daysOfCoverage: daysOfCoverage ?? Number.POSITIVE_INFINITY,
        futureCoverage: futureCoverage ?? Number.POSITIVE_INFINITY,
        inboundStock: stock.inboundStock,
        hasInboundSignal: Boolean(nextInbound)
      })

      return {
        ...item,
        ...stock,
        soldLast30d,
        averageDailySales,
        daysOfCoverage,
        futureCoverage,
        nextEta: nextInbound?.eta_estimated || null,
        inboundDestination: getDestinationLabel(nextInbound),
        activeInbound: inboundShipments.length > 0 || stock.inboundStock > 0,
        decision
      }
    })
  }, [inventory, salesByProject, shipmentsByProject])

  const stats = useMemo(() => {
    const activeSkus = inventoryCards.length
    const currentStockTotal = inventoryCards.reduce((sum, item) => sum + item.currentStock, 0)
    const inboundTotal = inventoryCards.reduce((sum, item) => sum + item.inboundStock, 0)
    const criticalCoverage = inventoryCards.filter((item) => item.averageDailySales > 0 && safeNumber(item.daysOfCoverage) <= 14).length
    const reorderSuggested = inventoryCards.filter((item) => item.decision.label === DECISION_META.reorder.label).length

    return {
      activeSkus,
      currentStockTotal,
      inboundTotal,
      criticalCoverage,
      reorderSuggested
    }
  }, [inventoryCards])

  const filteredInventory = useMemo(() => {
    return inventoryCards.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesProject = !filterProject || item.project_id === filterProject
      const matchesStatus =
        !filterStatus ||
        (filterStatus === 'reorder' && item.decision.label === DECISION_META.reorder.label) ||
        (filterStatus === 'watch' && item.decision.label === DECISION_META.watch.label) ||
        (filterStatus === 'ok' && item.decision.label === DECISION_META.do_not_reorder.label) ||
        (filterStatus === 'let_die' && item.decision.label === DECISION_META.let_die.label) ||
        (filterStatus === 'inbound' && item.activeInbound)

      return matchesSearch && matchesProject && matchesStatus
    })
  }, [filterProject, filterStatus, inventoryCards, searchTerm])

  useEffect(() => {
    if (!filteredInventory.length) {
      setSelectedInventoryId(null)
      return
    }
    if (!selectedInventoryId || !filteredInventory.some(i => i.id === selectedInventoryId)) {
      setSelectedInventoryId(filteredInventory[0].id)
    }
  }, [filteredInventory, selectedInventoryId])

  const effectiveLayout = isMobile ? 'list' : layout
  const selectedInventoryItem = filteredInventory.find(i => i.id === selectedInventoryId)

  const renderInventoryCard = (item, { isPreview = false, enablePreviewSelect = false } = {}) => {
    return (
      <div
        key={item.id}
        style={{
          ...styles.inventoryCard,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedInventoryId(item.id) : undefined}
      >
        <div style={styles.cardHeader}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#111827', marginBottom: 4 }}>
              {item.sku}
            </div>
            <div style={{ fontSize: 14, color: darkMode ? '#d1d5db' : '#374151', marginBottom: 6 }}>
              {item.product_name || 'Sense nom'}
            </div>
            {item.project && (
              <button
                type="button"
                onClick={() => item.project_id && navigate(`/app/projects/${item.project_id}`)}
                style={{
                  ...styles.projectBadge,
                  cursor: item.project_id ? 'pointer' : 'default',
                  textDecoration: item.project_id ? 'underline' : 'none',
                  background: 'none',
                  border: 'none'
                }}
              >
                {item.project.project_code ? `${item.project.project_code} · ` : ''}
                {item.project.name}
              </button>
            )}
          </div>

          <span
            style={{
              ...styles.decisionBadge,
              color: item.decision.tone,
              backgroundColor: item.decision.background
            }}
          >
            {item.decision.label}
          </span>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Stock resumit</div>
          <div style={styles.metricGrid}>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Stock actual</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatNumber(item.currentStock)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Inbound</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatNumber(item.inboundStock)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Total visible</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatNumber(item.totalVisible)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Senyal</span>
              <strong style={{ color: item.decision.tone }}>{item.decision.label}</strong>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Lectura operativa</div>
          <div style={styles.metricGrid}>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Vendes mitjanes/dia</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatRate(item.averageDailySales)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Cobertura estimada</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatCoverage(item.daysOfCoverage)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>ETA pròxima</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatShortDate(item.nextEta)}</strong>
            </div>
            <div style={styles.metricCell}>
              <span style={styles.metricLabel}>Destí inbound</span>
              <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{item.activeInbound ? item.inboundDestination : 'Sense inbound actiu'}</strong>
            </div>
          </div>
          <div style={{ ...styles.decisionHint, color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {item.decision.hint}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Ubicació resumida</div>
          <div style={styles.locationRow}>
            <span style={styles.locationPill}>Amazon FBA · {formatNumber(item.amazonStock)}</span>
            <span style={styles.locationPill}>Warehouse / FBM · {formatNumber(item.warehouseStock)}</span>
            <span style={styles.locationPill}>Inbound / transit · {formatNumber(item.inboundStock)}</span>
          </div>
        </div>

        {!isPreview && (
          <div style={styles.cardFooter}>
            {item.project_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/app/projects/${item.project_id}`)}
                style={styles.linkButton}
              >
                Veure projecte
              </Button>
            )}
          {item.project && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/app/orders?project=${item.project_id}`)}
                style={styles.linkButton}
              >
                Veure compres
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <Package size={22} />
            Inventari
          </span>
        }
      />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        <div style={styles.readOnlyBanner}>
          <div>
            <div style={{ fontWeight: 700, color: darkMode ? '#ffffff' : '#111827', marginBottom: 4 }}>
              Vista operativa de lectura
            </div>
            <div style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: 13 }}>
              Inventory ara prioritza stock actual, inbound, velocitat de venda i decisió simple de reabastiment.
            </div>
          </div>
        </div>

        <div style={{
          ...styles.statsRow,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))'
        }}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#4f46e5" />
            <div>
              <span style={{ ...styles.statValue, color: '#4f46e5' }}>{stats.activeSkus}</span>
              <span style={styles.statLabel}>SKUs actius</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={24} color="#22c55e" />
            <div>
              <span style={{ ...styles.statValue, color: '#22c55e' }}>{formatNumber(stats.currentStockTotal)}</span>
              <span style={styles.statLabel}>Stock actual total</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Truck size={24} color="#2563eb" />
            <div>
              <span style={{ ...styles.statValue, color: '#2563eb' }}>{formatNumber(stats.inboundTotal)}</span>
              <span style={styles.statLabel}>Inbound total</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <AlertTriangle size={24} color="#ef4444" />
            <div>
              <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.criticalCoverage}</span>
              <span style={styles.statLabel}>Cobertura crítica</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <TrendingUp size={24} color="#d97706" />
            <div>
              <span style={{ ...styles.statValue, color: '#d97706' }}>{stats.reorderSuggested}</span>
              <span style={styles.statLabel}>Reorders suggerits</span>
            </div>
          </div>
        </div>

        <div style={styles.toolbar} className="toolbar-row">
          <div style={styles.searchGroup} className="toolbar-group">
            <div style={styles.searchContainer} className="toolbar-search">
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar SKU o producte..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
          <div style={styles.filters} className="toolbar-group">
            <div className="toolbar-filterSelect" title="Filtre per projecte">
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
              >
                <option value="">Tots els projectes</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="toolbar-filterSelect" title="Filtre per lectura operativa">
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">Totes les lectures</option>
                <option value="reorder">reorder</option>
                <option value="watch">watch</option>
                <option value="ok">do not reorder</option>
                <option value="let_die">let die</option>
                <option value="inbound">inbound actiu</option>
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={loadData} style={styles.refreshBtn}>
              <RefreshCw size={18} />
            </Button>
          </div>
          <div className="toolbar-group view-controls">
            <LayoutSwitcher
              value={effectiveLayout}
              onChange={setLayout}
              compact={isMobile}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 64, ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DataLoading message={t('dataStates.loading')} />
          </div>
        ) : error ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff', border: '1px solid var(--border-color)' }}>
            <DataError message={error} onRetry={loadData} />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DataEmpty
              message="No hi ha SKU operatives per a aquesta selecció."
              icon={Package}
            />
          </div>
        ) : (
          <>
            {effectiveLayout === 'grid' && (
              <div style={styles.inventoryGrid}>
                {filteredInventory.map(item => renderInventoryCard(item))}
              </div>
            )}
            {effectiveLayout === 'list' && (
              <div style={styles.inventoryList}>
                {filteredInventory.map(item => renderInventoryCard(item))}
              </div>
            )}
            {effectiveLayout === 'split' && (
              <div style={styles.splitLayout}>
                <div style={styles.splitList}>
                  {filteredInventory.map(item => renderInventoryCard(item, { enablePreviewSelect: true }))}
                </div>
                <div style={styles.splitPreview}>
                  {selectedInventoryItem ? (
                    renderInventoryCard(selectedInventoryItem, { isPreview: true })
                  ) : (
                    <div style={styles.splitEmpty}>{t('inventoryPage.selectProduct')}</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto' },
  readOnlyBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
    padding: '16px 18px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.09), rgba(34, 197, 94, 0.08))',
    border: '1px solid rgba(79, 70, 229, 0.10)'
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: '600' },
  statLabel: { fontSize: '11px', color: '#6b7280' },
  toolbar: { display: 'flex', marginBottom: '24px' },
  searchGroup: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  searchContainer: { flex: '0 0 auto', width: '320px', minWidth: '240px' },
  searchInput: { flex: 1, minWidth: 0 },
  refreshBtn: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  filters: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' },
  inventoryList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '20px' },
  splitList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitPreview: { position: 'sticky', top: '96px', alignSelf: 'flex-start' },
  splitEmpty: { padding: '24px', borderRadius: '16px', backgroundColor: 'var(--surface-bg)', boxShadow: 'var(--shadow-soft)', color: 'var(--muted)' },
  inventoryCard: { padding: '18px', borderRadius: '18px', border: '1px solid rgba(148, 163, 184, 0.10)', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: '14px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' },
  projectBadge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', backgroundColor: '#4f46e510', color: '#4f46e5', borderRadius: '999px', fontSize: '11px' },
  decisionBadge: { padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.2px', textTransform: 'lowercase', whiteSpace: 'nowrap' },
  section: { display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', fontWeight: 700 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' },
  metricCell: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  metricLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' },
  decisionHint: { fontSize: '12px', lineHeight: 1.5 },
  locationRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  locationPill: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '999px', fontSize: '12px', color: '#374151', backgroundColor: 'rgba(148, 163, 184, 0.10)' },
  cardFooter: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  linkButton: { boxShadow: 'none' }
}
