import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Trash2, 
  Upload, 
  FileText, 
  X, 
  Save, 
  AlertTriangle, 
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { 
  getSupplierQuotes, 
  createSupplierQuote, 
  updateSupplierQuote,
  deleteSupplierQuote,
  getSuppliers,
  createSupplier,
  getProjectProfitability,
  supabase
} from '../lib/supabase'
import { resolveProjectsBucket } from '../lib/projectsBucket'
import { calculateQuickProfitability } from '../lib/profitability'
import { useBreakpoint } from '../hooks/useBreakpoint'
import DecisionLog from './DecisionLog'
import PlannedVsActual from './PlannedVsActual'
import { parseSupplierQuote } from '../lib/parseSupplierQuote'

const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP']
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

export default function QuotesSection({ projectId, darkMode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [lastImportedSupplierName, setLastImportedSupplierName] = useState(null)
  const [targetQuantity, setTargetQuantity] = useState(100)
  const [projectShipping, setProjectShipping] = useState(0)
  const [projectProfitability, setProjectProfitability] = useState(null)
  const [showCreateSupplier, setShowCreateSupplier] = useState(false)
  const [prefillSupplier, setPrefillSupplier] = useState(null)
  const [createSupplierSaving, setCreateSupplierSaving] = useState(false)
  const [manualDraft, setManualDraft] = useState(null)
  
  const [newQuote, setNewQuote] = useState({
    supplier_id: '',
    currency: 'USD',
    incoterm: '',
    payment_terms: '',
    lead_time_days: '',
    moq: '',
    notes: '',
    shipping_estimate: null,
    price_breaks: [{ min_qty: 1, unit_price: '' }]
  })
  
  const fileInputRef = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [quotesData, suppliersData, profitability] = await Promise.all([
        getSupplierQuotes(projectId),
        getSuppliers(),
        getProjectProfitability(projectId)
      ])
      setQuotes(quotesData || [])
      setSuppliers(suppliersData || [])
      setProjectProfitability(profitability)
      if (profitability) {
        setProjectShipping(profitability.shipping_per_unit || 0)
      }
    } catch (err) {
      console.error('Error loading quotes:', err)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId, loadData])

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type)) {
      alert('Please upload PDF or Excel files only')
      return
    }

    setUploadingFile(true)
    try {
      const bucket = await resolveProjectsBucket()
      const path = `projects/${projectId}/suppliers/quotes/${file.name}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (error) throw error
      setNewQuote(prev => ({
        ...prev,
        file_name: file.name,
        file_path: path
      }))
    } catch (err) {
      console.error('Error uploading file:', err)
      alert('Error uploading file')
    }
    setUploadingFile(false)
  }

  const handleAddPriceBreak = () => {
    setNewQuote(prev => ({
      ...prev,
      price_breaks: [...prev.price_breaks, { min_qty: '', unit_price: '' }]
    }))
  }

  const handleRemovePriceBreak = (index) => {
    setNewQuote(prev => ({
      ...prev,
      price_breaks: prev.price_breaks.filter((_, i) => i !== index)
    }))
  }

  const handlePriceBreakChange = (index, field, value) => {
    setNewQuote(prev => ({
      ...prev,
      price_breaks: prev.price_breaks.map((pb, i) => 
        i === index ? { ...pb, [field]: value } : pb
      )
    }))
  }

  const resolveSupplierIdByName = async (name) => {
    const n = String(name || '').trim().toLowerCase()
    if (!n) return null

    // A) Primer: intenta resoldre-ho des del dropdown ja carregat (zero DB assumptions)
    const selectEl = document.querySelector('select[data-supplier-select="true"]')
    if (selectEl) {
      const opt = [...selectEl.options].find(o => String(o.textContent || '').trim().toLowerCase() === n)
      if (opt && opt.value) return opt.value
    }

    // B) Fallback DB (sense project_id)
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .ilike('name', n)
      .limit(1)

    if (error) return null
    return data?.[0]?.id || null
  }

  const handleSaveQuote = async () => {
    if (!newQuote.supplier_id || !newQuote.price_breaks.length) {
      alert('Please fill supplier and at least one price break')
      return
    }

    // Validate price breaks
    const validBreaks = newQuote.price_breaks
      .filter(pb => pb.min_qty && pb.unit_price)
      .map(pb => ({
        min_qty: parseInt(pb.min_qty),
        unit_price: parseFloat(pb.unit_price)
      }))
      .sort((a, b) => a.min_qty - b.min_qty)

    if (validBreaks.length === 0) {
      alert('Please add at least one valid price break')
      return
    }

    try {
      await createSupplierQuote({
        project_id: projectId,
        supplier_id: newQuote.supplier_id,
        file_path: newQuote.file_path,
        file_name: newQuote.file_name,
        currency: newQuote.currency,
        incoterm: newQuote.incoterm || null,
        payment_terms: newQuote.payment_terms || null,
        lead_time_days: newQuote.lead_time_days ? parseInt(newQuote.lead_time_days) : null,
        moq: newQuote.moq ? parseInt(newQuote.moq) : null,
        notes: newQuote.notes || null,
        shipping_estimate: newQuote.shipping_estimate ? parseFloat(newQuote.shipping_estimate) : null,
        price_breaks: validBreaks
      })
      
      setNewQuote({
        supplier_id: '',
        currency: 'USD',
        incoterm: '',
        payment_terms: '',
        lead_time_days: '',
        moq: '',
        notes: '',
        shipping_estimate: null,
        price_breaks: [{ min_qty: 1, unit_price: '' }]
      })
      setShowAddForm(false)
      await loadData()
    } catch (err) {
      console.error('Error saving quote:', err)
      alert('Error saving quote: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDeleteQuote = async (quoteId) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      await deleteSupplierQuote(quoteId)
      await loadData()
    } catch (err) {
      console.error('Error deleting quote:', err)
      alert('Error deleting quote')
    }
  }

  const handleValidityChange = async (quoteId, validity_status) => {
    try {
      await updateSupplierQuote(quoteId, { validity_status })
      await loadData()
    } catch (err) {
      console.error('Error updating validity:', err)
      alert('Error updating validity')
    }
  }

  const handleSelectedClick = async (quote) => {
    if (quote.is_selected) return
    try {
      await supabase
        .from('supplier_quotes')
        .update({ is_selected: false })
        .eq('project_id', projectId)
      await updateSupplierQuote(quote.id, { is_selected: true })
      await loadData()
    } catch (err) {
      console.error('Error updating selected quote:', err)
      alert('Error en marcar com escollida')
    }
  }

  const handleSamplesToggle = async (quote) => {
    if (quote.id?.startsWith('demo-')) return
    try {
      await updateSupplierQuote(quote.id, { go_samples: !quote.go_samples })
      await loadData()
    } catch (err) {
      console.error('Error updating go_samples:', err)
      alert('Error actualitzant MOSTRES')
    }
  }

  const handleCreateSupplier = async () => {
    const defaultName = lastImportedSupplierName || ''
    const name = window.prompt('Nom del proveïdor:', defaultName)
    if (!name || !name.trim()) return
    try {
      const newSupplier = await createSupplier({ name: name.trim(), type: 'other' })
      await loadData()
      setNewQuote(prev => ({ ...prev, supplier_id: newSupplier.id }))
      if (lastImportedSupplierName) setLastImportedSupplierName(null)
    } catch (err) {
      alert(err.message || 'Error creant proveïdor')
    }
  }

  const handleSendToSamples = () => {
    const selected = (quotes || []).filter(q => q.go_samples).map(q => q.id)
    sessionStorage.setItem(`samples:selected_quotes:${projectId}`, JSON.stringify(selected))
    navigate(`/projects/${projectId}?phase=samples`)
  }

  const handleAddManualRow = () => {
    setManualDraft({
      supplier_name: '',
      incoterm: '',
      moq: '',
      unit_price: '',
      lead_time_days: '',
      payment_terms: ''
    })
  }

  const handleSaveManualDraft = async () => {
    const name = String(manualDraft.supplier_name || '').trim()
    const unitPrice = manualDraft.unit_price != null && manualDraft.unit_price !== '' ? parseFloat(manualDraft.unit_price) : NaN
    if (!name) {
      alert('Cal indicar el nom del proveïdor.')
      return
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      alert('Cal indicar un preu unitat vàlid.')
      return
    }
    const supplierId = await resolveSupplierIdByName(name)
    if (!supplierId) {
      alert('Cal crear/seleccionar el proveïdor abans de desar.')
      return
    }
    const moqVal = manualDraft.moq != null && manualDraft.moq !== '' ? parseInt(manualDraft.moq, 10) : 1
    const leadTimeVal = manualDraft.lead_time_days != null && manualDraft.lead_time_days !== '' ? parseInt(manualDraft.lead_time_days, 10) : null
    try {
      await createSupplierQuote({
        project_id: projectId,
        supplier_id: supplierId,
        currency: 'USD',
        incoterm: manualDraft.incoterm || null,
        payment_terms: manualDraft.payment_terms || null,
        lead_time_days: Number.isFinite(leadTimeVal) ? leadTimeVal : null,
        moq: Number.isFinite(moqVal) ? moqVal : null,
        shipping_estimate: null,
        notes: null,
        price_breaks: [{ min_qty: Number.isFinite(moqVal) ? moqVal : 1, unit_price: String(unitPrice) }]
      })
      setManualDraft(null)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error desant la cotització')
    }
  }

  const openCreateSupplierFromQuote = (quote) => {
    const parts = []
    if (quote.currency) parts.push(`Moneda: ${quote.currency}`)
    if (quote.incoterm) parts.push(`Incoterm: ${quote.incoterm}`)
    if (quote.payment_terms) parts.push(`Pagament: ${quote.payment_terms}`)
    if (quote.notes) parts.push(quote.notes)
    setPrefillSupplier({
      name: quote.suppliers?.name || lastImportedSupplierName || '',
      currency: quote.currency || null,
      incoterm: quote.incoterm || null,
      payment_terms: quote.payment_terms || null,
      notes: parts.length ? parts.join('\n') : null
    })
    setShowCreateSupplier(true)
  }

  const getUnitPriceForQuantity = (quote, quantity) => {
    if (!quote.supplier_quote_price_breaks || quote.supplier_quote_price_breaks.length === 0) {
      return 0
    }
    
    const sortedBreaks = [...quote.supplier_quote_price_breaks]
      .sort((a, b) => b.min_qty - a.min_qty) // Sort descending
    
    for (const breakItem of sortedBreaks) {
      if (quantity >= breakItem.min_qty) {
        return parseFloat(breakItem.unit_price)
      }
    }
    
    // Return highest price break if quantity is less than all breaks
    return parseFloat(sortedBreaks[sortedBreaks.length - 1]?.unit_price || 0)
  }

  const calculateQuoteProfitability = (quote, quantity) => {
    const unitPrice = getUnitPriceForQuantity(quote, quantity)
    const shipping = quote.shipping_estimate !== null 
      ? quote.shipping_estimate 
      : projectShipping
    
    // Get profitability data from project
    const sellingPrice = projectProfitability?.selling_price || 0
    const referralFeePercent = projectProfitability?.referral_fee_percent || 15
    const fbaFeePerUnit = projectProfitability?.fba_fee_per_unit || 0
    const ppcPerUnit = projectProfitability?.ppc_per_unit || 0
    const otherCostsPerUnit = projectProfitability?.other_costs_per_unit || 0
    const fixedCosts = projectProfitability?.fixed_costs || 0

    // Calculate COGS (unit price + shipping)
    const cogs = unitPrice + shipping

    // Use profitability calculator
    const profitability = calculateQuickProfitability({
      selling_price: sellingPrice,
      cogs: cogs,
      shipping_per_unit: shipping,
      referral_fee_percent: referralFeePercent,
      fba_fee_per_unit: fbaFeePerUnit,
      ppc_per_unit: ppcPerUnit,
      other_costs_per_unit: otherCostsPerUnit,
      fixed_costs: fixedCosts
    })

    return {
      unit_price: unitPrice,
      cogs: cogs,
      shipping: shipping,
      ...profitability
    }
  }

  const getBestQuote = () => {
    if (quotes.length === 0) return null
    
    const profitabilities = quotes.map(quote => ({
      quote,
      profitability: calculateQuoteProfitability(quote, targetQuantity)
    }))
    
    // Sort by net profit descending
    profitabilities.sort((a, b) => b.profitability.net_profit - a.profitability.net_profit)
    
    return profitabilities[0]?.quote || null
  }

  const bestQuoteId = getBestQuote()?.id

  const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value)
  }

  const getDemoQuotesForLayout = () => ([
    {
      id: 'demo-q1',
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier A' },
      incoterm: 'FOB',
      moq: 300,
      lead_time_days: 28,
      payment_terms: '30/70 TT',
      validity_status: 'PASS',
      is_selected: true,
      currency: 'EUR',
      supplier_quote_price_breaks: [{ min_qty: 300, unit_price: 2.10 }],
    },
    {
      id: 'demo-q2',
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier B' },
      incoterm: 'EXW',
      moq: 500,
      lead_time_days: 20,
      payment_terms: '100% TT',
      validity_status: 'LOCK',
      is_selected: false,
      currency: 'EUR',
      supplier_quote_price_breaks: [{ min_qty: 500, unit_price: 1.95 }],
    },
    {
      id: 'demo-q3',
      created_at: new Date().toISOString(),
      suppliers: { name: 'Demo Supplier C' },
      incoterm: 'DDP',
      moq: 200,
      lead_time_days: 35,
      payment_terms: '50/50',
      validity_status: 'FAIL',
      is_selected: false,
      currency: 'EUR',
      supplier_quote_price_breaks: [{ min_qty: 200, unit_price: 2.35 }],
    },
  ])

  if (loading) {
    return (
      <div style={{
        ...styles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={styles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  const quotesForTable =
    (quotes && quotes.length > 0)
      ? quotes
      : (import.meta.env.DEV ? getDemoQuotesForLayout() : [])

  const samplesCount = quotesForTable.filter(q => q.go_samples && !String(q.id).startsWith('demo-')).length

  return (
    <div style={{
      ...styles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div className="quotes-header">
        <div className="quotes-title">
          <DollarSign className="quotes-title__icon" size={18} />
          <h3>Comparativa ràpida de cotitzacions</h3>
        </div>
        <div className="quotes-actions">
          <div
            className="quote-import-dropzone"
            onClick={() => setShowImport(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowImport(true) } }}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-dragover') }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('is-dragover') }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('is-dragover')
              const f = e.dataTransfer.files?.[0]
              if (f) {
                f.text().then((text) => { setImportText(text); setShowImport(true) }).catch(() => {})
              }
            }}
          >
            <div className="quote-import-dropzone__title">Importar cotització</div>
            <div className="quote-import-dropzone__hint">Arrossega aquí o fes clic</div>
          </div>
          <button type="button" className="btn btn--turq" onClick={handleAddManualRow}>
            <Plus size={16} />
            Afegir cotització
          </button>
        </div>
      </div>

      {showImport && (
        <div className="card" style={{ marginBottom: 16 }}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={10}
            style={{ width: '100%' }}
          />
          <button
            className="btn btn--primary"
            onClick={async () => {
              const result = parseSupplierQuote(importText)
              if (!result.ok) {
                alert(result.error)
                return
              }

              const supplierId = await resolveSupplierIdByName(result.data.supplier_name)

              setNewQuote(prev => ({
                ...prev,
                supplier_id: supplierId || prev.supplier_id,
                currency: result.data.currency || 'USD',
                incoterm: result.data.incoterm || '',
                payment_terms: result.data.payment_terms || '',
                lead_time_days: result.data.lead_time_days || '',
                moq: result.data.moq || '',
                notes: result.data.notes || '',
                shipping_estimate: result.data.shipping_estimate
                  ? parseFloat(result.data.shipping_estimate)
                  : null,
                price_breaks: result.data.unit_price
                  ? [{ min_qty: result.data.moq || 1, unit_price: result.data.unit_price }]
                  : prev.price_breaks
              }))

              if (result.data.supplier_name && !supplierId) {
                setLastImportedSupplierName(result.data.supplier_name)
              }

              setShowAddForm(true)
              setShowImport(false)
              setImportText('')
            }}
          >
            Omplir formulari
          </button>

          <button
            className="btn"
            onClick={() => {
              setShowImport(false)
              setImportText('')
            }}
          >
            Cancel·lar
          </button>
        </div>
      )}

      {/* Target Quantity Selector */}
      {quotes.length > 0 && (
        <div style={{
          ...styles.quantitySelector,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderColor: darkMode ? '#374151' : '#d1d5db'
        }}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>
            Target Quantity:
          </label>
          <input
            type="number"
            min="1"
            value={targetQuantity}
            onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1)}
            style={{
              ...styles.quantityInput,
              backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151',
            marginLeft: '16px'
          }}>
            Project Shipping (€/unit):
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={projectShipping}
            onChange={(e) => setProjectShipping(parseFloat(e.target.value) || 0)}
            style={{
              ...styles.quantityInput,
              backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
        </div>
      )}

      {/* Afegir cotització Form */}
      {showAddForm && (
        <div style={{
          ...styles.form,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderColor: darkMode ? '#374151' : '#d1d5db'
        }}>
          <div style={styles.formHeader}>
            <h4 style={{
              ...styles.formTitle,
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              Add New Quote
            </h4>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewQuote({
                  supplier_id: '',
                  currency: 'USD',
                  incoterm: '',
                  payment_terms: '',
                  lead_time_days: '',
                  moq: '',
                  notes: '',
                  shipping_estimate: null,
                  price_breaks: [{ min_qty: 1, unit_price: '' }]
                })
              }}
              style={styles.closeButton}
            >
              <X size={18} />
            </button>
          </div>

          {/* File Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.style.backgroundColor = darkMode ? '#2a2a3a' : '#e5e7eb'
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.style.backgroundColor = 'transparent'
              handleFileUpload(e.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...styles.uploadArea,
              backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          >
            <Upload size={24} color={darkMode ? '#9ca3af' : '#6b7280'} />
            <p style={{ color: darkMode ? '#9ca3af' : '#6b7280', margin: '8px 0 0 0' }}>
              {newQuote.file_name || 'Drag & drop PDF/Excel or click to select'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>

          {/* Form Fields */}
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Supplier *</label>
              <select
                data-supplier-select="true"
                value={newQuote.supplier_id}
                onChange={(e) => setNewQuote({ ...newQuote, supplier_id: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              >
                <option value="">Select supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Currency</label>
              <select
                value={newQuote.currency}
                onChange={(e) => setNewQuote({ ...newQuote, currency: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Incoterm</label>
              <select
                value={newQuote.incoterm}
                onChange={(e) => setNewQuote({ ...newQuote, incoterm: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              >
                <option value="">Select incoterm</option>
                {INCOTERMS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Terms</label>
              <input
                type="text"
                value={newQuote.payment_terms}
                onChange={(e) => setNewQuote({ ...newQuote, payment_terms: e.target.value })}
                placeholder="e.g., 30% deposit, 70% before shipment"
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Lead Time (days)</label>
              <input
                type="number"
                min="1"
                value={newQuote.lead_time_days}
                onChange={(e) => setNewQuote({ ...newQuote, lead_time_days: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>MOQ</label>
              <input
                type="number"
                min="1"
                value={newQuote.moq}
                onChange={(e) => setNewQuote({ ...newQuote, moq: e.target.value })}
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Shipping Override (€/unit, optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newQuote.shipping_estimate || ''}
                onChange={(e) => setNewQuote({ ...newQuote, shipping_estimate: e.target.value || null })}
                placeholder="Leave empty to use project default"
                style={{
                  ...styles.input,
                  backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#111827',
                  borderColor: darkMode ? '#374151' : '#d1d5db'
                }}
              />
            </div>
          </div>

          {/* Price Breaks */}
          <div style={styles.priceBreaksSection}>
            <div style={styles.priceBreaksHeader}>
              <label style={styles.label}>Price Breaks *</label>
              <button
                onClick={handleAddPriceBreak}
                style={styles.addBreakButton}
              >
                <Plus size={14} />
                Add Break
              </button>
            </div>
            <div style={styles.priceBreaksTable}>
              <div style={styles.priceBreaksHeaderRow}>
                <span style={styles.tableHeader}>Min Qty</span>
                <span style={styles.tableHeader}>Unit Price ({newQuote.currency})</span>
                <span style={styles.tableHeader}></span>
              </div>
              {newQuote.price_breaks.map((pb, index) => (
                <div key={index} style={styles.priceBreaksRow}>
                  <input
                    type="number"
                    min="1"
                    value={pb.min_qty}
                    onChange={(e) => handlePriceBreakChange(index, 'min_qty', e.target.value)}
                    placeholder="Min qty"
                    style={{
                      ...styles.priceBreakInput,
                      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#111827',
                      borderColor: darkMode ? '#374151' : '#d1d5db'
                    }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={pb.unit_price}
                    onChange={(e) => handlePriceBreakChange(index, 'unit_price', e.target.value)}
                    placeholder="Unit price"
                    style={{
                      ...styles.priceBreakInput,
                      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#111827',
                      borderColor: darkMode ? '#374151' : '#d1d5db'
                    }}
                  />
                  {newQuote.price_breaks.length > 1 && (
                    <button
                      onClick={() => handleRemovePriceBreak(index)}
                      style={styles.removeBreakButton}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={newQuote.notes}
              onChange={(e) => setNewQuote({ ...newQuote, notes: e.target.value })}
              rows={3}
              style={{
                ...styles.textarea,
                backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>

          <div style={styles.formActions}>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewQuote({
                  supplier_id: '',
                  currency: 'USD',
                  incoterm: '',
                  payment_terms: '',
                  lead_time_days: '',
                  moq: '',
                  notes: '',
                  shipping_estimate: null,
                  price_breaks: [{ min_qty: 1, unit_price: '' }]
                })
              }}
              style={styles.cancelButton}
            >
              Cancel·lar
            </button>
            <button
              onClick={handleSaveQuote}
              style={styles.saveButton}
            >
              <Save size={16} />
              Save Quote
            </button>
          </div>
        </div>
      )}

      {/* Quotes Comparison */}
      {(quotesForTable.length > 0 || manualDraft) && (() => {
        let bestPriceQuoteId = null
        let bestPrice = Infinity
        for (const q of quotesForTable) {
          const breaks = q.supplier_quote_price_breaks
          if (!breaks?.length) continue
          const first = [...breaks].sort((a, b) => (a.min_qty ?? 0) - (b.min_qty ?? 0))[0]
          const price = parseFloat(first.unit_price)
          if (Number.isFinite(price) && price < bestPrice) {
            bestPrice = price
            bestPriceQuoteId = q.id
          }
        }
        let bestLeadTimeQuoteId = null
        let bestLead = Infinity
        for (const q of quotesForTable) {
          const days = q.lead_time_days != null ? Number(q.lead_time_days) : null
          if (days == null) continue
          if (days < bestLead) {
            bestLead = days
            bestLeadTimeQuoteId = q.id
          }
        }
        let bestMoqQuoteId = null
        let bestMoq = Infinity
        for (const q of quotesForTable) {
          const moq = q.moq != null && q.moq !== '' ? Number(q.moq) : null
          if (moq == null || !Number.isFinite(moq)) continue
          if (moq < bestMoq) {
            bestMoq = moq
            bestMoqQuoteId = q.id
          }
        }

        return (
        <div style={styles.comparisonSection}>
          <h4 style={{
            ...styles.comparisonTitle,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Comparison (Qty: {targetQuantity})
          </h4>
          <table className="quotes-table">
            <thead>
              <tr>
                <th>Proveïdor</th>
                <th>Incoterm</th>
                <th>MOQ</th>
                <th>Preu unitat</th>
                <th>Lead time</th>
                <th>Pagament</th>
                <th>Accions</th>
              </tr>
            </thead>
            <tbody>
              {manualDraft && (
                <tr className="quotes-row--draft">
                  <td>
                    <input
                      value={manualDraft.supplier_name}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, supplier_name: e.target.value }))}
                      placeholder="Proveïdor"
                    />
                  </td>
                  <td>
                    <input
                      value={manualDraft.incoterm}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, incoterm: e.target.value }))}
                      placeholder="Incoterm"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={manualDraft.moq}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, moq: e.target.value }))}
                      placeholder="MOQ"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={manualDraft.unit_price}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="Preu unitat"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={manualDraft.lead_time_days}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, lead_time_days: e.target.value }))}
                      placeholder="Lead time"
                    />
                  </td>
                  <td>
                    <input
                      value={manualDraft.payment_terms}
                      onChange={(e) => setManualDraft(prev => ({ ...prev, payment_terms: e.target.value }))}
                      placeholder="Pagament"
                    />
                  </td>
                  <td>
                    <div className="quote-actions">
                      <button type="button" className="btn btn--turq btn--sm" onClick={handleSaveManualDraft}>
                        Desar
                      </button>
                      <button type="button" className="btn btn--soft btn--sm" onClick={() => setManualDraft(null)}>
                        Cancel·lar
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {quotesForTable.map((quote, rowIndex) => {
                const isDemoRow = quote.id?.startsWith('demo-')
                const firstPriceBreak = quote.supplier_quote_price_breaks?.length > 0
                  ? [...quote.supplier_quote_price_breaks].sort((a, b) => a.min_qty - b.min_qty)[0]
                  : null
                const unitPrice = firstPriceBreak ? parseFloat(firstPriceBreak.unit_price) : null

                return (
                  <tr key={quote.id} className={quote.is_selected ? 'quote-selected-row' : ''}>
                    <td>{quote.suppliers?.name || '-'}</td>
                    <td>{quote.incoterm || '-'}</td>
                    <td>
                      {quote.moq ?? '-'}
                      {quote.id === bestMoqQuoteId && (
                        <span className="quote-metric-badge quote-metric-badge--best">Millor</span>
                      )}
                    </td>
                    <td>
                      {unitPrice ? formatCurrency(unitPrice, quote.currency) : '-'}
                      {quote.id === bestPriceQuoteId && (
                        <span className="quote-metric-badge quote-metric-badge--best">Millor</span>
                      )}
                    </td>
                    <td>
                      {quote.lead_time_days ?? '-'}
                      {quote.id === bestLeadTimeQuoteId && (
                        <span className="quote-metric-badge quote-metric-badge--best">Millor</span>
                      )}
                    </td>
                    <td>{quote.payment_terms || '-'}</td>
                    <td>
                      <div className="quote-actions">
                        <label className={`quote-action-toggle ${quote.go_samples ? 'quote-action-toggle--on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={!!quote.go_samples}
                            disabled={isDemoRow}
                            onChange={() => handleSamplesToggle(quote)}
                          />
                          <span>MOSTRES</span>
                        </label>

                        <button type="button" className="btn btn--soft quote-create-supplier-inline" onClick={() => openCreateSupplierFromQuote(quote)} disabled={isDemoRow}>
                          Crear proveïdor
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )
      })()}

      {quotesForTable.length === 0 && !manualDraft && (
        <div style={styles.empty}>
          <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
            Encara no hi ha cotitzacions. Afegeix la primera per comparar.
          </p>
        </div>
      )}

      <div className="quotes-footer">
        <button
          type="button"
          className="btn btn--turq"
          onClick={handleSendToSamples}
          disabled={samplesCount === 0}
        >
          Enviar a mostres ({samplesCount})
        </button>
      </div>

      {showCreateSupplier && prefillSupplier && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateSupplier(false)}>
          <div style={{ ...styles.modal, backgroundColor: darkMode ? '#111827' : '#ffffff' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Crear proveïdor</h3>
              <button type="button" onClick={() => setShowCreateSupplier(false)} style={styles.closeButton} aria-label="Tancar">
                <X size={20} />
              </button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom *</label>
              <input
                type="text"
                value={prefillSupplier.name || ''}
                onChange={e => setPrefillSupplier(prev => ({ ...prev, name: e.target.value }))}
                style={styles.input}
                placeholder="Nom del proveïdor"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes</label>
              <textarea
                value={prefillSupplier.notes || ''}
                onChange={e => setPrefillSupplier(prev => ({ ...prev, notes: e.target.value }))}
                style={{ ...styles.input, minHeight: 60 }}
                placeholder="Moneda, incoterm, pagament..."
                rows={3}
              />
            </div>
            <div style={styles.modalFooter}>
              <button type="button" onClick={() => setShowCreateSupplier(false)} className="btn btn--soft">
                Cancel·lar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={createSupplierSaving || !(prefillSupplier.name || '').trim()}
                onClick={async () => {
                  setCreateSupplierSaving(true)
                  try {
                    const supplier = await createSupplier({
                      name: (prefillSupplier.name || '').trim(),
                      type: 'other',
                      notes: (prefillSupplier.notes || '').trim() || undefined
                    })
                    await loadData()
                    setShowCreateSupplier(false)
                    setPrefillSupplier(null)
                    if (supplier?.id) setNewQuote(prev => ({ ...prev, supplier_id: supplier.id }))
                  } catch (err) {
                    alert(err.message || 'Error creant proveïdor')
                  } finally {
                    setCreateSupplierSaving(false)
                  }
                }}
              >
                {createSupplierSaving ? 'Guardant...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '40px',
    textAlign: 'center'
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
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid var(--border-1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-1)'
  },
  quantitySelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '20px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#6b7280'
  },
  quantityInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    width: '120px'
  },
  form: {
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '24px'
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  formTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    borderRadius: '8px',
    border: '2px dashed',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'background-color 0.2s'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  priceBreaksSection: {
    marginBottom: '20px'
  },
  priceBreaksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  addBreakButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  priceBreaksTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  priceBreaksHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 40px',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-color)'
  },
  tableHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280'
  },
  priceBreaksRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 40px',
    gap: '12px',
    alignItems: 'center'
  },
  priceBreakInput: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '13px',
    outline: 'none'
  },
  removeBreakButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#ef4444'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  comparisonSection: {
    marginTop: '24px'
  },
  comparisonTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  quotesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  quoteCard: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid',
    position: 'relative'
  },
  bestBadge: {
    position: 'absolute',
    top: '-10px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600'
  },
  quoteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  quoteSupplier: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  quoteMeta: {
    margin: '4px 0 0 0',
    fontSize: '12px'
  },
  deleteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#ef4444'
  },
  quoteDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  quoteDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500'
  },
  profitabilityBox: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid',
    marginTop: '12px'
  },
  profitabilityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  profitabilityLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  profitabilityValue: {
    fontSize: '14px',
    fontWeight: '600'
  },
  decisionBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '8px'
  }
}

