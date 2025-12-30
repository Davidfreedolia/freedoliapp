import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Trash2,
  Edit,
  MoreVertical,
  X,
  Save,
  Receipt,
  ShoppingCart,
  Truck,
  Package,
  Monitor,
  BookOpen,
  Megaphone,
  Calculator,
  BarChart3,
  PieChart,
  Building2,
  FolderKanban
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  supabase,
  getProjects,
  getSuppliers
} from '../lib/supabase'
import Header from '../components/Header'

// Categories de despeses
const EXPENSE_CATEGORIES = {
  project: [
    { id: 'project_purchase', name: 'Compra (PO)', icon: ShoppingCart, color: '#4f46e5' },
    { id: 'project_sample', name: 'Mostres', icon: Package, color: '#8b5cf6' },
    { id: 'project_shipping', name: 'Enviament', icon: Truck, color: '#06b6d4' },
    { id: 'project_inspection', name: 'Inspecció', icon: Search, color: '#f59e0b' },
    { id: 'project_other', name: 'Altres', icon: Receipt, color: '#6b7280' }
  ],
  global: [
    { id: 'global_software', name: 'Software', icon: Monitor, color: '#3b82f6' },
    { id: 'global_tools', name: 'Eines', icon: Package, color: '#10b981' },
    { id: 'global_training', name: 'Formació', icon: BookOpen, color: '#8b5cf6' },
    { id: 'global_accounting', name: 'Comptabilitat', icon: Calculator, color: '#f59e0b' },
    { id: 'global_marketing', name: 'Marketing', icon: Megaphone, color: '#ec4899' },
    { id: 'global_other', name: 'Altres', icon: Receipt, color: '#6b7280' }
  ]
}

// Categories d'ingressos
const INCOME_CATEGORIES = [
  { id: 'sale', name: 'Venda', color: '#22c55e' },
  { id: 'refund', name: 'Reemborsament', color: '#f59e0b' },
  { id: 'reimbursement', name: 'Compensació Amazon', color: '#3b82f6' },
  { id: 'other', name: 'Altres', color: '#6b7280' }
]

const PAYMENT_STATUS = {
  pending: { name: 'Pendent', color: '#f59e0b' },
  paid: { name: 'Pagat', color: '#22c55e' },
  partial: { name: 'Parcial', color: '#3b82f6' }
}

export default function Finances() {
  const { darkMode } = useApp()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtres
  const [filterProject, setFilterProject] = useState(null)
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [expensesRes, incomesRes, projectsData, suppliersData] = await Promise.all([
        supabase.from('expenses').select('*, project:projects(name), supplier:suppliers(name)').order('expense_date', { ascending: false }),
        supabase.from('incomes').select('*, project:projects(name)').order('income_date', { ascending: false }),
        getProjects(),
        getSuppliers()
      ])
      
      setExpenses(expensesRes.data || [])
      setIncomes(incomesRes.data || [])
      setProjects(projectsData || [])
      setSuppliers(suppliersData || [])
    } catch (err) {
      console.error('Error carregant finances:', err)
    }
    setLoading(false)
  }

  // Calcular estadístiques
  const calculateStats = () => {
    const filteredExpenses = filterData(expenses, 'expense_date')
    const filteredIncomes = filterData(incomes, 'income_date')
    
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    const totalIncomes = filteredIncomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
    const projectExpenses = filteredExpenses.filter(e => !e.is_global).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    const globalExpenses = filteredExpenses.filter(e => e.is_global).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    
    return {
      totalExpenses,
      totalIncomes,
      profit: totalIncomes - totalExpenses,
      projectExpenses,
      globalExpenses,
      expenseCount: filteredExpenses.length,
      incomeCount: filteredIncomes.length
    }
  }

  // Filtrar dades per període
  const filterData = (data, dateField) => {
    let filtered = [...data]
    
    if (filterProject) {
      filtered = filtered.filter(d => d.project_id === filterProject)
    }
    
    if (filterPeriod !== 'all') {
      const now = new Date()
      let startDate
      
      switch (filterPeriod) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
      }
      
      filtered = filtered.filter(d => new Date(d[dateField]) >= startDate)
    }
    
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }

  const stats = calculateStats()

  // CRUD Despeses
  const handleNewExpense = (isGlobal = false) => {
    setEditingExpense({
      project_id: isGlobal ? null : '',
      is_global: isGlobal,
      category: isGlobal ? 'global_software' : 'project_purchase',
      subcategory: '',
      description: '',
      amount: '',
      currency: 'EUR',
      expense_date: new Date().toISOString().split('T')[0],
      supplier_id: '',
      supplier_name: '',
      reference_number: '',
      payment_status: 'pending',
      payment_method: '',
      notes: ''
    })
    setShowExpenseModal(true)
  }

  const handleSaveExpense = async () => {
    if (!editingExpense.amount || !editingExpense.category) {
      alert('Import i categoria són obligatoris')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...editingExpense,
        amount: parseFloat(editingExpense.amount),
        project_id: editingExpense.is_global ? null : editingExpense.project_id || null,
        supplier_id: editingExpense.supplier_id || null
      }
      
      // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
      const { user_id, ...dataToSave } = data

      if (editingExpense.id) {
        await supabase.from('expenses').update(dataToSave).eq('id', editingExpense.id)
      } else {
        await supabase.from('expenses').insert(dataToSave)
      }
      
      await loadData()
      setShowExpenseModal(false)
      setEditingExpense(null)
    } catch (err) {
      console.error('Error guardant despesa:', err)
      alert('Error guardant la despesa')
    }
    setSaving(false)
  }

  const handleDeleteExpense = async (expense) => {
    if (!confirm('Segur que vols eliminar aquesta despesa?')) return
    try {
      await supabase.from('expenses').delete().eq('id', expense.id)
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error eliminant:', err)
    }
  }

  // CRUD Ingressos
  const handleNewIncome = () => {
    setEditingIncome({
      project_id: '',
      category: 'sale',
      description: '',
      amount: '',
      currency: 'EUR',
      platform: 'amazon',
      marketplace: 'ES',
      income_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      order_id: '',
      notes: ''
    })
    setShowIncomeModal(true)
  }

  const handleSaveIncome = async () => {
    if (!editingIncome.amount || !editingIncome.project_id) {
      alert('Import i projecte són obligatoris')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...editingIncome,
        amount: parseFloat(editingIncome.amount)
      }
      
      // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
      const { user_id, ...dataToSave } = data

      if (editingIncome.id) {
        await supabase.from('incomes').update(dataToSave).eq('id', editingIncome.id)
      } else {
        await supabase.from('incomes').insert(dataToSave)
      }
      
      await loadData()
      setShowIncomeModal(false)
      setEditingIncome(null)
    } catch (err) {
      console.error('Error guardant ingrés:', err)
      alert('Error guardant l\'ingrés')
    }
    setSaving(false)
  }

  const handleDeleteIncome = async (income) => {
    if (!confirm('Segur que vols eliminar aquest ingrés?')) return
    try {
      await supabase.from('incomes').delete().eq('id', income.id)
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error eliminant:', err)
    }
  }

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: currency
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ca-ES')
  }

  const getCategoryInfo = (categoryId) => {
    const allCategories = [...EXPENSE_CATEGORIES.project, ...EXPENSE_CATEGORIES.global]
    return allCategories.find(c => c.id === categoryId) || { name: categoryId, icon: Receipt, color: '#6b7280' }
  }

  return (
    <div style={styles.container}>
      <Header title="Finances" />

      <div style={styles.content}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'overview' ? '#4f46e5' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <BarChart3 size={18} /> Resum
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'expenses' ? '#ef4444' : 'transparent',
              color: activeTab === 'expenses' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <TrendingDown size={18} /> Despeses
          </button>
          <button
            onClick={() => setActiveTab('incomes')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'incomes' ? '#22c55e' : 'transparent',
              color: activeTab === 'incomes' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <TrendingUp size={18} /> Ingressos
          </button>
        </div>

        {/* Filtres */}
        <div style={styles.toolbar}>
          <div style={{
            ...styles.searchContainer,
            backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
          }}>
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ ...styles.searchInput, color: darkMode ? '#ffffff' : '#111827' }}
            />
          </div>

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

          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            style={{
              ...styles.filterSelect,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827'
            }}
          >
            <option value="all">Tot el temps</option>
            <option value="month">Aquest mes</option>
            <option value="quarter">Aquest trimestre</option>
            <option value="year">Aquest any</option>
          </select>

          {activeTab === 'expenses' && (
            <>
              <button onClick={() => handleNewExpense(false)} style={styles.newButton}>
                <Plus size={18} /> Despesa Projecte
              </button>
              <button onClick={() => handleNewExpense(true)} style={{...styles.newButton, backgroundColor: '#6b7280'}}>
                <Plus size={18} /> Despesa Global
              </button>
            </>
          )}
          
          {activeTab === 'incomes' && (
            <button onClick={handleNewIncome} style={{...styles.newButton, backgroundColor: '#22c55e'}}>
              <Plus size={18} /> Nou Ingrés
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <TrendingUp size={28} color="#22c55e" />
            <div>
              <span style={{...styles.statValue, color: '#22c55e'}}>{formatCurrency(stats.totalIncomes)}</span>
              <span style={styles.statLabel}>Ingressos</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <TrendingDown size={28} color="#ef4444" />
            <div>
              <span style={{...styles.statValue, color: '#ef4444'}}>{formatCurrency(stats.totalExpenses)}</span>
              <span style={styles.statLabel}>Despeses</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <DollarSign size={28} color={stats.profit >= 0 ? '#22c55e' : '#ef4444'} />
            <div>
              <span style={{...styles.statValue, color: stats.profit >= 0 ? '#22c55e' : '#ef4444'}}>
                {formatCurrency(stats.profit)}
              </span>
              <span style={styles.statLabel}>Benefici</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <FolderKanban size={28} color="#4f46e5" />
            <div>
              <span style={{...styles.statValue, color: '#4f46e5'}}>{formatCurrency(stats.projectExpenses)}</span>
              <span style={styles.statLabel}>Desp. Projectes</span>
            </div>
          </div>
          <div style={{ ...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <Building2 size={28} color="#6b7280" />
            <div>
              <span style={{...styles.statValue, color: '#6b7280'}}>{formatCurrency(stats.globalExpenses)}</span>
              <span style={styles.statLabel}>Desp. Globals</span>
            </div>
          </div>
        </div>

        {/* Content based on tab */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={styles.overviewGrid}>
                {/* Últimes despeses */}
                <div style={{...styles.card, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
                  <h3 style={{...styles.cardTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                    <TrendingDown size={18} color="#ef4444" /> Últimes Despeses
                  </h3>
                  {expenses.slice(0, 5).map(expense => {
                    const catInfo = getCategoryInfo(expense.category)
                    const CatIcon = catInfo.icon
                    return (
                      <div key={expense.id} style={styles.listItem}>
                        <div style={{...styles.listIcon, backgroundColor: `${catInfo.color}15`}}>
                          <CatIcon size={16} color={catInfo.color} />
                        </div>
                        <div style={styles.listContent}>
                          <span style={{color: darkMode ? '#ffffff' : '#111827', fontWeight: '500'}}>
                            {expense.description || catInfo.name}
                          </span>
                          <span style={{color: '#6b7280', fontSize: '12px'}}>
                            {expense.project?.name || 'Global'} • {formatDate(expense.expense_date)}
                          </span>
                        </div>
                        <span style={{color: '#ef4444', fontWeight: '600'}}>-{formatCurrency(expense.amount, expense.currency)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Últims ingressos */}
                <div style={{...styles.card, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
                  <h3 style={{...styles.cardTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                    <TrendingUp size={18} color="#22c55e" /> Últims Ingressos
                  </h3>
                  {incomes.slice(0, 5).map(income => (
                    <div key={income.id} style={styles.listItem}>
                      <div style={{...styles.listIcon, backgroundColor: '#22c55e15'}}>
                        <DollarSign size={16} color="#22c55e" />
                      </div>
                      <div style={styles.listContent}>
                        <span style={{color: darkMode ? '#ffffff' : '#111827', fontWeight: '500'}}>
                          {income.description || 'Venda'}
                        </span>
                        <span style={{color: '#6b7280', fontSize: '12px'}}>
                          {income.project?.name} • {formatDate(income.income_date)}
                        </span>
                      </div>
                      <span style={{color: '#22c55e', fontWeight: '600'}}>+{formatCurrency(income.amount, income.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
              <div style={{...styles.tableContainer, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Data</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Categoria</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Descripció</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Projecte</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Import</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Estat</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(expenses, 'expense_date').map(expense => {
                      const catInfo = getCategoryInfo(expense.category)
                      const CatIcon = catInfo.icon
                      const statusInfo = PAYMENT_STATUS[expense.payment_status] || PAYMENT_STATUS.pending
                      
                      return (
                        <tr key={expense.id} style={styles.tr}>
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {formatDate(expense.expense_date)}
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.categoryBadge, backgroundColor: `${catInfo.color}15`, color: catInfo.color}}>
                              <CatIcon size={14} /> {catInfo.name}
                            </span>
                          </td>
                          <td style={{...styles.td, color: darkMode ? '#ffffff' : '#111827'}}>
                            {expense.description || '-'}
                          </td>
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {expense.is_global ? (
                              <span style={styles.globalBadge}>🌐 Global</span>
                            ) : expense.project?.name || '-'}
                          </td>
                          <td style={{...styles.td, color: '#ef4444', fontWeight: '600'}}>
                            {formatCurrency(expense.amount, expense.currency)}
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.statusBadge, backgroundColor: `${statusInfo.color}15`, color: statusInfo.color}}>
                              {statusInfo.name}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={{position: 'relative'}}>
                              <button onClick={() => setMenuOpen(menuOpen === expense.id ? null : expense.id)} style={styles.menuButton}>
                                <MoreVertical size={18} />
                              </button>
                              {menuOpen === expense.id && (
                                <div style={{...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'}}>
                                  <button onClick={() => { setEditingExpense(expense); setShowExpenseModal(true); setMenuOpen(null) }} style={styles.menuItem}>
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button onClick={() => handleDeleteExpense(expense)} style={{...styles.menuItem, color: '#ef4444'}}>
                                    <Trash2 size={14} /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* INCOMES TAB */}
            {activeTab === 'incomes' && (
              <div style={{...styles.tableContainer, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Data</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Categoria</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Descripció</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Projecte</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Plataforma</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Import</th>
                      <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Accions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(incomes, 'income_date').map(income => {
                      const catInfo = INCOME_CATEGORIES.find(c => c.id === income.category) || INCOME_CATEGORIES[0]
                      
                      return (
                        <tr key={income.id} style={styles.tr}>
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {formatDate(income.income_date)}
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.categoryBadge, backgroundColor: `${catInfo.color}15`, color: catInfo.color}}>
                              {catInfo.name}
                            </span>
                          </td>
                          <td style={{...styles.td, color: darkMode ? '#ffffff' : '#111827'}}>
                            {income.description || '-'}
                          </td>
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {income.project?.name || '-'}
                          </td>
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {income.platform} {income.marketplace && `(${income.marketplace})`}
                          </td>
                          <td style={{...styles.td, color: '#22c55e', fontWeight: '600'}}>
                            {formatCurrency(income.amount, income.currency)}
                          </td>
                          <td style={styles.td}>
                            <div style={{position: 'relative'}}>
                              <button onClick={() => setMenuOpen(menuOpen === `i-${income.id}` ? null : `i-${income.id}`)} style={styles.menuButton}>
                                <MoreVertical size={18} />
                              </button>
                              {menuOpen === `i-${income.id}` && (
                                <div style={{...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'}}>
                                  <button onClick={() => { setEditingIncome(income); setShowIncomeModal(true); setMenuOpen(null) }} style={styles.menuItem}>
                                    <Edit size={14} /> Editar
                                  </button>
                                  <button onClick={() => handleDeleteIncome(income)} style={{...styles.menuItem, color: '#ef4444'}}>
                                    <Trash2 size={14} /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Despesa */}
      {showExpenseModal && editingExpense && (
        <div style={styles.modalOverlay} onClick={() => setShowExpenseModal(false)}>
          <div style={{...styles.modal, backgroundColor: darkMode ? '#15151f' : '#ffffff'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingExpense.id ? 'Editar Despesa' : (editingExpense.is_global ? 'Nova Despesa Global' : 'Nova Despesa de Projecte')}
              </h3>
              <button onClick={() => setShowExpenseModal(false)} style={styles.closeButton}><X size={20} /></button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                {!editingExpense.is_global && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Projecte *</label>
                    <select
                      value={editingExpense.project_id}
                      onChange={e => setEditingExpense({...editingExpense, project_id: e.target.value})}
                      style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                    >
                      <option value="">Selecciona...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria *</label>
                  <select
                    value={editingExpense.category}
                    onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    {(editingExpense.is_global ? EXPENSE_CATEGORIES.global : EXPENSE_CATEGORIES.project).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Import *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingExpense.amount}
                    onChange={e => setEditingExpense({...editingExpense, amount: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Moneda</label>
                  <select
                    value={editingExpense.currency}
                    onChange={e => setEditingExpense({...editingExpense, currency: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data *</label>
                  <input
                    type="date"
                    value={editingExpense.expense_date}
                    onChange={e => setEditingExpense({...editingExpense, expense_date: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Estat pagament</label>
                  <select
                    value={editingExpense.payment_status}
                    onChange={e => setEditingExpense({...editingExpense, payment_status: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="pending">Pendent</option>
                    <option value="paid">Pagat</option>
                    <option value="partial">Parcial</option>
                  </select>
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Descripció</label>
                  <input
                    type="text"
                    value={editingExpense.description}
                    onChange={e => setEditingExpense({...editingExpense, description: e.target.value})}
                    placeholder="Descripció de la despesa..."
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Referència</label>
                  <input
                    type="text"
                    value={editingExpense.reference_number}
                    onChange={e => setEditingExpense({...editingExpense, reference_number: e.target.value})}
                    placeholder="Nº factura, PO..."
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Proveïdor</label>
                  <select
                    value={editingExpense.supplier_id}
                    onChange={e => {
                      if (e.target.value === '__other__') {
                        setEditingExpense({...editingExpense, supplier_id: '', supplier_name: ''})
                      } else {
                        setEditingExpense({...editingExpense, supplier_id: e.target.value, supplier_name: ''})
                      }
                    }}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="">Selecciona...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="__other__">➕ Altre (escriure nom)</option>
                  </select>
                </div>

                {editingExpense.supplier_id === '' && editingExpense.supplier_name !== undefined && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nom Proveïdor</label>
                    <input
                      type="text"
                      value={editingExpense.supplier_name}
                      onChange={e => setEditingExpense({...editingExpense, supplier_name: e.target.value})}
                      placeholder="Nom del proveïdor..."
                      style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                    />
                  </div>
                )}

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    value={editingExpense.notes}
                    onChange={e => setEditingExpense({...editingExpense, notes: e.target.value})}
                    rows={2}
                    style={{...styles.input, ...styles.textarea, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                {/* Upload factura */}
                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Factura / Document</label>
                  <div style={{
                    ...styles.uploadArea,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    borderColor: editingExpense.receipt_url ? '#22c55e' : '#d1d5db'
                  }}>
                    {editingExpense.receipt_url ? (
                      <div style={styles.uploadedFile}>
                        <span style={{ color: '#22c55e' }}>✓ Document adjuntat</span>
                        <a href={editingExpense.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontSize: '12px' }}>
                          Veure document
                        </a>
                        <button 
                          onClick={() => setEditingExpense({...editingExpense, receipt_url: '', receipt_drive_id: ''})}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div style={styles.uploadPlaceholder}>
                        <span style={{ color: '#6b7280', fontSize: '13px' }}>
                          📄 Puja factura des del projecte o enganxa URL
                        </span>
                        <input
                          type="url"
                          placeholder="URL del document (Google Drive, etc.)"
                          value={editingExpense.receipt_url || ''}
                          onChange={e => setEditingExpense({...editingExpense, receipt_url: e.target.value})}
                          style={{...styles.input, marginTop: '8px', backgroundColor: darkMode ? '#15151f' : '#ffffff', color: darkMode ? '#ffffff' : '#111827'}}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowExpenseModal(false)} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveExpense} disabled={saving} style={{...styles.saveButton, backgroundColor: '#ef4444'}}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ingrés */}
      {showIncomeModal && editingIncome && (
        <div style={styles.modalOverlay} onClick={() => setShowIncomeModal(false)}>
          <div style={{...styles.modal, backgroundColor: darkMode ? '#15151f' : '#ffffff'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingIncome.id ? 'Editar Ingrés' : 'Nou Ingrés'}
              </h3>
              <button onClick={() => setShowIncomeModal(false)} style={styles.closeButton}><X size={20} /></button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Projecte *</label>
                  <select
                    value={editingIncome.project_id}
                    onChange={e => setEditingIncome({...editingIncome, project_id: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="">Selecciona...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria</label>
                  <select
                    value={editingIncome.category}
                    onChange={e => setEditingIncome({...editingIncome, category: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    {INCOME_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Import *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingIncome.amount}
                    onChange={e => setEditingIncome({...editingIncome, amount: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Moneda</label>
                  <select
                    value={editingIncome.currency}
                    onChange={e => setEditingIncome({...editingIncome, currency: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Data *</label>
                  <input
                    type="date"
                    value={editingIncome.income_date}
                    onChange={e => setEditingIncome({...editingIncome, income_date: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Plataforma</label>
                  <select
                    value={editingIncome.platform}
                    onChange={e => setEditingIncome({...editingIncome, platform: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="amazon">Amazon</option>
                    <option value="other">Altre</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Marketplace</label>
                  <select
                    value={editingIncome.marketplace}
                    onChange={e => setEditingIncome({...editingIncome, marketplace: e.target.value})}
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  >
                    <option value="ES">Espanya</option>
                    <option value="DE">Alemanya</option>
                    <option value="FR">França</option>
                    <option value="IT">Itàlia</option>
                    <option value="UK">UK</option>
                    <option value="US">USA</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Order ID</label>
                  <input
                    type="text"
                    value={editingIncome.order_id}
                    onChange={e => setEditingIncome({...editingIncome, order_id: e.target.value})}
                    placeholder="ID comanda Amazon..."
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Descripció</label>
                  <input
                    type="text"
                    value={editingIncome.description}
                    onChange={e => setEditingIncome({...editingIncome, description: e.target.value})}
                    placeholder="Descripció..."
                    style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowIncomeModal(false)} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveIncome} disabled={saving} style={{...styles.saveButton, backgroundColor: '#22c55e'}}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
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
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
  toolbar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  searchContainer: { flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)' },
  searchInput: { flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' },
  filterSelect: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  newButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' },
  statValue: { display: 'block', fontSize: '18px', fontWeight: '700' },
  statLabel: { fontSize: '12px', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
  card: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  listItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' },
  listIcon: { width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  listContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  tableContainer: { borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' },
  tr: { borderBottom: '1px solid var(--border-color)' },
  td: { padding: '14px 16px', fontSize: '14px' },
  categoryBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
  globalBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', backgroundColor: '#6b728015', color: '#6b7280' },
  menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#9ca3af' },
  menu: { position: 'absolute', right: 0, top: '100%', minWidth: '140px', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 10 },
  menuItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', border: 'none', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'inherit' },
  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '100%', maxWidth: '600px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalBody: { padding: '24px', overflowY: 'auto', maxHeight: '60vh' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  textarea: { resize: 'vertical', minHeight: '60px' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  uploadArea: { padding: '16px', borderRadius: '8px', border: '2px dashed', textAlign: 'center' },
  uploadedFile: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  uploadPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center' }
}
