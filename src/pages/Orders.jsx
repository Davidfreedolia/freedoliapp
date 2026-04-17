import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  FileText,
  Download,
  Eye,
  Trash2,
  Edit,
  MoreVertical,
  Calendar,
  Building2,
  Package,
  Truck,
  DollarSign,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Loader,
  X,
  Ship,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  getPurchaseOrders, 
  deletePurchaseOrder,
  getProjects,
  getSuppliers,
  getPurchaseOrder,
  getCompanySettings,
  updatePurchaseOrder,
  getProductIdentifiers,
  getProject,
  getPoAmazonReadiness,
  upsertPoAmazonReadiness,
  updatePoAmazonReadinessLabels,
  getQuoteForPo,
  getShipmentForPo
} from '../lib/supabase'
import ShipmentTrackingSection from '../components/ShipmentTrackingSection'
import TasksSection from '../components/TasksSection'
import DecisionLog from '../components/DecisionLog'
import PlannedVsActual from '../components/PlannedVsActual'
import Header from '../components/Header'
import NewPOModal from '../components/NewPOModal'
import LogisticsFlow from '../components/LogisticsFlow'
import ShipmentsPanel from '../components/Logistics/ShipmentsPanel'
import AmazonReadySection from '../components/AmazonReadySection'
import ManufacturerPackModal from '../components/ManufacturerPackModal'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'
import { generatePOPdf } from '../lib/generatePOPdf'
import { generateFnskuLabelsPdf } from '../lib/generateFnskuLabelsPdf'
import { computePoAmazonReady } from '../lib/amazonReady'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { validateManufacturerPack, getManufacturerPackFileNames } from '../lib/manufacturerPack'
import { generatePackingListPdf } from '../lib/generatePackingListPdf'
import { generateCartonLabelsPdf } from '../lib/generateCartonLabelsPdf'
import JSZip from 'jszip'
import { safeJsonArray } from '../lib/safeJson'
import { safeArray } from '../lib/safeArray'
import { formatError, notifyError } from '../lib/errorHandling'
import { isScreenshotMode } from '../lib/ui/screenshotMode'
import { DataLoading, DataError, DataEmpty } from '../components/dataStates'
import { showToast } from '../components/Toast'
import { useTranslation } from 'react-i18next'
import NextStepCard from '../components/assistant/NextStepCard'
import { deriveOrderOperationalCard } from '../lib/orders/deriveOrderOperationalCard'

// PO status visuals (labels from i18n: orders.status.*)
const PO_STATUS_META = {
  draft: { color: '#6b7280', icon: Edit },
  sent: { color: '#3b82f6', icon: Send },
  confirmed: { color: '#8b5cf6', icon: CheckCircle },
  partial_paid: { color: '#f59e0b', icon: DollarSign },
  paid: { color: '#22c55e', icon: DollarSign },
  in_production: { color: '#ec4899', icon: Package },
  shipped: { color: '#06b6d4', icon: Truck },
  received: { color: '#10b981', icon: CheckCircle },
  cancelled: { color: '#ef4444', icon: AlertCircle }
}

const RISK_META = {
  high: { color: '#dc2626', background: 'rgba(220, 38, 38, 0.12)' },
  medium: { color: '#d97706', background: 'rgba(217, 119, 6, 0.12)' },
  low: { color: '#0f766e', background: 'rgba(15, 118, 110, 0.12)' },
  done: { color: '#2563eb', background: 'rgba(37, 99, 235, 0.12)' }
}

export default function Orders() {
  const { darkMode, activeOrgId } = useApp()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useBreakpoint()
  const { t, i18n } = useTranslation()
  const resolveLocale = () => {
    const lng = (i18n.language || 'ca').split('-')[0]
    if (lng === 'en') return 'en-US'
    if (lng === 'es') return 'es-ES'
    return 'ca-ES'
  }
  const [searchParams] = useSearchParams()
  
  const [orders, setOrders] = useState([])
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [layout, setLayout] = useLayoutPreference('layout:orders', 'grid')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  // Rich PO detail loaded for the split-view right pane
  const [splitDetail, setSplitDetail] = useState(null)
  const [splitDetailLoading, setSplitDetailLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(null)
  
  // Modal detall
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [labelsConfig, setLabelsConfig] = useState({
    quantity: 30,
    template: 'AVERY_5160',
    includeSku: true,
    includeName: true,
    offsetXmm: 0,
    offsetYmm: 0,
    testPrint: false
  })
  const [amazonReadiness, setAmazonReadiness] = useState(null)
  const [amazonReadyStatus, setAmazonReadyStatus] = useState({ ready: false, missing: [] })
  const [showAmazonReadySection, setShowAmazonReadySection] = useState(false)
  const [showManufacturerPackModal, setShowManufacturerPackModal] = useState(false)
  const [manufacturerPackIdentifiers, setManufacturerPackIdentifiers] = useState(null)
  const [selectedOrders] = useState(new Set())
  // Removed unused bulkActionLoading state
  const [collapsedOrderGroups, setCollapsedOrderGroups] = useState(new Set())

  useEffect(() => {
    loadData()
  }, [])

  // Abrir modal automáticamente si action=create en URL
  useEffect(() => {
    if (isScreenshotMode()) return
    const action = searchParams.get('action')
    const projectId = searchParams.get('project')
    if (action === 'create' && projectId && projects.length > 0) {
      // Esperar a que projects esté carregat
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setEditingOrder({ project_id: projectId })
        setShowModal(true)
        // Netejar URL per evitar reobrir el modal en refresh
        window.history.replaceState({}, '', '/orders?project=' + projectId)
      }
    }
  }, [searchParams, projects])

  // Keep menu closed in screenshot mode for stable captures
  useEffect(() => {
    if (isScreenshotMode() && menuOpen) {
      setMenuOpen(null)
    }
  }, [menuOpen])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersData, projectsData, suppliersData] = await Promise.all([
        getPurchaseOrders(null, activeOrgId ?? undefined).catch(() => []),
        getProjects(false, activeOrgId ?? undefined).catch(() => []),
        getSuppliers(activeOrgId ?? undefined).catch(() => [])
      ])
      
      // Establecer datos básicos primero para que la página se muestre
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      setLoading(false) // Marcar como cargado para mostrar la página
      
      // Carregar estat Amazon Ready + shipment summary per cada PO (async, després de mostrar la pàgina)
      if (ordersData && ordersData.length > 0) {
        const ordersWithReadiness = await Promise.all(
          ordersData.map(async (order) => {
            if (!order.project_id) {
              return {
                ...order,
                amazonReadyStatus: null,
                shipment: null,
                ...deriveOrderOperationalCard({
                  ...order,
                  amazonReadyStatus: null,
                  shipment: null,
                  manufacturerPackStatus: null
                })
              }
            }
            
            try {
              const [readiness, identifiers, shipment] = await Promise.all([
                getPoAmazonReadiness(order.id),
                getProductIdentifiers(order.project_id),
                getShipmentForPo(order.id)
              ])
              
              const readyStatus = computePoAmazonReady({
                po: order,
                identifiers,
                readiness
              })
              
              // Manufacturer pack status
              let packStatus = null
              if (readiness) {
                if (readiness.manufacturer_pack_sent_at) {
                  packStatus = 'sent'
                } else if (readiness.manufacturer_pack_generated_at) {
                  packStatus = 'generated'
                }
              }

              const operational = deriveOrderOperationalCard({
                ...order,
                shipment,
                amazonReadyStatus: readyStatus,
                manufacturerPackStatus: packStatus
              })
              
              return { 
                ...order, 
                shipment,
                amazonReadyStatus: readyStatus,
                manufacturerPackStatus: packStatus,
                manufacturerPackVersion: readiness?.manufacturer_pack_version || null,
                manufacturerPackGeneratedAt: readiness?.manufacturer_pack_generated_at || null,
                manufacturerPackSentAt: readiness?.manufacturer_pack_sent_at || null,
                ...operational
              }
            } catch (err) {
              if (import.meta.env.DEV) {
                console.error(`Error carregant Amazon readiness per PO ${order.id}:`, err)
              }
              return {
                ...order,
                amazonReadyStatus: null,
                shipment: null,
                ...deriveOrderOperationalCard({ ...order, amazonReadyStatus: null, shipment: null, manufacturerPackStatus: null })
              }
            }
          })
        )
        setOrders(ordersWithReadiness)
      }
    } catch (err) {
      setError(formatError(err))
      setOrders([])
      setProjects([])
      setSuppliers([])
      notifyError(err, { context: 'Orders:loadData' })
    } finally {
      setLoading(false)
    }
  }

  // Carregar Amazon readiness
  const loadAmazonReadiness = async (poId, projectId, poData = null) => {
    try {
      const readiness = await getPoAmazonReadiness(poId)
      let finalReadiness = readiness
      
      // Si no existeix, crear registre inicial
      if (!readiness && poId && projectId) {
        finalReadiness = await upsertPoAmazonReadiness(poId, projectId, {
          needs_fnsku: true
        }, activeOrgId ?? undefined)
      }
      
      setAmazonReadiness(finalReadiness)
      
      // Calcular estat ready
      if (finalReadiness) {
        const identifiers = await getProductIdentifiers(projectId)
        const po = poData || selectedOrder
        const status = computePoAmazonReady({
          po: po,
          identifiers,
          readiness: finalReadiness
        })
        setAmazonReadyStatus(status)
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error carregant Amazon readiness:', err)
      }
    }
  }

  // Veure detall PO
  const handleViewOrder = async (order) => {
    setLoadingDetail(true)
    setShowDetailModal(true)
    setMenuOpen(null)
    try {
      const fullOrder = await getPurchaseOrder(order.id)
      setSelectedOrder(fullOrder)
      
      // Carregar Amazon readiness
      if (fullOrder.project_id) {
        await loadAmazonReadiness(fullOrder.id, fullOrder.project_id, fullOrder)
      }
      
      // Load quote and shipment for Planned vs Actual
      const [quote, shipment] = await Promise.all([
        getQuoteForPo(fullOrder.id),
        getShipmentForPo(fullOrder.id)
      ])
      setSelectedQuote(quote)
      setSelectedShipment(shipment)
    } catch (err) {
      notifyError(err, { context: 'Orders:handleViewOrder' })
      setShowDetailModal(false)
    }
    setLoadingDetail(false)
  }

  // Generar etiquetes FNSKU
  const handleGenerateLabels = async () => {
    if (!selectedOrder?.project_id) {
      showToast(`${t('orders.toasts.errorPrefix')} ${t('orders.toasts.noProject')}`, 'error')
      return
    }

    try {
      // Obtenir identificadors del projecte
      const identifiers = await getProductIdentifiers(selectedOrder.project_id)
      if (!identifiers || !identifiers.fnsku) {
        showToast(`${t('orders.toasts.errorPrefix')} ${t('orders.toasts.missingFnsku')}`, 'error')
        return
      }

      // Obtenir projecte per SKU i nom
      const project = await getProject(selectedOrder.project_id)

      // Generar PDF (async ara)
      const doc = await generateFnskuLabelsPdf({
        fnsku: identifiers.fnsku,
        sku: project.sku || '',
        productName: project.name || '',
        quantity: labelsConfig.quantity,
        template: labelsConfig.template,
        includeSku: labelsConfig.includeSku,
        includeName: labelsConfig.includeName,
        offsetXmm: labelsConfig.offsetXmm || 0,
        offsetYmm: labelsConfig.offsetYmm || 0,
        testPrint: labelsConfig.testPrint || false
      })

      // Descarregar
      doc.save(`FNSKU-labels-${identifiers.fnsku}-${Date.now()}.pdf`)
      
      // Actualitzar Amazon readiness amb les etiquetes generades
      try {
        await updatePoAmazonReadinessLabels(selectedOrder.id, {
          quantity: labelsConfig.quantity,
          template: labelsConfig.template
        })
        // Recarregar readiness
        if (selectedOrder?.project_id) {
          await loadAmazonReadiness(selectedOrder.id, selectedOrder.project_id)
        }
        } catch (err) {
          notifyError(err, { context: 'Orders:handleUpdateAmazonReadiness' })
        // No bloquejar si falla aquesta actualització
      }
      
      setShowLabelsModal(false)
    } catch (err) {
      notifyError(err, { context: 'Orders:handleGenerateLabels' })
    }
  }

  // Generar Manufacturer Pack (used by ManufacturerPackModal)
  const handleGenerateManufacturerPack = async (options) => {
    const {
      includePOPdf,
      includeFnskuLabels,
      includePackingList,
      includeCartonLabels,
      fnskuQuantity,
      fnskuTemplate
    } = options

    if (!selectedOrder?.id || !selectedOrder?.project_id) {
      throw new Error(t('orders.errors.noProjectAssociated'))
    }

    // Validar
    const identifiers = await getProductIdentifiers(selectedOrder.project_id)
    const validation = validateManufacturerPack({
      readiness: amazonReadiness,
      identifiers,
      options: { includePackingList, includeCartonLabels, includeFnskuLabels }
    })

    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'))
    }

    try {
      // Obtenir dades necessàries
      const [project, supplier, companySettings] = await Promise.all([
        getProject(selectedOrder.project_id),
        selectedOrder.supplier_id ? getSuppliers(activeOrgId ?? undefined).then(suppliers =>
          suppliers.find(s => s.id === selectedOrder.supplier_id)
        ) : Promise.resolve(null),
        getCompanySettings(activeOrgId ?? undefined)
      ])

      const fileNames = getManufacturerPackFileNames(selectedOrder.po_number)
      const zip = new JSZip()

      // 1. Generar PO PDF
      if (includePOPdf) {
        const poDoc = await generatePOPdf(selectedOrder, supplier, companySettings)
        const poBlob = poDoc.output('blob')
        zip.file(fileNames.po, poBlob)
      }

      // 2. Generar FNSKU Labels
      if (includeFnskuLabels && amazonReadiness?.needs_fnsku !== false && identifiers?.fnsku) {
        const fnskuDoc = await generateFnskuLabelsPdf({
          fnsku: identifiers.fnsku,
          sku: project.sku || '',
          productName: project.name || '',
          quantity: fnskuQuantity,
          template: fnskuTemplate === 'A4_30UP' ? 'AVERY_5160' : fnskuTemplate,
          includeSku: true,
          includeName: true
        })
        const fnskuBlob = fnskuDoc.output('blob')
        zip.file(fileNames.fnsku, fnskuBlob)

        // Actualitzar readiness amb labels generats
        await updatePoAmazonReadinessLabels(selectedOrder.id, {
          quantity: fnskuQuantity,
          template: fnskuTemplate
        })
      }

      // 3. Generar Packing List
      if (includePackingList && amazonReadiness) {
        const packingListDoc = await generatePackingListPdf(
          selectedOrder,
          project,
          supplier,
          companySettings,
          amazonReadiness
        )
        const packingListBlob = packingListDoc.output('blob')
        zip.file(fileNames.packingList, packingListBlob)
      }

      // 4. Generar Carton Labels
      if (includeCartonLabels && amazonReadiness) {
        const cartonLabelsDoc = await generateCartonLabelsPdf({
          poNumber: selectedOrder.po_number,
          projectSku: project.sku || '',
          cartonsCount: amazonReadiness.cartons_count,
          unitsPerCarton: amazonReadiness.units_per_carton,
          cartonWeightKg: amazonReadiness.carton_weight_kg,
          cartonLengthCm: amazonReadiness.carton_length_cm,
          cartonWidthCm: amazonReadiness.carton_width_cm,
          cartonHeightCm: amazonReadiness.carton_height_cm,
          labelsPerPage: 2
        })
        const cartonLabelsBlob = cartonLabelsDoc.output('blob')
        zip.file(fileNames.cartonLabels, cartonLabelsBlob)
      }

      // Generar ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Audit log
      try {
        const { logSuccess } = await import('../lib/auditLog')
        await logSuccess(
          'manufacturer_pack',
          'manufacturer_pack_generated',
          selectedOrder.id,
          'Manufacturer pack generated',
          {
            po_id: selectedOrder.id,
            po_number: selectedOrder.po_number,
            documents: {
              po: includePOPdf,
              fnsku_labels: includeFnskuLabels,
              packing_list: includePackingList,
              carton_labels: includeCartonLabels
            }
          }
            )
          } catch (auditErr) {
            if (import.meta.env.DEV) {
              console.warn('Error registrant audit log:', auditErr)
            }
          }

      // Descarregar ZIP
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileNames.zip
      a.click()
      URL.revokeObjectURL(url)

      showToast(t('orders.toasts.manufacturerPackSuccess'), 'success')

      // Recarregar readiness si s'han generat labels
      if (includeFnskuLabels && amazonReadiness?.needs_fnsku !== false) {
        await loadAmazonReadiness(selectedOrder.id, selectedOrder.project_id)
      }
    } catch (err) {
      notifyError(err, { context: 'Orders:handleGenerateManufacturerPack' })
      throw err
    }
  }

  // Descarregar PDF
  const handleDownloadPdf = async (order) => {
    setDownloadingPdf(order.id)
    setMenuOpen(null)
    try {
      const [fullOrder, companySettings] = await Promise.all([
        getPurchaseOrder(order.id),
        getCompanySettings(activeOrgId ?? undefined)
      ])
      const supplier = suppliers.find(s => s.id === order.supplier_id) || fullOrder.supplier
      await generatePOPdf(fullOrder, supplier, companySettings)
    } catch (err) {
      notifyError(err, { context: 'Orders:handleDownloadPdf' })
    }
    setDownloadingPdf(null)
  }

  // Canviar estat
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updatePurchaseOrder(orderId, { status: newStatus })
      await loadData()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (err) {
      notifyError(err, { context: 'Orders:handleUpdateStatus' })
    }
  }

  // Filtrar comandes (con manejo de errores)
  const filteredOrders = safeArray(orders).filter(order => {
    try {
      if (!order) return false
      const matchesSearch = !searchTerm || 
        order?.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order?.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order?.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !filterStatus || order?.status === filterStatus
      const matchesProject = !filterProject || order?.project_id === filterProject
      return matchesSearch && matchesStatus && matchesProject
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error filtering order:', err, order)
      }
      return false
    }
  })

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null)
      return
    }
    if (!selectedOrderId || !filteredOrders.some(o => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0].id)
    }
  }, [filteredOrders, selectedOrderId])

  const effectiveLayout = isMobile ? 'list' : layout
  const selectedOrderCard = filteredOrders.find(o => o.id === selectedOrderId)

  // Load full PO detail (line items, etc.) when in split mode.
  useEffect(() => {
    if (effectiveLayout !== 'split' || !selectedOrderId) {
      setSplitDetail(null)
      return
    }
    let cancelled = false
    setSplitDetailLoading(true)
    getPurchaseOrder(selectedOrderId)
      .then((row) => { if (!cancelled) setSplitDetail(row || null) })
      .catch((err) => {
        console.warn('Failed to load PO detail for split view:', err?.message || err)
        if (!cancelled) setSplitDetail(null)
      })
      .finally(() => { if (!cancelled) setSplitDetailLoading(false) })
    return () => { cancelled = true }
  }, [effectiveLayout, selectedOrderId])

  const ordersArray = safeArray(orders)
  const stats = useMemo(() => ({
    total: ordersArray.length,
    requiringAttention: ordersArray.filter(o => o?.riskLevel === 'high').length,
    activeLogistics: ordersArray.filter(o => o?.shipment && o?.shipment?.status !== 'delivered').length,
    notAmazonReady: ordersArray.filter(o => o?.amazonReadyStatus && o.amazonReadyStatus.ready === false).length,
    completed: ordersArray.filter(o => o?.status === 'received').length
  }), [ordersArray])

  const handleDeleteOrder = async (order) => {
    if (!confirm(t('orders.confirmDelete', { poNumber: order.po_number }))) return
    try {
      await deletePurchaseOrder(order.id)
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      notifyError(err, { context: 'Orders:handleDelete' })
    }
  }

  const handleSaveOrder = async () => {
    setShowModal(false)
    setEditingOrder(null)
    await loadData()
  }

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleDateString(resolveLocale())
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error formatting date:', err)
      }
      return '-'
    }
  }

  const formatCurrency = (amount, currency = 'USD') => {
    try {
      return new Intl.NumberFormat(resolveLocale(), {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount || 0)
    } catch (err) {
      console.error('Error formatting currency:', err)
      return `${amount || 0} ${currency || 'USD'}`
    }
  }

  const renderOrderCard = (order, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const statusKey = PO_STATUS_META[order.status] ? order.status : 'draft'
    const status = {
      ...PO_STATUS_META[statusKey],
      name: t(`orders.status.${statusKey}`)
    }
    const StatusIcon = status.icon
    const risk = RISK_META[order.riskLevel] || RISK_META.low
    const amazonReadyLabel = order.amazonReadyStatus == null
      ? t('orders.operational.readiness.unknown')
      : (order.amazonReadyStatus.ready ? t('orders.operational.readiness.ready') : t('orders.operational.readiness.notReady'))
    const packLabel = order.manufacturerPackStatus === 'sent'
      ? t('orders.operational.packStatus.sent')
      : order.manufacturerPackStatus === 'generated'
        ? t('orders.operational.packStatus.generated')
        : t('orders.operational.packStatus.notStarted')
    const blockerDetails = Array.isArray(order.amazonReadyStatus?.missing) ? order.amazonReadyStatus.missing : []
    const blockerLabel = t(`orders.operational.blockers.${order.blockerKey || 'no_blockers'}`)
    const blockerHint = order.blockerKey === 'amazon_setup_missing' && blockerDetails.length > 0
      ? blockerDetails.slice(0, 2).join(' · ')
      : blockerLabel
    const nextActionLabel = t(`orders.operational.nextActions.${order.nextActionKey || 'monitor_execution'}`)
    const shipmentLabel = t(`orders.operational.shipmentSummary.${order.shipmentSummaryKey || 'no_shipment'}`, {
      defaultValue: order.shipmentStatus
        ? order.shipmentStatus.replace(/_/g, ' ')
        : t('orders.operational.shipmentSummary.no_shipment')
    })

    return (
      <div
        key={order.id}
        style={{
          ...styles.orderCard,
          backgroundColor: 'var(--surface-bg)'
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedOrderId(order.id) : undefined}
      >
        <div style={styles.orderCardHeader}>
          <div>
            <div style={{ fontWeight: '600', color: darkMode ? '#ffffff' : '#111827', marginBottom: '4px' }}>
              {order.po_number}
            </div>
            <div style={{ fontSize: '14px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {order.project?.name || '-'}
            </div>
            <div style={{ fontSize: '13px', color: darkMode ? '#6b7280' : '#6b7280', marginTop: '4px' }}>
              {order.supplier?.name || '-'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '500',
              letterSpacing: '0.2px',
              textTransform: 'capitalize',
              backgroundColor: `${status.color}15`,
              color: status.color
            }}>
              <StatusIcon size={14} />
              {status.name}
            </span>
            <span style={{
              ...styles.riskBadge,
              color: risk.color,
              backgroundColor: risk.background
            }}>
              {t(`orders.operational.risk.${order.riskLevel || 'low'}`)}
            </span>
          </div>
        </div>
        <div style={styles.orderCardBody}>
          <div style={styles.operationalRow}>
            <span style={styles.operationalLabel}>{t('orders.operational.fields.total')}</span>
            <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>
              {formatCurrency(order.total_amount, order.currency)}
            </strong>
          </div>
          <div style={styles.operationalRow}>
            <span style={styles.operationalLabel}>{t('orders.operational.fields.shipment')}</span>
            <span>{shipmentLabel}</span>
          </div>
          <div style={styles.operationalRow}>
            <span style={styles.operationalLabel}>{t('orders.operational.fields.eta')}</span>
            <span>{order.etaDate ? formatDate(order.etaDate) : '-'}</span>
          </div>
          <div style={styles.operationalRow}>
            <span style={styles.operationalLabel}>{t('orders.operational.fields.readiness')}</span>
            <span>{amazonReadyLabel}</span>
          </div>
          <div style={styles.operationalRow}>
            <span style={styles.operationalLabel}>{t('orders.operational.fields.pack')}</span>
            <span>{packLabel}</span>
          </div>
          <div style={styles.operationalPanel}>
            <span style={styles.operationalPanelLabel}>{t('orders.operational.fields.blocker')}</span>
            <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{blockerHint}</strong>
          </div>
          <div style={styles.operationalPanel}>
            <span style={styles.operationalPanelLabel}>{t('orders.operational.fields.nextAction')}</span>
            <strong style={{ color: status.color }}>{nextActionLabel}</strong>
          </div>
          <div style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
            {t('orders.card.date')}: {formatDate(order.order_date)}
          </div>
        </div>
        {!isPreview && (
          <div style={styles.orderCardActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleViewOrder(order)}
            >
              <Eye size={14} />
              {t('orders.card.view')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadPdf(order)}
              disabled={downloadingPdf === order.id}
            >
              {downloadingPdf === order.id ? <Loader size={14} className="spin" /> : <Download size={14} />}
              PDF
            </Button>
            {order.manufacturerPackStatus === 'generated' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const { quickMarkPackAsSent } = await import('../lib/supabase')
                    const { showToast } = await import('../components/Toast')
                    await quickMarkPackAsSent(order.id)
                    showToast(t('orders.toasts.packMarkedSent'), 'success')
                    await loadData()
                  } catch (err) {
                    const { showToast } = await import('../components/Toast')
                    showToast(`${t('orders.toasts.errorPrefix')} ${err.message || t('orders.toasts.unknownError')}`, 'error')
                  }
                }}
              >
                ✓ {t('orders.card.sent')}
              </Button>
            )}
            <div style={{ position: 'relative' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen(menuOpen === order.id ? null : order.id)}
                style={styles.iconButton}
              >
                <MoreVertical size={18} color="#9ca3af" />
              </Button>
              {menuOpen === order.id && (
                <div style={{ ...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff' }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingOrder(order); setShowModal(true); setMenuOpen(null) }}
                    style={styles.menuItem}
                  >
                    <Edit size={14} /> {t('orders.card.edit')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteOrder(order)}
                    style={styles.menuItemDanger}
                  >
                    <Trash2 size={14} /> {t('orders.card.delete')}
                  </Button>
                </div>
              )}
            </div>
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
            <FileText size={22} />
            {t('orders.pageTitle')}
          </span>
        }
      />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: darkMode ? '#9ca3af' : '#4b5563' }}>
          {t('orders.intro')}
        </p>
        {/* Toolbar */}
        <div style={styles.toolbar} className="toolbar-row">
          <div style={styles.searchGroup} className="toolbar-group">
            <div style={styles.searchContainer} className="toolbar-search">
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder={t('orders.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filters} className="toolbar-group">
            <div className="toolbar-filterSelect" title={t('orders.filterStatusTitle')}>
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterStatus || ''}
                onChange={e => setFilterStatus(e.target.value || null)}
              >
                <option value="">{t('orders.allStatuses')}</option>
                {Object.keys(PO_STATUS_META).map((key) => (
                  <option key={key} value={key}>{t(`orders.status.${key}`)}</option>
                ))}
              </select>
            </div>

            <div className="toolbar-filterSelect" title={t('orders.filterProjectTitle')}>
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterProject || ''}
                onChange={e => setFilterProject(e.target.value || null)}
              >
                <option value="">{t('orders.allProjects')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="toolbar-group view-controls">
            <LayoutSwitcher
              value={effectiveLayout}
              onChange={setLayout}
              compact={isMobile}
            />
          </div>
          <div style={styles.toolbarRight} className="toolbar-group">
            <Button
              size="sm"
              onClick={() => {
                setEditingOrder(null)
                setShowModal(true)
              }} 
              className="toolbar-cta"
            >
              <Plus size={18} />
              {t('common.createOrder')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <FileText size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>{t('orders.stats.totalPOs')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <AlertCircle size={24} color="var(--c-cta-500)" />
            <div>
              <span style={{ ...styles.statValue, color: 'var(--c-coral-500)' }}>{stats.requiringAttention}</span>
              <span style={styles.statLabel}>{t('orders.operational.stats.requiringAttention')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Truck size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{stats.activeLogistics}</span>
              <span style={styles.statLabel}>{t('orders.operational.stats.activeLogistics')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{stats.notAmazonReady}</span>
              <span style={styles.statLabel}>{t('orders.operational.stats.notAmazonReady')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <CheckCircle size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{stats.completed}</span>
              <span style={styles.statLabel}>{t('orders.stats.completed')}</span>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff', padding: 64 }}>
            <DataLoading message={t('common.loading')} />
          </div>
        ) : error ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DataError message={error} onRetry={loadData} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DataEmpty
              icon={FileText}
              message={
                searchTerm || filterStatus || filterProject
                  ? t('orders.empty.filteredTitle')
                  : t('orders.empty.title')
              }
              action={
                <Button
                  onClick={() => {
                    setShowModal(true)
                  }}
                >
                  <Plus size={18} />
                  {t('common.createOrder')}
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <NextStepCard
              title={t('guidance.nextStepTitle')}
              description={t('guidance.orders.createOrLink')}
              ctaLabel={t('orders.empty.cta')}
              ctaOnClick={() => setShowModal(true)}
              secondaryCtaLabel={t('nav.projects')}
              secondaryCtaOnClick={() => navigate('/app/projects')}
            />
            {effectiveLayout === 'grid' && (
              <div style={styles.ordersGrid}>
                {filteredOrders.map(order => renderOrderCard(order))}
              </div>
            )}
            {effectiveLayout === 'list' && (() => {
              const STATUS_ORDER = ['draft', 'sent', 'confirmed', 'partial_paid', 'paid', 'in_production', 'shipped', 'received', 'cancelled']
              const groups = STATUS_ORDER.reduce((acc, status) => {
                const items = filteredOrders.filter(o => (o.status || 'draft') === status)
                if (items.length > 0) acc.push({ status, items })
                return acc
              }, [])
              const uncategorised = filteredOrders.filter(o => !STATUS_ORDER.includes(o.status))
              if (uncategorised.length > 0) groups.push({ status: 'other', items: uncategorised })
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {groups.map(({ status, items: groupItems }) => {
                    const meta = PO_STATUS_META[status] || { color: '#6b7280' }
                    const label = STATUS_ORDER.includes(status) ? t(`orders.status.${status}`) : t('orders.statusOther', { defaultValue: 'Other' })
                    const isCollapsed = collapsedOrderGroups.has(status)
                    const toggleGroup = () => setCollapsedOrderGroups(prev => {
                      const next = new Set(prev)
                      if (next.has(status)) next.delete(status)
                      else next.add(status)
                      return next
                    })
                    return (
                      <div key={status}>
                        {/* Group header */}
                        <button
                          type="button"
                          onClick={toggleGroup}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '6px 10px', marginBottom: isCollapsed ? 0 : 8,
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            borderRadius: 8, textAlign: 'left',
                            color: darkMode ? '#d1d5db' : '#374151'
                          }}
                        >
                          {isCollapsed
                            ? <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                            : <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                          }
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {label}
                          </span>
                          <span style={{
                            marginLeft: 4, fontSize: 11, fontWeight: 600, padding: '1px 6px',
                            borderRadius: 10, backgroundColor: meta.color + '22', color: meta.color
                          }}>
                            {groupItems.length}
                          </span>
                        </button>
                        {/* Group items */}
                        {!isCollapsed && (
                          <div style={styles.ordersList}>
                            {groupItems.map(order => renderOrderCard(order))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {effectiveLayout === 'split' && (
              <div style={styles.splitLayout}>
                <div style={styles.splitList}>
                  {filteredOrders.map(order => {
                    const statusKey = PO_STATUS_META[order.status] ? order.status : 'draft'
                    const status = PO_STATUS_META[statusKey]
                    const StatusIcon = status.icon
                    const isSelected = order.id === selectedOrderId
                    return (
                      <div
                        key={order.id}
                        style={{
                          ...styles.splitRow,
                          backgroundColor: isSelected
                            ? 'rgba(110, 203, 195, 0.12)'
                            : 'var(--surface-bg)',
                          borderLeft: isSelected
                            ? '3px solid #6ECBC3'
                            : '3px solid transparent'
                        }}
                        onClick={() => setSelectedOrderId(order.id)}
                        onMouseEnter={() => !isSelected && setSelectedOrderId(order.id)}
                      >
                        <div style={styles.splitRowTop}>
                          <span style={{ ...styles.splitRowPo, color: darkMode ? '#ffffff' : '#111827' }}>
                            {order.po_number}
                          </span>
                          <span style={{
                            ...styles.splitRowStatus,
                            color: status.color,
                            backgroundColor: `${status.color}15`
                          }}>
                            <StatusIcon size={11} />
                            {t(`orders.status.${statusKey}`)}
                          </span>
                        </div>
                        <div style={styles.splitRowSub}>
                          <span>{order.project?.name || '—'}</span>
                          <span style={{ color: status.color, fontSize: 11 }}>
                            {order.supplier?.name || '—'}
                          </span>
                        </div>
                        {order.total_amount ? (
                          <div style={styles.splitRowAmount}>
                            {formatCurrency(order.total_amount, order.currency)}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                <div style={styles.splitPreview}>
                  {selectedOrderCard ? (
                    <SplitPODetail
                      summary={selectedOrderCard}
                      detail={splitDetail}
                      loading={splitDetailLoading}
                      darkMode={darkMode}
                      onOpenFull={() => handleViewOrder(selectedOrderCard)}
                      onOpenProject={(pid) => navigate(`/app/projects/${pid}`)}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      t={t}
                    />
                  ) : (
                    <div style={styles.splitEmpty}>{t('orders.splitSelectPrompt')}</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nova/Editar PO */}
      <NewPOModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingOrder(null) }}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
        projects={projects}
        suppliers={suppliers}
      />

      {/* Modal Detall PO */}
      {showDetailModal && (
        <div style={{
          ...styles.modalOverlay,
          ...(isMobile ? {
            padding: 0,
            backgroundColor: darkMode ? '#0a0a0f' : '#ffffff'
          } : {})
        }} onClick={() => setShowDetailModal(false)}>
          <div style={{ 
            ...styles.detailModal, 
            backgroundColor: darkMode ? '#15151f' : '#ffffff',
            ...(isMobile ? {
              width: '100%',
              height: '100%',
              maxWidth: 'none',
              maxHeight: 'none',
              borderRadius: 0
            } : {})
          }} onClick={e => e.stopPropagation()}>
            {loadingDetail ? (
              <div style={styles.modalLoading}>
                <Loader size={32} color="#4f46e5" className="spin" />
                <p>{t('common.loading')}</p>
              </div>
            ) : selectedOrder && (
              <>
                {/* Header */}
                <div style={styles.detailHeader}>
                  <div>
                    <h2 style={{ ...styles.detailTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                      {selectedOrder.po_number}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                      {selectedOrder.project?.name}
                      {selectedOrder.project_id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/app/projects/${selectedOrder.project_id}`)}
                          style={{
                            marginLeft: 8,
                            fontSize: '13px',
                            color: '#4f46e5',
                            textDecoration: 'underline',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {t('orders.viewProject')}
                        </button>
                      )}
                    </p>
                  </div>
                  <div style={styles.detailHeaderRight}>
                    <select
                      value={selectedOrder.status}
                      onChange={e => handleStatusChange(selectedOrder.id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        backgroundColor: `${PO_STATUS_META[selectedOrder.status]?.color || PO_STATUS_META.draft.color}15`,
                        color: PO_STATUS_META[selectedOrder.status]?.color || PO_STATUS_META.draft.color
                      }}
                    >
                      {Object.keys(PO_STATUS_META).map((key) => (
                        <option key={key} value={key}>{t(`orders.status.${key}`)}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadPdf(selectedOrder)}
                      style={styles.pdfButton}
                    >
                      <Download size={16} /> PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailModal(false)}
                      style={styles.closeButton}
                    >
                      <X size={20} />
                    </Button>
                  </div>
                </div>

                {/* Body */}
                <div style={styles.detailBody}>
                  {/* Info general */}
                  <div style={styles.detailGrid}>
                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>📅 {t('orders.detail.sections.generalInfo')}</h4>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.date')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatDate(selectedOrder.order_date)}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.quoteRef')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.quote_ref || '-'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.currency')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.currency || 'USD'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.incoterm')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.incoterm} {selectedOrder.incoterm_location}</span>
                      </div>
                    </div>

                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>🏭 {t('orders.detail.sections.supplier')}</h4>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.name')}:</span>
                        {selectedOrder.supplier?.name ? (
                          <button
                            type="button"
                            onClick={() => navigate('/app/suppliers')}
                            style={{
                              color: darkMode ? '#e5e7eb' : '#111827',
                              fontWeight: 500,
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {selectedOrder.supplier.name}
                          </button>
                        ) : (
                          <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '500' }}>-</span>
                        )}
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.contact')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.supplier?.contact_name || '-'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>{t('orders.detail.fields.email')}:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.supplier?.email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Entrega */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>🚚 {t('orders.detail.sections.deliveryAddress')}</h4>
                    <p style={{ margin: 0, color: darkMode ? '#ffffff' : '#111827' }}>
                      {selectedOrder.delivery_address || '-'}
                    </p>
                    {selectedOrder.delivery_contact && (
                      <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
                        👤 {selectedOrder.delivery_contact} {selectedOrder.delivery_phone && `• 📱 ${selectedOrder.delivery_phone}`}
                      </p>
                    )}
                  </div>

                  {/* Productes */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>📦 {t('orders.detail.sections.products')}</h4>
                    <table style={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th style={styles.itemsTh}>{t('orders.detail.fields.ref')}</th>
                          <th style={styles.itemsTh}>{t('orders.detail.fields.description')}</th>
                          <th style={styles.itemsTh}>{t('orders.detail.fields.qty')}</th>
                          <th style={styles.itemsTh}>{t('orders.detail.fields.price')}</th>
                          <th style={styles.itemsTh}>{t('orders.detail.fields.total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const items = safeJsonArray(selectedOrder?.items)
                          
                          if (items.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} style={{ ...styles.itemsTd, textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                                  {t('orders.detail.empty.noItems')}
                                </td>
                              </tr>
                            )
                          }
                          
                          return items.map((item, i) => (
                              <tr key={i}>
                                <td style={styles.itemsTd}>{item?.ref || '-'}</td>
                                <td style={{ ...styles.itemsTd, color: darkMode ? '#ffffff' : '#111827' }}>{item?.description || '-'}</td>
                                <td style={styles.itemsTd}>{item?.qty || 0} {item?.unit || ''}</td>
                                <td style={styles.itemsTd}>{formatCurrency(item?.unit_price || 0, selectedOrder?.currency || 'EUR')}</td>
                                <td style={{ ...styles.itemsTd, fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>
                                  {formatCurrency((parseFloat(item?.qty) || 0) * (parseFloat(item?.unit_price) || 0), selectedOrder?.currency || 'EUR')}
                                </td>
                              </tr>
                            ))
                        })()}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ ...styles.itemsTd, textAlign: 'right', fontWeight: '600' }}>{t('orders.detail.fields.total')}:</td>
                          <td style={{ ...styles.itemsTd, fontWeight: '700', color: '#4f46e5', fontSize: '16px' }}>
                            {formatCurrency(selectedOrder.total_amount, selectedOrder.currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Shipping */}
                  {(selectedOrder.total_cartons || selectedOrder.net_weight || selectedOrder.gross_weight) && (
                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>📊 {t('orders.detail.sections.shippingSpecs')}</h4>
                      <div style={styles.shippingGrid}>
                        {selectedOrder.total_cartons && (
                          <div><span style={styles.detailLabel}>{t('orders.detail.fields.boxes')}:</span> {selectedOrder.total_cartons}</div>
                        )}
                        {selectedOrder.net_weight && (
                          <div><span style={styles.detailLabel}>{t('orders.detail.fields.netWeight')}:</span> {selectedOrder.net_weight}</div>
                        )}
                        {selectedOrder.gross_weight && (
                          <div><span style={styles.detailLabel}>{t('orders.detail.fields.grossWeight')}:</span> {selectedOrder.gross_weight}</div>
                        )}
                        {selectedOrder.total_volume && (
                          <div><span style={styles.detailLabel}>{t('orders.detail.fields.volume')}:</span> {selectedOrder.total_volume}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Amazon Ready Section */}
                  <div style={styles.detailSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={styles.detailSectionTitle}>📦 {t('orders.detail.sections.amazonReady')}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAmazonReadySection(!showAmazonReadySection)}
                      >
                        {showAmazonReadySection ? t('orders.actions.hide') : t('orders.actions.show')}
                      </Button>
                    </div>
                    
                    {showAmazonReadySection && (
                      <AmazonReadySection
                        po={selectedOrder}
                        readiness={amazonReadiness}
                        readyStatus={amazonReadyStatus}
                        onUpdate={async (data) => {
                          if (selectedOrder?.id && selectedOrder?.project_id) {
                            const updated = await upsertPoAmazonReadiness(selectedOrder.id, selectedOrder.project_id, data, activeOrgId ?? undefined)
                            setAmazonReadiness(updated)
                            // Recalcular estat
                            const identifiers = await getProductIdentifiers(selectedOrder.project_id)
                            const status = computePoAmazonReady({
                              po: selectedOrder,
                              identifiers,
                              readiness: updated
                            })
                            setAmazonReadyStatus(status)
                          }
                        }}
                        darkMode={darkMode}
                      />
                    )}
                  </div>

                  {/* Flux Logístic */}
                  {selectedOrder.status !== 'draft' && selectedOrder.status !== 'cancelled' && (
                    <div style={styles.detailSection}>
                      <LogisticsFlow 
                        orderId={selectedOrder.id} 
                        projectId={selectedOrder.project_id}
                      />
                    </div>
                  )}

                  {/* Shipments (F4) */}
                  <div style={styles.detailSection}>
                    <ShipmentsPanel
                      poId={selectedOrder.id}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Shipment Tracking */}
                  <div style={styles.detailSection}>
                    <ShipmentTrackingSection 
                      po={selectedOrder} 
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Manufacturer Pack (single block) */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>📦 {t('orders.detail.sections.manufacturerPack')}</h4>
                    <p style={{ 
                      fontSize: '13px', 
                      color: darkMode ? '#9ca3af' : '#6b7280',
                      marginBottom: '12px'
                    }}>
                      {t('orders.detail.manufacturerPackHelp')}
                    </p>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        if (selectedOrder?.project_id) {
                          try {
                            const ids = await getProductIdentifiers(selectedOrder.project_id)
                            setManufacturerPackIdentifiers(ids)
                          } catch (err) {
                            console.error('Error carregant identifiers:', err)
                          }
                        }
                        setShowManufacturerPackModal(true)
                      }}
                    >
                      <Package size={18} />
                      {t('orders.detail.generateManufacturerPack')}
                    </Button>
                  </div>

                  {/* Generar Etiquetes FNSKU */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>🏷️ {t('orders.detail.sections.fnskuLabels')}</h4>
                    <Button
                      variant="primary"
                      onClick={() => setShowLabelsModal(true)}
                    >
                      {t('orders.labels.openGenerator')}
                    </Button>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>📝 {t('orders.detail.sections.notes')}</h4>
                      <p style={{ margin: 0, color: darkMode ? '#ffffff' : '#111827', whiteSpace: 'pre-wrap' }}>
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}

                  {/* Tasks Section */}
                  {selectedOrder && (
                    <div style={styles.detailSection}>
                      <TasksSection 
                        entityType="purchase_order" 
                        entityId={selectedOrder.id} 
                        darkMode={darkMode} 
                      />
                    </div>
                  )}

                  {/* Decision Log - Why this supplier was chosen */}
                  {selectedOrder && (
                    <div style={styles.detailSection}>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}>
                        {t('orders.detail.whySupplier')}
                      </h4>
                      <DecisionLog 
                        entityType="purchase_order" 
                        entityId={selectedOrder.id} 
                        darkMode={darkMode}
                        allowedDecisions={[
                          { value: 'go', label: t('orders.detail.decision.go'), icon: CheckCircle2, color: '#10b981' }
                        ]}
                      />
                    </div>
                  )}

                  {/* Planned vs Actual */}
                  {selectedOrder && selectedQuote && (
                    <div style={styles.detailSection}>
                      <PlannedVsActual
                        quote={selectedQuote}
                        po={selectedOrder}
                        shipment={selectedShipment}
                        darkMode={darkMode}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Manufacturer Pack */}
      {showManufacturerPackModal && selectedOrder && (
        <ManufacturerPackModal
          isOpen={showManufacturerPackModal}
          onClose={() => setShowManufacturerPackModal(false)}
          po={selectedOrder}
          project={projects.find(p => p.id === selectedOrder.project_id)}
          supplier={suppliers.find(s => s.id === selectedOrder.supplier_id)}
          readiness={amazonReadiness}
          identifiers={manufacturerPackIdentifiers}
          darkMode={darkMode}
          onRefresh={async () => {
            // Recarregar readiness després de marcar com enviat
            if (selectedOrder?.project_id) {
              const updatedReadiness = await getPoAmazonReadiness(selectedOrder.id)
              setAmazonReadiness(updatedReadiness)
            }
          }}
        />
      )}

      {/* Modal Generar Etiquetes */}
      {showLabelsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLabelsModal(false)}>
          <div
            style={{
              ...styles.detailModal,
              backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
              maxWidth: '500px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.detailHeader}>
              <h3 style={{
                ...styles.detailTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                {t('orders.labels.modalTitle')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLabelsModal(false)}
                style={styles.closeButton}
              >
                <X size={20} />
              </Button>
            </div>
            <div style={styles.detailBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: darkMode ? '#e5e7eb' : '#374151'
                  }}>
                    {t('orders.labels.quantity')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={labelsConfig.quantity}
                    onChange={e => setLabelsConfig({ ...labelsConfig, quantity: parseInt(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: darkMode ? '#374151' : '#d1d5db',
                      backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: darkMode ? '#e5e7eb' : '#374151'
                  }}>
                    {t('orders.labels.template')}
                  </label>
                  <select
                    value={labelsConfig.template}
                    onChange={e => setLabelsConfig({ ...labelsConfig, template: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: darkMode ? '#374151' : '#d1d5db',
                      backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827',
                      fontSize: '14px'
                    }}
                  >
                    <option value="AVERY_5160">{t('orders.labels.templates.avery5160')}</option>
                    <option value="LABEL_40x30">{t('orders.labels.templates.single40x30')}</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={labelsConfig.includeSku}
                      onChange={e => setLabelsConfig({ ...labelsConfig, includeSku: e.target.checked })}
                    />
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>{t('orders.labels.includeSku')}</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={labelsConfig.includeName}
                      onChange={e => setLabelsConfig({ ...labelsConfig, includeName: e.target.checked })}
                    />
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>{t('orders.labels.includeName')}</span>
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={labelsConfig.testPrint}
                      onChange={e => setLabelsConfig({ ...labelsConfig, testPrint: e.target.checked })}
                    />
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>{t('orders.labels.testPrint')}</span>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: darkMode ? '#e5e7eb' : '#374151'
                    }}>
                      {t('orders.labels.offsetX')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labelsConfig.offsetXmm}
                      onChange={e => setLabelsConfig({ ...labelsConfig, offsetXmm: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: darkMode ? '#374151' : '#d1d5db',
                        backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: darkMode ? '#e5e7eb' : '#374151'
                    }}>
                      {t('orders.labels.offsetY')}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labelsConfig.offsetYmm}
                      onChange={e => setLabelsConfig({ ...labelsConfig, offsetYmm: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: darkMode ? '#374151' : '#d1d5db',
                        backgroundColor: darkMode ? '#15151f' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleGenerateLabels}
                  style={{ marginTop: '12px' }}
                >
                  {t('orders.labels.generateAndDownloadPdf')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto', flex: 1, minHeight: 0 },
  toolbar: { display: 'flex', marginBottom: '24px' },
  searchGroup: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  searchContainer: { flex: '0 0 auto', width: '320px', minWidth: '240px' },
  searchInput: { flex: 1, minWidth: 0 },
  filterSelect: { height: 'var(--btn-h-sm)', padding: '0 12px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--btn-secondary-border)', backgroundColor: 'var(--btn-ghost-bg)', color: 'var(--btn-secondary-fg)', fontSize: '14px', outline: 'none', cursor: 'pointer', boxShadow: 'var(--btn-shadow)' },
  filters: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  filterButton: { height: 'var(--btn-h-sm)' },
  toolbarRight: { display: 'inline-flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'nowrap' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: '1px solid #1F4E5F', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: '600', color: '#1F4E5F' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  createButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: '1px solid #1F4E5F', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  ordersList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '0', border: '1px solid var(--border-1)', borderRadius: '12px', overflow: 'hidden' },
  splitList: { display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-1)', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' },
  splitRow: { padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-1)', transition: 'background 0.12s ease' },
  splitRowTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  splitRowPo: { fontWeight: 600, fontSize: 13, fontFamily: "'Roboto Mono', monospace" },
  splitRowStatus: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 },
  splitRowSub: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' },
  splitRowAmount: { fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginTop: 4, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  splitPreview: { overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', padding: '16px' },
  splitEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, padding: '24px', color: 'var(--text-2)', fontSize: 14 },
  orderCard: { padding: '16px', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  orderCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  orderCardBody: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#6b7280' },
  riskBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' },
  operationalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  operationalLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' },
  operationalPanel: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(148, 163, 184, 0.08)' },
  operationalPanelLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' },
  orderCardActions: { display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' },
  iconButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '140px', borderRadius: '10px', border: '1px solid rgba(31, 78, 95, 0.12)', boxShadow: 'var(--shadow-soft-hover)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  menuItemDanger: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  // Modal Detall
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  detailModal: { width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalLoading: { padding: '64px', textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  detailTitle: { margin: 0, fontSize: '20px', fontWeight: '600' },
  detailHeaderRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  statusSelect: { padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', outline: 'none' },
  pdfButton: { minWidth: '86px' },
  closeButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  detailBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' },
  detailSection: { marginBottom: '24px' },
  detailSectionTitle: { margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#6b7280' },
  detailRow: { display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '14px' },
  detailLabel: { color: '#9ca3af', minWidth: '80px' },
  itemsTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  itemsTh: { padding: '10px 12px', textAlign: 'left', backgroundColor: 'var(--bg-secondary)', fontWeight: '600', color: '#6b7280' },
  itemsTd: { padding: '10px 12px', borderBottom: '1px solid var(--border-color)', color: '#6b7280' },
  shippingGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px', color: '#6b7280' }
}

/**
 * Rich PO detail panel rendered in the right side of the split view.
 * Shows line items (from the PO's items jsonb), totals, dates, tracking and
 * a quick action to open the full detail modal.
 */
function SplitPODetail({ summary, detail, loading, darkMode, onOpenFull, onOpenProject, formatCurrency, formatDate, t }) {
  const data = detail || summary
  const items = Array.isArray(data?.items) ? data.items : []
  const cellTh = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border-1)', background: 'var(--surface-bg-2)' }
  const cellTd = { padding: '8px 10px', fontSize: 13, color: 'var(--text-1)', borderBottom: '1px solid var(--border-1)' }

  return (
    <div style={{
      background: darkMode ? '#15151f' : 'var(--surface-bg)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'sticky',
      top: 88,
      maxHeight: 'calc(100vh - 110px)',
      overflowY: 'auto'
    }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
            {data?.po_number || '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {data?.supplier?.name || data?.supplier_name || '—'}
            {data?.project?.name && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => data?.project_id && onOpenProject(data.project_id)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #3b82f6)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 13 }}
                >
                  {data.project.name}
                </button>
              </>
            )}
          </div>
        </div>
        <button type="button" onClick={onOpenFull} style={{
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 600,
          border: '1px solid var(--border-1)',
          background: 'var(--surface-bg-2)',
          color: 'var(--text-1)',
          borderRadius: 8,
          cursor: 'pointer'
        }}>
          {t('orders.card.view', 'Obrir detall')}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <KV label={t('orders.operational.fields.total', 'Total')} value={formatCurrency(data?.total_amount, data?.currency || 'EUR')} strong />
        <KV label="Estat" value={t(`orders.status.${data?.status || 'draft'}`)} />
        <KV label={t('orders.card.date', 'Data')} value={data?.order_date ? formatDate(data.order_date) : '—'} />
        <KV label={t('orders.operational.fields.eta', 'ETA')} value={data?.etaDate ? formatDate(data.etaDate) : (data?.delivery_date ? formatDate(data.delivery_date) : '—')} />
        <KV label="Tracking" value={data?.tracking_number || '—'} />
        <KV label="Incoterm" value={data?.incoterm || '—'} />
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-2)', marginBottom: 6 }}>
          Línies de producte {loading ? '· carregant…' : `(${items.length})`}
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--text-2)', fontSize: 13, fontStyle: 'italic' }}>
            {loading ? '…' : 'Sense línies registrades.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={cellTh}>SKU / nom</th>
                  <th style={{ ...cellTh, textAlign: 'right' }}>Qty</th>
                  <th style={{ ...cellTh, textAlign: 'right' }}>Unitat</th>
                  <th style={{ ...cellTh, textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const qty = Number(it?.quantity ?? it?.qty ?? 0) || 0
                  const unit = Number(it?.unit_price ?? it?.price ?? 0) || 0
                  const subtotal = it?.subtotal != null ? Number(it.subtotal) : qty * unit
                  return (
                    <tr key={idx}>
                      <td style={cellTd}>
                        <div style={{ fontWeight: 600 }}>{it?.sku || it?.name || `Línia ${idx + 1}`}</div>
                        {it?.name && it?.sku && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{it.name}</div>}
                      </td>
                      <td style={{ ...cellTd, textAlign: 'right' }}>{qty}</td>
                      <td style={{ ...cellTd, textAlign: 'right' }}>{formatCurrency(unit, data?.currency || 'EUR')}</td>
                      <td style={{ ...cellTd, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(subtotal, data?.currency || 'EUR')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.notes && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-2)', marginBottom: 6 }}>Notes</div>
          <div style={{ padding: 10, border: '1px solid var(--border-1)', borderRadius: 8, background: 'var(--surface-bg-2)', fontSize: 13, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>
            {data.notes}
          </div>
        </div>
      )}
    </div>
  )
}

function KV({ label, value, strong }) {
  return (
    <div style={{ padding: 10, border: '1px solid var(--border-1)', borderRadius: 8, background: 'var(--surface-bg-2)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: strong ? 16 : 13, fontWeight: strong ? 700 : 500, color: 'var(--text-1)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
