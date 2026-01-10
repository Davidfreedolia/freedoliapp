import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Users,
  Building2,
  Truck,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Save,
  MessageCircle,
  CreditCard,
  Clock,
  Package
} from 'lucide-react'
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
import SupplierMemory from '../components/SupplierMemory'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import { showToast } from '../components/Toast'

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

export default function Suppliers() {
  const { darkMode, driveConnected, demoMode } = useApp()
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
  
  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, supplier: null, isDeleting: false })
  
  // Custom cities (per guardar ciutats afegides manualment)
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
      const data = await getSuppliers()
      setSuppliers(data || [])
    } catch (err) {
      console.error('Error carregant proveïdors:', err)
    }
    setLoading(false)
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
    if (!driveConnected) return
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
        await createSupplier(editingSupplier)
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

  // Stats
  const stats = {
    total: filteredSuppliers.length,
    manufacturers: filteredSuppliers.filter(s => s.type === 'manufacturer').length,
    trading: filteredSuppliers.filter(s => s.type === 'trading').length,
    agents: filteredSuppliers.filter(s => s.type === 'agent').length,
    topRated: filteredSuppliers.filter(s => s.rating >= 4).length
  }

  const getTypeInfo = (type) => SUPPLIER_TYPES.find(t => t.id === type) || SUPPLIER_TYPES[0]

  return (
    <div style={styles.container}>
      <Header title="Proveïdors" />

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
          <div style={{
            ...styles.searchContainer,
            backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar proveïdors..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...styles.searchInput, color: darkMode ? '#ffffff' : '#111827' }}
            />
          </div>

          <select
            value={filterType || ''}
            onChange={e => setFilterType(e.target.value || null)}
            style={{
              ...styles.filterSelect,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827'
            }}
          >
            <option value="">Tots els tipus</option>
            {SUPPLIER_TYPES.filter(t => t.id !== 'freight').map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterCountry || ''}
            onChange={e => setFilterCountry(e.target.value || null)}
            style={{
              ...styles.filterSelect,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827'
            }}
          >
            <option value="">Tots els països</option>
            {Object.keys(COUNTRIES_CITIES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button 
            onClick={handleNewSupplier} 
            disabled={!driveConnected}
            title={!driveConnected ? "Connecta Google Drive per crear" : ""}
            style={{
              ...styles.newButton,
              opacity: !driveConnected ? 0.5 : 1,
              cursor: !driveConnected ? 'not-allowed' : 'pointer'
            }}>
            <Plus size={18} /> Nou Proveïdor
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Users size={24} color="#4f46e5" />
            <div>
              <span style={styles.statValue}>{stats.total}</span>
              <span style={styles.statLabel}>Total Proveïdors</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Building2 size={24} color="#4f46e5" />
            <div>
              <span style={styles.statValue}>{stats.manufacturers}</span>
              <span style={styles.statLabel}>Fabricants</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#8b5cf6" />
            <div>
              <span style={styles.statValue}>{stats.trading}</span>
              <span style={styles.statLabel}>Trading</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Star size={24} color="#f59e0b" />
            <div>
              <span style={styles.statValue}>{stats.topRated}</span>
              <span style={styles.statLabel}>Top Rated (4+⭐)</span>
            </div>
          </div>
        </div>

        {/* Suppliers Grid */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Users size={48} color="#d1d5db" />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              No hi ha proveïdors. Crea el primer!
            </p>
            <button onClick={handleNewSupplier} style={styles.newButton}>
              <Plus size={18} /> Afegir Proveïdor
            </button>
          </div>
        ) : (
          <div style={{
            ...styles.suppliersGrid,
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))'),
            gap: isMobile ? '12px' : '20px'
          }}>
            {filteredSuppliers.map(supplier => {
              const typeInfo = getTypeInfo(supplier.type)
              const TypeIcon = typeInfo.icon

              return (
                <div key={supplier.id} style={{
                  ...styles.supplierCard,
                  backgroundColor: darkMode ? '#15151f' : '#ffffff'
                }}>
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
                    <div 
                      style={{ position: 'relative' }} 
                      data-menu-container
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === supplier.id ? null : supplier.id)
                        }} 
                        style={styles.menuButton}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen === supplier.id && (
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
                              setEditingSupplier(supplier)
                              setShowModal(true)
                              setMenuOpen(null)
                            }} 
                            style={styles.menuItem}
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(supplier)
                            }} 
                            style={{ ...styles.menuItem, color: '#ef4444' }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
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

                  {/* Payment Terms */}
                  {supplier.payment_terms && (
                    <div style={styles.cardRow}>
                      <CreditCard size={14} color="#6b7280" />
                      <span style={{ color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }}>
                        {supplier.payment_terms}
                      </span>
                    </div>
                  )}

                  {/* Incoterm */}
                  {supplier.incoterm && (
                    <div style={styles.cardRow}>
                      <Package size={14} color="#6b7280" />
                      <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {supplier.incoterm} {supplier.incoterm_location}
                      </span>
                    </div>
                  )}

                  {/* Rating */}
                  {supplier.rating > 0 && (
                    <div style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} size={14} fill={i <= supplier.rating ? '#f59e0b' : 'none'} color={i <= supplier.rating ? '#f59e0b' : '#d1d5db'} />
                      ))}
                    </div>
                  )}

                  {/* Supplier Memory */}
                  <SupplierMemory supplierId={supplier.id} darkMode={darkMode} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editingSupplier && (
        <div style={styles.modalOverlay} onClick={() => { setShowModal(false); setEditingSupplier(null) }}>
          <div style={{ ...styles.modal, backgroundColor: darkMode ? '#15151f' : '#ffffff' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingSupplier.id ? 'Editar Proveïdor' : 'Nou Proveïdor'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingSupplier(null) }} style={styles.closeButton}>
                <X size={20} />
              </button>
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
                      <button onClick={handleAddCustomCity} style={styles.addCityBtn}>Afegir</button>
                      <button onClick={() => { setShowCustomCityInput(false); setNewCityName('') }} style={styles.cancelCityBtn}>✕</button>
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
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditingSupplier({ ...editingSupplier, rating: i })}
                        style={styles.starButton}
                      >
                        <Star size={20} fill={i <= editingSupplier.rating ? '#f59e0b' : 'none'} color={i <= editingSupplier.rating ? '#f59e0b' : '#d1d5db'} />
                      </button>
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
              <button onClick={() => { setShowModal(false); setEditingSupplier(null) }} style={styles.cancelButton}>
                Cancel·lar
              </button>
              <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
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
  searchContainer: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)' },
  searchInput: { flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' },
  filterSelect: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' },
  statValue: { display: 'block', fontSize: '24px', fontWeight: '700', color: '#4f46e5' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  suppliersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  supplierCard: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' },
  typeIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1 },
  cardTitle: { margin: '0 0 4px', fontSize: '16px', fontWeight: '600' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' },
  cardRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px' },
  ratingRow: { display: 'flex', gap: '2px', marginTop: '12px' },
  menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '120px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'inherit' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { width: '100%', maxWidth: '700px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '80px' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  ratingInput: { display: 'flex', gap: '4px' },
  starButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px' },
  cityInputGroup: { display: 'flex', gap: '8px' },
  customCityRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  addCityBtn: { padding: '8px 12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  cancelCityBtn: { padding: '8px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }
}
