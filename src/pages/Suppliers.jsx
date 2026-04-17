import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Plus, 
  Search, 
  Users,
  Building2,
  Truck,
  MapPin,
  Phone,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Save,
  MessageCircle,
  Clock,
  Package,
  Filter,
  List,
  Grid2X2
} from 'lucide-react'

// Suppliers expose a simple list/grid toggle — split view was removed because
// a supplier's profile is a flat record, not something to preview alongside a
// list. Click a supplier to open its full sheet.
const SUPPLIERS_VIEW_OPTIONS = [
  { id: 'list', label: 'Llista', Icon: List },
  { id: 'grid', label: 'Graella', Icon: Grid2X2 }
]
import { useApp } from '../context/AppContext'
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier,
  supabase
} from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { DataLoading, DataEmpty } from '../components/dataStates'
import SupplierMemory from '../components/SupplierMemory'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import { showToast } from '../components/Toast'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'
import { isScreenshotMode } from '../lib/ui/screenshotMode'

// Tipus de proveïdors
const SUPPLIER_TYPES = [
  { id: 'manufacturer', name: 'Fabricant', icon: Building2, color: '#4f46e5' },
  { id: 'trading', name: 'Trading Company', icon: Package, color: '#8b5cf6' },
  { id: 'agent', name: 'Agent de Compres', icon: Users, color: '#06b6d4' },
  { id: 'freight', name: 'Transitari', icon: Truck, color: '#f59e0b' }
]

// Incoterms
const INCOTERMS = ['EXW', 'FOB', 'CIF', 'CFR', 'DDP', 'DAP', 'FCA', 'CPT', 'CIP', 'DAT']

// Payment terms
const PAYMENT_TERMS = [
  '100% T/T in advance',
  '30% deposit, 70% before shipment',
  '50% deposit, 50% before shipment',
  '30% deposit, 70% against B/L copy',
  'Net 30 days',
  'Net 60 days',
  'L/C at sight',
  'L/C 30 days',
  'PayPal',
  'Western Union'
]

// Països amb ciutats
const COUNTRIES_CITIES = {
  'China': ['Shenzhen', 'Guangzhou', 'Shanghai', 'Ningbo', 'Yiwu', 'Dongguan', 'Foshan', 'Hangzhou', 'Xiamen', 'Qingdao', 'Tianjin', 'Beijing', 'Huizhou', 'Zhongshan', 'Jiangmen'],
  'India': ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Ahmedabad'],
  'Vietnam': ['Ho Chi Minh', 'Hanoi', 'Da Nang', 'Hai Phong'],
  'Taiwan': ['Taipei', 'Kaohsiung', 'Taichung'],
  'Thailand': ['Bangkok', 'Chiang Mai'],
  'Indonesia': ['Jakarta', 'Surabaya'],
  'Malaysia': ['Kuala Lumpur', 'Penang'],
  'España': ['Barcelona', 'Madrid', 'Valencia', 'Sevilla', 'Bilbao'],
  'Altres': []
}

const CLOSED_QUOTE_VALIDITY = new Set(['FAIL', 'LOCK'])
const CLOSED_SAMPLE_STATUSES = new Set(['RECEIVED', 'REJECTED'])
const CLOSED_PO_STATUSES = new Set(['received', 'cancelled'])
const CLOSED_SHIPMENT_STATUSES = new Set(['delivered'])
const DAY_MS = 24 * 60 * 60 * 1000

const OPERATIONAL_STATUS_META = {
  active: { color: '#0f766e', background: 'rgba(15, 118, 110, 0.12)' },
  watch: { color: '#b45309', background: 'rgba(180, 83, 9, 0.12)' },
  inactive: { color: '#6b7280', background: 'rgba(107, 114, 128, 0.12)' }
}

const RISK_LEVEL_META = {
  high: { color: '#dc2626', background: 'rgba(220, 38, 38, 0.12)' },
  medium: { color: '#d97706', background: 'rgba(217, 119, 6, 0.12)' },
  low: { color: '#2563eb', background: 'rgba(37, 99, 235, 0.12)' },
  none: { color: '#6b7280', background: 'rgba(107, 114, 128, 0.12)' }
}

const EMPTY_OPERATIONAL_SUMMARY = {
  openQuotesCount: 0,
  pendingSamplesCount: 0,
  activePosCount: 0,
  activeShipmentsCount: 0,
  lastActivityAt: null,
  operationalStatus: 'inactive',
  nextAction: 'noImmediateAction',
  riskLevel: 'none',
  needsFollowUp: false
}

const getTimestamp = (value) => {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

const getDaysSince = (value) => {
  const timestamp = getTimestamp(value)
  if (timestamp == null) return Infinity
  return (Date.now() - timestamp) / DAY_MS
}

const getLatestIsoDate = (values) => {
  const timestamps = values
    .map(getTimestamp)
    .filter(timestamp => timestamp != null)

  if (!timestamps.length) return null

  return new Date(Math.max(...timestamps)).toISOString()
}

const deriveSupplierOperationalSummary = ({ quotes, samples, pos, shipmentsByPoId }) => {
  const openQuotes = (quotes || []).filter(
    quote => !CLOSED_QUOTE_VALIDITY.has(String(quote.validity_status || '').toUpperCase())
  )
  const pendingSamples = (samples || []).filter(
    sample => !CLOSED_SAMPLE_STATUSES.has(String(sample.status || 'PENDING').toUpperCase())
  )
  const activePos = (pos || []).filter(
    purchaseOrder => !CLOSED_PO_STATUSES.has(String(purchaseOrder.status || 'draft').toLowerCase())
  )
  const allShipmentRows = (pos || []).flatMap(purchaseOrder => shipmentsByPoId.get(purchaseOrder.id) || [])
  const activeShipments = allShipmentRows.filter(
    shipment => !CLOSED_SHIPMENT_STATUSES.has(String(shipment.status || 'planned').toLowerCase())
  )
  const posWithoutShipment = activePos.filter(purchaseOrder => {
    const relatedShipments = shipmentsByPoId.get(purchaseOrder.id) || []
    return relatedShipments.length === 0
  })

  const lastActivityAt = getLatestIsoDate([
    ...(quotes || []).map(quote => quote.updated_at || quote.created_at),
    ...(samples || []).map(sample => sample.updated_at || sample.created_at),
    ...(pos || []).map(purchaseOrder => purchaseOrder.updated_at || purchaseOrder.order_date || purchaseOrder.created_at),
    ...allShipmentRows.map(shipment => shipment.updated_at || shipment.pickup_date || shipment.created_at)
  ])

  const hasOldPendingSample = pendingSamples.some(sample => getDaysSince(sample.updated_at || sample.created_at) > 14)
  const hasOldPoWithoutShipment = posWithoutShipment.some(
    purchaseOrder => getDaysSince(purchaseOrder.updated_at || purchaseOrder.order_date || purchaseOrder.created_at) > 14
  )

  let operationalStatus = 'inactive'
  if (openQuotes.length || pendingSamples.length || activePos.length || activeShipments.length) {
    operationalStatus = 'active'
  } else if (lastActivityAt) {
    operationalStatus = getDaysSince(lastActivityAt) <= 60 ? 'active' : 'watch'
  }

  let nextAction = 'noImmediateAction'
  if (pendingSamples.length) {
    nextAction = 'reviewSample'
  } else if (activeShipments.length || posWithoutShipment.length) {
    nextAction = 'trackShipment'
  } else if (openQuotes.length) {
    nextAction = 'followUpQuote'
  }

  let riskLevel = 'none'
  if (hasOldPendingSample || hasOldPoWithoutShipment) {
    riskLevel = 'high'
  } else if (openQuotes.length || pendingSamples.length || activePos.length || activeShipments.length) {
    riskLevel = 'medium'
  } else if (lastActivityAt) {
    riskLevel = 'low'
  }

  return {
    openQuotesCount: openQuotes.length,
    pendingSamplesCount: pendingSamples.length,
    activePosCount: activePos.length,
    activeShipmentsCount: activeShipments.length,
    lastActivityAt,
    operationalStatus,
    nextAction,
    riskLevel,
    needsFollowUp: riskLevel === 'high' || riskLevel === 'medium' || nextAction !== 'noImmediateAction'
  }
}

export default function Suppliers() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { darkMode, demoMode, activeOrgId } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState(null)
  const [filterCountry, setFilterCountry] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [saving, setSaving] = useState(false)
  const [layout, setLayout] = useLayoutPreference('layout:suppliers', 'grid')
  const [selectedSupplierId, setSelectedSupplierId] = useState(null)
  const [operationalBySupplier, setOperationalBySupplier] = useState({})
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, supplier: null, isDeleting: false })
  
  // Custom cities (per guardar ciutats afegides manualment)
  const [customCities, setCustomCities] = useState({})
  const [showCustomCityInput, setShowCustomCityInput] = useState(false)
  const [newCityName, setNewCityName] = useState('')

  useEffect(() => {
    loadData()
  }, [activeOrgId])

  useEffect(() => {
    loadCustomCities()
  }, [])

  // Close actions menu when clicking outside
  useEffect(() => {
    if (isScreenshotMode() && menuOpen) {
      setMenuOpen(null)
      return
    }

    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('[data-menu-container]')) {
        setMenuOpen(null)
      }
    }
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [menuOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getSuppliers(activeOrgId ?? undefined)
      setSuppliers(data || [])
      const operationalData = await loadOperationalData(data || [])
      setOperationalBySupplier(operationalData)
    } catch (err) {
      console.error('Error carregant proveïdors:', err)
      setOperationalBySupplier({})
    }
    setLoading(false)
  }

  const loadOperationalData = async (supplierRows) => {
    const supplierIds = supplierRows.map(supplier => supplier.id).filter(Boolean)
    if (!supplierIds.length) return {}

    let quotesQuery = supabase
      .from('supplier_quotes')
      .select('id, supplier_id, created_at, updated_at, validity_status, go_samples')
      .in('supplier_id', supplierIds)

    let samplesQuery = supabase
      .from('supplier_sample_requests')
      .select('id, supplier_id, status, created_at, updated_at')
      .in('supplier_id', supplierIds)

    let posQuery = supabase
      .from('purchase_orders')
      .select('id, supplier_id, status, created_at, updated_at, order_date')
      .in('supplier_id', supplierIds)

    if (activeOrgId) {
      quotesQuery = quotesQuery.eq('org_id', activeOrgId)
      samplesQuery = samplesQuery.eq('org_id', activeOrgId)
      posQuery = posQuery.eq('org_id', activeOrgId)
    }

    const [
      { data: quotes = [], error: quotesError },
      { data: samples = [], error: samplesError },
      { data: purchaseOrders = [], error: posError }
    ] = await Promise.all([quotesQuery, samplesQuery, posQuery])

    if (quotesError) throw quotesError
    if (samplesError) throw samplesError
    if (posError) throw posError

    const poIds = purchaseOrders.map(purchaseOrder => purchaseOrder.id).filter(Boolean)
    let shipments = []
    if (poIds.length) {
      const { data: shipmentRows, error: shipmentsError } = await supabase
        .from('po_shipments')
        .select('id, purchase_order_id, status, created_at, updated_at, pickup_date, eta_date')
        .in('purchase_order_id', poIds)

      if (shipmentsError) throw shipmentsError
      shipments = shipmentRows || []
    }

    const quotesBySupplier = quotes.reduce((acc, quote) => {
      if (!quote.supplier_id) return acc
      if (!acc[quote.supplier_id]) acc[quote.supplier_id] = []
      acc[quote.supplier_id].push(quote)
      return acc
    }, {})

    const samplesBySupplier = samples.reduce((acc, sample) => {
      if (!sample.supplier_id) return acc
      if (!acc[sample.supplier_id]) acc[sample.supplier_id] = []
      acc[sample.supplier_id].push(sample)
      return acc
    }, {})

    const posBySupplier = purchaseOrders.reduce((acc, purchaseOrder) => {
      if (!purchaseOrder.supplier_id) return acc
      if (!acc[purchaseOrder.supplier_id]) acc[purchaseOrder.supplier_id] = []
      acc[purchaseOrder.supplier_id].push(purchaseOrder)
      return acc
    }, {})

    const shipmentsByPoId = shipments.reduce((acc, shipment) => {
      if (!shipment.purchase_order_id) return acc
      const existing = acc.get(shipment.purchase_order_id) || []
      existing.push(shipment)
      acc.set(shipment.purchase_order_id, existing)
      return acc
    }, new Map())

    return supplierRows.reduce((acc, supplier) => {
      acc[supplier.id] = deriveSupplierOperationalSummary({
        quotes: quotesBySupplier[supplier.id] || [],
        samples: samplesBySupplier[supplier.id] || [],
        pos: posBySupplier[supplier.id] || [],
        shipmentsByPoId
      })
      return acc
    }, {})
  }

  const loadCustomCities = async () => {
    try {
      const { data } = await supabase.from('custom_cities').select('*')
      if (data) {
        const grouped = {}
        data.forEach(c => {
          if (!grouped[c.country]) grouped[c.country] = []
          grouped[c.country].push(c.city)
        })
        setCustomCities(grouped)
      }
    } catch (err) {
      console.log('No custom cities table yet')
    }
  }

  const getCitiesForCountry = (country) => {
    const baseCities = COUNTRIES_CITIES[country] || []
    const custom = customCities[country] || []
    return [...new Set([...baseCities, ...custom])].sort()
  }

  const handleAddCustomCity = async () => {
    if (!newCityName.trim() || !editingSupplier?.country) return
    
    const country = editingSupplier.country
    const city = newCityName.trim()
    
    try {
      await supabase.from('custom_cities').insert({ country, city })
      setCustomCities(prev => ({
        ...prev,
        [country]: [...(prev[country] || []), city]
      }))
      setEditingSupplier({ ...editingSupplier, city })
      setNewCityName('')
      setShowCustomCityInput(false)
    } catch (err) {
      // Si la taula no existeix, només guardar local
      setCustomCities(prev => ({
        ...prev,
        [country]: [...(prev[country] || []), city]
      }))
      setEditingSupplier({ ...editingSupplier, city })
      setNewCityName('')
      setShowCustomCityInput(false)
    }
  }

  const handleNewSupplier = () => {
    setEditingSupplier({
      name: '',
      type: 'manufacturer',
      contact_name: '',
      email: '',
      phone: '',
      whatsapp: '',
      wechat: '',
      website: '',
      country: 'China',
      city: '',
      address: '',
      payment_terms: '30% deposit, 70% before shipment',
      incoterm: 'FOB',
      incoterm_location: '',
      lead_time_days: 30,
      rating: 0,
      notes: ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!editingSupplier.name || !editingSupplier.name.trim()) {
      showToast('El nom és obligatori', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingSupplier.id) {
        await updateSupplier(editingSupplier.id, editingSupplier)
        showToast('Proveïdor actualitzat correctament', 'success')
      } else {
        await createSupplier(editingSupplier, activeOrgId ?? undefined)
        showToast('Proveïdor creat correctament', 'success')
      }
      await loadData()
      setShowModal(false)
      setEditingSupplier(null)
    } catch (err) {
      console.error('Error guardant proveïdor:', err)
      showToast(`Error guardant el proveïdor: ${err.message || 'Error desconegut'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (supplier) => {
    // Check demo mode
    if (demoMode) {
      showToast('En mode demo no es poden eliminar dades', 'error')
      return
    }
    
    setDeleteModal({ isOpen: true, supplier, isDeleting: false })
    setMenuOpen(null)
  }

  const handleConfirmDelete = async () => {
    const { supplier } = deleteModal
    if (!supplier) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      await deleteSupplier(supplier.id)
      showToast('Eliminat correctament', 'success')
      await loadData()
      setDeleteModal({ isOpen: false, supplier: null, isDeleting: false })
    } catch (err) {
      console.error('Error eliminant proveïdor:', err)
      
      // Check for FK constraint violation (PostgreSQL error code 23503)
      if (err.code === '23503' || err.message?.includes('foreign key') || err.message?.includes('violates foreign key')) {
        showToast('No es pot eliminar perquè està en ús (comandes/despeses/projectes). Elimina o desvincula els elements relacionats primer.', 'error')
      } else {
        showToast('Error eliminant proveïdor: ' + (err.message || 'Error desconegut'), 'error')
      }
      
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  // Filtrar proveïdors (excloure transitaris que van a altra pàgina)
  const filteredSuppliers = suppliers.filter(s => {
    if (s.type === 'freight') return false // Transitaris van a altra pàgina
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType ? s.type === filterType : true
    const matchesCountry = filterCountry ? s.country === filterCountry : true
    return matchesSearch && matchesType && matchesCountry
  })

  useEffect(() => {
    if (!filteredSuppliers.length) {
      setSelectedSupplierId(null)
      return
    }
    if (!selectedSupplierId || !filteredSuppliers.some(s => s.id === selectedSupplierId)) {
      setSelectedSupplierId(filteredSuppliers[0].id)
    }
  }, [filteredSuppliers, selectedSupplierId])

  // Suppliers no longer support split view — coerce stale preference to grid.
  const normalizedLayout = layout === 'split' ? 'grid' : layout
  const effectiveLayout = isMobile ? 'list' : normalizedLayout
  const selectedSupplier = filteredSuppliers.find(s => s.id === selectedSupplierId)
  const locale = (i18n.language || 'ca').split('-')[0]
  const formatLastActivity = (value) => {
    if (!value) return t('suppliersPage.operational.noRecentActivity')
    return new Date(value).toLocaleDateString(
      locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'ca-ES',
      { day: '2-digit', month: 'short', year: 'numeric' }
    )
  }

  // Stats
  const stats = {
    suppliersWithOpenQuotes: filteredSuppliers.filter(supplier => (operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY).openQuotesCount > 0).length,
    pendingSamples: filteredSuppliers.reduce((sum, supplier) => sum + (operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY).pendingSamplesCount, 0),
    activePos: filteredSuppliers.reduce((sum, supplier) => sum + (operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY).activePosCount, 0),
    activeShipments: filteredSuppliers.reduce((sum, supplier) => sum + (operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY).activeShipmentsCount, 0),
    needsFollowUp: filteredSuppliers.filter(supplier => (operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY).needsFollowUp).length
  }

  const getTypeInfo = (type) => SUPPLIER_TYPES.find(t => t.id === type) || SUPPLIER_TYPES[0]

  const renderSupplierCard = (supplier, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const typeInfo = getTypeInfo(supplier.type)
    const TypeIcon = typeInfo.icon
    const operational = operationalBySupplier[supplier.id] || EMPTY_OPERATIONAL_SUMMARY
    const statusMeta = OPERATIONAL_STATUS_META[operational.operationalStatus] || OPERATIONAL_STATUS_META.inactive
    const riskMeta = RISK_LEVEL_META[operational.riskLevel] || RISK_LEVEL_META.none

    return (
      <div
        key={supplier.id}
        style={{
          ...styles.supplierCard,
          ...(isPreview ? styles.supplierCardPreview : null),
          backgroundColor: 'var(--surface-bg)',
          cursor: isPreview ? 'default' : 'pointer'
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedSupplierId(supplier.id) : undefined}
        onClick={isPreview ? undefined : () => navigate(`/app/suppliers/${supplier.id}`)}
      >
        {/* Header */}
        <div style={styles.cardHeader}>
          <div style={{ ...styles.typeIcon, backgroundColor: `${typeInfo.color}15` }}>
            <TypeIcon size={20} color={typeInfo.color} />
          </div>
          <div style={styles.cardTitleArea}>
            <h3 style={{ ...styles.cardTitle, color: darkMode ? '#ffffff' : '#111827' }}>
              {supplier.name}
            </h3>
            <span style={{ ...styles.typeBadge, backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>
              {typeInfo.name}
            </span>
          </div>
          {!isPreview && (
            <div 
              style={{ position: 'relative' }} 
              data-menu-container
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === supplier.id ? null : supplier.id)
                }}
                style={styles.menuButton}
              >
                <MoreVertical size={18} />
              </Button>
              {menuOpen === supplier.id && (
                <div 
                  style={{ 
                    ...styles.menu, 
                    backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                    zIndex: 1000
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingSupplier(supplier)
                      setShowModal(true)
                      setMenuOpen(null)
                    }}
                    style={styles.menuItem}
                  >
                    <Edit size={14} /> Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(supplier)
                    }}
                    style={styles.menuItemDanger}
                  >
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        <div style={styles.cardRow}>
          <MapPin size={14} color="#6b7280" />
          <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {supplier.city}, {supplier.country}
          </span>
        </div>

        {/* Contact */}
        {supplier.contact_name && (
          <div style={styles.cardRow}>
            <Users size={14} color="#6b7280" />
            <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>{supplier.contact_name}</span>
          </div>
        )}

        {/* Phone/WhatsApp */}
        {(supplier.phone || supplier.whatsapp) && (
          <div style={styles.cardRow}>
            <Phone size={14} color="#6b7280" />
            <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {supplier.phone || supplier.whatsapp}
            </span>
          </div>
        )}

        <div style={styles.operationalBadgeRow}>
          <span style={{ ...styles.statusBadge, color: statusMeta.color, backgroundColor: statusMeta.background }}>
            {t(`suppliersPage.operational.status.${operational.operationalStatus}`)}
          </span>
          <span style={{ ...styles.statusBadge, color: riskMeta.color, backgroundColor: riskMeta.background }}>
            {t(`suppliersPage.operational.risk.${operational.riskLevel}`)}
          </span>
        </div>

        <div style={styles.operationalMetricsGrid}>
          <div style={{ ...styles.operationalMetricCard, backgroundColor: darkMode ? '#0f1118' : '#f8fafc' }}>
            <MessageCircle size={14} color="#2563eb" />
            <div>
              <div style={{ ...styles.operationalMetricValue, color: darkMode ? '#ffffff' : '#111827' }}>{operational.openQuotesCount}</div>
              <div style={styles.operationalMetricLabel}>{t('suppliersPage.operational.metrics.openQuotes')}</div>
            </div>
          </div>
          <div style={{ ...styles.operationalMetricCard, backgroundColor: darkMode ? '#0f1118' : '#f8fafc' }}>
            <Package size={14} color="#d97706" />
            <div>
              <div style={{ ...styles.operationalMetricValue, color: darkMode ? '#ffffff' : '#111827' }}>{operational.pendingSamplesCount}</div>
              <div style={styles.operationalMetricLabel}>{t('suppliersPage.operational.metrics.pendingSamples')}</div>
            </div>
          </div>
          <div style={{ ...styles.operationalMetricCard, backgroundColor: darkMode ? '#0f1118' : '#f8fafc' }}>
            <Building2 size={14} color="#7c3aed" />
            <div>
              <div style={{ ...styles.operationalMetricValue, color: darkMode ? '#ffffff' : '#111827' }}>{operational.activePosCount}</div>
              <div style={styles.operationalMetricLabel}>{t('suppliersPage.operational.metrics.activePos')}</div>
            </div>
          </div>
          <div style={{ ...styles.operationalMetricCard, backgroundColor: darkMode ? '#0f1118' : '#f8fafc' }}>
            <Truck size={14} color="#0891b2" />
            <div>
              <div style={{ ...styles.operationalMetricValue, color: darkMode ? '#ffffff' : '#111827' }}>{operational.activeShipmentsCount}</div>
              <div style={styles.operationalMetricLabel}>{t('suppliersPage.operational.metrics.activeShipments')}</div>
            </div>
          </div>
        </div>

        <div style={styles.operationalFooter}>
          <div style={styles.operationalFooterBlock}>
            <span style={styles.operationalFooterLabel}>{t('suppliersPage.operational.nextActionLabel')}</span>
            <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>
              {t(`suppliersPage.operational.nextAction.${operational.nextAction}`)}
            </strong>
          </div>
          <div style={styles.operationalFooterBlock}>
            <span style={styles.operationalFooterLabel}>{t('suppliersPage.operational.lastActivityLabel')}</span>
            <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>
              {formatLastActivity(operational.lastActivityAt)}
            </strong>
          </div>
        </div>

        {/* Supplier Memory */}
        <SupplierMemory supplierId={supplier.id} darkMode={darkMode} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <Users size={22} />
            {t('suppliersPage.pageTitle')}
          </span>
        }
      />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Toolbar */}
        <div style={styles.toolbar} className="toolbar-row">
          <div style={styles.searchGroup} className="toolbar-group">
            <div style={styles.searchContainer} className="toolbar-search">
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder={t('suppliersPage.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filters} className="toolbar-group">
            <div className="toolbar-filterSelect" title="Filtre per tipus">
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterType || ''}
                onChange={e => setFilterType(e.target.value || null)}
              >
                <option value="">{t('suppliersPage.filters.allTypes')}</option>
                {SUPPLIER_TYPES.filter(t => t.id !== 'freight').map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="toolbar-filterSelect" title="Filtre per país">
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterCountry || ''}
                onChange={e => setFilterCountry(e.target.value || null)}
              >
                <option value="">{t('suppliersPage.filters.allCountries')}</option>
                {Object.keys(COUNTRIES_CITIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-group view-controls">
            <LayoutSwitcher
              value={effectiveLayout}
              onChange={setLayout}
              compact={isMobile}
              options={SUPPLIERS_VIEW_OPTIONS}
            />
          </div>
          <div style={styles.toolbarRight} className="toolbar-group">
            <Button
              size="sm"
              onClick={handleNewSupplier} 
              className="toolbar-cta"
            >
              <Plus size={18} /> {t('common.createSupplier')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: 'var(--surface-bg)' }}>
            <MessageCircle size={24} color="var(--c-teal-300)" />
            <div>
              <span style={styles.statValue}>{stats.suppliersWithOpenQuotes}</span>
              <span style={styles.statLabel}>{t('suppliersPage.kpis.suppliersWithOpenQuotes')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: 'var(--surface-bg)' }}>
            <Package size={24} color="var(--c-teal-300)" />
            <div>
              <span style={styles.statValue}>{stats.pendingSamples}</span>
              <span style={styles.statLabel}>{t('suppliersPage.kpis.pendingSamples')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: 'var(--surface-bg)' }}>
            <Building2 size={24} color="var(--c-teal-900)" />
            <div>
              <span style={styles.statValue}>{stats.activePos}</span>
              <span style={styles.statLabel}>{t('suppliersPage.kpis.activePos')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: 'var(--surface-bg)' }}>
            <Truck size={24} color="var(--c-teal-300)" />
            <div>
              <span style={styles.statValue}>{stats.activeShipments}</span>
              <span style={styles.statLabel}>{t('suppliersPage.kpis.activeShipments')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: 'var(--surface-bg)' }}>
            <Clock size={24} color="var(--c-teal-900)" />
            <div>
              <span style={styles.statValue}>{stats.needsFollowUp}</span>
              <span style={styles.statLabel}>{t('suppliersPage.kpis.needsFollowUp')}</span>
            </div>
          </div>
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <div style={{ ...styles.empty, backgroundColor: 'var(--surface-bg)', padding: 64 }}>
            <DataLoading message={t('common.loading')} />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: 'var(--surface-bg)' }}>
            <DataEmpty
              icon={Users}
              message={t('suppliers.empty.title')}
              action={
                <Button onClick={handleNewSupplier}>
                  <Plus size={18} /> {t('common.createSupplier')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {effectiveLayout === 'grid' && (
              <div style={{
                ...styles.suppliersGrid,
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
                gap: isMobile ? '12px' : '20px'
              }}>
                {filteredSuppliers.map(supplier => renderSupplierCard(supplier))}
              </div>
            )}
            {effectiveLayout === 'list' && (
              <div style={styles.suppliersList}>
                {filteredSuppliers.map(supplier => renderSupplierCard(supplier))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && editingSupplier && (
        <div style={styles.modalOverlay} onClick={() => { setShowModal(false); setEditingSupplier(null) }}>
          <div style={{ ...styles.modal, backgroundColor: 'var(--surface-bg)' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingSupplier.id ? 'Editar Proveïdor' : 'Nou Proveïdor'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowModal(false); setEditingSupplier(null) }}
                style={styles.closeButton}
              >
                <X size={20} />
              </Button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                {/* Nom */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Nom de l'empresa *</label>
                  <input
                    type="text"
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    placeholder="Ex: Huizhou Ziyuan Houseware"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Tipus */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipus</label>
                  <select
                    value={editingSupplier.type}
                    onChange={e => setEditingSupplier({ ...editingSupplier, type: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    {SUPPLIER_TYPES.filter(t => t.id !== 'freight').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Contacte */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Persona de contacte</label>
                  <input
                    type="text"
                    value={editingSupplier.contact_name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contact_name: e.target.value })}
                    placeholder="Ex: Lucy Wang"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* País */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>País</label>
                  <select
                    value={editingSupplier.country}
                    onChange={e => setEditingSupplier({ ...editingSupplier, country: e.target.value, city: '' })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    {Object.keys(COUNTRIES_CITIES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Ciutat amb opció manual */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ciutat</label>
                  <div style={styles.cityInputGroup}>
                    <select
                      value={editingSupplier.city}
                      onChange={e => {
                        if (e.target.value === '__add_new__') {
                          setShowCustomCityInput(true)
                        } else {
                          setEditingSupplier({ ...editingSupplier, city: e.target.value })
                        }
                      }}
                      style={{ ...styles.input, flex: 1, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                    >
                      <option value="">Selecciona...</option>
                      {getCitiesForCountry(editingSupplier.country).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__add_new__">➕ Afegir nova ciutat...</option>
                    </select>
                  </div>
                  {showCustomCityInput && (
                    <div style={styles.customCityRow}>
                      <input
                        type="text"
                        value={newCityName}
                        onChange={e => setNewCityName(e.target.value)}
                        placeholder="Nom de la ciutat"
                        style={{ ...styles.input, flex: 1, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                      />
                      <Button variant="secondary" size="sm" onClick={handleAddCustomCity} style={styles.addCityBtn}>Afegir</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowCustomCityInput(false); setNewCityName('') }} style={styles.cancelCityBtn}>✕</Button>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    value={editingSupplier.email}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    placeholder="email@example.com"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Telèfon */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telèfon</label>
                  <input
                    type="tel"
                    value={editingSupplier.phone}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    placeholder="+86 123 456 7890"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* WhatsApp */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>WhatsApp</label>
                  <input
                    type="tel"
                    value={editingSupplier.whatsapp}
                    onChange={e => setEditingSupplier({ ...editingSupplier, whatsapp: e.target.value })}
                    placeholder="+86 123 456 7890"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* WeChat */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>WeChat ID</label>
                  <input
                    type="text"
                    value={editingSupplier.wechat}
                    onChange={e => setEditingSupplier({ ...editingSupplier, wechat: e.target.value })}
                    placeholder="wechat_id"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Payment Terms */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Condicions de Pagament</label>
                  <select
                    value={editingSupplier.payment_terms}
                    onChange={e => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    {PAYMENT_TERMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Incoterm */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Incoterm</label>
                  <select
                    value={editingSupplier.incoterm}
                    onChange={e => setEditingSupplier({ ...editingSupplier, incoterm: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    {INCOTERMS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                {/* Incoterm Location */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lloc Incoterm</label>
                  <input
                    type="text"
                    value={editingSupplier.incoterm_location}
                    onChange={e => setEditingSupplier({ ...editingSupplier, incoterm_location: e.target.value })}
                    placeholder="Ex: Shenzhen Port"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Lead Time */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Lead Time (dies)</label>
                  <input
                    type="number"
                    value={editingSupplier.lead_time_days}
                    onChange={e => setEditingSupplier({ ...editingSupplier, lead_time_days: parseInt(e.target.value) || 0 })}
                    placeholder="30"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Rating */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Valoració</label>
                  <div style={styles.ratingInput}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Button
                        key={i}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSupplier({ ...editingSupplier, rating: i })}
                        style={styles.starButton}
                      >
                        <Star size={20} fill={i <= editingSupplier.rating ? '#f59e0b' : 'none'} color={i <= editingSupplier.rating ? '#f59e0b' : '#d1d5db'} />
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Adreça */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Adreça completa</label>
                  <input
                    type="text"
                    value={editingSupplier.address}
                    onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    placeholder="Adreça completa..."
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                {/* Notes */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    value={editingSupplier.notes}
                    onChange={e => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
                    rows={3}
                    placeholder="Notes addicionals..."
                    style={{ ...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <Button
                variant="secondary"
                onClick={() => { setShowModal(false); setEditingSupplier(null) }}
                style={styles.cancelButton}
              >
                Cancel·lar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, supplier: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        entityName={deleteModal.supplier?.name || ''}
        entityType="proveïdor"
        entityLabel={t('suppliersPage.deleteEntityNoun')}
        isDeleting={deleteModal.isDeleting}
        darkMode={darkMode}
        showUsageWarning={true}
      />
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto' },
  toolbar: { display: 'flex', marginBottom: '24px' },
  searchGroup: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  searchContainer: { flex: '0 0 auto', width: '320px', minWidth: '240px' },
  searchInput: { flex: 1, minWidth: 0 },
  filters: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  filterSelect: { height: 'var(--btn-h-sm)', padding: '0 12px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--btn-secondary-border)', backgroundColor: 'var(--btn-ghost-bg)', color: 'var(--btn-secondary-fg)', fontSize: '14px', outline: 'none', cursor: 'pointer', boxShadow: 'var(--btn-shadow)' },
  filterButton: { height: 'var(--btn-h-sm)' },
  toolbarRight: { display: 'inline-flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'nowrap' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '24px', fontWeight: '600', color: '#1F4E5F' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  suppliersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  suppliersList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '20px' },
  splitList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitPreview: { position: 'sticky', top: '96px', alignSelf: 'flex-start' },
  splitEmpty: { padding: '24px', borderRadius: '16px', backgroundColor: 'var(--surface-bg)', boxShadow: 'var(--shadow-soft)', color: 'var(--muted)' },
  supplierCard: { padding: '20px', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  supplierCardPreview: { cursor: 'default' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' },
  typeIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1 },
  cardTitle: { margin: '0 0 4px', fontSize: '16px', fontWeight: '600' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' },
  cardRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px' },
  ratingRow: { display: 'flex', gap: '2px', marginTop: '12px' },
  operationalBadgeRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', marginBottom: '14px' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' },
  operationalMetricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '14px' },
  operationalMetricCard: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px' },
  operationalMetricValue: { fontSize: '16px', fontWeight: '700', color: '#111827', lineHeight: 1.1 },
  operationalMetricLabel: { fontSize: '11px', color: '#6b7280', lineHeight: 1.2 },
  operationalFooter: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '8px' },
  operationalFooterBlock: { display: 'flex', flexDirection: 'column', gap: '4px' },
  operationalFooterLabel: { fontSize: '11px', color: '#6b7280' },
  menuButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)', color: '#9ca3af' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '120px', borderRadius: '10px', border: '1px solid rgba(31, 78, 95, 0.12)', boxShadow: 'var(--shadow-soft-hover)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  menuItemDanger: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '80px' },
  cancelButton: { minWidth: '120px' },
  saveButton: { minWidth: '140px' },
  ratingInput: { display: 'flex', gap: '4px' },
  starButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  cityInputGroup: { display: 'flex', gap: '8px' },
  customCityRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  addCityBtn: { minWidth: '96px' },
  cancelCityBtn: { minWidth: '56px' }
}
