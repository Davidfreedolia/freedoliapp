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
  FolderKanban,
  FileText,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Tag,
  BookOpen as BookIcon
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  supabase,
  getProjects,
  getSuppliers,
  getCurrentUserId
} from '../lib/supabase'
import Header from '../components/Header'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { showToast } from '../components/Toast'
import { useTranslation } from 'react-i18next'

export default function Finances() {
  const { darkMode } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const { t } = useTranslation()
  const modalStyles = getModalStyles(isMobile, darkMode)
  
  // Data
  const [ledger, setLedger] = useState([]) // Combined incomes + expenses
  const [categories, setCategories] = useState({ income: [], expense: [] })
  const [projects, setProjects] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Views
  const [savedViews, setSavedViews] = useState([])
  const [activeView, setActiveView] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingView, setEditingView] = useState(null)
  
  // Filters
  const [filters, setFilters] = useState({
    project_id: null,
    category_id: null,
    date_from: null,
    date_to: null,
    search: '',
    type: 'all' // 'all', 'income', 'expense'
  })
  
  // UI State
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'type', 'category', 'description', 'project', 'amount', 'balance'
  ])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (activeView) {
      setFilters(activeView.filters || {})
      setVisibleColumns(activeView.columns || visibleColumns)
    }
  }, [activeView])

  const loadData = async () => {
    setLoading(true)
    try {
      const userId = await getCurrentUserId()
      
      // Load categories
      const { data: categoriesData } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      
      const incomeCats = (categoriesData || []).filter(c => c.type === 'income')
      const expenseCats = (categoriesData || []).filter(c => c.type === 'expense')
      setCategories({ income: incomeCats, expense: expenseCats })
      
      // Load expenses and incomes
      const [expensesRes, incomesRes, projectsData, suppliersData, viewsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            project:projects(id, name, project_code),
            supplier:suppliers(id, name),
            category:finance_categories(id, name, color, icon)
          `)
          .eq('user_id', userId)
          .order('expense_date', { ascending: false }),
        supabase
          .from('incomes')
          .select(`
            *,
            project:projects(id, name, project_code),
            category:finance_categories(id, name, color, icon)
          `)
          .eq('user_id', userId)
          .order('income_date', { ascending: false }),
        getProjects(),
        getSuppliers(),
        supabase
          .from('finance_views')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
      ])
      
      // Combine into ledger
      const expenses = (expensesRes.data || []).map(e => ({
        ...e,
        type: 'expense',
        date: e.expense_date,
        amount: -Math.abs(parseFloat(e.amount || 0)),
        currency: e.currency || 'EUR'
      }))
      
      const incomes = (incomesRes.data || []).map(i => ({
        ...i,
        type: 'income',
        date: i.income_date,
        amount: Math.abs(parseFloat(i.amount || 0)),
        currency: i.currency || 'EUR'
      }))
      
      // Combine and sort by date
      const combined = [...expenses, ...incomes].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      )
      
      // Calculate running balance
      let balance = 0
      const ledgerWithBalance = combined.map(item => {
        balance += item.amount
        return { ...item, balance }
      })
      
      setLedger(ledgerWithBalance)
      setProjects(projectsData || [])
      setSuppliers(suppliersData || [])
      setSavedViews(viewsRes.data || [])
      
      // Set default view if exists
      const defaultView = viewsRes.data?.find(v => v.is_default)
      if (defaultView) {
        setActiveView(defaultView)
      }
    } catch (err) {
      console.error('Error carregant finances:', err)
      showToast('Error carregant les finances', 'error')
    }
    setLoading(false)
  }

  // Filter ledger
  const filteredLedger = ledger.filter(item => {
    if (filters.type !== 'all' && item.type !== filters.type) return false
    if (filters.project_id && item.project_id !== filters.project_id) return false
    if (filters.category_id && item.category_id !== filters.category_id) return false
    if (filters.date_from && new Date(item.date) < new Date(filters.date_from)) return false
    if (filters.date_to && new Date(item.date) > new Date(filters.date_to)) return false
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        item.description?.toLowerCase().includes(searchLower) ||
        item.reference_number?.toLowerCase().includes(searchLower) ||
        item.project?.name?.toLowerCase().includes(searchLower) ||
        item.order_id?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Calculate stats
  const stats = {
    totalIncome: filteredLedger.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0),
    totalExpense: Math.abs(filteredLedger.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0)),
    profit: filteredLedger.reduce((sum, i) => sum + i.amount, 0),
    balance: filteredLedger.length > 0 ? filteredLedger[filteredLedger.length - 1]?.balance || 0 : 0
  }

  // Category CRUD
  const handleNewCategory = (type) => {
    setEditingCategory({
      name: '',
      type: type,
      color: '#6b7280',
      icon: 'Receipt',
      parent_id: null,
      is_system: false
    })
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async () => {
    if (!editingCategory.name) {
      showToast('El nom és obligatori', 'error')
      return
    }
    
    setSaving(true)
    try {
      const userId = await getCurrentUserId()
      const data = {
        ...editingCategory,
        user_id: userId
      }
      
      if (editingCategory.id) {
        const { error } = await supabase
          .from('finance_categories')
          .update(data)
          .eq('id', editingCategory.id)
        if (error) throw error
        showToast('Categoria actualitzada', 'success')
      } else {
        const { error } = await supabase
          .from('finance_categories')
          .insert(data)
        if (error) throw error
        showToast('Categoria creada', 'success')
      }
      
      await loadData()
      setShowCategoryModal(false)
      setEditingCategory(null)
    } catch (err) {
      console.error('Error guardant categoria:', err)
      showToast('Error guardant la categoria', 'error')
    }
    setSaving(false)
  }

  const handleDeleteCategory = async (category) => {
    if (category.is_system) {
      showToast('No es pot eliminar una categoria del sistema', 'error')
      return
    }
    
    if (!confirm(`Segur que vols eliminar la categoria "${category.name}"?`)) return
    
    try {
      const { error } = await supabase
        .from('finance_categories')
        .delete()
        .eq('id', category.id)
      if (error) throw error
      showToast('Categoria eliminada', 'success')
      await loadData()
    } catch (err) {
      console.error('Error eliminant categoria:', err)
      showToast('Error eliminant la categoria', 'error')
    }
  }

  // View CRUD
  const handleSaveView = async () => {
    if (!editingView.name) {
      showToast('El nom és obligatori', 'error')
      return
    }
    
    setSaving(true)
    try {
      const userId = await getCurrentUserId()
      const data = {
        name: editingView.name,
        filters: filters,
        columns: visibleColumns,
        sort_by: 'date',
        sort_order: 'desc',
        is_default: editingView.is_default || false,
        user_id: userId
      }
      
      if (editingView.id) {
        const { error } = await supabase
          .from('finance_views')
          .update(data)
          .eq('id', editingView.id)
        if (error) throw error
        showToast('Vista guardada', 'success')
      } else {
        const { error } = await supabase
          .from('finance_views')
          .insert(data)
        if (error) throw error
        showToast('Vista creada', 'success')
      }
      
      await loadData()
      setShowViewModal(false)
      setEditingView(null)
    } catch (err) {
      console.error('Error guardant vista:', err)
      showToast('Error guardant la vista', 'error')
    }
    setSaving(false)
  }

  const handleDeleteView = async (view) => {
    if (!confirm(`Segur que vols eliminar la vista "${view.name}"?`)) return
    
    try {
      const { error } = await supabase
        .from('finance_views')
        .delete()
        .eq('id', view.id)
      if (error) throw error
      showToast('Vista eliminada', 'success')
      if (activeView?.id === view.id) {
        setActiveView(null)
      }
      await loadData()
    } catch (err) {
      console.error('Error eliminant vista:', err)
      showToast('Error eliminant la vista', 'error')
    }
  }

  // Transaction CRUD
  const handleNewTransaction = (type) => {
    const defaultCategory = type === 'income' 
      ? categories.income[0] 
      : categories.expense[0]
    
    setEditingTransaction({
      type: type,
      project_id: null,
      category_id: defaultCategory?.id || null,
      description: '',
      amount: '',
      currency: 'EUR',
      date: new Date().toISOString().split('T')[0],
      reference_number: '',
      payment_status: type === 'expense' ? 'pending' : null,
      // Amazon-specific fields
      platform: type === 'income' ? 'amazon' : null,
      marketplace: type === 'income' ? 'ES' : null,
      order_id: type === 'income' ? '' : null,
      supplier_id: type === 'expense' ? null : null,
      notes: ''
    })
    setShowTransactionModal(true)
  }

  const handleSaveTransaction = async () => {
    if (!editingTransaction.amount || !editingTransaction.category_id) {
      showToast('Import i categoria són obligatoris', 'error')
      return
    }
    
    setSaving(true)
    try {
      const userId = await getCurrentUserId()
      const amount = Math.abs(parseFloat(editingTransaction.amount))
      
      if (editingTransaction.type === 'expense') {
        const data = {
          project_id: editingTransaction.project_id || null,
          category_id: editingTransaction.category_id,
          description: editingTransaction.description,
          amount: amount,
          currency: editingTransaction.currency,
          expense_date: editingTransaction.date,
          reference_number: editingTransaction.reference_number,
          payment_status: editingTransaction.payment_status,
          supplier_id: editingTransaction.supplier_id || null,
          notes: editingTransaction.notes,
          user_id: userId
        }
        
        if (editingTransaction.id) {
          const { error } = await supabase
            .from('expenses')
            .update(data)
            .eq('id', editingTransaction.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('expenses')
            .insert(data)
          if (error) throw error
        }
      } else {
        const data = {
          project_id: editingTransaction.project_id,
          category_id: editingTransaction.category_id,
          description: editingTransaction.description,
          amount: amount,
          currency: editingTransaction.currency,
          income_date: editingTransaction.date,
          reference_number: editingTransaction.reference_number,
          platform: editingTransaction.platform,
          marketplace: editingTransaction.marketplace,
          order_id: editingTransaction.order_id,
          notes: editingTransaction.notes,
          user_id: userId
        }
        
        if (editingTransaction.id) {
          const { error } = await supabase
            .from('incomes')
            .update(data)
            .eq('id', editingTransaction.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('incomes')
            .insert(data)
          if (error) throw error
        }
      }
      
      showToast('Transacció guardada', 'success')
      await loadData()
      setShowTransactionModal(false)
      setEditingTransaction(null)
    } catch (err) {
      console.error('Error guardant transacció:', err)
      showToast('Error guardant la transacció', 'error')
    }
    setSaving(false)
  }

  const handleDeleteTransaction = async (transaction) => {
    if (!confirm('Segur que vols eliminar aquesta transacció?')) return
    
    try {
      const table = transaction.type === 'expense' ? 'expenses' : 'incomes'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', transaction.id)
      if (error) throw error
      showToast('Transacció eliminada', 'success')
      await loadData()
      setMenuOpen(null)
    } catch (err) {
      console.error('Error eliminant transacció:', err)
      showToast('Error eliminant la transacció', 'error')
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Tipus', 'Categoria', 'Descripció', 'Projecte', 'Import', 'Moneda', 'Saldo', 'Referència']
    const rows = filteredLedger.map(item => [
      formatDate(item.date),
      item.type === 'income' ? 'Ingrés' : 'Despesa',
      item.category?.name || '-',
      item.description || '-',
      item.project?.name || '-',
      item.amount.toFixed(2),
      item.currency,
      item.balance.toFixed(2),
      item.reference_number || item.order_id || '-'
    ])
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ledger_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    showToast('Exportat a CSV', 'success')
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

  const getCategoryInfo = (categoryId, type) => {
    const catList = type === 'income' ? categories.income : categories.expense
    return catList.find(c => c.id === categoryId) || { name: 'Sense categoria', color: '#6b7280', icon: 'Receipt' }
  }

  return (
    <div style={styles.container}>
      <Header title="Finances" />

      <div style={styles.content}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          {/* Saved Views */}
          <div style={styles.viewsSection}>
            <select
              value={activeView?.id || ''}
              onChange={(e) => {
                const view = savedViews.find(v => v.id === e.target.value)
                setActiveView(view || null)
              }}
              style={{
                ...styles.viewSelect,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              <option value="">Vista actual</option>
              {savedViews.map(view => (
                <option key={view.id} value={view.id}>{view.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditingView({ name: '', filters: filters, columns: visibleColumns, is_default: false })
                setShowViewModal(true)
              }}
              style={styles.iconButton}
              title="Guardar vista"
            >
              <Save size={18} />
            </button>
            {activeView && (
              <button
                onClick={() => {
                  setEditingView(activeView)
                  setShowViewModal(true)
                }}
                style={styles.iconButton}
                title="Editar vista"
              >
                <Edit size={18} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={styles.filtersSection}>
            <select
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})}
              style={{
                ...styles.filterSelect,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              <option value="all">Tots</option>
              <option value="income">Ingressos</option>
              <option value="expense">Despeses</option>
            </select>

            <select
              value={filters.project_id || ''}
              onChange={e => setFilters({...filters, project_id: e.target.value || null})}
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
              value={filters.category_id || ''}
              onChange={e => setFilters({...filters, category_id: e.target.value || null})}
              style={{
                ...styles.filterSelect,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            >
              <option value="">Totes les categories</option>
              {[...categories.income, ...categories.expense].map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date_from || ''}
              onChange={e => setFilters({...filters, date_from: e.target.value || null})}
              placeholder="Des de"
              style={{
                ...styles.filterInput,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />

            <input
              type="date"
              value={filters.date_to || ''}
              onChange={e => setFilters({...filters, date_to: e.target.value || null})}
              placeholder="Fins a"
              style={{
                ...styles.filterInput,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827'
              }}
            />

            <div style={{
              ...styles.searchContainer,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
            }}>
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                style={{...styles.searchInput, color: darkMode ? '#ffffff' : '#111827'}}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actionsSection}>
            <button
              onClick={() => setShowCategoryModal(true)}
              style={styles.iconButton}
              title="Gestionar categories"
            >
              <Tag size={18} />
            </button>
            <button
              onClick={handleExportCSV}
              style={styles.iconButton}
              title="Exportar a CSV"
            >
              <FileSpreadsheet size={18} />
            </button>
            <button
              onClick={() => handleNewTransaction('income')}
              style={{...styles.newButton, backgroundColor: '#22c55e', border: '1px solid #16a34a'}}
            >
              <Plus size={18} /> Ingrés
            </button>
            <button
              onClick={() => handleNewTransaction('expense')}
              style={{...styles.newButton, backgroundColor: '#ef4444', border: '1px solid #dc2626'}}
            >
              <Plus size={18} /> Despesa
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <div style={{...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <TrendingUp size={28} color="#22c55e" />
            <div>
              <span style={{...styles.statValue, color: '#22c55e'}}>{formatCurrency(stats.totalIncome)}</span>
              <span style={styles.statLabel}>Ingressos</span>
            </div>
          </div>
          <div style={{...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <TrendingDown size={28} color="#ef4444" />
            <div>
              <span style={{...styles.statValue, color: '#ef4444'}}>{formatCurrency(stats.totalExpense)}</span>
              <span style={styles.statLabel}>Despeses</span>
            </div>
          </div>
          <div style={{...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <DollarSign size={28} color={stats.profit >= 0 ? '#22c55e' : '#ef4444'} />
            <div>
              <span style={{...styles.statValue, color: stats.profit >= 0 ? '#22c55e' : '#ef4444'}}>
                {formatCurrency(stats.profit)}
              </span>
              <span style={styles.statLabel}>Benefici</span>
            </div>
          </div>
          <div style={{...styles.statCard, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <BookIcon size={28} color="#4f46e5" />
            <div>
              <span style={{...styles.statValue, color: '#4f46e5'}}>{formatCurrency(stats.balance)}</span>
              <span style={styles.statLabel}>Saldo</span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div style={styles.loading}>Carregant...</div>
        ) : (
          <div style={{...styles.tableContainer, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {visibleColumns.includes('date') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Data</th>
                  )}
                  {visibleColumns.includes('type') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Tipus</th>
                  )}
                  {visibleColumns.includes('category') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Categoria</th>
                  )}
                  {visibleColumns.includes('description') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Descripció</th>
                  )}
                  {visibleColumns.includes('project') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Projecte</th>
                  )}
                  {visibleColumns.includes('amount') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Import</th>
                  )}
                  {visibleColumns.includes('balance') && (
                    <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Saldo</th>
                  )}
                  <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} style={{...styles.td, textAlign: 'center', padding: '48px', color: '#6b7280'}}>
                      No hi ha transaccions
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item, index) => {
                    const catInfo = getCategoryInfo(item.category_id, item.type)
                    return (
                      <tr key={`${item.type}-${item.id}`} style={styles.tr}>
                        {visibleColumns.includes('date') && (
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {formatDate(item.date)}
                          </td>
                        )}
                        {visibleColumns.includes('type') && (
                          <td style={styles.td}>
                            <span style={{
                              ...styles.typeBadge,
                              backgroundColor: item.type === 'income' ? '#22c55e15' : '#ef444415',
                              color: item.type === 'income' ? '#22c55e' : '#ef4444'
                            }}>
                              {item.type === 'income' ? 'Ingrés' : 'Despesa'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes('category') && (
                          <td style={styles.td}>
                            <span style={{
                              ...styles.categoryBadge,
                              backgroundColor: `${catInfo.color}15`,
                              color: catInfo.color
                            }}>
                              {catInfo.name}
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes('description') && (
                          <td style={{...styles.td, color: darkMode ? '#ffffff' : '#111827'}}>
                            {item.description || '-'}
                            {item.order_id && (
                              <span style={{fontSize: '11px', color: '#6b7280', marginLeft: '8px'}}>
                                Order: {item.order_id}
                              </span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('project') && (
                          <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                            {item.project?.name || '-'}
                          </td>
                        )}
                        {visibleColumns.includes('amount') && (
                          <td style={{
                            ...styles.td,
                            color: item.amount >= 0 ? '#22c55e' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount, item.currency)}
                          </td>
                        )}
                        {visibleColumns.includes('balance') && (
                          <td style={{
                            ...styles.td,
                            color: item.balance >= 0 ? '#22c55e' : '#ef4444',
                            fontWeight: '600'
                          }}>
                            {formatCurrency(item.balance, item.currency)}
                          </td>
                        )}
                        <td style={styles.td}>
                          <div style={{position: 'relative'}}>
                            <button
                              onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                              style={styles.menuButton}
                            >
                              <MoreVertical size={18} />
                            </button>
                            {menuOpen === item.id && (
                              <div style={{...styles.menu, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'}}>
                                <button
                                  onClick={() => {
                                    setEditingTransaction(item)
                                    setShowTransactionModal(true)
                                    setMenuOpen(null)
                                  }}
                                  style={styles.menuItem}
                                >
                                  <Edit size={14} /> Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(item)}
                                  style={{...styles.menuItem, color: '#ef4444'}}
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowCategoryModal(false)}>
          <div style={{...styles.modal, ...modalStyles.modal}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                Gestionar Categories
              </h3>
              <button onClick={() => setShowCategoryModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.categoryTabs}>
                <button
                  onClick={() => setEditingCategory({...editingCategory, type: 'income'})}
                  style={{
                    ...styles.categoryTab,
                    backgroundColor: editingCategory?.type === 'income' ? '#22c55e' : 'transparent',
                    color: editingCategory?.type === 'income' ? '#ffffff' : 'inherit'
                  }}
                >
                  Ingressos
                </button>
                <button
                  onClick={() => setEditingCategory({...editingCategory, type: 'expense'})}
                  style={{
                    ...styles.categoryTab,
                    backgroundColor: editingCategory?.type === 'expense' ? '#ef4444' : 'transparent',
                    color: editingCategory?.type === 'expense' ? '#ffffff' : 'inherit'
                  }}
                >
                  Despeses
                </button>
              </div>

              <div style={styles.categoriesList}>
                {(editingCategory?.type === 'income' ? categories.income : categories.expense).map(cat => (
                  <div key={cat.id} style={styles.categoryItem}>
                    <span style={{
                      ...styles.categoryBadge,
                      backgroundColor: `${cat.color}15`,
                      color: cat.color
                    }}>
                      {cat.name}
                    </span>
                    {!cat.is_system && (
                      <div style={styles.categoryActions}>
                        <button
                          onClick={() => {
                            setEditingCategory(cat)
                            setShowCategoryModal(true)
                          }}
                          style={styles.smallButton}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          style={{...styles.smallButton, color: '#ef4444'}}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editingCategory && (
                <div style={styles.categoryForm}>
                  <input
                    type="text"
                    placeholder="Nom de la categoria"
                    value={editingCategory.name || ''}
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                  <input
                    type="color"
                    value={editingCategory.color || '#6b7280'}
                    onChange={e => setEditingCategory({...editingCategory, color: e.target.value})}
                    style={styles.colorInput}
                  />
                  <div style={styles.formActions}>
                    <button
                      onClick={handleSaveCategory}
                      disabled={saving}
                      style={styles.saveButton}
                    >
                      {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(null)
                        setShowCategoryModal(false)
                      }}
                      style={styles.cancelButton}
                    >
                      Cancel·lar
                    </button>
                  </div>
                </div>
              )}

              {!editingCategory && (
                <button
                  onClick={() => handleNewCategory(editingCategory?.type || 'expense')}
                  style={styles.newCategoryButton}
                >
                  <Plus size={16} /> Nova Categoria
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && editingView && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowViewModal(false)}>
          <div style={{...styles.modal, ...modalStyles.modal}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingView.id ? 'Editar Vista' : 'Nova Vista'}
              </h3>
              <button onClick={() => setShowViewModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nom de la vista</label>
                <input
                  type="text"
                  value={editingView.name}
                  onChange={e => setEditingView({...editingView, name: e.target.value})}
                  placeholder="Ex: Q1 2024, Amazon Sales, etc."
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={editingView.is_default || false}
                    onChange={e => setEditingView({...editingView, is_default: e.target.checked})}
                    style={{marginRight: '8px'}}
                  />
                  Vista per defecte
                </label>
              </div>
              <div style={styles.formActions}>
                <button
                  onClick={handleSaveView}
                  disabled={saving}
                  style={styles.saveButton}
                >
                  {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
                </button>
                {editingView.id && (
                  <button
                    onClick={() => handleDeleteView(editingView)}
                    style={{...styles.cancelButton, color: '#ef4444'}}
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                )}
                <button
                  onClick={() => setShowViewModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel·lar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && editingTransaction && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowTransactionModal(false)}>
          <div style={{...styles.modal, ...modalStyles.modal, maxWidth: '700px'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingTransaction.id 
                  ? `Editar ${editingTransaction.type === 'income' ? 'Ingrés' : 'Despesa'}` 
                  : `Nova ${editingTransaction.type === 'income' ? 'Ingrés' : 'Despesa'}`}
              </h3>
              <button onClick={() => setShowTransactionModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Projecte {editingTransaction.type === 'income' && '*'}</label>
                  <select
                    value={editingTransaction.project_id || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, project_id: e.target.value || null})}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="">Selecciona...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Categoria *</label>
                  <select
                    value={editingTransaction.category_id || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, category_id: e.target.value || null})}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="">Selecciona...</option>
                    {(editingTransaction.type === 'income' ? categories.income : categories.expense).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Import *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTransaction.amount}
                    onChange={e => setEditingTransaction({...editingTransaction, amount: e.target.value})}
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
                    value={editingTransaction.currency}
                    onChange={e => setEditingTransaction({...editingTransaction, currency: e.target.value})}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
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
                    value={editingTransaction.date}
                    onChange={e => setEditingTransaction({...editingTransaction, date: e.target.value})}
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>

                {editingTransaction.type === 'expense' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Estat pagament</label>
                    <select
                      value={editingTransaction.payment_status}
                      onChange={e => setEditingTransaction({...editingTransaction, payment_status: e.target.value})}
                      style={{
                        ...styles.input,
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    >
                      <option value="pending">Pendent</option>
                      <option value="paid">Pagat</option>
                      <option value="partial">Parcial</option>
                    </select>
                  </div>
                )}

                {editingTransaction.type === 'income' && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Plataforma</label>
                      <select
                        value={editingTransaction.platform}
                        onChange={e => setEditingTransaction({...editingTransaction, platform: e.target.value})}
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
                      >
                        <option value="amazon">Amazon</option>
                        <option value="other">Altre</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Marketplace</label>
                      <select
                        value={editingTransaction.marketplace}
                        onChange={e => setEditingTransaction({...editingTransaction, marketplace: e.target.value})}
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
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
                      <label style={styles.label}>Order ID (Amazon)</label>
                      <input
                        type="text"
                        value={editingTransaction.order_id || ''}
                        onChange={e => setEditingTransaction({...editingTransaction, order_id: e.target.value})}
                        placeholder="ID comanda Amazon..."
                        style={{
                          ...styles.input,
                          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                          color: darkMode ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                  </>
                )}

                {editingTransaction.type === 'expense' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Proveïdor</label>
                    <select
                      value={editingTransaction.supplier_id || ''}
                      onChange={e => setEditingTransaction({...editingTransaction, supplier_id: e.target.value || null})}
                      style={{
                        ...styles.input,
                        backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}
                    >
                      <option value="">Selecciona...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Descripció</label>
                  <input
                    type="text"
                    value={editingTransaction.description || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})}
                    placeholder="Descripció de la transacció..."
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Referència</label>
                  <input
                    type="text"
                    value={editingTransaction.reference_number || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, reference_number: e.target.value})}
                    placeholder="Nº factura, PO..."
                    style={{
                      ...styles.input,
                      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                      color: darkMode ? '#ffffff' : '#111827'
                    }}
                  />
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    value={editingTransaction.notes || ''}
                    onChange={e => setEditingTransaction({...editingTransaction, notes: e.target.value})}
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
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowTransactionModal(false)} style={styles.cancelButton}>
                Cancel·lar
              </button>
              <button
                onClick={handleSaveTransaction}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  backgroundColor: editingTransaction.type === 'income' ? '#22c55e' : '#ef4444',
                  border: editingTransaction.type === 'income' ? '1px solid #16a34a' : '1px solid #dc2626'
                }}
              >
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
  content: { padding: '16px', overflowY: 'auto' },
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  viewsSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  viewSelect: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '150px'
  },
  filtersSection: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    flexWrap: 'wrap'
  },
  filterSelect: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none'
  },
  searchContainer: {
    flex: 1,
    minWidth: '200px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)'
  },
  searchInput: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    background: 'transparent'
  },
  actionsSection: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  iconButton: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: 'inherit'
  },
  newButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  loading: {
    padding: '64px',
    textAlign: 'center',
    color: '#6b7280'
  },
  tableContainer: {
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid var(--border-color)'
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    whiteSpace: 'nowrap'
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    color: '#9ca3af'
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    minWidth: '140px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
    padding: '4px'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    color: 'inherit'
  },
  // Modal
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
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)'
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    maxHeight: '60vh'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid var(--border-color)'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
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
    color: '#6b7280'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontSize: '14px',
    outline: 'none'
  },
  textarea: {
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  // Category modal specific
  categoryTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },
  categoryTab: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    fontSize: '14px'
  },
  categoriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)'
  },
  categoryActions: {
    display: 'flex',
    gap: '4px'
  },
  smallButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280'
  },
  categoryForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    marginTop: '20px'
  },
  colorInput: {
    width: '60px',
    height: '40px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  newCategoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    justifyContent: 'center'
  }
}
