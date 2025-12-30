import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  BarChart3,
  Activity,
  Barcode,
  AlertCircle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getUnassignedGtinCodes, getProjectsMissingGtin } from '../lib/supabase'
import Header from '../components/Header'

// Colors per categories
const CATEGORY_COLORS = {
  product_cost: '#ef4444',
  shipping: '#f59e0b',
  amazon_fees: '#ff9900',
  marketing: '#8b5cf6',
  samples: '#ec4899',
  other: '#6b7280',
  sale: '#22c55e',
  refund: '#ef4444'
}

export default function Analytics() {
  const { darkMode } = useApp()
  
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // dies
  const [filterProject, setFilterProject] = useState('')
  const [projects, setProjects] = useState([])
  
  // Dades
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [unassignedGtins, setUnassignedGtins] = useState([])
  const [missingGtinProjects, setMissingGtinProjects] = useState([])

  useEffect(() => {
    loadData()
  }, [dateRange, filterProject])

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      const startDateStr = startDate.toISOString().split('T')[0]

      // Projectes
      const { data: projectsData } = await supabase.from('projects').select('*')
      setProjects(projectsData || [])

      // Despeses
      let expensesQuery = supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDateStr)
      if (filterProject) expensesQuery = expensesQuery.eq('project_id', filterProject)
      const { data: expensesData } = await expensesQuery
      setExpenses(expensesData || [])

      // Ingressos
      let incomesQuery = supabase
        .from('incomes')
        .select('*')
        .gte('income_date', startDateStr)
      if (filterProject) incomesQuery = incomesQuery.eq('project_id', filterProject)
      const { data: incomesData } = await incomesQuery
      setIncomes(incomesData || [])

      // Comandes
      let ordersQuery = supabase
        .from('purchase_orders')
        .select('*')
        .gte('order_date', startDateStr)
      if (filterProject) ordersQuery = ordersQuery.eq('project_id', filterProject)
      const { data: ordersData } = await ordersQuery
      setOrders(ordersData || [])

      // Inventari
      let inventoryQuery = supabase.from('inventory').select('*')
      if (filterProject) inventoryQuery = inventoryQuery.eq('project_id', filterProject)
      const { data: inventoryData } = await inventoryQuery
      setInventory(inventoryData || [])

      // GTIN Pool - Unassigned codes
      const unassigned = await getUnassignedGtinCodes()
      setUnassignedGtins(unassigned || [])

      // Projects missing GTIN
      const missing = await getProjectsMissingGtin()
      setMissingGtinProjects(missing || [])

    } catch (err) {
      console.error('Error carregant dades:', err)
    }
    setLoading(false)
  }

  // Càlculs
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const totalIncomes = incomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
  const totalOrders = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
  const profit = totalIncomes - totalExpenses
  const margin = totalIncomes > 0 ? (profit / totalIncomes * 100) : 0

  // Despeses per categoria
  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'other'
    acc[cat] = (acc[cat] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})

  // Ingressos per categoria
  const incomesByCategory = incomes.reduce((acc, i) => {
    const cat = i.category || 'sale'
    acc[cat] = (acc[cat] || 0) + (parseFloat(i.amount) || 0)
    return acc
  }, {})

  // Despeses per projecte
  const expensesByProject = expenses.reduce((acc, e) => {
    const projId = e.project_id || 'global'
    acc[projId] = (acc[projId] || 0) + (parseFloat(e.amount) || 0)
    return acc
  }, {})

  // Top productes per stock
  const topInventory = [...inventory]
    .sort((a, b) => (b.units_amazon_fba || 0) - (a.units_amazon_fba || 0))
    .slice(0, 5)

  // Comandes per estat
  const ordersByStatus = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  // Render barra de progrés
  const renderProgressBar = (value, max, color) => {
    const percentage = max > 0 ? (value / max * 100) : 0
    return (
      <div style={styles.progressContainer}>
        <div style={{ ...styles.progressBar, width: `${Math.min(percentage, 100)}%`, backgroundColor: color }} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header title="Analytics" />

      <div style={styles.content}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            style={{ ...styles.filterSelect, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
          >
            <option value="7">Últims 7 dies</option>
            <option value="30">Últims 30 dies</option>
            <option value="90">Últims 90 dies</option>
            <option value="365">Últim any</option>
          </select>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            style={{ ...styles.filterSelect, backgroundColor: darkMode ? '#1f1f2e' : '#ffffff', color: darkMode ? '#ffffff' : '#111827' }}
          >
            <option value="">Tots els projectes</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={loadData} style={styles.refreshBtn}>
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Carregant analytics...</div>
        ) : (
          <>
            {/* KPIs principals */}
            <div style={styles.kpiGrid}>
              <div style={{ ...styles.kpiCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <div style={styles.kpiHeader}>
                  <div style={{ ...styles.kpiIcon, backgroundColor: '#22c55e20' }}>
                    <TrendingUp size={24} color="#22c55e" />
                  </div>
                  <span style={styles.kpiLabel}>Ingressos</span>
                </div>
                <span style={{ ...styles.kpiValue, color: '#22c55e' }}>{formatCurrency(totalIncomes)}</span>
                <div style={styles.kpiFooter}>
                  <ArrowUpRight size={14} color="#22c55e" />
                  <span style={{ color: '#22c55e' }}>{incomes.length} transaccions</span>
                </div>
              </div>

              <div style={{ ...styles.kpiCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <div style={styles.kpiHeader}>
                  <div style={{ ...styles.kpiIcon, backgroundColor: '#ef444420' }}>
                    <TrendingDown size={24} color="#ef4444" />
                  </div>
                  <span style={styles.kpiLabel}>Despeses</span>
                </div>
                <span style={{ ...styles.kpiValue, color: '#ef4444' }}>{formatCurrency(totalExpenses)}</span>
                <div style={styles.kpiFooter}>
                  <ArrowDownRight size={14} color="#ef4444" />
                  <span style={{ color: '#ef4444' }}>{expenses.length} transaccions</span>
                </div>
              </div>

              <div style={{ ...styles.kpiCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <div style={styles.kpiHeader}>
                  <div style={{ ...styles.kpiIcon, backgroundColor: profit >= 0 ? '#22c55e20' : '#ef444420' }}>
                    <DollarSign size={24} color={profit >= 0 ? '#22c55e' : '#ef4444'} />
                  </div>
                  <span style={styles.kpiLabel}>Benefici</span>
                </div>
                <span style={{ ...styles.kpiValue, color: profit >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(profit)}</span>
                <div style={styles.kpiFooter}>
                  <Activity size={14} color="#6b7280" />
                  <span style={{ color: '#6b7280' }}>Marge: {margin.toFixed(1)}%</span>
                </div>
              </div>

              <div style={{ ...styles.kpiCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <div style={styles.kpiHeader}>
                  <div style={{ ...styles.kpiIcon, backgroundColor: '#4f46e520' }}>
                    <ShoppingCart size={24} color="#4f46e5" />
                  </div>
                  <span style={styles.kpiLabel}>Comandes (PO)</span>
                </div>
                <span style={{ ...styles.kpiValue, color: '#4f46e5' }}>{formatCurrency(totalOrders)}</span>
                <div style={styles.kpiFooter}>
                  <Package size={14} color="#6b7280" />
                  <span style={{ color: '#6b7280' }}>{orders.length} ordres</span>
                </div>
              </div>
            </div>

            {/* Gràfics */}
            <div style={styles.chartsGrid}>
              {/* Despeses per categoria */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <PieChart size={18} color="#ef4444" />
                  Despeses per Categoria
                </h3>
                <div style={styles.categoryList}>
                  {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                    <div key={cat} style={styles.categoryItem}>
                      <div style={styles.categoryInfo}>
                        <span style={{
                          ...styles.categoryDot,
                          backgroundColor: CATEGORY_COLORS[cat] || '#6b7280'
                        }} />
                        <span style={{ color: darkMode ? '#ffffff' : '#111827', textTransform: 'capitalize' }}>
                          {cat.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={styles.categoryValue}>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '600' }}>
                          {formatCurrency(amount)}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          {totalExpenses > 0 ? (amount / totalExpenses * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      {renderProgressBar(amount, totalExpenses, CATEGORY_COLORS[cat] || '#6b7280')}
                    </div>
                  ))}
                  {Object.keys(expensesByCategory).length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>No hi ha despeses</p>
                  )}
                </div>
              </div>

              {/* Ingressos per categoria */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <BarChart3 size={18} color="#22c55e" />
                  Ingressos per Categoria
                </h3>
                <div style={styles.categoryList}>
                  {Object.entries(incomesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                    <div key={cat} style={styles.categoryItem}>
                      <div style={styles.categoryInfo}>
                        <span style={{
                          ...styles.categoryDot,
                          backgroundColor: cat === 'sale' ? '#22c55e' : (cat === 'refund' ? '#ef4444' : '#6b7280')
                        }} />
                        <span style={{ color: darkMode ? '#ffffff' : '#111827', textTransform: 'capitalize' }}>
                          {cat === 'sale' ? 'Vendes' : cat === 'refund' ? 'Devolucions' : cat === 'reimbursement' ? 'Reemborsaments' : cat}
                        </span>
                      </div>
                      <div style={styles.categoryValue}>
                        <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '600' }}>
                          {formatCurrency(amount)}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          {totalIncomes > 0 ? (amount / totalIncomes * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      {renderProgressBar(amount, totalIncomes, cat === 'sale' ? '#22c55e' : '#ef4444')}
                    </div>
                  ))}
                  {Object.keys(incomesByCategory).length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>No hi ha ingressos</p>
                  )}
                </div>
              </div>

              {/* Despeses per projecte */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <Package size={18} color="#4f46e5" />
                  Despeses per Projecte
                </h3>
                <div style={styles.categoryList}>
                  {Object.entries(expensesByProject).sort((a, b) => b[1] - a[1]).map(([projId, amount]) => {
                    const proj = projects.find(p => p.id === projId)
                    return (
                      <div key={projId} style={styles.categoryItem}>
                        <div style={styles.categoryInfo}>
                          <span style={{ ...styles.categoryDot, backgroundColor: '#4f46e5' }} />
                          <span style={{ color: darkMode ? '#ffffff' : '#111827' }}>
                            {proj?.name || (projId === 'global' ? '🌍 Global' : 'Sense projecte')}
                          </span>
                        </div>
                        <div style={styles.categoryValue}>
                          <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '600' }}>
                            {formatCurrency(amount)}
                          </span>
                        </div>
                        {renderProgressBar(amount, totalExpenses, '#4f46e5')}
                      </div>
                    )
                  })}
                  {Object.keys(expensesByProject).length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>No hi ha despeses</p>
                  )}
                </div>
              </div>

              {/* Top Stock */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <Package size={18} color="#ff9900" />
                  Top Productes (Stock FBA)
                </h3>
                <div style={styles.categoryList}>
                  {topInventory.map((item, idx) => (
                    <div key={item.id} style={styles.categoryItem}>
                      <div style={styles.categoryInfo}>
                        <span style={{
                          ...styles.rankBadge,
                          backgroundColor: idx === 0 ? '#fbbf24' : (idx === 1 ? '#9ca3af' : (idx === 2 ? '#cd7f32' : '#6b7280'))
                        }}>
                          {idx + 1}
                        </span>
                        <div>
                          <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '500' }}>{item.sku}</span>
                          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{item.product_name}</p>
                        </div>
                      </div>
                      <span style={{ color: '#ff9900', fontWeight: '700' }}>{item.units_amazon_fba || 0}</span>
                    </div>
                  ))}
                  {topInventory.length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>No hi ha inventari</p>
                  )}
                </div>
              </div>
            </div>

            {/* Resum comandes */}
            <div style={{ ...styles.summaryCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
              <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                <ShoppingCart size={18} color="#4f46e5" />
                Resum Comandes (PO)
              </h3>
              <div style={styles.ordersGrid}>
                {Object.entries(ordersByStatus).map(([status, count]) => (
                  <div key={status} style={{
                    ...styles.orderStatusCard,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                  }}>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: darkMode ? '#ffffff' : '#111827' }}>{count}</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                  </div>
                ))}
                {Object.keys(ordersByStatus).length === 0 && (
                  <p style={{ color: '#6b7280', gridColumn: 'span 4' }}>No hi ha comandes</p>
                )}
              </div>
            </div>

            {/* GTIN Management */}
            <div style={styles.chartsGrid}>
              {/* Unassigned GTIN Codes */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <Barcode size={18} color="#4f46e5" />
                  Codis GTIN no Assignats ({unassignedGtins.length})
                </h3>
                <div style={styles.categoryList}>
                  {unassignedGtins.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>Tots els codis estan assignats</p>
                  ) : (
                    unassignedGtins.slice(0, 10).map(gtin => (
                      <div key={gtin.id} style={styles.categoryItem}>
                        <div style={styles.categoryInfo}>
                          <span style={{ ...styles.categoryDot, backgroundColor: '#4f46e5' }} />
                          <div>
                            <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '500', fontFamily: 'monospace' }}>
                              {gtin.gtin_code || 'GTIN_EXEMPT'}
                            </span>
                            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{gtin.gtin_type}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SKUs Missing GTIN */}
              <div style={{ ...styles.chartCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <h3 style={{ ...styles.chartTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                  <AlertCircle size={18} color="#f59e0b" />
                  SKUs sense GTIN ({missingGtinProjects.length})
                </h3>
                <div style={styles.categoryList}>
                  {missingGtinProjects.length === 0 ? (
                    <p style={{ color: '#6b7280', textAlign: 'center' }}>Tots els SKUs tenen GTIN</p>
                  ) : (
                    missingGtinProjects.slice(0, 10).map(project => (
                      <div key={project.id} style={styles.categoryItem}>
                        <div style={styles.categoryInfo}>
                          <span style={{ ...styles.categoryDot, backgroundColor: '#f59e0b' }} />
                          <div>
                            <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '500' }}>
                              {project.name}
                            </span>
                            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>{project.project_code} / {project.sku}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Mètriques adicionals */}
            <div style={styles.metricsGrid}>
              <div style={{ ...styles.metricCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <span style={styles.metricLabel}>Despesa mitjana</span>
                <span style={{ ...styles.metricValue, color: '#ef4444' }}>
                  {expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : '€0'}
                </span>
              </div>
              <div style={{ ...styles.metricCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <span style={styles.metricLabel}>Ingrés mitjà</span>
                <span style={{ ...styles.metricValue, color: '#22c55e' }}>
                  {incomes.length > 0 ? formatCurrency(totalIncomes / incomes.length) : '€0'}
                </span>
              </div>
              <div style={{ ...styles.metricCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <span style={styles.metricLabel}>PO mitjana</span>
                <span style={{ ...styles.metricValue, color: '#4f46e5' }}>
                  {orders.length > 0 ? formatCurrency(totalOrders / orders.length) : '€0'}
                </span>
              </div>
              <div style={{ ...styles.metricCard, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
                <span style={styles.metricLabel}>SKUs actius</span>
                <span style={{ ...styles.metricValue, color: '#ff9900' }}>{inventory.length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' },
  content: { padding: '32px', overflowY: 'auto' },
  toolbar: { display: 'flex', gap: '12px', marginBottom: '24px' },
  filterSelect: { padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  refreshBtn: { padding: '12px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: '#6b7280' },
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  // KPIs
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' },
  kpiCard: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  kpiHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  kpiIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: '14px', color: '#6b7280' },
  kpiValue: { fontSize: '28px', fontWeight: '700', display: 'block', marginBottom: '8px' },
  kpiFooter: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' },
  // Charts
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' },
  chartCard: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  chartTitle: { margin: '0 0 16px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  categoryList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  categoryItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  categoryInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  categoryDot: { width: '10px', height: '10px', borderRadius: '50%' },
  categoryValue: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressContainer: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' },
  rankBadge: { width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '12px', fontWeight: '700' },
  // Summary
  summaryCard: { padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '24px' },
  ordersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' },
  orderStatusCard: { padding: '16px', borderRadius: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' },
  // Metrics
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  metricCard: { padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' },
  metricLabel: { display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' },
  metricValue: { fontSize: '20px', fontWeight: '700' }
}
