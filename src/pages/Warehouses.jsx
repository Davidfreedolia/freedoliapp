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
  Globe
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
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'
import { useTranslation } from 'react-i18next'

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

// Tipus de magatzem
const WAREHOUSE_TYPES = [
  { id: 'amazon_fba', name: 'Amazon FBA', icon: '📦', color: '#ff9900' },
  { id: 'amazon_fbm', name: 'Amazon FBM', icon: '📦', color: '#ff9900' },
  { id: 'forwarder', name: 'Transitari', icon: '🚚', color: '#3b82f6' },
  { id: '3pl', name: '3PL (Third Party)', icon: '🏢', color: '#8b5cf6' },
  { id: 'own', name: 'Magatzem Propi', icon: '🏠', color: '#22c55e' },
  { id: 'custom', name: 'Personalitzat', icon: '🏭', color: '#6b7280' }
]

export default function Warehouses() {
  const { darkMode, driveConnected } = useApp()
  const { t } = useTranslation()
  const { isMobile, isTablet } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const cancelButtonState = useButtonState()
  const saveButtonState = useButtonState()
  const amazonCancelButtonState = useButtonState()
  const amazonSaveButtonState = useButtonState()
  
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [showAmazonModal, setShowAmazonModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedAmazonWarehouses, setSelectedAmazonWarehouses] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getWarehouses()
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

  // Obtenir info del tipus
  const getTypeInfo = (typeId) => {
    return WAREHOUSE_TYPES.find(t => t.id === typeId) || WAREHOUSE_TYPES[2]
  }

  // CRUD
  const handleNewWarehouse = () => {
    if (!driveConnected) return
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
    if (!editingWarehouse.name) {
      alert('El nom és obligatori')
      return
    }
    setSaving(true)
    try {
      if (editingWarehouse.id) {
        await updateWarehouse(editingWarehouse.id, editingWarehouse)
      } else {
        await createWarehouse(editingWarehouse)
      }
      await loadData()
      setShowModal(false)
    } catch (err) {
      console.error('Error:', err)
      alert('Error guardant magatzem')
    }
    setSaving(false)
  }

  const handleDeleteWarehouse = async (warehouse) => {
    if (!confirm(`Segur que vols eliminar "${warehouse.name}"?`)) return
    try {
      await deleteWarehouse(warehouse.id)
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error:', err)
      alert('Error eliminant magatzem')
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
            notes: `Codi: ${amazonWarehouse.code}`
          })
        }
      }

      await loadData()
      setShowAmazonModal(false)
    } catch (err) {
      console.error('Error:', err)
      alert('Error afegint magatzems Amazon')
    }
    setSaving(false)
  }

  // Agrupar Amazon per país
  const amazonByCountry = AMAZON_FBA_WAREHOUSES.reduce((acc, w) => {
    if (!acc[w.country]) acc[w.country] = []
    acc[w.country].push(w)
    return acc
  }, {})

  return (
    <div style={styles.container}>
      <Header title="Magatzems" />

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
              placeholder="Buscar magatzems..."
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
            {WAREHOUSE_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
            ))}
          </select>

          <button onClick={handleOpenAmazonModal} style={styles.amazonButton}>
            <Package size={18} />
            Afegir Amazon FBA
          </button>

          <button 
            onClick={handleNewWarehouse} 
            disabled={!driveConnected}
            title={!driveConnected ? "Connecta Google Drive per crear" : ""}
            style={{
              ...styles.newButton,
              opacity: !driveConnected ? 0.5 : 1,
              cursor: !driveConnected ? 'not-allowed' : 'pointer'
            }}>
            <Plus size={18} />
            Nou Magatzem
          </button>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={24} color="#4f46e5" />
            <div>
              <span style={styles.statValue}>{warehouses.length}</span>
              <span style={styles.statLabel}>Total Magatzems</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#ff9900" />
            <div>
              <span style={{...styles.statValue, color: '#ff9900'}}>{warehouses.filter(w => w.type === 'amazon_fba').length}</span>
              <span style={styles.statLabel}>Amazon FBA</span>
            </div>
          </div>
        </div>

        {/* Warehouses Grid */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : filteredWarehouses.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={48} color="#d1d5db" />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
              {searchTerm || filterType ? 'No s\'han trobat magatzems' : 'No hi ha magatzems. Afegeix els d\'Amazon o crea un personalitzat!'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleOpenAmazonModal} style={styles.amazonButton}>
                <Package size={18} />
                Afegir Amazon FBA
              </button>
              <button 
                onClick={handleNewWarehouse} 
                disabled={!driveConnected}
                title={!driveConnected ? "Connecta Google Drive per crear" : ""}
                style={{
                  ...styles.createButton,
                  opacity: !driveConnected ? 0.5 : 1,
                  cursor: !driveConnected ? 'not-allowed' : 'pointer'
                }}>
                <Plus size={18} />
                Crear Magatzem
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            ...styles.warehousesGrid,
            gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))'),
            gap: isMobile ? '12px' : '16px'
          }}>
            {filteredWarehouses.map(warehouse => {
              const typeInfo = getTypeInfo(warehouse.type)
              
              return (
                <div 
                  key={warehouse.id}
                  style={{ ...styles.warehouseCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}
                >
                  <div style={styles.cardHeader}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: `${typeInfo.color}15`,
                      color: typeInfo.color
                    }}>
                      {typeInfo.icon} {typeInfo.name}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setMenuOpen(menuOpen === warehouse.id ? null : warehouse.id)} style={styles.menuButton}>
                        <MoreVertical size={18} color="#9ca3af" />
                      </button>
                      {menuOpen === warehouse.id && (
                        <div style={{ ...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff' }}>
                          <button onClick={() => handleEditWarehouse(warehouse)} style={styles.menuItem}>
                            <Edit size={14} /> Editar
                          </button>
                          <button onClick={() => handleDeleteWarehouse(warehouse)} style={{ ...styles.menuItem, color: '#ef4444' }}>
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
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
            })}
          </div>
        )}
      </div>

      {/* Modal Magatzem */}
      {showModal && editingWarehouse && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowModal(false)}>
          <div style={{ ...styles.modal, ...modalStyles.modal }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {editingWarehouse.id ? 'Editar Magatzem' : 'Nou Magatzem'}
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.closeButton}><X size={20} /></button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom *</label>
                  <input type="text" value={editingWarehouse.name} onChange={e => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipus</label>
                  <select value={editingWarehouse.type} onChange={e => setEditingWarehouse({...editingWarehouse, type: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}>
                    {WAREHOUSE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Adreça</label>
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
                  <label style={styles.label}>Persona contacte</label>
                  <input type="text" value={editingWarehouse.contact_name} onChange={e => setEditingWarehouse({...editingWarehouse, contact_name: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telèfon</label>
                  <input type="tel" value={editingWarehouse.contact_phone} onChange={e => setEditingWarehouse({...editingWarehouse, contact_phone: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Email</label>
                  <input type="email" value={editingWarehouse.contact_email} onChange={e => setEditingWarehouse({...editingWarehouse, contact_email: e.target.value})}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                onClick={() => setShowModal(false)}
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
              <button 
                onClick={handleSaveWarehouse} 
                disabled={saving}
                {...saveButtonState}
                style={getButtonStyles({ 
                  variant: 'primary', 
                  darkMode, 
                  disabled: saving,
                  isHovered: saveButtonState.isHovered,
                  isActive: saveButtonState.isActive
                })}
              >
                {saving ? 'Guardant...' : <><Save size={16} /> {editingWarehouse.id ? 'Actualitzar' : 'Crear'}</>}
              </button>
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
                📦 Afegir Magatzems Amazon FBA
              </h3>
              <button onClick={() => setShowAmazonModal(false)} style={styles.closeButton}><X size={20} /></button>
            </div>

            <div style={{ ...styles.modalBody, maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                Selecciona els magatzems Amazon FBA que vols afegir:
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
                {selectedAmazonWarehouses.length} seleccionats
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowAmazonModal(false)}
                  {...amazonCancelButtonState}
                  style={getButtonStyles({ 
                    variant: 'danger', 
                    darkMode, 
                    disabled: false,
                    isHovered: amazonCancelButtonState.isHovered,
                    isActive: amazonCancelButtonState.isActive
                  })}
                >
                  {t('common.cancel', 'Cancel·lar')}
                </button>
                <button 
                  onClick={handleSaveAmazonWarehouses} 
                  disabled={saving}
                  {...amazonSaveButtonState}
                  style={{
                    ...getButtonStyles({ 
                      variant: 'primary', 
                      darkMode, 
                      disabled: saving,
                      isHovered: amazonSaveButtonState.isHovered,
                      isActive: amazonSaveButtonState.isActive
                    }),
                    backgroundColor: '#ff9900',
                    border: '1px solid #e68900'
                  }}
                >
                  {saving ? 'Guardant...' : <><Save size={16} /> Afegir seleccionats</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  amazonButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#ff9900', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' },
  statValue: { display: 'block', fontSize: '24px', fontWeight: '700', color: '#4f46e5' },
  statLabel: { fontSize: '13px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  createButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  warehousesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
  warehouseCard: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  typeBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '140px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'inherit' },
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
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
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
