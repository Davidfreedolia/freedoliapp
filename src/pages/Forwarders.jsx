import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Truck,
  MoreVertical,
  Trash2,
  Edit,
  Mail,
  Phone,
  MapPin,
  Star,
  MessageCircle,
  Globe,
  X,
  Save,
  Warehouse,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Package,
  Filter
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  getSuppliersByType,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  supabase
} from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { showToast } from '../components/Toast'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'

// Països i ciutats
const COUNTRIES_CITIES = {
  'Xina': ['Shenzhen', 'Guangzhou', 'Ningbo', 'Shanghai', 'Yiwu', 'Qingdao', 'Xiamen', 'Hong Kong', 'Foshan', 'Dongguan', 'Huizhou'],
  'Índia': ['Mumbai', 'Delhi', 'Chennai'],
  'Vietnam': ['Ho Chi Minh', 'Hanoi', 'Hai Phong'],
  'Espanya': ['Barcelona', 'Madrid', 'Valencia', 'Bilbao'],
  'Alemanya': ['Hamburg', 'Frankfurt', 'Berlin'],
  'Holanda': ['Rotterdam', 'Amsterdam'],
  'USA': ['Los Angeles', 'New York', 'Miami'],
  'Altres': []
}

const COUNTRIES = Object.keys(COUNTRIES_CITIES)

const PAYMENT_TERMS = [
  '100% T/T in advance',
  '30% deposit, 70% before shipment',
  '50% deposit, 50% before shipment',
  'Net 30 days',
  'Net 60 days',
  'PayPal'
]

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'CFR', 'DDP', 'DAP', 'FCA', 'CPT']

export default function Forwarders() {
  const { darkMode, driveConnected, demoMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  const [forwarders, setForwarders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedForwarder, setExpandedForwarder] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [layout, setLayout] = useLayoutPreference('layout:forwarders', 'grid')
  const [selectedForwarderId, setSelectedForwarderId] = useState(null)
  
  // Modals
  const [showForwarderModal, setShowForwarderModal] = useState(false)
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [editingForwarder, setEditingForwarder] = useState(null)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    entity: null, 
    entityType: null, // 'forwarder' or 'warehouse'
    isDeleting: false 
  })
  
  // Ciutats
  const [availableCities, setAvailableCities] = useState([])
  const [customCities, setCustomCities] = useState({})
  const [showCustomCityInput, setShowCustomCityInput] = useState(false)
  const [newCityName, setNewCityName] = useState('')

  useEffect(() => {
    loadData()
    loadCustomCities()
  }, [])

  // Close actions menu when clicking outside
  useEffect(() => {
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
      // Verify functions are available before calling
      if (typeof getSuppliersByType !== 'function' || typeof getWarehouses !== 'function') {
        throw new Error('Database functions not available')
      }
      
      const [forwardersData, warehousesData] = await Promise.all([
        getSuppliersByType('freight'),
        getWarehouses()
      ])
      setForwarders(forwardersData || [])
      setWarehouses(warehousesData || [])
    } catch (err) {
      console.error('Error carregant dades:', err)
      showToast('Error carregant transitaris: ' + (err.message || 'Error desconegut'), 'error')
      // Set empty arrays on error to prevent crashes
      setForwarders([])
      setWarehouses([])
    }
    setLoading(false)
  }

  const loadCustomCities = async () => {
    try {
      // Verify supabase client is valid before using it
      if (!supabase || typeof supabase.from !== 'function') {
        // Supabase client not available for custom cities - silently fail
        return
      }
      
      const { data, error } = await supabase
        .from('custom_cities')
        .select('*')
      
      if (error) {
        // Silently fail if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          return
        }
        throw error
      }
      
      if (data) {
        const grouped = {}
        data.forEach(c => {
          if (!grouped[c.country]) grouped[c.country] = []
          grouped[c.country].push(c.city)
        })
        setCustomCities(grouped)
      }
    } catch (err) {
      // Silently fail for custom cities - it's optional data
      // Silently fail for custom cities - it's optional data
    }
  }

  const getCitiesForCountry = (country) => {
    const baseCities = COUNTRIES_CITIES[country] || []
    const custom = customCities[country] || []
    return [...new Set([...baseCities, ...custom])].sort()
  }

  const handleAddCustomCity = async () => {
    if (!newCityName.trim() || !editingForwarder?.country) return
    
    const country = editingForwarder.country
    const city = newCityName.trim()
    
    try {
      await supabase.from('custom_cities').insert({ country, city })
    } catch (err) {
      // Custom cities saved locally
    }
    
    setCustomCities(prev => ({
      ...prev,
      [country]: [...(prev[country] || []), city]
    }))
    setAvailableCities(prev => [...prev, city].sort())
    setEditingForwarder({ ...editingForwarder, city })
    setNewCityName('')
    setShowCustomCityInput(false)
  }

  // Filtrar transitaris
  const filteredForwarders = forwarders.filter(f => 
    f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (!filteredForwarders.length) {
      setSelectedForwarderId(null)
      return
    }
    if (!selectedForwarderId || !filteredForwarders.some(f => f.id === selectedForwarderId)) {
      setSelectedForwarderId(filteredForwarders[0].id)
    }
  }, [filteredForwarders, selectedForwarderId])

  const effectiveLayout = isMobile ? 'list' : layout
  const selectedForwarder = filteredForwarders.find(f => f.id === selectedForwarderId)

  // Obtenir magatzems d'un transitari
  const getForwarderWarehouses = (forwarderId) => {
    return warehouses.filter(w => w.supplier_id === forwarderId)
  }

  // Stats
  const stats = {
    total: filteredForwarders.length,
    totalWarehouses: warehouses.filter(w => w.type === 'forwarder').length
  }

  // Render estrelles
  const renderStars = (rating, editable = false, onChange = null) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => editable && onChange && onChange(i)}
            style={{ background: 'none', border: 'none', cursor: editable ? 'pointer' : 'default', padding: '2px' }}
          >
            <Star size={16} fill={i <= rating ? '#f59e0b' : 'none'} color={i <= rating ? '#f59e0b' : '#d1d5db'} />
          </button>
        ))}
      </div>
    )
  }

  const renderForwarderCard = (forwarder, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const forwarderWarehouses = getForwarderWarehouses(forwarder.id)
    const isExpanded = isPreview ? true : expandedForwarder === forwarder.id

    return (
      <div key={forwarder.id} style={{
        ...styles.forwarderCard,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}
      onMouseEnter={enablePreviewSelect ? () => setSelectedForwarderId(forwarder.id) : undefined}
      >
        {/* Header */}
        <div
          style={styles.forwarderHeader}
          onClick={() => {
            if (isPreview) return
            setExpandedForwarder(isExpanded ? null : forwarder.id)
          }}
        >
          <div style={styles.forwarderIcon}>
            <Truck size={24} color="#1F4E5F" />
          </div>
          <div style={styles.forwarderInfo}>
            <h3 style={{ ...styles.forwarderName, color: darkMode ? '#ffffff' : '#111827' }}>
              {forwarder.name}
            </h3>
            <div style={styles.forwarderMeta}>
              <span><MapPin size={12} /> {forwarder.city}, {forwarder.country}</span>
              {forwarder.phone && <span><Phone size={12} /> {forwarder.phone}</span>}
            </div>
            {forwarder.payment_terms && (
              <div style={styles.forwarderMeta}>
                <span><CreditCard size={12} /> {forwarder.payment_terms}</span>
                {forwarder.incoterm && <span><Package size={12} /> {forwarder.incoterm}</span>}
              </div>
            )}
          </div>
          <div style={styles.forwarderActions}>
            <span style={styles.warehouseCount}>
              {forwarderWarehouses.length} magatzems
            </span>
            {renderStars(forwarder.rating)}
            {!isPreview && (isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
          </div>
          {!isPreview && (
            <div 
              style={{ position: 'relative' }} 
              data-menu-container
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === forwarder.id ? null : forwarder.id)
                }} 
                style={styles.menuButton}
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen === forwarder.id && (
                <div 
                  style={{ 
                    ...styles.menu, 
                    backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                    zIndex: 1000
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditForwarder(forwarder)
                    }} 
                    style={styles.menuItem}
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteForwarder(forwarder)
                    }} 
                    style={{ ...styles.menuItem, color: '#F26C63' }}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded - Warehouses */}
        {isExpanded && (
          <div style={styles.warehousesSection}>
            <div style={styles.warehousesHeader}>
              <h4 style={{ color: darkMode ? '#ffffff' : '#111827', margin: 0 }}>
                Magatzems de {forwarder.name}
              </h4>
              <button onClick={() => handleNewWarehouse(forwarder.id)} style={styles.addWarehouseBtn}>
                <Plus size={14} /> Afegir magatzem
              </button>
            </div>
            
            {forwarderWarehouses.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No hi ha magatzems configurats</p>
            ) : (
              <div style={styles.warehousesList}>
                {forwarderWarehouses.map(warehouse => (
                  <div key={warehouse.id} style={{
                    ...styles.warehouseItem,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                  }}>
                    <div>
                      <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{warehouse.name}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                        {warehouse.address}, {warehouse.city}, {warehouse.country}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditWarehouse(warehouse)} style={styles.iconBtn}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteWarehouse(warehouse)} style={{ ...styles.iconBtn, color: '#F26C63' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // CRUD Transitari
  const handleNewForwarder = () => {
    if (!driveConnected) return
    const defaultCountry = 'Xina'
    setEditingForwarder({
      name: '',
      type: 'freight',
      contact_name: '',
      email: '',
      phone: '',
      whatsapp: '',
      wechat: '',
      country: defaultCountry,
      city: '',
      address: '',
      website: '',
      rating: 0,
      notes: '',
      payment_terms: 'Net 30 days',
      incoterm: 'FOB',
      incoterm_location: ''
    })
    setAvailableCities(getCitiesForCountry(defaultCountry))
    setShowForwarderModal(true)
  }

  const handleEditForwarder = (forwarder) => {
    setEditingForwarder({ ...forwarder })
    setAvailableCities(getCitiesForCountry(forwarder.country))
    setShowForwarderModal(true)
    setMenuOpen(null)
  }

  const handleSaveForwarder = async () => {
    if (!editingForwarder.name || !editingForwarder.name.trim()) {
      showToast('El nom és obligatori', 'error')
      return
    }
    
    // Verify required functions are available
    if (typeof createSupplier !== 'function' || typeof updateSupplier !== 'function') {
      showToast('Error: Funcions de base de dades no disponibles', 'error')
      return
    }
    
    setSaving(true)
    try {
      if (editingForwarder.id) {
        // Ensure type is set when updating
        const updateData = { ...editingForwarder, type: 'freight' }
        const result = await updateSupplier(editingForwarder.id, updateData)
        if (!result) {
          throw new Error('No es va rebre resposta de l\'actualització')
        }
        showToast('Transitari actualitzat correctament', 'success')
      } else {
        // Ensure type is set when creating
        const createData = { ...editingForwarder, type: 'freight' }
        const result = await createSupplier(createData)
        if (!result) {
          throw new Error('No es va rebre resposta de la creació')
        }
        showToast('Transitari creat correctament', 'success')
      }
      await loadData()
      setShowForwarderModal(false)
      setEditingForwarder(null)
    } catch (err) {
      console.error('Error guardant transitari:', err)
      const errorMessage = err.message || 'Error desconegut'
      showToast('Error guardant transitari: ' + errorMessage, 'error')
      // NO tancar modal si hi ha error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteForwarder = async (forwarder) => {
    // Check demo mode
    if (demoMode) {
      showToast('En mode demo no es poden eliminar dades', 'error')
      return
    }
    
    setDeleteModal({ isOpen: true, entity: forwarder, entityType: 'forwarder', isDeleting: false })
    setMenuOpen(null)
  }

  // CRUD Magatzem
  const handleNewWarehouse = (forwarderId) => {
    const forwarder = forwarders.find(f => f.id === forwarderId)
    setEditingWarehouse({
      name: '',
      type: 'forwarder',
      warehouse_type: 'forwarder',
      supplier_id: forwarderId,
      address: '',
      city: forwarder?.city || '',
      country: forwarder?.country || 'Xina',
      contact_name: forwarder?.contact_name || '',
      contact_phone: forwarder?.phone || '',
      contact_email: forwarder?.email || '',
      notes: ''
    })
    setShowWarehouseModal(true)
  }

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse({ ...warehouse })
    setShowWarehouseModal(true)
    setMenuOpen(null)
  }

  const handleSaveWarehouse = async () => {
    if (!editingWarehouse.name || !editingWarehouse.name.trim()) {
      showToast('El nom és obligatori', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingWarehouse.id) {
        await updateWarehouse(editingWarehouse.id, editingWarehouse)
        showToast('Magatzem actualitzat correctament', 'success')
      } else {
        await createWarehouse(editingWarehouse)
        showToast('Magatzem creat correctament', 'success')
      }
      await loadData()
      setShowWarehouseModal(false)
      setEditingWarehouse(null)
    } catch (err) {
      console.error('Error guardant magatzem:', err)
      showToast(`Error guardant magatzem: ${err.message || 'Error desconegut'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse) => {
    // Check demo mode
    if (demoMode) {
      showToast('En mode demo no es poden eliminar dades', 'error')
      return
    }
    
    setDeleteModal({ isOpen: true, entity: warehouse, entityType: 'warehouse', isDeleting: false })
    setMenuOpen(null)
  }

  const handleConfirmDelete = async () => {
    const { entity, entityType } = deleteModal
    if (!entity || !entityType) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      if (entityType === 'forwarder') {
        await deleteSupplier(entity.id)
      } else if (entityType === 'warehouse') {
        await deleteWarehouse(entity.id)
      }
      
      showToast('Eliminat correctament', 'success')
      await loadData()
      setDeleteModal({ isOpen: false, entity: null, entityType: null, isDeleting: false })
    } catch (err) {
      console.error(`Error eliminant ${entityType}:`, err)
      
      // Check for FK constraint violation (PostgreSQL error code 23503)
      if (err.code === '23503' || err.message?.includes('foreign key') || err.message?.includes('violates foreign key')) {
        showToast('No es pot eliminar perquè està en ús (comandes/despeses/projectes). Elimina o desvincula els elements relacionats primer.', 'error')
      } else {
        const entityName = entityType === 'forwarder' ? 'transitari' : 'magatzem'
        showToast(`Error eliminant ${entityName}: ` + (err.message || 'Error desconegut'), 'error')
      }
      
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  return (
    <div style={styles.container}>
      <Header title="Transitaris" />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Toolbar */}
        <div style={{
          ...styles.toolbar,
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px'
        }}>
          <div style={styles.searchGroup}>
            <div style={{
              ...styles.searchContainer,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
            }}>
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar transitaris..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ ...styles.searchInput, color: darkMode ? '#ffffff' : '#111827' }}
              />
            </div>
            <Button variant="secondary" size="sm" style={styles.filterButton}>
              <Filter size={14} />
              Filtres
            </Button>
          </div>
          <div style={styles.toolbarRight}>
            <LayoutSwitcher
              value={effectiveLayout}
              onChange={setLayout}
              compact={isMobile}
            />
            <Button 
              onClick={handleNewForwarder} 
              disabled={!driveConnected}
              title={!driveConnected ? "Connecta Google Drive per crear" : ""}
              style={{
                opacity: !driveConnected ? 0.5 : 1,
                cursor: !driveConnected ? 'not-allowed' : 'pointer'
              }}
            >
              <Plus size={18} /> Nou Transitari
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Truck size={24} color="#f59e0b" />
            <div>
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>Transitaris</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={24} color="#3b82f6" />
            <div>
              <span style={styles.statValue}>{stats.totalWarehouses}</span>
              <span style={styles.statLabel}>Magatzems</span>
            </div>
          </div>
        </div>

        {/* Llista */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : filteredForwarders.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Truck size={48} color="#d1d5db" />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>No hi ha transitaris. Crea el primer!</p>
            <Button onClick={handleNewForwarder}>
              <Plus size={18} /> Afegir Transitari
            </Button>
          </div>
        ) : (
          <>
            {effectiveLayout === 'grid' && (
              <div style={{
                ...styles.forwardersGrid,
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
                gap: isMobile ? '12px' : '16px'
              }}>
                {filteredForwarders.map(forwarder => renderForwarderCard(forwarder))}
              </div>
            )}
            {effectiveLayout === 'list' && (
              <div style={styles.forwardersList}>
                {filteredForwarders.map(forwarder => renderForwarderCard(forwarder))}
              </div>
            )}
            {effectiveLayout === 'split' && (
              <div style={styles.splitLayout}>
                <div style={styles.splitList}>
                  {filteredForwarders.map(forwarder => renderForwarderCard(forwarder, { enablePreviewSelect: true }))}
                </div>
                <div style={styles.splitPreview}>
                  {selectedForwarder ? (
                    renderForwarderCard(selectedForwarder, { isPreview: true })
                  ) : (
                    <div style={styles.splitEmpty}>Selecciona un transitari</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Transitari */}
      {showForwarderModal && editingForwarder && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}}>
          <div style={{ ...styles.modal, ...modalStyles.modal }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingForwarder.id ? 'Editar Transitari' : 'Nou Transitari'}
              </h3>
              <button onClick={() => { setShowForwarderModal(false); setEditingForwarder(null); setShowCustomCityInput(false) }} style={styles.closeButton}><X size={20} /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                {/* Nom empresa */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Nom empresa *</label>
                  <input type="text" value={editingForwarder.name} onChange={e => setEditingForwarder({...editingForwarder, name: e.target.value})}
                    placeholder="Ex: Shenzhen Wingspeed International Logistics"
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* Contacte */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Persona contacte</label>
                  <input type="text" value={editingForwarder.contact_name} onChange={e => setEditingForwarder({...editingForwarder, contact_name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* Email */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input type="email" value={editingForwarder.email} onChange={e => setEditingForwarder({...editingForwarder, email: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* Telèfon */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telèfon</label>
                  <input type="tel" value={editingForwarder.phone} onChange={e => setEditingForwarder({...editingForwarder, phone: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* WhatsApp */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>WhatsApp</label>
                  <input type="tel" value={editingForwarder.whatsapp || ''} onChange={e => setEditingForwarder({...editingForwarder, whatsapp: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* WeChat */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>WeChat</label>
                  <input type="text" value={editingForwarder.wechat || ''} onChange={e => setEditingForwarder({...editingForwarder, wechat: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* País */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>País</label>
                  <select value={editingForwarder.country} onChange={e => { 
                    const newCountry = e.target.value
                    setEditingForwarder({...editingForwarder, country: newCountry, city: ''})
                    setAvailableCities(getCitiesForCountry(newCountry))
                  }}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Ciutat amb opció manual */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ciutat</label>
                  <select 
                    value={editingForwarder.city} 
                    onChange={e => {
                      if (e.target.value === '__add_new__') {
                        setShowCustomCityInput(true)
                      } else {
                        setEditingForwarder({...editingForwarder, city: e.target.value})
                      }
                    }}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    <option value="">Selecciona...</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__add_new__">➕ Afegir nova ciutat...</option>
                  </select>
                  {showCustomCityInput && (
                    <div style={styles.customCityRow}>
                      <input
                        type="text"
                        value={newCityName}
                        onChange={e => setNewCityName(e.target.value)}
                        placeholder="Nom de la ciutat"
                        style={{ ...styles.input, flex: 1, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                      />
                      <button onClick={handleAddCustomCity} style={styles.addCityBtn}>Afegir</button>
                      <button onClick={() => { setShowCustomCityInput(false); setNewCityName('') }} style={styles.cancelCityBtn}>✕</button>
                    </div>
                  )}
                </div>

                {/* Adreça completa */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Adreça completa</label>
                  <input type="text" value={editingForwarder.address || ''} onChange={e => setEditingForwarder({...editingForwarder, address: e.target.value})}
                    placeholder="Adreça completa de l'empresa..."
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* Payment Terms */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Condicions Pagament</label>
                  <select value={editingForwarder.payment_terms || ''} onChange={e => setEditingForwarder({...editingForwarder, payment_terms: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    <option value="">Selecciona...</option>
                    {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Incoterm */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Incoterm</label>
                  <select value={editingForwarder.incoterm || ''} onChange={e => setEditingForwarder({...editingForwarder, incoterm: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    <option value="">Selecciona...</option>
                    {INCOTERMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                {/* Website */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Web</label>
                  <input type="url" value={editingForwarder.website || ''} onChange={e => setEditingForwarder({...editingForwarder, website: e.target.value})}
                    placeholder="https://..."
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>

                {/* Valoració */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Valoració</label>
                  {renderStars(editingForwarder.rating, true, (r) => setEditingForwarder({...editingForwarder, rating: r}))}
                </div>

                {/* Notes */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Notes</label>
                  <textarea value={editingForwarder.notes || ''} onChange={e => setEditingForwarder({...editingForwarder, notes: e.target.value})} rows={2}
                    style={{ ...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => { setShowForwarderModal(false); setEditingForwarder(null); setShowCustomCityInput(false) }} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveForwarder} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> {editingForwarder.id ? 'Actualitzar' : 'Crear'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Magatzem */}
      {showWarehouseModal && editingWarehouse && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}}>
          <div style={{ ...styles.modal, ...modalStyles.modal }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingWarehouse.id ? 'Editar Magatzem' : 'Nou Magatzem'}
              </h3>
              <button onClick={() => { setShowWarehouseModal(false); setEditingWarehouse(null) }} style={styles.closeButton}><X size={20} /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Nom del magatzem *</label>
                  <input type="text" value={editingWarehouse.name} onChange={e => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                    placeholder="Ex: Magatzem Shenzhen" style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Adreça completa</label>
                  <textarea value={editingWarehouse.address} onChange={e => setEditingWarehouse({...editingWarehouse, address: e.target.value})} rows={2}
                    style={{ ...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ciutat</label>
                  <input type="text" value={editingWarehouse.city} onChange={e => setEditingWarehouse({...editingWarehouse, city: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>País</label>
                  <input type="text" value={editingWarehouse.country} onChange={e => setEditingWarehouse({...editingWarehouse, country: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contacte</label>
                  <input type="text" value={editingWarehouse.contact_name} onChange={e => setEditingWarehouse({...editingWarehouse, contact_name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telèfon contacte</label>
                  <input type="tel" value={editingWarehouse.contact_phone} onChange={e => setEditingWarehouse({...editingWarehouse, contact_phone: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email contacte</label>
                  <input type="email" value={editingWarehouse.contact_email} onChange={e => setEditingWarehouse({...editingWarehouse, contact_email: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Notes</label>
                  <textarea value={editingWarehouse.notes || ''} onChange={e => setEditingWarehouse({...editingWarehouse, notes: e.target.value})} rows={2}
                    style={{ ...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => { setShowWarehouseModal(false); setEditingWarehouse(null) }} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveWarehouse} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, entity: null, entityType: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        entityName={deleteModal.entity?.name || ''}
        entityType={deleteModal.entityType === 'forwarder' ? 'transitari' : 'magatzem'}
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
  toolbar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  searchGroup: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  searchContainer: { flex: '0 1 360px', maxWidth: '360px', width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)' },
  searchInput: { flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' },
  filterButton: { height: '36px' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '24px', fontWeight: '600', color: '#1F4E5F' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  forwardersList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  forwardersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '20px' },
  splitList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  splitPreview: { position: 'sticky', top: '96px', alignSelf: 'flex-start' },
  splitEmpty: { padding: '24px', borderRadius: '16px', backgroundColor: 'var(--surface-bg)', boxShadow: 'var(--shadow-soft)', color: 'var(--muted)' },
  forwarderCard: { borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' },
  forwarderHeader: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', cursor: 'pointer' },
  forwarderIcon: { width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(31, 78, 95, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  forwarderInfo: { flex: 1 },
  forwarderName: { margin: '0 0 4px', fontSize: '16px', fontWeight: '600' },
  forwarderMeta: { display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280', marginTop: '4px' },
  forwarderActions: { display: 'flex', alignItems: 'center', gap: '16px' },
  warehouseCount: { padding: '4px 10px', backgroundColor: 'rgba(31, 78, 95, 0.08)', color: '#1F4E5F', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
  menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#9ca3af' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '120px', borderRadius: '10px', border: '1px solid rgba(31, 78, 95, 0.12)', boxShadow: 'var(--shadow-soft-hover)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'inherit' },
  warehousesSection: { padding: '0 20px 20px', borderTop: '1px solid rgba(31, 78, 95, 0.12)' },
  warehousesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' },
  addWarehouseBtn: { display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  warehousesList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  warehouseItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px' },
  iconBtn: { background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#6b7280' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { width: '100%', maxWidth: '650px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '60px' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  customCityRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  addCityBtn: { padding: '8px 12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  cancelCityBtn: { padding: '8px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }
}
