import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Save, CheckCircle2, Clock, TrendingUp, DollarSign } from 'lucide-react'
import { 
  getRecurringExpenses, 
  createRecurringExpense, 
  updateRecurringExpense, 
  deleteRecurringExpense,
  getRecurringExpensesKPIs,
  markRecurringExpenseAsPaid
} from '../lib/supabase'
import { getProjects, getSuppliers } from '../lib/supabase'
import { showToast } from './Toast'

export default function RecurringExpensesSection({ darkMode, categories, demoMode, onExpensesGenerated }) {
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({ pending: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, upcoming: { count: 0, amount: 0 } })
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
    loadKPIs()
  }, [demoMode]) // Reload when demoMode changes

  const loadData = async () => {
    setLoading(true)
    try {
      const [recurring, projs, supps] = await Promise.all([
        getRecurringExpenses(),
        getProjects(),
        getSuppliers()
      ])
      setRecurringExpenses(recurring || [])
      setProjects(projs || [])
      setSuppliers(supps || [])
    } catch (err) {
      console.error('Error loading recurring expenses:', err)
      showToast('Error carregant despeses recurrents', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadKPIs = async () => {
    try {
      const kpisData = await getRecurringExpensesKPIs()
      setKpis(kpisData)
    } catch (err) {
      console.error('Error loading KPIs:', err)
    }
  }

  const handleNew = () => {
    setEditingRecurring({
      description: '',
      amount: '',
      currency: 'EUR',
      category_id: categories.expense[0]?.id || null,
      project_id: null,
      supplier_id: null,
      day_of_month: 1,
      is_active: true,
      notes: ''
    })
    setShowModal(true)
  }

  const handleEdit = (recurring) => {
    setEditingRecurring(recurring)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!editingRecurring.description || !editingRecurring.amount || !editingRecurring.day_of_month) {
      showToast('Descripció, import i dia del mes són obligatoris', 'error')
      return
    }

    // Require category for recurring expenses (needed for expense generation)
    if (!editingRecurring.category_id) {
      showToast('Selecciona una categoria', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingRecurring.id) {
        await updateRecurringExpense(editingRecurring.id, editingRecurring)
        showToast('Despesa recurrent actualitzada', 'success')
      } else {
        await createRecurringExpense(editingRecurring)
        showToast('Despesa recurrent creada', 'success')
      }
      await loadData()
      setShowModal(false)
      setEditingRecurring(null)
    } catch (err) {
      console.error('Error saving recurring expense:', err)
      showToast('Error guardant despesa recurrent', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Segur que vols eliminar aquesta despesa recurrent?')) return

    try {
      await deleteRecurringExpense(id)
      showToast('Despesa recurrent eliminada', 'success')
      await loadData()
    } catch (err) {
      console.error('Error deleting recurring expense:', err)
      showToast('Error eliminant despesa recurrent', 'error')
    }
  }

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const styles = {
    section: {
      marginBottom: '32px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    kpis: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    kpiCard: {
      padding: '16px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    kpiLabel: {
      fontSize: '12px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginBottom: '8px'
    },
    kpiValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: darkMode ? '#ffffff' : '#111827'
    },
    actions: {
      display: 'flex',
      gap: '12px'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      fontSize: '12px',
      fontWeight: '600',
      color: darkMode ? '#9ca3af' : '#6b7280',
      textTransform: 'uppercase'
    },
    td: {
      padding: '12px',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      fontSize: '14px',
      color: darkMode ? '#ffffff' : '#111827'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px',
      cursor: 'pointer'
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    }
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>Despeses Recurrents Mensuals</h2>
        <div style={styles.actions}>
          <button
            onClick={handleNew}
            style={{
              ...styles.button,
              backgroundColor: '#22c55e',
              color: '#ffffff'
            }}
          >
            <Plus size={16} />
            Nova Recurrent
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={styles.kpis}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Pending</div>
          <div style={{ ...styles.kpiValue, color: '#ef4444' }}>
            {kpis.pending.count} ({formatCurrency(kpis.pending.amount)})
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Paid</div>
          <div style={{ ...styles.kpiValue, color: '#22c55e' }}>
            {kpis.paid.count} ({formatCurrency(kpis.paid.amount)})
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Upcoming</div>
          <div style={{ ...styles.kpiValue, color: '#3b82f6' }}>
            {kpis.upcoming.count} ({formatCurrency(kpis.upcoming.amount)})
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          Carregant...
        </div>
      ) : recurringExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          No hi ha despeses recurrents. Crea una per començar.
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Descripció</th>
              <th style={styles.th}>Import</th>
              <th style={styles.th}>Dia del mes</th>
              <th style={styles.th}>Categoria</th>
              <th style={styles.th}>Projecte</th>
              <th style={styles.th}>Estat</th>
              <th style={styles.th}>Accions</th>
            </tr>
          </thead>
          <tbody>
            {recurringExpenses.map(recurring => (
              <tr key={recurring.id}>
                <td style={styles.td}>{recurring.description}</td>
                <td style={styles.td}>{formatCurrency(recurring.amount, recurring.currency)}</td>
                <td style={styles.td}>{recurring.day_of_month}</td>
                <td style={styles.td}>
                  {recurring.category?.name || '-'}
                </td>
                <td style={styles.td}>
                  {recurring.project?.name || '-'}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: recurring.is_active ? '#22c55e15' : '#6b728015',
                    color: recurring.is_active ? '#22c55e' : '#6b7280'
                  }}>
                    {recurring.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(recurring)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#4f46e5',
                        padding: '4px'
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(recurring.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && editingRecurring && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingRecurring.id ? 'Editar Despesa Recurrent' : 'Nova Despesa Recurrent'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: darkMode ? '#9ca3af' : '#6b7280'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Descripció *</label>
              <input
                type="text"
                value={editingRecurring.description}
                onChange={e => setEditingRecurring({ ...editingRecurring, description: e.target.value })}
                style={styles.input}
                placeholder="Ex: ChatGPT Plus, Gestoria..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Import *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecurring.amount}
                  onChange={e => setEditingRecurring({ ...editingRecurring, amount: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Moneda</label>
                <select
                  value={editingRecurring.currency}
                  onChange={e => setEditingRecurring({ ...editingRecurring, currency: e.target.value })}
                  style={styles.select}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Dia del mes * (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editingRecurring.day_of_month}
                  onChange={e => setEditingRecurring({ ...editingRecurring, day_of_month: parseInt(e.target.value) || 1 })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Categoria</label>
                <select
                  value={editingRecurring.category_id || ''}
                  onChange={e => setEditingRecurring({ ...editingRecurring, category_id: e.target.value || null })}
                  style={styles.select}
                >
                  <option value="">Selecciona...</option>
                  {categories.expense.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Projecte</label>
                <select
                  value={editingRecurring.project_id || ''}
                  onChange={e => setEditingRecurring({ ...editingRecurring, project_id: e.target.value || null })}
                  style={styles.select}
                >
                  <option value="">Cap</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Proveïdor</label>
                <select
                  value={editingRecurring.supplier_id || ''}
                  onChange={e => setEditingRecurring({ ...editingRecurring, supplier_id: e.target.value || null })}
                  style={styles.select}
                >
                  <option value="">Cap</option>
                  {suppliers.map(supp => (
                    <option key={supp.id} value={supp.id}>{supp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={editingRecurring.notes || ''}
                onChange={e => setEditingRecurring({ ...editingRecurring, notes: e.target.value })}
                rows={3}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={{ ...styles.checkboxLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={editingRecurring.is_active}
                  onChange={e => setEditingRecurring({ ...editingRecurring, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Activa</span>
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  ...styles.button,
                  backgroundColor: 'transparent',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`
                }}
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...styles.button,
                  backgroundColor: '#4f46e5',
                  color: '#ffffff'
                }}
              >
                <Save size={16} />
                {saving ? 'Guardant...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}







