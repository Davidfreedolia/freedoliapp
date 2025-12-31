import { useState, useEffect } from 'react'
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
  Clock,
  AlertCircle,
  Send,
  Loader,
  X,
  Ship
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
  updatePoAmazonReadinessLabels
} from '../lib/supabase'
import Header from '../components/Header'
import NewPOModal from '../components/NewPOModal'
import LogisticsFlow from '../components/LogisticsFlow'
import AmazonReadySection from '../components/AmazonReadySection'
import ManufacturerPackModal from '../components/ManufacturerPackModal'
import { generatePOPdf } from '../lib/generatePOPdf'
import { generateFnskuLabelsPdf } from '../lib/generateFnskuLabelsPdf'
import { computePoAmazonReady } from '../lib/amazonReady'

// Estats de la PO
const PO_STATUSES = {
  draft: { name: 'Esborrany', color: '#6b7280', icon: Edit },
  sent: { name: 'Enviat', color: '#3b82f6', icon: Send },
  confirmed: { name: 'Confirmat', color: '#8b5cf6', icon: CheckCircle },
  partial_paid: { name: 'Pagat parcial', color: '#f59e0b', icon: DollarSign },
  paid: { name: 'Pagat', color: '#22c55e', icon: DollarSign },
  in_production: { name: 'En producció', color: '#ec4899', icon: Package },
  shipped: { name: 'Enviat', color: '#06b6d4', icon: Truck },
  received: { name: 'Rebut', color: '#10b981', icon: CheckCircle },
  cancelled: { name: 'Cancel·lat', color: '#ef4444', icon: AlertCircle }
}

export default function Orders() {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [orders, setOrders] = useState([])
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(null)
  
  // Modal detall
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersData, projectsData, suppliersData] = await Promise.all([
        getPurchaseOrders(),
        getProjects(),
        getSuppliers()
      ])
      
      // Carregar estat Amazon Ready per cada PO
      if (ordersData && ordersData.length > 0) {
        const ordersWithReadiness = await Promise.all(
          ordersData.map(async (order) => {
            if (!order.project_id) return { ...order, amazonReadyStatus: null }
            
            try {
              const [readiness, identifiers] = await Promise.all([
                getPoAmazonReadiness(order.id),
                getProductIdentifiers(order.project_id)
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
              
              return { 
                ...order, 
                amazonReadyStatus: readyStatus,
                manufacturerPackStatus: packStatus,
                manufacturerPackVersion: readiness?.manufacturer_pack_version || null,
                manufacturerPackGeneratedAt: readiness?.manufacturer_pack_generated_at || null,
                manufacturerPackSentAt: readiness?.manufacturer_pack_sent_at || null
              }
            } catch (err) {
              console.error(`Error carregant Amazon readiness per PO ${order.id}:`, err)
              return { ...order, amazonReadyStatus: null }
            }
          })
        )
        setOrders(ordersWithReadiness)
      } else {
        setOrders(ordersData || [])
      }
      
      setProjects(projectsData || [])
      setSuppliers(suppliersData || [])
    } catch (err) {
      console.error('Error carregant dades:', err)
    }
    setLoading(false)
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
        })
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
      console.error('Error carregant Amazon readiness:', err)
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
    } catch (err) {
      console.error('Error carregant detall:', err)
      alert('Error carregant el detall de la comanda')
      setShowDetailModal(false)
    }
    setLoadingDetail(false)
  }

  // Generar etiquetes FNSKU
  const handleGenerateLabels = async () => {
    if (!selectedOrder?.project_id) {
      alert('Error: La comanda no té projecte associat')
      return
    }

    try {
      // Obtenir identificadors del projecte
      const identifiers = await getProductIdentifiers(selectedOrder.project_id)
      if (!identifiers || !identifiers.fnsku) {
        alert('Error: El projecte no té FNSKU informat. Afegeix-lo a la secció d\'Identificadors del projecte.')
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
        console.error('Error actualitzant Amazon readiness:', err)
        // No bloquejar si falla aquesta actualització
      }
      
      setShowLabelsModal(false)
    } catch (err) {
      console.error('Error generant etiquetes:', err)
      alert('Error generant etiquetes: ' + (err.message || 'Error desconegut'))
    }
  }

  // Generar Manufacturer Pack
  const handleGenerateManufacturerPack = async (options) => {
    const {
      includePOPdf,
      includeFnskuLabels,
      includePackingList,
      includeCartonLabels,
      fnskuQuantity,
      fnskuTemplate,
      uploadToDrive
    } = options

    if (!selectedOrder?.id || !selectedOrder?.project_id) {
      throw new Error('Error: La comanda no té projecte associat')
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
        selectedOrder.supplier_id ? getSuppliers().then(suppliers => 
          suppliers.find(s => s.id === selectedOrder.supplier_id)
        ) : Promise.resolve(null),
        getCompanySettings()
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

      // Upload a Drive si està connectat
      if (uploadToDrive && driveService.isAuthenticated()) {
        try {
          // Obtenir o crear carpeta del projecte
          const projectFolders = await driveService.ensureProjectDriveFolders(project)
          
          // Obtenir o crear subcarpeta PurchaseOrders
          const poFolder = await driveService.findOrCreateFolder(
            '03_PurchaseOrders',
            projectFolders.main.id
          )
          
          // Obtenir o crear subcarpeta per aquesta PO
          const poSubFolder = await driveService.findOrCreateFolder(
            selectedOrder.po_number || `PO_${selectedOrder.id}`,
            poFolder.id
          )
          
          // Pujar ZIP
          const zipFile = new File([zipBlob], fileNames.zip, { type: 'application/zip' })
          await driveService.uploadFile(zipFile, poSubFolder.id)
          
          // Pujar PDFs individuals (opcional - per facilitar accés)
          // Nota: pujem el ZIP, els PDFs individuals ja estan dins

          // Audit log
          try {
            const { logSuccess } = await import('../lib/auditLog')
            await logSuccess(
              'manufacturer_pack',
              'manufacturer_pack_generated',
              selectedOrder.id,
              'Manufacturer pack generated and uploaded to Drive',
              {
                po_id: selectedOrder.id,
                po_number: selectedOrder.po_number,
                documents: {
                  po: includePOPdf,
                  fnsku_labels: includeFnskuLabels,
                  packing_list: includePackingList,
                  carton_labels: includeCartonLabels
                },
                uploaded_to_drive: true,
                drive_folder_id: poSubFolder.id
              }
            )
          } catch (auditErr) {
            console.warn('Error registrant audit log:', auditErr)
          }

          alert(`Manufacturer Pack generat i pujat a Google Drive!\n\nCarpeta: ${poSubFolder.name}`)
        } catch (driveErr) {
          console.error('Error pujant a Drive:', driveErr)
          // Continuar amb download local
          alert('S\'ha generat el pack però hi ha hagut un error pujant-lo a Drive. S\'ha descarregat localment.')
          // Descarregar ZIP
          const url = URL.createObjectURL(zipBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileNames.zip
          a.click()
          URL.revokeObjectURL(url)
        }
      } else {
        // Descarregar ZIP
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileNames.zip
        a.click()
        URL.revokeObjectURL(url)

        // Audit log
        try {
          const { logSuccess } = await import('../lib/auditLog')
          await logSuccess(
            'manufacturer_pack',
            'manufacturer_pack_generated',
            selectedOrder.id,
            'Manufacturer pack generated and downloaded',
            {
              po_id: selectedOrder.id,
              po_number: selectedOrder.po_number,
              documents: {
                po: includePOPdf,
                fnsku_labels: includeFnskuLabels,
                packing_list: includePackingList,
                carton_labels: includeCartonLabels
              },
              uploaded_to_drive: false
            }
          )
        } catch (auditErr) {
          console.warn('Error registrant audit log:', auditErr)
        }
      }

      // Recarregar readiness si s'han generat labels
      if (includeFnskuLabels && amazonReadiness?.needs_fnsku !== false) {
        await loadAmazonReadiness(selectedOrder.id, selectedOrder.project_id)
      }
    } catch (err) {
      console.error('Error generant Manufacturer Pack:', err)
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
        getCompanySettings()
      ])
      const supplier = suppliers.find(s => s.id === order.supplier_id) || fullOrder.supplier
      await generatePOPdf(fullOrder, supplier, companySettings)
    } catch (err) {
      console.error('Error generant PDF:', err)
      alert('Error generant el PDF: ' + err.message)
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
      console.error('Error actualitzant estat:', err)
    }
  }

  // Filtrar comandes
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus ? order.status === filterStatus : true
    const matchesProject = filterProject ? order.project_id === filterProject : true
    return matchesSearch && matchesStatus && matchesProject
  })

  // Estadístiques
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['draft', 'sent'].includes(o.status)).length,
    inProgress: orders.filter(o => ['confirmed', 'partial_paid', 'paid', 'in_production'].includes(o.status)).length,
    completed: orders.filter(o => ['shipped', 'received'].includes(o.status)).length,
    totalValue: orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
  }

  const handleDeleteOrder = async (order) => {
    if (!confirm(`Segur que vols eliminar la comanda ${order.po_number}?`)) return
    try {
      await deletePurchaseOrder(order.id)
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error eliminant:', err)
      alert('Error eliminant la comanda')
    }
  }

  const handleSaveOrder = async () => {
    setShowModal(false)
    setEditingOrder(null)
    await loadData()
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ca-ES')
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: currency
    }).format(amount || 0)
  }

  return (
    <div style={styles.container}>
      <Header title="Comandes (PO)" />

      <div style={styles.content}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={{
            ...styles.searchContainer,
            backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar comandes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...styles.searchInput, color: darkMode ? '#ffffff' : '#111827' }}
            />
          </div>

          <select
            value={filterStatus || ''}
            onChange={e => setFilterStatus(e.target.value || null)}
            style={{
              ...styles.filterSelect,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827'
            }}
          >
            <option value="">Tots els estats</option>
            {Object.entries(PO_STATUSES).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>

          <select
            value={filterProject || ''}
            onChange={e => setFilterProject(e.target.value || null)}
            style={{
              ...styles.filterSelect,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827'
            }}
          >
            <option value="">Tots els projectes</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button onClick={() => { setEditingOrder(null); setShowModal(true) }} style={styles.newButton}>
            <Plus size={18} />
            Nova Comanda
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <FileText size={24} color="#4f46e5" />
            <div>
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>Total POs</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Clock size={24} color="#f59e0b" />
            <div>
              <span style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.pending}</span>
              <span style={styles.statLabel}>Pendents</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#8b5cf6" />
            <div>
              <span style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.inProgress}</span>
              <span style={styles.statLabel}>En curs</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <CheckCircle size={24} color="#22c55e" />
            <div>
              <span style={{ ...styles.statValue, color: '#22c55e' }}>{stats.completed}</span>
              <span style={styles.statLabel}>Completades</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DollarSign size={24} color="#4f46e5" />
            <div>
              <span style={styles.statValue}>{formatCurrency(stats.totalValue)}</span>
              <span style={styles.statLabel}>Valor total</span>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <FileText size={48} color="#d1d5db" />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {searchTerm || filterStatus || filterProject ? 'No s\'han trobat comandes' : 'No hi ha comandes. Crea la primera!'}
            </p>
            <button onClick={() => setShowModal(true)} style={styles.createButton}>
              <Plus size={18} />
              Nova Comanda
            </button>
          </div>
        ) : (
          <div style={{ ...styles.tableContainer, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>PO #</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Projecte</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Proveïdor</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Data</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Import</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Estat</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const status = PO_STATUSES[order.status] || PO_STATUSES.draft
                  const StatusIcon = status.icon

                  return (
                    <tr key={order.id} style={styles.tr}>
                      <td style={{ ...styles.td, color: darkMode ? '#ffffff' : '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.poNumber}>{order.po_number}</span>
                          {order.amazonReadyStatus && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: order.amazonReadyStatus.ready ? '#10b98115' : '#f59e0b15',
                              color: order.amazonReadyStatus.ready ? '#10b981' : '#f59e0b'
                            }}>
                              {order.amazonReadyStatus.ready ? 'Ready' : `Missing ${order.amazonReadyStatus.missing.length}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: darkMode ? '#ffffff' : '#111827' }}>
                        {order.project?.name || '-'}
                      </td>
                      <td style={{ ...styles.td, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {order.supplier?.name || '-'}
                      </td>
                      <td style={{ ...styles.td, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {formatDate(order.order_date)}
                      </td>
                      <td style={{ ...styles.td, color: darkMode ? '#ffffff' : '#111827', fontWeight: '600' }}>
                        {formatCurrency(order.total_amount, order.currency)}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: `${status.color}15`,
                            color: status.color
                          }}>
                            <StatusIcon size={14} />
                            {status.name}
                          </span>
                          {/* Manufacturer Pack Badge */}
                          {order.manufacturerPackStatus && (
                            <span style={{
                              ...styles.statusBadge,
                              fontSize: '11px',
                              padding: '2px 6px',
                              backgroundColor: 
                                order.manufacturerPackStatus === 'sent' ? '#d1fae515' :
                                order.manufacturerPackStatus === 'generated' ? '#fef3c715' : '#e5e7eb15',
                              color: 
                                order.manufacturerPackStatus === 'sent' ? '#10b981' :
                                order.manufacturerPackStatus === 'generated' ? '#f59e0b' : '#6b7280'
                            }}>
                              {order.manufacturerPackStatus === 'sent' && '✓ Pack Sent'}
                              {order.manufacturerPackStatus === 'generated' && '📦 Pack Generated'}
                              {order.manufacturerPackVersion > 1 && ` (v${order.manufacturerPackVersion})`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionsCell}>
                          {/* Botó Veure */}
                          <button
                            onClick={() => handleViewOrder(order)}
                            style={styles.iconButton}
                            title="Veure detall"
                          >
                            <Eye size={18} color="#4f46e5" />
                          </button>
                          
                          {/* Botó PDF */}
                          <button
                            onClick={() => handleDownloadPdf(order)}
                            disabled={downloadingPdf === order.id}
                            style={styles.iconButton}
                            title="Descarregar PDF"
                          >
                            {downloadingPdf === order.id ? (
                              <Loader size={18} color="#22c55e" className="spin" />
                            ) : (
                              <Download size={18} color="#22c55e" />
                            )}
                          </button>

                          {/* Menú més opcions */}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setMenuOpen(menuOpen === order.id ? null : order.id)}
                              style={styles.iconButton}
                            >
                              <MoreVertical size={18} color="#9ca3af" />
                            </button>
                            {menuOpen === order.id && (
                              <div style={{ ...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff' }}>
                                <button onClick={() => { setEditingOrder(order); setShowModal(true); setMenuOpen(null) }} style={styles.menuItem}>
                                  <Edit size={14} /> Editar
                                </button>
                                <button onClick={() => handleDeleteOrder(order)} style={{ ...styles.menuItem, color: '#ef4444' }}>
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={{ ...styles.detailModal, backgroundColor: darkMode ? '#15151f' : '#ffffff' }} onClick={e => e.stopPropagation()}>
            {loadingDetail ? (
              <div style={styles.modalLoading}>
                <Loader size={32} color="#4f46e5" className="spin" />
                <p>Carregant detall...</p>
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
                    </p>
                  </div>
                  <div style={styles.detailHeaderRight}>
                    <select
                      value={selectedOrder.status}
                      onChange={e => handleStatusChange(selectedOrder.id, e.target.value)}
                      style={{
                        ...styles.statusSelect,
                        backgroundColor: `${PO_STATUSES[selectedOrder.status]?.color}15`,
                        color: PO_STATUSES[selectedOrder.status]?.color
                      }}
                    >
                      {Object.entries(PO_STATUSES).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                      ))}
                    </select>
                    <button onClick={() => handleDownloadPdf(selectedOrder)} style={styles.pdfButton}>
                      <Download size={16} /> PDF
                    </button>
                    <button onClick={() => setShowDetailModal(false)} style={styles.closeButton}>
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div style={styles.detailBody}>
                  {/* Info general */}
                  <div style={styles.detailGrid}>
                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>📅 Informació General</h4>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Data:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{formatDate(selectedOrder.order_date)}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Quote Ref:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.quote_ref || '-'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Moneda:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.currency || 'USD'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Incoterm:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.incoterm} {selectedOrder.incoterm_location}</span>
                      </div>
                    </div>

                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>🏭 Proveïdor</h4>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Nom:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '500' }}>{selectedOrder.supplier?.name}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Contacte:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.supplier?.contact_name || '-'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Email:</span>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>{selectedOrder.supplier?.email || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Entrega */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>🚚 Adreça d'Entrega</h4>
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
                    <h4 style={styles.detailSectionTitle}>📦 Productes</h4>
                    <table style={styles.itemsTable}>
                      <thead>
                        <tr>
                          <th style={styles.itemsTh}>Ref</th>
                          <th style={styles.itemsTh}>Descripció</th>
                          <th style={styles.itemsTh}>Qty</th>
                          <th style={styles.itemsTh}>Preu</th>
                          <th style={styles.itemsTh}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(typeof selectedOrder.items === 'string' ? JSON.parse(selectedOrder.items) : selectedOrder.items || []).map((item, i) => (
                          <tr key={i}>
                            <td style={styles.itemsTd}>{item.ref}</td>
                            <td style={{ ...styles.itemsTd, color: darkMode ? '#ffffff' : '#111827' }}>{item.description}</td>
                            <td style={styles.itemsTd}>{item.qty} {item.unit}</td>
                            <td style={styles.itemsTd}>{formatCurrency(item.unit_price, selectedOrder.currency)}</td>
                            <td style={{ ...styles.itemsTd, fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>
                              {formatCurrency((parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0), selectedOrder.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ ...styles.itemsTd, textAlign: 'right', fontWeight: '600' }}>TOTAL:</td>
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
                      <h4 style={styles.detailSectionTitle}>📊 Especificacions d'Enviament</h4>
                      <div style={styles.shippingGrid}>
                        {selectedOrder.total_cartons && (
                          <div><span style={styles.detailLabel}>Caixes:</span> {selectedOrder.total_cartons}</div>
                        )}
                        {selectedOrder.net_weight && (
                          <div><span style={styles.detailLabel}>Pes net:</span> {selectedOrder.net_weight}</div>
                        )}
                        {selectedOrder.gross_weight && (
                          <div><span style={styles.detailLabel}>Pes brut:</span> {selectedOrder.gross_weight}</div>
                        )}
                        {selectedOrder.total_volume && (
                          <div><span style={styles.detailLabel}>Volum:</span> {selectedOrder.total_volume}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div style={styles.detailSection}>
                      <h4 style={styles.detailSectionTitle}>📝 Notes</h4>
                      <p style={{ margin: 0, color: darkMode ? '#ffffff' : '#111827', whiteSpace: 'pre-wrap' }}>
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}

                  {/* Amazon Ready Section */}
                  <div style={styles.detailSection}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={styles.detailSectionTitle}>📦 Amazon Ready</h4>
                      <button
                        onClick={() => setShowAmazonReadySection(!showAmazonReadySection)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'transparent',
                          color: darkMode ? '#ffffff' : '#111827',
                          border: '1px solid',
                          borderColor: darkMode ? '#374151' : '#d1d5db',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {showAmazonReadySection ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    
                    {showAmazonReadySection && (
                      <AmazonReadySection
                        po={selectedOrder}
                        readiness={amazonReadiness}
                        readyStatus={amazonReadyStatus}
                        onUpdate={async (data) => {
                          if (selectedOrder?.id && selectedOrder?.project_id) {
                            const updated = await upsertPoAmazonReadiness(selectedOrder.id, selectedOrder.project_id, data)
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

                  {/* Generate Manufacturer Pack */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>📦 Manufacturer Pack</h4>
                    <p style={{ 
                      fontSize: '13px', 
                      color: darkMode ? '#9ca3af' : '#6b7280',
                      marginBottom: '12px'
                    }}>
                      Generate all documents needed to send to the manufacturer (PO, labels, packing list, carton labels)
                    </p>
                    <button
                      onClick={() => setShowManufacturerPackModal(true)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#22c55e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Package size={18} />
                      Generate Manufacturer Pack
                    </button>
                  </div>

                  {/* Manufacturer Pack */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>📦 Manufacturer Pack</h4>
                    <p style={{ 
                      fontSize: '13px', 
                      color: darkMode ? '#9ca3af' : '#6b7280',
                      marginBottom: '12px'
                    }}>
                      Generate a complete pack with PO, labels, packing list and carton labels for the manufacturer
                    </p>
                    <button
                      onClick={async () => {
                        // Carregar identifiers per al pack
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
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#8b5cf6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Package size={16} />
                      Generate Manufacturer Pack
                    </button>
                  </div>

                  {/* Generar Etiquetes FNSKU */}
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailSectionTitle}>🏷️ Etiquetes FNSKU</h4>
                    <button
                      onClick={() => setShowLabelsModal(true)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Generar Etiquetes FNSKU
                    </button>
                  </div>
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
                Generar Etiquetes FNSKU
              </h3>
              <button
                onClick={() => setShowLabelsModal(false)}
                style={styles.closeButton}
              >
                <X size={20} />
              </button>
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
                    Quantitat d'etiquetes
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
                    Plantilla
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
                    <option value="AVERY_5160">Avery 5160 - 30 etiquetes (3x10)</option>
                    <option value="LABEL_40x30">Una etiqueta per pàgina (40x30mm)</option>
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
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>Incloure SKU</span>
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
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>Incloure Nom</span>
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
                    <span style={{ fontSize: '13px', color: darkMode ? '#e5e7eb' : '#374151' }}>Mode Test Print (guies)</span>
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
                      Offset X (mm)
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
                      Offset Y (mm)
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
                <button
                  onClick={handleGenerateLabels}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginTop: '12px'
                  }}
                >
                  Generar i Descarregar PDF
                </button>
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
  content: { padding: '32px', overflowY: 'auto' },
  toolbar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  searchContainer: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)' },
  searchInput: { flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' },
  filterSelect: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #3730a3', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: '700', color: '#4f46e5' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  createButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #3730a3', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  tableContainer: { borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '14px 16px', fontSize: '14px' },
  poNumber: { fontWeight: '600', color: '#4f46e5' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  actionsCell: { display: 'flex', alignItems: 'center', gap: '4px' },
  iconButton: { background: 'none', border: '1px solid var(--border-color, #e5e7eb)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '140px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'inherit' },
  // Modal Detall
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  detailModal: { width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalLoading: { padding: '64px', textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  detailTitle: { margin: 0, fontSize: '20px', fontWeight: '600' },
  detailHeaderRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  statusSelect: { padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer', outline: 'none' },
  pdfButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #16a34a', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' },
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
