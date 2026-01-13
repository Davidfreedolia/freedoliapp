import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  X, 
  Loader, 
  Plus, 
  Trash2, 
  Save,
  Building2,
  Package,
  Truck,
  FileText,
  Calculator
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  createPurchaseOrder, 
  updatePurchaseOrder,
  generatePONumber,
  getWarehouses,
  getCompanySettings
} from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'

// Incoterms comuns
const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'
]

// Monedes
const CURRENCIES = ['USD', 'EUR', 'CNY']

// Unitats
const UNITS = ['pcs', 'sets', 'CTN', 'kg', 'g', 'boxes', 'cartons', 'units', 'pairs', 'rolls', 'm', 'cm', 'L', 'mL', 'bags']

export default function NewPOModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingOrder,
  projects,
  suppliers 
}) {
  const { darkMode } = useApp()
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const cancelButtonState = useButtonState()
  const saveButtonState = useButtonState()
  const [loading, setLoading] = useState(false)
  const [generatingPO, setGeneratingPO] = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [companySettings, setCompanySettings] = useState(null)
  
  // Dades del comprador (es carregaran de la BD)
  const [buyerInfo, setBuyerInfo] = useState({
    company: 'Freedolia',
    name: 'David Castellà Gil',
    address: 'c/ Josep Camprecios, 1, 1-2, 08950 Esplugues de Llobregat, Barcelona, Spain',
    nif: '52626358N',
    phone: '+34 630 576 066',
    email: 'david@freedolia.com'
  })

  // Carregar magatzems i configuració empresa
  useEffect(() => {
    if (isOpen) {
      loadWarehouses()
      loadCompanySettings()
    }
  }, [isOpen])

  const loadWarehouses = async () => {
    try {
      const data = await getWarehouses()
      setWarehouses(data || [])
    } catch (err) {
      console.error('Error carregant magatzems:', err)
    }
  }

  const loadCompanySettings = async () => {
    try {
      const data = await getCompanySettings()
      if (data) {
        setCompanySettings(data)
        setBuyerInfo({
          company: data.company_name || 'Freedolia',
          name: data.legal_name || '',
          address: `${data.address || ''}, ${data.postal_code || ''} ${data.city || ''}, ${data.province || ''}, ${data.country || ''}`,
          nif: data.tax_id || '',
          phone: data.phone || '',
          email: data.email || ''
        })
      }
    } catch (err) {
      console.error('Error carregant configuració empresa:', err)
    }
  }

  // Estat del formulari
  const [formData, setFormData] = useState({
    po_number: '',
    project_id: '',
    project_sku: '',
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    quote_ref: '',
    currency: 'USD',
    incoterm: 'FCA',
    incoterm_location: '',
    payment_terms: '',
    sample_lead_time: '',
    production_lead_time: '',
    quote_validity: '',
    // Adreça d'entrega
    warehouse_id: '',
    delivery_address: '',
    delivery_contact: '',
    delivery_phone: '',
    delivery_email: '',
    // Productes
    items: [
      { ref: '1', description: '', qty: '', unit: 'pcs', unit_price: '', notes: '' }
    ],
    // Shipping
    total_cartons: '',
    net_weight: '',
    gross_weight: '',
    total_volume: '',
    carton_size: '',
    shipping_mark: '',
    notes: '',
    status: 'draft',
    tracking_number: '',
    logistics_status: ''
  })

  // Seleccionar magatzem i auto-completar camps
  const handleWarehouseChange = (warehouseId) => {
    if (!warehouseId) {
      setFormData(prev => ({
        ...prev,
        warehouse_id: '',
        delivery_address: '',
        delivery_contact: '',
        delivery_phone: '',
        delivery_email: ''
      }))
      return
    }

    const warehouse = warehouses.find(w => w.id === warehouseId)
    if (warehouse) {
      setFormData(prev => ({
        ...prev,
        warehouse_id: warehouseId,
        delivery_address: [warehouse.address, warehouse.city, warehouse.country].filter(Boolean).join(', '),
        delivery_contact: warehouse.contact_name || '',
        delivery_phone: warehouse.contact_phone || '',
        delivery_email: warehouse.contact_email || ''
      }))
    }
  }

  // Obtenir icona i color segons tipus de magatzem
  const getWarehouseTypeInfo = (type) => {
    const types = {
      forwarder: { icon: '🚚', label: 'Transitari' },
      agent: { icon: '🏭', label: 'Agent' },
      amazon_fba: { icon: '📦', label: 'Amazon FBA' },
      amazon_fbm: { icon: '📦', label: 'Amazon FBM' },
      custom: { icon: '📍', label: 'Personalitzat' }
    }
    return types[type] || types.custom
  }

  // Carregar dades si estem editant
  useEffect(() => {
    if (editingOrder) {
      setFormData({
        ...editingOrder,
        items: editingOrder.items || [{ ref: '1', description: '', qty: '', unit: 'pcs', unit_price: '', notes: '' }]
      })
    } else if (isOpen) {
      // Reset form per nova PO
      setFormData(prev => ({
        ...prev,
        po_number: '',
        project_id: '',
        project_sku: '',
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        items: [{ ref: '1', description: '', qty: '', unit: 'pcs', unit_price: '', notes: '' }]
      }))
    }
  }, [editingOrder, isOpen])

  // Generar número PO quan es selecciona projecte
  const handleProjectChange = async (projectId) => {
    if (!projectId) {
      setFormData(prev => ({ ...prev, project_id: '', project_sku: '', po_number: '' }))
      return
    }

    setGeneratingPO(true)
    try {
      // Obtenir SKU del projecte
      const project = projects.find(p => p.id === projectId)
      const sku = project?.sku || ''
      
      // Generar número PO
      const poNumber = await generatePONumber(sku)
      
      setFormData(prev => ({
        ...prev,
        project_id: projectId,
        project_sku: sku,
        po_number: poNumber
      }))
    } catch (err) {
      console.error('Error generant PO:', err)
      alert('Error generant número de PO')
    }
    setGeneratingPO(false)
  }

  // Afegir línia de producte
  const addItem = () => {
    const newRef = (formData.items.length + 1).toString()
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ref: newRef, description: '', qty: '', unit: 'pcs', unit_price: '', notes: '' }]
    }))
  }

  // Eliminar línia de producte
  const removeItem = (index) => {
    if (formData.items.length === 1) return
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({ ...item, ref: (i + 1).toString() }))
    }))
  }

  // Actualitzar línia de producte
  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  // Calcular total línia
  const calculateLineTotal = (item) => {
    const qty = parseFloat(item.qty) || 0
    const price = parseFloat(item.unit_price) || 0
    return qty * price
  }

  // Calcular total general
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  }

  // Guardar PO
  const handleSave = async () => {
    if (!formData.project_id) {
      alert('Selecciona un projecte')
      return
    }
    if (!formData.supplier_id) {
      alert('Selecciona un proveïdor')
      return
    }
    if (!formData.po_number) {
      alert('Error: No s\'ha generat el número de PO')
      return
    }

    setLoading(true)
    try {
      // Netejar dades - només enviar camps que existeixen a la BD
      const poData = {
        po_number: formData.po_number,
        project_id: formData.project_id,
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        quote_ref: formData.quote_ref || null,
        currency: formData.currency || 'USD',
        incoterm: formData.incoterm || 'FCA',
        incoterm_location: formData.incoterm_location || null,
        payment_terms: formData.payment_terms || null,
        sample_lead_time: formData.sample_lead_time || null,
        production_lead_time: formData.production_lead_time || null,
        quote_validity: formData.quote_validity || null,
        delivery_address: formData.delivery_address || null,
        delivery_contact: formData.delivery_contact || null,
        delivery_phone: formData.delivery_phone || null,
        delivery_email: formData.delivery_email || null,
        total_cartons: formData.total_cartons || null,
        net_weight: formData.net_weight || null,
        gross_weight: formData.gross_weight || null,
        total_volume: formData.total_volume || null,
        carton_size: formData.carton_size || null,
        shipping_mark: formData.shipping_mark || null,
        notes: formData.notes || null,
        status: formData.status || 'draft',
        tracking_number: formData.tracking_number || null,
        logistics_status: formData.logistics_status || null,
        total_amount: calculateTotal(),
        items: JSON.stringify(formData.items),
        buyer_info: JSON.stringify(buyerInfo)
      }

      console.log('Guardant PO:', poData)

      if (editingOrder) {
        await updatePurchaseOrder(editingOrder.id, poData)
        // Audit log: PO actualitzat
        const { logSuccess } = await import('../lib/auditLog')
        await logSuccess('purchase_order', 'update', editingOrder.id, 'Purchase order updated', {
          po_number: poData.po_number,
          project_id: poData.project_id
        })
      } else {
        const newPO = await createPurchaseOrder(poData)
        // Audit log: PO creat
        const { logSuccess } = await import('../lib/auditLog')
        await logSuccess('purchase_order', 'create', newPO.id, 'Purchase order created', {
          po_number: poData.po_number,
          project_id: poData.project_id,
          supplier_id: poData.supplier_id
        })
      }
      
      onSave()
    } catch (err) {
      console.error('Error guardant PO:', err)
      // Audit log: error
      const { logError, handleError } = await import('../lib/auditLog')
      const { handleError: handleErr } = await import('../lib/errorHandling')
      await logError('purchase_order', editingOrder ? 'update' : 'create', err, {
        po_number: formData.po_number,
        project_id: formData.project_id
      })
      await handleErr('purchase_order', editingOrder ? 'update' : 'create', err, { notify: true })
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div style={{...styles.overlay, ...modalStyles.overlay}}>
      <div 
        style={{
          ...styles.modal,
          ...modalStyles.modal
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{
              ...styles.title,
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              {editingOrder ? 'Editar Comanda' : 'Nova Purchase Order'}
            </h2>
            {formData.po_number && (
              <span style={styles.poNumberBadge}>{formData.po_number}</span>
            )}
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* SECCIÓ 1: Projecte i Proveïdor */}
          <div style={styles.section}>
            <h3 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
              <FileText size={18} />
              Informació Bàsica
            </h3>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Projecte *</label>
                <select
                  value={formData.project_id}
                  onChange={e => handleProjectChange(e.target.value)}
                  disabled={generatingPO}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                >
                  <option value="">Selecciona projecte...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.sku || project.project_code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Número PO</label>
                <input
                  type="text"
                  value={generatingPO ? 'Generant...' : formData.po_number}
                  disabled
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#e5e7eb',
                    color: '#4f46e5',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Proveïdor *</label>
                <select
                  value={formData.supplier_id}
                  onChange={e => {
                    const supplierId = e.target.value
                    const supplier = suppliers.find(s => s.id === supplierId)
                    setFormData({
                      ...formData, 
                      supplier_id: supplierId,
                      // Auto-completar amb dades del proveïdor si existeixen
                      payment_terms: supplier?.payment_terms || formData.payment_terms,
                      incoterm: supplier?.incoterm || formData.incoterm,
                      incoterm_location: supplier?.incoterm_location || formData.incoterm_location
                    })
                  }}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                >
                  <option value="">Selecciona proveïdor...</option>
                  {suppliers.filter(s => s.type !== 'freight').map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.city}, {supplier.country})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Data</label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={e => setFormData({...formData, order_date: e.target.value})}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ref. Pressupost</label>
                <input
                  type="text"
                  value={formData.quote_ref}
                  onChange={e => setFormData({...formData, quote_ref: e.target.value})}
                  placeholder="Ex: 20251216"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Moneda</label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓ 2: Adreça d'entrega */}
          <div style={styles.section}>
            <h3 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
              <Truck size={18} />
              Adreça d'Entrega
            </h3>
            
            <div style={styles.formGrid}>
              {/* Combo de magatzems */}
              <div style={{...styles.formGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Seleccionar Magatzem / Adreça</label>
                <select
                  value={formData.warehouse_id}
                  onChange={e => handleWarehouseChange(e.target.value)}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                >
                  <option value="">-- Selecciona o escriu manualment --</option>
                  {warehouses.map(warehouse => {
                    const typeInfo = getWarehouseTypeInfo(warehouse.type)
                    return (
                      <option key={warehouse.id} value={warehouse.id}>
                        {typeInfo.icon} {warehouse.name} ({typeInfo.label}) - {warehouse.city}, {warehouse.country}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div style={{...styles.formGroup, gridColumn: 'span 3'}}>
                <label style={styles.label}>Adreça completa</label>
                <textarea
                  value={formData.delivery_address}
                  onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                  placeholder="Shenzhen Wingspeed Logistics Park..."
                  rows={2}
                  style={{
                    ...styles.input,
                    ...styles.textarea,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contacte</label>
                <input
                  type="text"
                  value={formData.delivery_contact}
                  onChange={e => setFormData({...formData, delivery_contact: e.target.value})}
                  placeholder="Nom del contacte"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Telèfon</label>
                <input
                  type="tel"
                  value={formData.delivery_phone}
                  onChange={e => setFormData({...formData, delivery_phone: e.target.value})}
                  placeholder="+86..."
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={formData.delivery_email}
                  onChange={e => setFormData({...formData, delivery_email: e.target.value})}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓ 3: Termes Comercials */}
          <div style={styles.section}>
            <h3 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
              <Building2 size={18} />
              Termes Comercials
            </h3>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Termes de Pagament</label>
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                  placeholder="50% deposit, 50% before shipping"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Incoterm</label>
                <div style={styles.inlineInputs}>
                  <select
                    value={formData.incoterm}
                    onChange={e => setFormData({...formData, incoterm: e.target.value})}
                    style={{
                      ...styles.input,
                      width: '100px',
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    {INCOTERMS.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.incoterm_location}
                    onChange={e => setFormData({...formData, incoterm_location: e.target.value})}
                    placeholder="SHENZHEN"
                    style={{
                      ...styles.input,
                      flex: 1,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Lead Time Mostres</label>
                <input
                  type="text"
                  value={formData.sample_lead_time}
                  onChange={e => setFormData({...formData, sample_lead_time: e.target.value})}
                  placeholder="7 dies"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Lead Time Producció</label>
                <input
                  type="text"
                  value={formData.production_lead_time}
                  onChange={e => setFormData({...formData, production_lead_time: e.target.value})}
                  placeholder="2 mesos"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Validesa Pressupost</label>
                <input
                  type="text"
                  value={formData.quote_validity}
                  onChange={e => setFormData({...formData, quote_validity: e.target.value})}
                  placeholder="5 mesos"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓ 4: Productes */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827', margin: 0}}>
                <Package size={18} />
                Detall de Productes
              </h3>
              <button onClick={addItem} style={styles.addButton}>
                <Plus size={16} />
                Afegir línia
              </button>
            </div>
            
            <div style={styles.itemsTableWrapper}>
              <div style={styles.itemsTable}>
                <div style={styles.itemsHeader}>
                  <span style={{width: '40px', minWidth: '40px', flexShrink: 0}}>Ref</span>
                  <span style={{flex: '2 1 0', minWidth: 0}}>Descripció</span>
                  <span style={{width: '80px', minWidth: '80px', flexShrink: 0}}>Qty</span>
                  <span style={{width: '80px', minWidth: '80px', flexShrink: 0}}>Unitat</span>
                  <span style={{width: '100px', minWidth: '100px', flexShrink: 0}}>Preu ({formData.currency})</span>
                  <span style={{width: '100px', minWidth: '100px', flexShrink: 0}}>Total</span>
                  <span style={{width: '40px', minWidth: '40px', flexShrink: 0}}></span>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} style={styles.itemRow}>
                    <span style={{width: '40px', minWidth: '40px', flexShrink: 0, color: '#6b7280'}}>{item.ref}</span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(index, 'description', e.target.value)}
                      placeholder="Descripció del producte..."
                      style={{
                        ...styles.itemInput,
                        flex: '2 1 0',
                        minWidth: 0,
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    />
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => updateItem(index, 'qty', e.target.value)}
                      placeholder="0"
                      style={{
                        ...styles.itemInput,
                        width: '80px',
                        minWidth: '80px',
                        flexShrink: 0,
                        textAlign: 'right',
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    />
                    <select
                      value={item.unit}
                      onChange={e => updateItem(index, 'unit', e.target.value)}
                      style={{
                        ...styles.itemInput,
                        width: '80px',
                        minWidth: '80px',
                        flexShrink: 0,
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={item.unit_price}
                      onChange={e => updateItem(index, 'unit_price', e.target.value)}
                      placeholder="0.00"
                      style={{
                        ...styles.itemInput,
                        width: '100px',
                        minWidth: '100px',
                        flexShrink: 0,
                        textAlign: 'right',
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    />
                    <span style={{
                      width: '100px',
                      minWidth: '100px',
                      flexShrink: 0,
                      textAlign: 'right',
                      fontWeight: '600',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}>
                      {calculateLineTotal(item).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => removeItem(index)}
                      style={styles.removeItemButton}
                      disabled={formData.items.length === 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                
                {/* Total */}
                <div style={styles.totalRow}>
                  <span style={{flex: '1 1 0', minWidth: 0, textAlign: 'right', fontWeight: '600'}}>
                    TOTAL ({formData.currency}):
                  </span>
                  <span style={{
                    width: '100px',
                    minWidth: '100px',
                    flexShrink: 0,
                    textAlign: 'right',
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#4f46e5'
                  }}>
                    {calculateTotal().toFixed(2)}
                  </span>
                  <span style={{width: '40px', minWidth: '40px', flexShrink: 0}}></span>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓ 5: Shipping Specs */}
          <div style={styles.section}>
            <h3 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
              <Calculator size={18} />
              Especificacions d'Enviament
            </h3>
            
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Total Caixes (CTN)</label>
                <input
                  type="text"
                  value={formData.total_cartons}
                  onChange={e => setFormData({...formData, total_cartons: e.target.value})}
                  placeholder="40 CTN"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Pes Net (kg)</label>
                <input
                  type="text"
                  value={formData.net_weight}
                  onChange={e => setFormData({...formData, net_weight: e.target.value})}
                  placeholder="340 kg"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Pes Brut (kg)</label>
                <input
                  type="text"
                  value={formData.gross_weight}
                  onChange={e => setFormData({...formData, gross_weight: e.target.value})}
                  placeholder="360 kg"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Volum Total (CBM)</label>
                <input
                  type="text"
                  value={formData.total_volume}
                  onChange={e => setFormData({...formData, total_volume: e.target.value})}
                  placeholder="2.49 CBM"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Mida Caixa</label>
                <input
                  type="text"
                  value={formData.carton_size}
                  onChange={e => setFormData({...formData, carton_size: e.target.value})}
                  placeholder="45x38.5x36cm"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Shipping Mark</label>
                <input
                  type="text"
                  value={formData.shipping_mark}
                  onChange={e => setFormData({...formData, shipping_mark: e.target.value})}
                  placeholder="Freedolia + David Castellà"
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tracking & Logistics Status */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tracking Number</label>
              <input
                type="text"
                value={formData.tracking_number}
                onChange={e => setFormData({...formData, tracking_number: e.target.value})}
                placeholder="ABC123456789"
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                  color: darkMode ? '#ffffff' : '#111827'
                }}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estat Logístic</label>
              <select
                value={formData.logistics_status}
                onChange={e => setFormData({...formData, logistics_status: e.target.value})}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                  color: darkMode ? '#ffffff' : '#111827'
                }}
              >
                <option value="">Selecciona estat</option>
                <option value="production">Producció</option>
                <option value="pickup">Recollida</option>
                <option value="in_transit">En trànsit</option>
                <option value="customs">Duanes</option>
                <option value="amazon_fba">Amazon FBA</option>
                <option value="delivered">Lliurat</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Notes addicionals</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Notes, instruccions especials..."
              rows={3}
              style={{
                ...styles.input,
                ...styles.textarea,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button 
            onClick={onClose}
            {...cancelButtonState}
            style={getButtonStyles({ 
              variant: 'danger', 
              darkMode, 
              disabled: false,
              isHovered: cancelButtonState.isHovered,
              isActive: cancelButtonState.isActive
            })}
          >
            {t('common.cancel', 'Cancel·lar')}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <button 
              onClick={handleSave} 
              disabled={loading || !formData.po_number}
              title={!formData.po_number ? 'Selecciona un projecte per generar el número de PO' : ''}
              {...saveButtonState}
              style={getButtonStyles({ 
                variant: 'primary', 
                darkMode, 
                disabled: loading || !formData.po_number,
                isHovered: saveButtonState.isHovered,
                isActive: saveButtonState.isActive
              })}
            >
              {loading ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Guardant...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {editingOrder ? 'Actualitzar' : 'Crear PO'}
                </>
              )}
            </button>
            {!formData.po_number && !loading && (
              <span style={{
                fontSize: '11px',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                Selecciona un projecte per continuar
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    borderRadius: 'var(--radius-ui)', // Unified radius
    border: 'none', // No border - use shadow
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--surface-bg)',
    boxShadow: 'var(--shadow-lg)' // Stronger shadow for modals
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: 'none', // No border - use subtle background difference
    backgroundColor: 'var(--surface-bg-2)'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  poNumberBadge: {
    display: 'inline-block',
    marginTop: '4px',
    padding: '4px 10px',
    backgroundColor: '#4f46e515',
    color: '#4f46e5',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  body: {
    padding: '24px',
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    boxSizing: 'border-box'
  },
  section: {
    padding: '20px',
    borderRadius: 'var(--radius-ui)', // Unified radius
    border: 'none', // No border - use shadow
    backgroundColor: 'var(--surface-bg)',
    boxSizing: 'border-box',
    width: '100%',
    boxShadow: 'var(--shadow-soft)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    whiteSpace: 'nowrap',
    overflow: 'visible',
    textOverflow: 'clip'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%'
  },
  textarea: {
    resize: 'vertical',
    minHeight: '60px'
  },
  inlineInputs: {
    display: 'flex',
    gap: '8px'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#4f46e515',
    color: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  itemsTableWrapper: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'visible',
    boxSizing: 'border-box'
  },
  itemsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '100%',
    boxSizing: 'border-box'
  },
  itemsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#6b7280',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  itemInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%'
  },
  removeItemButton: {
    width: '32px',
    minWidth: '32px',
    height: '32px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 8px',
    borderTop: '2px solid var(--border-color)',
    marginTop: '8px',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid var(--border-color)'
  },
}
