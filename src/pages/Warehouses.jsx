import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Package,
  Warehouse,
  MoreVertical,
  Trash2,
  Edit,
  MapPin,
  Phone,
  Mail,
  X,
  Save,
  Globe,
  Filter
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { useTranslation } from 'react-i18next'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import { showToast } from '../components/Toast'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'

// Magatzems Amazon FBA pre-definits
const AMAZON_FBA_WAREHOUSES = [
  // Espanya
  { code: 'MAD4', name: 'Amazon FBA Madrid (MAD4)', city: 'San Fernando de Henares', country: 'España', address: 'Av. de Castilla, 2, 28830 San Fernando de Henares, Madrid' },
  { code: 'BCN1', name: 'Amazon FBA Barcelona (BCN1)', city: 'El Prat de Llobregat', country: 'España', address: 'Polígon Industrial Mas Blau II' },
  { code: 'MAD7', name: 'Amazon FBA Illescas (MAD7)', city: 'Illescas', country: 'España', address: 'Plataforma Central Iberum, Toledo' },
  // Alemanya
  { code: 'FRA1', name: 'Amazon FBA Frankfurt (FRA1)', city: 'Bad Hersfeld', country: 'Alemanya', address: 'Am Schloss Eichhof, 36251 Bad Hersfeld' },
  { code: 'FRA3', name: 'Amazon FBA Frankfurt (FRA3)', city: 'Bad Hersfeld', country: 'Alemanya', address: 'Bad Hersfeld' },
  { code: 'MUC3', name: 'Amazon FBA Munich (MUC3)', city: 'Graben', country: 'Alemanya', address: 'Graben, Bavaria' },
  { code: 'LEJ1', name: 'Amazon FBA Leipzig (LEJ1)', city: 'Leipzig', country: 'Alemanya', address: 'Leipzig' },
  // França
  { code: 'ORY1', name: 'Amazon FBA Paris (ORY1)', city: 'Saran', country: 'França', address: 'Saran, Loiret' },
  { code: 'LYS1', name: 'Amazon FBA Lyon (LYS1)', city: 'Sevrey', country: 'França', address: 'Sevrey' },
  // Itàlia
  { code: 'MXP5', name: 'Amazon FBA Milan (MXP5)', city: 'Castel San Giovanni', country: 'Itàlia', address: 'Castel San Giovanni, Piacenza' },
  { code: 'FCO1', name: 'Amazon FBA Roma (FCO1)', city: 'Passo Corese', country: 'Itàlia', address: 'Passo Corese, Rieti' },
  // UK
  { code: 'LTN1', name: 'Amazon FBA London (LTN1)', city: 'Marston Gate', country: 'UK', address: 'Marston Gate, Milton Keynes' },
  { code: 'BHX4', name: 'Amazon FBA Birmingham (BHX4)', city: 'Rugeley', country: 'UK', address: 'Rugeley, Staffordshire' },
  // Polònia
  { code: 'WRO2', name: 'Amazon FBA Wroclaw (WRO2)', city: 'Wroclaw', country: 'Polònia', address: 'Bielany Wrocławskie' },
  // USA
  { code: 'ONT8', name: 'Amazon FBA California (ONT8)', city: 'Moreno Valley', country: 'USA', address: 'Moreno Valley, CA' },
  { code: 'PHX6', name: 'Amazon FBA Arizona (PHX6)', city: 'Phoenix', country: 'USA', address: 'Phoenix, AZ' },
]

// Tipus de magatzem (només metadades; el nom visible ve de i18n: warehousesPage.types.*)
const WAREHOUSE_TYPES = [
  { id: 'amazon_fba', icon: '📦', color: '#ff9900' },
  { id: 'amazon_fbm', icon: '📦', color: '#ff9900' },
  { id: 'forwarder', icon: '🚚', color: '#3b82f6' },
  { id: '3pl', icon: '🏢', color: '#8b5cf6' },
  { id: 'own', icon: '🏠', color: '#22c55e' },
  { id: 'custom', icon: '🏭', color: '#6b7280' }
]

export default function Warehouses() {
  const { darkMode, demoMode, activeOrgId } = useApp()
  const { t } = useTranslation()
  const { isMobile, isTablet } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [layout, setLayout] = useLayoutPreference('layout:warehouses', 'grid')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null)
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [showAmazonModal, setShowAmazonModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedAmazonWarehouses, setSelectedAmazonWarehouses] = useState([])
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, warehouse: null, isDeleting: false })

  useEffect(() => {
    loadData()
  }, [activeOrgId])

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
      const data = await getWarehouses(activeOrgId ?? undefined)
      // Filtrar només magatzems NO vinculats a transitaris (tipus amazon o custom)
      const filteredData = (data || []).filter(w => !w.supplier_id || w.type === 'amazon_fba' || w.type === 'amazon_fbm' || w.type === 'custom')
      setWarehouses(filteredData)
    } catch (err) {
      console.error('Error carregant magatzems:', err)
    }
    setLoading(false)
  }

  // Filtrar magatzems
  const filteredWarehouses = warehouses.filter(w => {
    const matchesSearch = w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.city?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType ? w.type === filterType : true
    return matchesSearch && matchesType
  })

  useEffect(() => {
    if (!filteredWarehouses.length) {
      setSelectedWarehouseId(null)
      return
    }
    if (!selectedWarehouseId || !filteredWarehouses.some(w => w.id === selectedWarehouseId)) {
      setSelectedWarehouseId(filteredWarehouses[0].id)
    }
  }, [filteredWarehouses, selectedWarehouseId])

  const effectiveLayout = isMobile ? 'list' : layout
  const selectedWarehouse = filteredWarehouses.find(w => w.id === selectedWarehouseId)

  // Obtenir info del tipus
  const getTypeInfo = (typeId) => {
    return WAREHOUSE_TYPES.find((wt) => wt.id === typeId) || WAREHOUSE_TYPES[2]
  }

  const renderWarehouseCard = (warehouse, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const typeInfo = getTypeInfo(warehouse.type)

    return (
      <div 
        key={warehouse.id}
        style={{ ...styles.warehouseCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedWarehouseId(warehouse.id) : undefined}
      >
        <div style={styles.cardHeader}>
          <span style={{
            ...styles.typeBadge,
            backgroundColor: 'var(--surface-bg-2)',
            color: 'var(--c-cta-500)'
          }}>
            {typeInfo.icon} {t(`warehousesPage.types.${typeInfo.id}`)}
          </span>
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
                  setMenuOpen(menuOpen === warehouse.id ? null : warehouse.id)
                }}
                style={styles.menuButton}
              >
                <MoreVertical size={18} color="#9ca3af" />
              </Button>
              {menuOpen === warehouse.id && (
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
                      handleEditWarehouse(warehouse)
                    }}
                    style={styles.menuItem}
                  >
                    <Edit size={14} /> {t('warehousesPage.menuEdit')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteWarehouse(warehouse)
                    }}
                    style={styles.menuItemDanger}
                  >
                    <Trash2 size={14} /> {t('warehousesPage.menuDelete')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <h3 style={{ ...styles.warehouseName, color: darkMode ? '#ffffff' : '#111827' }}>
          {warehouse.name}
        </h3>

        <div style={styles.warehouseDetails}>
          <p style={styles.detailRow}>
            <MapPin size={14} />
            {warehouse.city}, {warehouse.country}
          </p>
          {warehouse.address && (
            <p style={styles.addressRow}>{warehouse.address}</p>
          )}
          {warehouse.contact_name && warehouse.contact_name !== 'Amazon FBA' && (
            <p style={styles.detailRow}>👤 {warehouse.contact_name}</p>
          )}
          {warehouse.contact_phone && (
            <p style={styles.detailRow}><Phone size={14} /> {warehouse.contact_phone}</p>
          )}
        </div>
      </div>
    )
  }

  // CRUD
  const handleNewWarehouse = () => {
    setEditingWarehouse({
      name: '',
      type: 'custom',
      address: '',
      city: '',
      country: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      notes: ''
    })
    setShowModal(true)
  }

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse({ ...warehouse })
    setShowModal(true)
    setMenuOpen(null)
  }

  const handleSaveWarehouse = async () => {
    if (!editingWarehouse.name || !editingWarehouse.name.trim()) {
      showToast(t('warehousesPage.toastNameRequired'), 'error')
      return
    }
    setSaving(true)
    try {
      if (editingWarehouse.id) {
        await updateWarehouse(editingWarehouse.id, editingWarehouse)
        showToast(t('warehousesPage.toastUpdated'), 'success')
      } else {
        await createWarehouse({ ...editingWarehouse, ...(activeOrgId ? { org_id: activeOrgId } : {}) }, activeOrgId ?? undefined)
        showToast(t('warehousesPage.toastCreated'), 'success')
      }
      await loadData()
      setShowModal(false)
      setEditingWarehouse(null)
    } catch (err) {
      console.error('Error guardant magatzem:', err)
      showToast(t('warehousesPage.toastSaveError', { message: err.message || t('common.errorGeneric') }), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWarehouse = async (warehouse) => {
    // Check demo mode
    if (demoMode) {
      showToast(t('warehousesPage.toastDemoDelete'), 'error')
      return
    }
    
    setDeleteModal({ isOpen: true, warehouse, isDeleting: false })
    setMenuOpen(null)
  }

  const handleConfirmDelete = async () => {
    const { warehouse } = deleteModal
    if (!warehouse) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      await deleteWarehouse(warehouse.id)
      showToast(t('warehousesPage.toastDeleted'), 'success')
      await loadData()
      setDeleteModal({ isOpen: false, warehouse: null, isDeleting: false })
    } catch (err) {
      console.error('Error eliminant magatzem:', err)
      
      // Check for FK constraint violation (PostgreSQL error code 23503)
      if (err.code === '23503' || err.message?.includes('foreign key') || err.message?.includes('violates foreign key')) {
        showToast(t('warehousesPage.toastDeleteFk'), 'error')
      } else {
        showToast(t('warehousesPage.toastDeleteError', { message: err.message || t('common.errorGeneric') }), 'error')
      }
      
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  // Afegir magatzems Amazon
  const handleOpenAmazonModal = () => {
    // Marcar els que ja existeixen
    const existingCodes = warehouses.filter(w => w.type === 'amazon_fba').map(w => {
      const match = w.name.match(/\(([A-Z0-9]+)\)/)
      return match ? match[1] : null
    }).filter(Boolean)
    setSelectedAmazonWarehouses(existingCodes)
    setShowAmazonModal(true)
  }

  const toggleAmazonWarehouse = (code) => {
    setSelectedAmazonWarehouses(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const handleSaveAmazonWarehouses = async () => {
    setSaving(true)
    try {
      // Obtenir els que ja existeixen
      const existingCodes = warehouses.filter(w => w.type === 'amazon_fba').map(w => {
        const match = w.name.match(/\(([A-Z0-9]+)\)/)
        return match ? match[1] : null
      }).filter(Boolean)

      // Afegir els nous
      const newCodes = selectedAmazonWarehouses.filter(code => !existingCodes.includes(code))
      
      for (const code of newCodes) {
        const amazonWarehouse = AMAZON_FBA_WAREHOUSES.find(w => w.code === code)
        if (amazonWarehouse) {
          await createWarehouse({
            name: amazonWarehouse.name,
            type: 'amazon_fba',
            address: amazonWarehouse.address,
            city: amazonWarehouse.city,
            country: amazonWarehouse.country,
            contact_name: 'Amazon FBA',
            contact_phone: '',
            contact_email: '',
            notes: `Codi: ${amazonWarehouse.code}`,
            ...(activeOrgId ? { org_id: activeOrgId } : {})
          }, activeOrgId ?? undefined)
        }
      }

      await loadData()
      setShowAmazonModal(false)
      if (newCodes.length > 0) {
        showToast(t('warehousesPage.toastAmazonAdded', { count: newCodes.length }), 'success')
      } else {
        showToast(t('warehousesPage.toastAmazonAllExist'), 'info')
      }
    } catch (err) {
      console.error('Error afegint magatzems Amazon:', err)
      showToast(t('warehousesPage.toastAmazonError', { message: err.message || t('common.errorGeneric') }), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Agrupar Amazon per país
  const amazonByCountry = AMAZON_FBA_WAREHOUSES.reduce((acc, w) => {
    if (!acc[w.country]) acc[w.country] = []
    acc[w.country].push(w)
    return acc
  }, {})

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <Warehouse size={22} />
            {t('warehousesPage.pageTitle')}
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
                placeholder="Buscar magatzems..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filters} className="toolbar-group">
            <div className="toolbar-filterSelect" title={t('warehousesPage.filterByTypeTitle')}>
              <span className="toolbar-filterSelect__icon" aria-hidden="true">
                <Filter size={16} />
              </span>
              <select
                value={filterType || ''}
                onChange={e => setFilterType(e.target.value || null)}
              >
                <option value="">{t('warehousesPage.filterAllTypes')}</option>
                {WAREHOUSE_TYPES.map((wt) => (
                  <option key={wt.id} value={wt.id}>{wt.icon} {t(`warehousesPage.types.${wt.id}`)}</option>
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
            <Button size="sm" onClick={handleOpenAmazonModal} style={styles.amazonButton}>
              <Package size={18} />
              {t('warehousesPage.addAmazonFba')}
            </Button>
            <Button
              size="sm"
              onClick={handleNewWarehouse} 
              className="toolbar-cta"
            >
              <Plus size={18} />
              {t('warehousesPage.newWarehouse')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{warehouses.length}</span>
              <span style={styles.statLabel}>{t('warehousesPage.totalWarehouses')}</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="var(--c-cta-500)" />
            <div>
              <span style={styles.statValue}>{warehouses.filter(w => w.type === 'amazon_fba').length}</span>
              <span style={styles.statLabel}>{t('warehousesPage.amazonFbaStat')}</span>
            </div>
          </div>
        </div>

        {/* Warehouses Grid */}
        {loading ? (
          <div style={styles.loading}>{t('common.loading')}</div>
        ) : filteredWarehouses.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={48} color="#d1d5db" />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {searchTerm || filterType ? t('warehousesPage.emptyFiltered') : t('warehousesPage.emptyDefault')}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={handleOpenAmazonModal} style={styles.amazonButton}>
                <Package size={18} />
                {t('warehousesPage.addAmazonFba')}
              </Button>
              <Button 
                onClick={handleNewWarehouse} 
              >
                <Plus size={18} />
                {t('warehousesPage.createWarehouse')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {effectiveLayout === 'grid' && (
              <div style={{
                ...styles.warehousesGrid,
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))'),
                gap: isMobile ? '12px' : '16px'
              }}>
                {filteredWarehouses.map(warehouse => renderWarehouseCard(warehouse))}
              </div>
            )}
            {effectiveLayout === 'list' && (
              <div style={styles.warehousesList}>
                {filteredWarehouses.map(warehouse => renderWarehouseCard(warehouse))}
              </div>
            )}
            {effectiveLayout === 'split' && (
              <div style={styles.splitLayout}>
                <div style={styles.splitList}>
                  {filteredWarehouses.map(warehouse => renderWarehouseCard(warehouse, { enablePreviewSelect: true }))}
                </div>
                <div style={styles.splitPreview}>
                  {selectedWarehouse ? (
                    renderWarehouseCard(selectedWarehouse, { isPreview: true })
                  ) : (
                    <div style={styles.splitEmpty}>{t('warehousesPage.selectWarehouse')}</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Magatzem */}
      {showModal && editingWarehouse && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowModal(false)}>
          <div style={{ ...styles.modal, ...modalStyles.modal }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingWarehouse.id ? t('warehousesPage.editWarehouse') : t('warehousesPage.newWarehouse')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} style={styles.closeButton}>
                <X size={20} />
              </Button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.name')}</label>
                  <input type="text" value={editingWarehouse.name} onChange={e => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.type')}</label>
                  <select value={editingWarehouse.type} onChange={e => setEditingWarehouse({...editingWarehouse, type: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    {WAREHOUSE_TYPES.map((wt) => (
                      <option key={wt.id} value={wt.id}>{wt.icon} {t(`warehousesPage.types.${wt.id}`)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>{t('warehousesPage.form.address')}</label>
                  <textarea value={editingWarehouse.address} onChange={e => setEditingWarehouse({...editingWarehouse, address: e.target.value})} rows={2}
                    style={{ ...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.city')}</label>
                  <input type="text" value={editingWarehouse.city} onChange={e => setEditingWarehouse({...editingWarehouse, city: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.country')}</label>
                  <input type="text" value={editingWarehouse.country} onChange={e => setEditingWarehouse({...editingWarehouse, country: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.contactName')}</label>
                  <input type="text" value={editingWarehouse.contact_name} onChange={e => setEditingWarehouse({...editingWarehouse, contact_name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>{t('warehousesPage.form.phone')}</label>
                  <input type="tel" value={editingWarehouse.contact_phone} onChange={e => setEditingWarehouse({...editingWarehouse, contact_phone: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>{t('warehousesPage.form.email')}</label>
                  <input type="email" value={editingWarehouse.contact_email} onChange={e => setEditingWarehouse({...editingWarehouse, contact_email: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                {t('common.cancel', 'Cancel·lar')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveWarehouse}
                disabled={saving}
              >
                {saving ? t('common.saving') : <><Save size={16} /> {editingWarehouse.id ? t('warehousesPage.updateWarehouse') : t('warehousesPage.createWarehouseAction')}</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Amazon FBA */}
      {showAmazonModal && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowAmazonModal(false)}>
          <div style={{ ...styles.modal, ...styles.amazonModal, ...modalStyles.modal, maxWidth: isMobile ? '100%' : '700px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                📦 {t('warehousesPage.modalAmazonTitle')}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAmazonModal(false)} style={styles.closeButton}>
                <X size={20} />
              </Button>
            </div>

            <div style={{ ...styles.modalBody, maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                {t('warehousesPage.modalAmazonHint')}
              </p>
              
              {Object.entries(amazonByCountry).map(([country, whs]) => (
                <div key={country} style={styles.countrySection}>
                  <h4 style={{ ...styles.countryTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                    {country === 'España' ? '🇪🇸' : country === 'Alemanya' ? '🇩🇪' : country === 'França' ? '🇫🇷' : country === 'Itàlia' ? '🇮🇹' : country === 'UK' ? '🇬🇧' : country === 'Polònia' ? '🇵🇱' : '🇺🇸'} {country}
                  </h4>
                  <div style={styles.amazonList}>
                    {whs.map(w => (
                      <label key={w.code} style={{ ...styles.amazonItem, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
                        <input
                          type="checkbox"
                          checked={selectedAmazonWarehouses.includes(w.code)}
                          onChange={() => toggleAmazonWarehouse(w.code)}
                          style={styles.checkbox}
                        />
                        <div>
                          <span style={{ fontWeight: '500', color: darkMode ? '#ffffff' : '#111827' }}>{w.code}</span>
                          <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>{w.city}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.modalFooter}>
              <span style={{ color: '#6b7280', fontSize: '13px' }}>
                {t('warehousesPage.selectedCount', { count: selectedAmazonWarehouses.length })}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowAmazonModal(false)}
                >
                  {t('common.cancel', 'Cancel·lar')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveAmazonWarehouses}
                  disabled={saving}
                >
                  {saving ? t('common.saving') : <><Save size={16} /> {t('warehousesPage.addSelected')}</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, warehouse: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        entityName={deleteModal.warehouse?.name || ''}
        entityType="magatzem"
        entityLabel={t('warehousesPage.deleteEntityNoun')}
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
  amazonButton: { minWidth: '160px' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '24px', fontWeight: '600', color: '#1F4E5F' },
  statLabel: { fontSize: '13px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  createButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  warehousesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  warehousesList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '20px' },
  splitList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitPreview: { position: 'sticky', top: '96px', alignSelf: 'flex-start' },
  splitEmpty: { padding: '24px', borderRadius: '16px', backgroundColor: 'var(--surface-bg)', boxShadow: 'var(--shadow-soft)', color: 'var(--muted)' },
  warehouseCard: { padding: '20px', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  typeBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  menuButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '140px', borderRadius: '10px', border: '1px solid rgba(31, 78, 95, 0.12)', boxShadow: 'var(--shadow-soft-hover)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  menuItemDanger: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'flex-start', padding: '0 var(--btn-pad-x)', fontSize: '13px' },
  warehouseName: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' },
  warehouseDetails: { display: 'flex', flexDirection: 'column', gap: '6px' },
  detailRow: { margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' },
  addressRow: { margin: 0, fontSize: '12px', color: '#9ca3af', paddingLeft: '20px' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '100%', maxWidth: '600px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  amazonModal: { maxWidth: '700px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  modalBody: { padding: '24px', overflowY: 'auto' },
  modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '60px' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  amazonSaveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#ff9900', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  countrySection: { marginBottom: '20px' },
  countryTitle: { margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' },
  amazonList: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' },
  amazonItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', accentColor: '#ff9900' }
}
