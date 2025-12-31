import { useState, useEffect } from 'react'
import { 
  Package, 
  Search, 
  Plus,
  Minus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Truck,
  RefreshCw,
  Edit,
  Save,
  X,
  History,
  Filter,
  MoreVertical
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

// Tipus de moviment
const MOVEMENT_TYPES = {
  in_production: { label: 'En producció', color: '#8b5cf6', icon: '🏭' },
  in_transit: { label: 'En trànsit', color: '#f59e0b', icon: '🚢' },
  in_forwarder: { label: 'Magatzem transitari', color: '#3b82f6', icon: '🏢' },
  in_amazon_fba: { label: 'Amazon FBA', color: '#ff9900', icon: '📦' },
  in_amazon_fbm: { label: 'Amazon FBM', color: '#ff9900', icon: '🏠' },
  sold: { label: 'Venut', color: '#22c55e', icon: '✅' },
  returned: { label: 'Devolució', color: '#ef4444', icon: '↩️' },
  damaged: { label: 'Danyat', color: '#ef4444', icon: '💔' },
  adjustment: { label: 'Ajust', color: '#6b7280', icon: '📝' }
}

export default function Inventory() {
  const { darkMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [newMovement, setNewMovement] = useState({
    type: 'in_amazon_fba',
    quantity: 0,
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar projectes
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')
      setProjects(projectsData || [])

      // Carregar inventari
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*, project:projects(name, project_code)')
        .order('created_at', { ascending: false })
      setInventory(inventoryData || [])

      // Carregar moviments recents
      const { data: movementsData } = await supabase
        .from('inventory_movements')
        .select('*, inventory:inventory(sku, product_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setMovements(movementsData || [])

    } catch (err) {
      console.error('Error carregant dades:', err)
    }
    setLoading(false)
  }

  // Stats
  const stats = {
    totalSKUs: inventory.length,
    totalUnits: inventory.reduce((sum, i) => sum + (i.total_units || 0), 0),
    inAmazon: inventory.reduce((sum, i) => sum + (i.units_amazon_fba || 0) + (i.units_amazon_fbm || 0), 0),
    inTransit: inventory.reduce((sum, i) => sum + (i.units_in_transit || 0), 0),
    lowStock: inventory.filter(i => (i.units_amazon_fba || 0) <= (i.reorder_point || 10)).length
  }

  // Filtrar inventari
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !filterProject || item.project_id === filterProject
    const matchesStatus = !filterStatus || 
      (filterStatus === 'low_stock' && (item.units_amazon_fba || 0) <= (item.reorder_point || 10)) ||
      (filterStatus === 'in_transit' && (item.units_in_transit || 0) > 0) ||
      (filterStatus === 'ok' && (item.units_amazon_fba || 0) > (item.reorder_point || 10))
    return matchesSearch && matchesProject && matchesStatus
  })

  const handleNewItem = () => {
    setSelectedItem({
      sku: '',
      product_name: '',
      project_id: '',
      units_in_production: 0,
      units_in_transit: 0,
      units_in_forwarder: 0,
      units_amazon_fba: 0,
      units_amazon_fbm: 0,
      reorder_point: 50,
      notes: ''
    })
    setShowMovementModal(true)
  }

  const handleEditItem = (item) => {
    setSelectedItem({ ...item })
    setShowMovementModal(true)
  }

  const handleSaveItem = async () => {
    if (!selectedItem.sku || !selectedItem.product_name) {
      alert('SKU i nom són obligatoris')
      return
    }
    setSaving(true)
    try {
      const totalUnits = 
        (parseInt(selectedItem.units_in_production) || 0) +
        (parseInt(selectedItem.units_in_transit) || 0) +
        (parseInt(selectedItem.units_in_forwarder) || 0) +
        (parseInt(selectedItem.units_amazon_fba) || 0) +
        (parseInt(selectedItem.units_amazon_fbm) || 0)

      const payload = {
        ...selectedItem,
        total_units: totalUnits,
        updated_at: new Date().toISOString()
      }

      // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
      const { user_id, ...dataToSave } = payload

      if (selectedItem.id) {
        const { error } = await supabase.from('inventory').update(dataToSave).eq('id', selectedItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventory').insert(dataToSave)
        if (error) throw error
      }

      await loadData()
      setShowMovementModal(false)
      setSelectedItem(null)
    } catch (err) {
      console.error('Error guardant:', err)
      alert('Error guardant: ' + err.message)
    }
    setSaving(false)
  }

  const handleAddMovement = async () => {
    if (!selectedItem || newMovement.quantity === 0) return
    setSaving(true)
    try {
      // Registrar moviment (user_id s'assigna automàticament)
      const { error: movementError } = await supabase.from('inventory_movements').insert({
        inventory_id: selectedItem.id,
        movement_type: newMovement.type,
        quantity: newMovement.quantity,
        notes: newMovement.notes
      })
      if (movementError) throw movementError

      // Actualitzar stock segons tipus
      const updates = {}
      if (newMovement.type === 'in_production') {
        updates.units_in_production = (selectedItem.units_in_production || 0) + newMovement.quantity
      } else if (newMovement.type === 'in_transit') {
        updates.units_in_transit = (selectedItem.units_in_transit || 0) + newMovement.quantity
      } else if (newMovement.type === 'in_forwarder') {
        updates.units_in_forwarder = (selectedItem.units_in_forwarder || 0) + newMovement.quantity
      } else if (newMovement.type === 'in_amazon_fba') {
        updates.units_amazon_fba = (selectedItem.units_amazon_fba || 0) + newMovement.quantity
      } else if (newMovement.type === 'in_amazon_fbm') {
        updates.units_amazon_fbm = (selectedItem.units_amazon_fbm || 0) + newMovement.quantity
      } else if (newMovement.type === 'sold') {
        updates.units_amazon_fba = (selectedItem.units_amazon_fba || 0) - Math.abs(newMovement.quantity)
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from('inventory').update(updates).eq('id', selectedItem.id)
        if (updateError) throw updateError
      }

      await loadData()
      setNewMovement({ type: 'in_amazon_fba', quantity: 0, notes: '' })
      setShowHistoryModal(false)
    } catch (err) {
      console.error('Error:', err)
      alert('Error registrant moviment')
    }
    setSaving(false)
  }

  const showHistory = (item) => {
    setSelectedItem(item)
    setShowHistoryModal(true)
  }

  const getStockStatus = (item) => {
    const fbaUnits = item.units_amazon_fba || 0
    const reorderPoint = item.reorder_point || 50
    if (fbaUnits <= reorderPoint * 0.5) return { status: 'critical', color: '#ef4444', label: 'Crític' }
    if (fbaUnits <= reorderPoint) return { status: 'low', color: '#f59e0b', label: 'Baix' }
    return { status: 'ok', color: '#22c55e', label: 'OK' }
  }

  return (
    <div style={styles.container}>
      <Header title="Inventari" />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Stats */}
        <div style={{
          ...styles.statsRow,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))'
        }}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#4f46e5" />
            <div>
              <span style={{ ...styles.statValue, color: '#4f46e5' }}>{stats.totalSKUs}</span>
              <span style={styles.statLabel}>SKUs</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Warehouse size={24} color="#22c55e" />
            <div>
              <span style={{ ...styles.statValue, color: '#22c55e' }}>{stats.totalUnits.toLocaleString()}</span>
              <span style={styles.statLabel}>Unitats totals</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={24} color="#ff9900" />
            <div>
              <span style={{ ...styles.statValue, color: '#ff9900' }}>{stats.inAmazon.toLocaleString()}</span>
              <span style={styles.statLabel}>A Amazon</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Truck size={24} color="#3b82f6" />
            <div>
              <span style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.inTransit.toLocaleString()}</span>
              <span style={styles.statLabel}>En trànsit</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <AlertTriangle size={24} color="#ef4444" />
            <div>
              <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.lowStock}</span>
              <span style={styles.statLabel}>Stock baix</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={{
            ...styles.searchContainer,
            backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar SKU o producte..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...styles.searchInput, color: darkMode ? '#ffffff' : '#111827' }}
            />
          </div>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            style={{ ...styles.filterSelect, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
          >
            <option value="">Tots els projectes</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ ...styles.filterSelect, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
          >
            <option value="">Tots els estats</option>
            <option value="low_stock">⚠️ Stock baix</option>
            <option value="in_transit">🚢 En trànsit</option>
            <option value="ok">✅ OK</option>
          </select>
          <button onClick={loadData} style={styles.refreshBtn}>
            <RefreshCw size={18} />
          </button>
          <button onClick={handleNewItem} style={styles.newButton}>
            <Plus size={18} /> Nou Producte
          </button>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={48} color="#d1d5db" />
            <p style={{ color: '#6b7280' }}>No hi ha productes a l'inventari</p>
            <button onClick={handleNewItem} style={styles.newButton}>
              <Plus size={18} /> Afegir Producte
            </button>
          </div>
        ) : isMobile ? (
          // Mobile: Cards
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredInventory.map(item => {
              const stockStatus = getStockStatus(item)
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: darkMode ? '#15151f' : '#ffffff'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', color: darkMode ? '#ffffff' : '#111827', marginBottom: '4px' }}>
                      {item.sku}
                    </div>
                    <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      {item.product_name}
                    </div>
                    {item.project && (
                      <span style={styles.projectBadge}>{item.project.name}</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
                    <div>🏭 Prod: {item.units_in_production || 0}</div>
                    <div>🚢 Trànsit: {item.units_in_transit || 0}</div>
                    <div>🏢 Transit: {item.units_in_forwarder || 0}</div>
                    <div style={{ fontWeight: '600', color: '#ff9900' }}>📦 FBA: {item.units_amazon_fba || 0}</div>
                    <div>🏠 FBM: {item.units_amazon_fbm || 0}</div>
                    <div style={{ fontWeight: '700' }}>Total: {item.total_units || 0}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${stockStatus.color}15`,
                      color: stockStatus.color
                    }}>
                      {stockStatus.label}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setSelectedItem(item); setShowMovementModal(true) }} style={styles.actionButton}>
                        <Plus size={14} />
                      </button>
                      <button onClick={() => showHistory(item)} style={styles.actionButton}>
                        <History size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ ...styles.tableContainer, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Producte</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>🏭 Prod.</th>
                  {!isTablet && <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>🚢 Trànsit</th>}
                  {!isTablet && <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>🏢 Transit.</th>}
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>📦 FBA</th>
                  {!isTablet && <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>🏠 FBM</th>}
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Total</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Estat</th>
                  <th style={{ ...styles.th, color: darkMode ? '#9ca3af' : '#6b7280' }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const stockStatus = getStockStatus(item)
                  return (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div>
                          <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{item.sku}</strong>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{item.product_name}</p>
                          {item.project && (
                            <span style={styles.projectBadge}>{item.project.name}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{item.units_in_production || 0}</td>
                      {!isTablet && <td style={{ ...styles.td, textAlign: 'center' }}>{item.units_in_transit || 0}</td>}
                      {!isTablet && <td style={{ ...styles.td, textAlign: 'center' }}>{item.units_in_forwarder || 0}</td>}
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '600', color: '#ff9900' }}>{item.units_amazon_fba || 0}</td>
                      {!isTablet && <td style={{ ...styles.td, textAlign: 'center' }}>{item.units_amazon_fbm || 0}</td>}
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', color: darkMode ? '#ffffff' : '#111827' }}>{item.total_units || 0}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: `${stockStatus.color}15`,
                          color: stockStatus.color
                        }}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => showHistory(item)} style={styles.iconBtn} title="Historial">
                            <History size={16} />
                          </button>
                          <button onClick={() => handleEditItem(item)} style={styles.iconBtn} title="Editar">
                            <Edit size={16} />
                          </button>
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

      {/* Modal Editar/Nou */}
      {showMovementModal && selectedItem && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}}>
          <div style={{ ...styles.modal, ...modalStyles.modal }}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                {selectedItem.id ? 'Editar Producte' : 'Nou Producte'}
              </h3>
              <button onClick={() => { setShowMovementModal(false); setSelectedItem(null) }} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SKU *</label>
                  <input
                    type="text"
                    value={selectedItem.sku}
                    onChange={e => setSelectedItem({ ...selectedItem, sku: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Projecte</label>
                  <select
                    value={selectedItem.project_id || ''}
                    onChange={e => setSelectedItem({ ...selectedItem, project_id: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    <option value="">Selecciona...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={styles.label}>Nom producte *</label>
                  <input
                    type="text"
                    value={selectedItem.product_name}
                    onChange={e => setSelectedItem({ ...selectedItem, product_name: e.target.value })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 12px', color: darkMode ? '#ffffff' : '#111827' }}>📊 Unitats per ubicació</h4>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>🏭 En producció</label>
                  <input
                    type="number"
                    value={selectedItem.units_in_production || 0}
                    onChange={e => setSelectedItem({ ...selectedItem, units_in_production: parseInt(e.target.value) || 0 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🚢 En trànsit</label>
                  <input
                    type="number"
                    value={selectedItem.units_in_transit || 0}
                    onChange={e => setSelectedItem({ ...selectedItem, units_in_transit: parseInt(e.target.value) || 0 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🏢 Magatzem transitari</label>
                  <input
                    type="number"
                    value={selectedItem.units_in_forwarder || 0}
                    onChange={e => setSelectedItem({ ...selectedItem, units_in_forwarder: parseInt(e.target.value) || 0 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>📦 Amazon FBA</label>
                  <input
                    type="number"
                    value={selectedItem.units_amazon_fba || 0}
                    onChange={e => setSelectedItem({ ...selectedItem, units_amazon_fba: parseInt(e.target.value) || 0 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🏠 Amazon FBM</label>
                  <input
                    type="number"
                    value={selectedItem.units_amazon_fbm || 0}
                    onChange={e => setSelectedItem({ ...selectedItem, units_amazon_fbm: parseInt(e.target.value) || 0 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>⚠️ Punt de reposició</label>
                  <input
                    type="number"
                    value={selectedItem.reorder_point || 50}
                    onChange={e => setSelectedItem({ ...selectedItem, reorder_point: parseInt(e.target.value) || 50 })}
                    style={{ ...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => { setShowMovementModal(false); setSelectedItem(null) }} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveItem} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistoryModal && selectedItem && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}}>
          <div style={{ ...styles.modal, ...modalStyles.modal, maxWidth: isMobile ? '100%' : '700px' }}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                📦 {selectedItem.sku} - Moviments
              </h3>
              <button onClick={() => { setShowHistoryModal(false); setSelectedItem(null) }} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Afegir moviment */}
              <div style={{ ...styles.addMovementSection, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
                <h4 style={{ margin: '0 0 12px', color: darkMode ? '#ffffff' : '#111827' }}>➕ Registrar moviment</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <select
                    value={newMovement.type}
                    onChange={e => setNewMovement({ ...newMovement, type: e.target.value })}
                    style={{ ...styles.input, flex: 1, minWidth: '150px', backgroundColor: darkMode ? '#15151f' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
                  >
                    {Object.entries(MOVEMENT_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newMovement.quantity}
                    onChange={e => setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="Quantitat (+/-)"
                    style={{ ...styles.input, width: '120px', backgroundColor: darkMode ? '#15151f' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                  <input
                    type="text"
                    value={newMovement.notes}
                    onChange={e => setNewMovement({ ...newMovement, notes: e.target.value })}
                    placeholder="Notes..."
                    style={{ ...styles.input, flex: 2, minWidth: '150px', backgroundColor: darkMode ? '#15151f' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
                  />
                  <button onClick={handleAddMovement} disabled={saving || newMovement.quantity === 0} style={styles.addBtn}>
                    <Plus size={16} /> Afegir
                  </button>
                </div>
              </div>

              {/* Historial */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 12px', color: darkMode ? '#ffffff' : '#111827' }}>📜 Historial</h4>
                {movements.filter(m => m.inventory_id === selectedItem.id).length === 0 ? (
                  <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No hi ha moviments registrats</p>
                ) : (
                  <div style={styles.movementsList}>
                    {movements.filter(m => m.inventory_id === selectedItem.id).map(mov => {
                      const type = MOVEMENT_TYPES[mov.movement_type] || MOVEMENT_TYPES.adjustment
                      return (
                        <div key={mov.id} style={{ ...styles.movementItem, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
                          <span style={{ fontSize: '20px' }}>{type.icon}</span>
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: darkMode ? '#ffffff' : '#111827' }}>{type.label}</strong>
                            {mov.notes && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{mov.notes}</p>}
                          </div>
                          <span style={{
                            fontWeight: '600',
                            color: mov.quantity > 0 ? '#22c55e' : '#ef4444'
                          }}>
                            {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(mov.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
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
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: '700' },
  statLabel: { fontSize: '11px', color: '#6b7280' },
  toolbar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  searchContainer: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)' },
  searchInput: { flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' },
  filterSelect: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  refreshBtn: { padding: '12px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: '#6b7280' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  tableContainer: { borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  th: { padding: '14px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '12px', fontSize: '14px', color: '#6b7280' },
  projectBadge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', backgroundColor: '#4f46e510', color: '#4f46e5', borderRadius: '4px', fontSize: '11px' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  iconBtn: { padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', borderRadius: '6px' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { width: '100%', maxWidth: '600px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #3730a3', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  addMovementSection: { padding: '16px', borderRadius: '12px' },
  addBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: '#22c55e', color: '#ffffff', border: '1px solid #16a34a', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  movementsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  movementItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px' }
}
