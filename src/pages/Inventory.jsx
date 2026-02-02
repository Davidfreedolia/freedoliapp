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
import { supabase, getCurrentUserId, getProjects } from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import Button from '../components/Button'
import LayoutSwitcher from '../components/LayoutSwitcher'
import { useLayoutPreference } from '../hooks/useLayoutPreference'

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
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [layout, setLayout] = useLayoutPreference('layout:inventory', 'grid')
  const [selectedInventoryId, setSelectedInventoryId] = useState(null)
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
    setError(null)
    try {
      const userId = await getCurrentUserId()
      
      // Carregar projectes (usar funció que ja filtra per user_id)
      const projectsData = await getProjects(true) // includeDiscarded = true
      setProjects(projectsData || [])

      // Carregar inventari
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*, project:projects(name, project_code)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (inventoryError) throw inventoryError
      setInventory(inventoryData || [])

      // Carregar moviments recents
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_movements')
        .select('*, inventory:inventory(sku, product_name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (movementsError) throw movementsError
      setMovements(movementsData || [])

    } catch (err) {
      console.error('Error carregant dades:', err)
      setError(err.message || 'Error carregant dades. Torna a intentar.')
    } finally {
      setLoading(false)
    }
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

  const renderInventoryCard = (item, { isPreview = false, enablePreviewSelect = false } = {}) => {
    const stockStatus = getStockStatus(item)
    return (
      <div
        key={item.id}
        style={{
          ...styles.inventoryCard,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}
        onMouseEnter={enablePreviewSelect ? () => setSelectedInventoryId(item.id) : undefined}
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
          <div style={{ fontWeight: '600', color: darkMode ? '#ffffff' : '#111827' }}>Total: {item.total_units || 0}</div>
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
          {!isPreview && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setShowMovementModal(true) }} style={styles.actionButton}>
                <Plus size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => showHistory(item)} style={styles.actionButton}>
                <History size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    )
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
            <Button variant="secondary" size="sm" style={styles.filterButton}>
              <Filter size={14} />
              Filtres
            </Button>
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">Tots els projectes</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">Tots els estats</option>
              <option value="low_stock">⚠️ Stock baix</option>
              <option value="in_transit">🚢 En trànsit</option>
              <option value="ok">✅ OK</option>
            </select>
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
          <div style={styles.toolbarRight} className="toolbar-group">
            <Button size="sm" onClick={handleNewItem}>
              <Plus size={18} /> Nou Producte
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: darkMode ? '#9ca3af' : '#6b7280' }}>Carregant inventari...</div>
        ) : error ? (
          <div style={{ padding: '64px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', backgroundColor: darkMode ? '#15151f' : '#ffffff', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <AlertTriangle size={32} color="#ef4444" />
            <h3 style={{ color: darkMode ? '#ffffff' : '#111827', margin: 0 }}>Error carregant dades</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>{error}</p>
            <Button variant="primary" onClick={loadData}>
              <RefreshCw size={16} />
              Tornar a intentar
            </Button>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ ...styles.empty, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Package size={48} color="#d1d5db" />
            <p style={{ color: '#6b7280' }}>No hi ha productes a l'inventari</p>
            <Button onClick={handleNewItem}>
              <Plus size={18} /> Afegir Producte
            </Button>
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
                    <div style={styles.splitEmpty}>Selecciona un producte</div>
                  )}
                </div>
              </div>
            )}
          </>
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
              <Button variant="ghost" size="sm" onClick={() => { setShowMovementModal(false); setSelectedItem(null) }} style={styles.closeButton}>
                <X size={20} />
              </Button>
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
              <Button variant="secondary" onClick={() => { setShowMovementModal(false); setSelectedItem(null) }} style={styles.cancelButton}>
                Cancel·lar
              </Button>
              <Button variant="primary" onClick={handleSaveItem} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </Button>
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
              <Button variant="ghost" size="sm" onClick={() => { setShowHistoryModal(false); setSelectedItem(null) }} style={styles.closeButton}>
                <X size={20} />
              </Button>
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
                  <Button variant="primary" size="sm" onClick={handleAddMovement} disabled={saving || newMovement.quantity === 0} style={styles.addBtn}>
                    <Plus size={16} /> Afegir
                  </Button>
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
  statCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: '600' },
  statLabel: { fontSize: '11px', color: '#6b7280' },
  toolbar: { display: 'flex', marginBottom: '24px' },
  searchGroup: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  searchContainer: { flex: '0 0 auto', width: '320px', minWidth: '240px' },
  searchInput: { flex: 1, minWidth: 0 },
  filterSelect: { height: 'var(--btn-h-sm)', padding: '0 12px', borderRadius: 'var(--btn-radius)', border: '1px solid var(--btn-secondary-border)', backgroundColor: 'var(--btn-ghost-bg)', color: 'var(--btn-secondary-fg)', fontSize: '14px', outline: 'none', cursor: 'pointer', boxShadow: 'var(--btn-shadow)' },
  refreshBtn: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  filters: { display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap' },
  filterButton: { height: 'var(--btn-h-sm)' },
  toolbarRight: { display: 'inline-flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'nowrap' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#1F4E5F', color: '#F4F7F3', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  empty: { padding: '64px', textAlign: 'center', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  inventoryList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitLayout: { display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '20px' },
  splitList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  splitPreview: { position: 'sticky', top: '96px', alignSelf: 'flex-start' },
  splitEmpty: { padding: '24px', borderRadius: '16px', backgroundColor: 'var(--surface-bg)', boxShadow: 'var(--shadow-soft)', color: 'var(--muted)' },
  inventoryCard: { padding: '16px', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-soft)' },
  projectBadge: { display: 'inline-block', marginTop: '4px', padding: '2px 8px', backgroundColor: '#4f46e510', color: '#4f46e5', borderRadius: '4px', fontSize: '11px' },
  statusBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  iconBtn: { padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', borderRadius: '6px' },
  actionButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { width: '100%', maxWidth: '600px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { padding: '0', width: 'var(--btn-h-sm)', minWidth: 'var(--btn-h-sm)' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  cancelButton: { minWidth: '120px' },
  saveButton: { minWidth: '140px' },
  addMovementSection: { padding: '16px', borderRadius: '12px' },
  addBtn: { minWidth: '120px' },
  movementsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  movementItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px' }
}
