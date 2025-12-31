import { useState, useEffect, useRef } from 'react'
import { 
  Save, 
  Building2, 
  CreditCard,
  Check,
  Phone,
  MapPin,
  PenTool,
  Plus,
  Trash2,
  Upload,
  Star,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Barcode
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getCompanySettings, updateCompanySettings, supabase, getAuditLogs } from '../lib/supabase'
import Header from '../components/Header'
import GTINPoolSection from '../components/GTINPoolSection'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

export default function Settings() {
  const { darkMode } = useApp()
  
  const [activeTab, setActiveTab] = useState('company')
  const [auditLogs, setAuditLogs] = useState([])
  const [statusFilter, setStatusFilter] = useState(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  
  const [companyData, setCompanyData] = useState({
    company_name: 'Freedolia',
    legal_name: '',
    tax_id: '',
    address: '',
    city: '',
    postal_code: '',
    province: '',
    country: 'España',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    bank_iban: '',
    bank_swift: ''
  })
  
  const [signatures, setSignatures] = useState([])
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [editingSignature, setEditingSignature] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [activeTab, statusFilter])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [companyRes, signaturesRes] = await Promise.all([
        getCompanySettings(),
        supabase.from('signatures').select('*').order('created_at', { ascending: true })
      ])
      
      if (companyRes) setCompanyData(companyRes)
      setSignatures(signaturesRes.data || [])
    } catch (err) {
      console.error('Error carregant configuració:', err)
    }
    setLoading(false)
  }

  const loadAuditLogs = async () => {
    setLoadingLogs(true)
    try {
      const logs = await getAuditLogs(50, statusFilter)
      setAuditLogs(logs || [])
    } catch (err) {
      console.error('Error carregant audit logs:', err)
      setAuditLogs([])
    }
    setLoadingLogs(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCompanySettings(companyData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error guardant:', err)
      alert('Error guardant les dades')
    }
    setSaving(false)
  }

  const handleNewSignature = () => {
    setEditingSignature({
      name: '',
      role: '',
      signature_image: '',
      type: 'buyer',
      is_default: signatures.length === 0
    })
    setShowSignatureModal(true)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imatge')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setEditingSignature({...editingSignature, signature_image: event.target.result})
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSignature = async () => {
    if (!editingSignature.name || !editingSignature.signature_image) {
      alert('Nom i imatge de signatura són obligatoris')
      return
    }

    setSaving(true)
    try {
      if (editingSignature.is_default) {
        await supabase.from('signatures').update({ is_default: false }).neq('id', editingSignature.id || '')
      }

      // Eliminar user_id si ve del client (seguretat: sempre s'assigna automàticament)
      const { user_id, ...dataToSave } = editingSignature

      if (editingSignature.id) {
        const { error } = await supabase.from('signatures').update(dataToSave).eq('id', editingSignature.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('signatures').insert(dataToSave)
        if (error) throw error
      }

      await loadSettings()
      setShowSignatureModal(false)
      setEditingSignature(null)
    } catch (err) {
      console.error('Error guardant signatura:', err)
      alert('Error guardant la signatura')
    }
    setSaving(false)
  }

  const handleDeleteSignature = async (sig) => {
    if (!confirm(`Segur que vols eliminar la signatura de "${sig.name}"?`)) return
    try {
      await supabase.from('signatures').delete().eq('id', sig.id)
      await loadSettings()
    } catch (err) {
      console.error('Error eliminant:', err)
    }
  }

  const handleSetDefault = async (sig) => {
    try {
      await supabase.from('signatures').update({ is_default: false }).neq('id', sig.id)
      await supabase.from('signatures').update({ is_default: true }).eq('id', sig.id)
      await loadSettings()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Configuració" />
        <div style={styles.loading}>Carregant...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header title="Configuració" />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('company')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'company' ? '#4f46e5' : 'transparent',
              color: activeTab === 'company' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <Building2 size={18} /> Dades Empresa
          </button>
          <button
            onClick={() => setActiveTab('signatures')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'signatures' ? '#4f46e5' : 'transparent',
              color: activeTab === 'signatures' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <PenTool size={18} /> Signatures
          </button>
          <button
            onClick={() => setActiveTab('gtin')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'gtin' ? '#4f46e5' : 'transparent',
              color: activeTab === 'gtin' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <Barcode size={18} /> GTIN Pool
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'audit' ? '#4f46e5' : 'transparent',
              color: activeTab === 'audit' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <FileText size={18} /> Audit Log
          </button>
        </div>

        {/* Company Tab */}
        {activeTab === 'company' && (
          <div style={{...styles.section, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <div style={styles.sectionHeader}>
              <h2 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                <Building2 size={20} /> Dades de l'Empresa
              </h2>
              <button onClick={handleSave} disabled={saving} style={{...styles.saveButton, backgroundColor: saved ? '#22c55e' : '#4f46e5'}}>
                {saved ? <><Check size={16} /> Guardat!</> : saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </button>
            </div>

            <p style={styles.sectionDescription}>Aquestes dades s'utilitzaran per generar els documents (PO, Briefings...)</p>

            {/* Dades generals */}
            <div style={styles.subsection}>
              <h3 style={{...styles.subsectionTitle, color: darkMode ? '#9ca3af' : '#6b7280'}}>Informació General</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom comercial</label>
                  <input type="text" value={companyData.company_name} onChange={e => setCompanyData({...companyData, company_name: e.target.value})} placeholder="Ex: Freedolia" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom legal</label>
                  <input type="text" value={companyData.legal_name} onChange={e => setCompanyData({...companyData, legal_name: e.target.value})} placeholder="Ex: David Castellà Gil" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>NIF / CIF</label>
                  <input type="text" value={companyData.tax_id} onChange={e => setCompanyData({...companyData, tax_id: e.target.value})} placeholder="Ex: 52626358N" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
              </div>
            </div>

            {/* Adreça */}
            <div style={styles.subsection}>
              <h3 style={{...styles.subsectionTitle, color: darkMode ? '#9ca3af' : '#6b7280'}}><MapPin size={16} /> Adreça Fiscal</h3>
              <div style={styles.formGrid}>
                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Adreça</label>
                  <input type="text" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} placeholder="Ex: c/ Josep Camprecios, 1, 1-2" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Codi postal</label>
                  <input type="text" value={companyData.postal_code} onChange={e => setCompanyData({...companyData, postal_code: e.target.value})} placeholder="Ex: 08950" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ciutat</label>
                  <input type="text" value={companyData.city} onChange={e => setCompanyData({...companyData, city: e.target.value})} placeholder="Ex: Esplugues de Llobregat" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Província</label>
                  <input type="text" value={companyData.province} onChange={e => setCompanyData({...companyData, province: e.target.value})} placeholder="Ex: Barcelona" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>País</label>
                  <input type="text" value={companyData.country} onChange={e => setCompanyData({...companyData, country: e.target.value})} placeholder="Ex: España" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
              </div>
            </div>

            {/* Contacte */}
            <div style={styles.subsection}>
              <h3 style={{...styles.subsectionTitle, color: darkMode ? '#9ca3af' : '#6b7280'}}><Phone size={16} /> Contacte</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telèfon</label>
                  <input type="tel" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} placeholder="Ex: +34 630 576 066" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input type="email" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} placeholder="Ex: david@freedolia.com" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Pàgina web</label>
                  <input type="url" value={companyData.website} onChange={e => setCompanyData({...companyData, website: e.target.value})} placeholder="Ex: https://freedolia.com" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
              </div>
            </div>

            {/* Bancàries */}
            <div style={styles.subsection}>
              <h3 style={{...styles.subsectionTitle, color: darkMode ? '#9ca3af' : '#6b7280'}}><CreditCard size={16} /> Dades Bancàries</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Banc</label>
                  <input type="text" value={companyData.bank_name} onChange={e => setCompanyData({...companyData, bank_name: e.target.value})} placeholder="Ex: La Caixa" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>IBAN</label>
                  <input type="text" value={companyData.bank_iban} onChange={e => setCompanyData({...companyData, bank_iban: e.target.value})} placeholder="Ex: ES12 3456 7890 1234 5678 9012" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SWIFT/BIC</label>
                  <input type="text" value={companyData.bank_swift} onChange={e => setCompanyData({...companyData, bank_swift: e.target.value})} placeholder="Ex: CAIXESBBXXX" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signatures Tab */}
        {activeTab === 'signatures' && (
          <div style={{...styles.section, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                  <PenTool size={20} /> Signatures Digitals
                </h2>
                <p style={styles.sectionDescription}>Gestiona les signatures per als PDFs</p>
              </div>
              <button onClick={handleNewSignature} style={styles.addButton}>
                <Plus size={18} /> Nova Signatura
              </button>
            </div>

            <div style={styles.signaturesGrid}>
              {signatures.length === 0 ? (
                <div style={styles.emptySignatures}>
                  <PenTool size={48} color="#d1d5db" />
                  <p>No hi ha signatures configurades</p>
                  <button onClick={handleNewSignature} style={styles.addButton}>
                    <Plus size={18} /> Afegir Signatura
                  </button>
                </div>
              ) : (
                signatures.map(sig => (
                  <div key={sig.id} style={{
                    ...styles.signatureCard,
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                    borderColor: sig.is_default ? '#4f46e5' : 'var(--border-color)'
                  }}>
                    {sig.is_default && (
                      <span style={styles.defaultBadge}><Star size={12} /> Per defecte</span>
                    )}
                    
                    <div style={styles.signaturePreview}>
                      {sig.signature_image ? (
                        <img src={sig.signature_image} alt={sig.name} style={styles.signatureImage} />
                      ) : (
                        <div style={styles.noSignature}>Sense imatge</div>
                      )}
                    </div>
                    
                    <div style={styles.signatureInfo}>
                      <h4 style={{...styles.signatureName, color: darkMode ? '#ffffff' : '#111827'}}>{sig.name}</h4>
                      {sig.role && <p style={styles.signatureRole}>{sig.role}</p>}
                      <p style={styles.signatureType}>{sig.type === 'buyer' ? '👤 Comprador' : '🏭 Proveïdor'}</p>
                    </div>
                    
                    <div style={styles.signatureActions}>
                      {!sig.is_default && (
                        <button onClick={() => handleSetDefault(sig)} style={styles.signatureActionBtn} title="Fer per defecte">
                          <Star size={16} />
                        </button>
                      )}
                      <button onClick={() => { setEditingSignature(sig); setShowSignatureModal(true) }} style={styles.signatureActionBtn} title="Editar">
                        <PenTool size={16} />
                      </button>
                      <button onClick={() => handleDeleteSignature(sig)} style={{...styles.signatureActionBtn, color: '#ef4444'}} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GTIN Pool Tab */}
        {activeTab === 'gtin' && (
          <GTINPoolSection darkMode={darkMode} />
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div style={{...styles.section, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <div style={styles.sectionHeader}>
              <h2 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                <FileText size={20} /> Audit Log
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setStatusFilter(null)}
                  style={{
                    ...styles.filterButton,
                    backgroundColor: statusFilter === null ? '#4f46e5' : 'transparent',
                    color: statusFilter === null ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  Tots
                </button>
                <button
                  onClick={() => setStatusFilter('success')}
                  style={{
                    ...styles.filterButton,
                    backgroundColor: statusFilter === 'success' ? '#22c55e' : 'transparent',
                    color: statusFilter === 'success' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  <CheckCircle2 size={14} /> Èxits
                </button>
                <button
                  onClick={() => setStatusFilter('error')}
                  style={{
                    ...styles.filterButton,
                    backgroundColor: statusFilter === 'error' ? '#ef4444' : 'transparent',
                    color: statusFilter === 'error' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  <AlertCircle size={14} /> Errors
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div style={styles.loading}>Carregant logs...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                No hi ha logs d'auditoria
              </div>
            ) : (
              <div style={styles.auditLogList}>
                {auditLogs.map(log => (
                  <div key={log.id} style={{
                    ...styles.auditLogItem,
                    borderLeftColor: log.status === 'success' ? '#22c55e' : '#ef4444',
                    backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                  }}>
                    <div style={styles.auditLogHeader}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: log.status === 'success' ? '#22c55e15' : '#ef444415',
                            color: log.status === 'success' ? '#22c55e' : '#ef4444'
                          }}>
                            {log.status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {log.status === 'success' ? 'Èxit' : 'Error'}
                          </span>
                          <span style={{ color: darkMode ? '#ffffff' : '#111827', fontWeight: '600' }}>
                            {log.entity_type} • {log.action}
                          </span>
                        </div>
                        {log.message && (
                          <p style={{ margin: '4px 0', color: darkMode ? '#9ca3af' : '#6b7280', fontSize: '14px' }}>
                            {log.message}
                          </p>
                        )}
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <details style={{ marginTop: '8px' }}>
                            <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '12px' }}>
                              Detalls
                            </summary>
                            <pre style={{
                              marginTop: '8px',
                              padding: '8px',
                              backgroundColor: darkMode ? '#15151f' : '#ffffff',
                              borderRadius: '6px',
                              fontSize: '11px',
                              overflow: 'auto'
                            }}>
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <span style={{ color: '#9ca3af', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('ca-ES')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Signatura */}
      {showSignatureModal && editingSignature && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowSignatureModal(false)}>
          <div style={{...styles.modal, ...modalStyles.modal}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingSignature.id ? 'Editar Signatura' : 'Nova Signatura'}
              </h3>
              <button onClick={() => setShowSignatureModal(false)} style={styles.closeButton}><X size={20} /></button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nom *</label>
                  <input type="text" value={editingSignature.name} onChange={e => setEditingSignature({...editingSignature, name: e.target.value})} placeholder="Ex: David Castellà Gil" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Càrrec</label>
                  <input type="text" value={editingSignature.role} onChange={e => setEditingSignature({...editingSignature, role: e.target.value})} placeholder="Ex: Owner" style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipus</label>
                  <select value={editingSignature.type} onChange={e => setEditingSignature({...editingSignature, type: e.target.value})} style={{...styles.input, backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb', color: darkMode ? '#ffffff' : '#111827'}}>
                    <option value="buyer">👤 Comprador (Freedolia)</option>
                    <option value="supplier">🏭 Proveïdor</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.checkboxLabel}>
                    <input type="checkbox" checked={editingSignature.is_default} onChange={e => setEditingSignature({...editingSignature, is_default: e.target.checked})} />
                    Signatura per defecte
                  </label>
                </div>
              </div>

              <div style={styles.uploadSection}>
                <label style={styles.label}>Imatge de la signatura *</label>
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    ...styles.uploadZone, 
                    borderColor: dragOver ? '#4f46e5' : (editingSignature.signature_image ? '#22c55e' : (darkMode ? '#374151' : '#d1d5db')),
                    backgroundColor: dragOver ? (darkMode ? '#1f1f2e' : '#eef2ff') : 'transparent'
                  }}
                >
                  {editingSignature.signature_image ? (
                    <img src={editingSignature.signature_image} alt="Signatura" style={styles.uploadedImage} />
                  ) : (
                    <>
                      <Upload size={32} color={dragOver ? '#4f46e5' : '#9ca3af'} />
                      <p style={{margin: '8px 0 0', color: darkMode ? '#9ca3af' : '#6b7280'}}>
                        {dragOver ? 'Deixa anar per pujar' : 'Arrossega la imatge aquí o clica per seleccionar'}
                      </p>
                      <span style={{fontSize: '12px', color: '#9ca3af'}}>PNG amb fons transparent recomanat</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{display: 'none'}} />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowSignatureModal(false)} style={styles.cancelButton}>Cancel·lar</button>
              <button onClick={handleSaveSignature} disabled={saving} style={styles.saveButton}>
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
  loading: { padding: '64px', textAlign: 'center', color: '#6b7280' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '24px' },
  tab: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  section: { padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  sectionTitle: { margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' },
  sectionDescription: { margin: '4px 0 24px 0', fontSize: '14px', color: '#6b7280' },
  subsection: { marginBottom: '24px' },
  subsectionTitle: { margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  formGrid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: '#6b7280' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', outline: 'none' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', cursor: 'pointer', marginTop: '20px' },
  saveButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #3730a3', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  addButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4f46e5', color: '#ffffff', border: '1px solid #3730a3', borderRadius: '10px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  filterButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  auditLogList: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' },
  auditLogItem: { padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeftWidth: '4px' },
  auditLogHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  statusBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  signaturesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  emptySignatures: { gridColumn: '1 / -1', padding: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: '#6b7280' },
  signatureCard: { padding: '16px', borderRadius: '12px', border: '2px solid', position: 'relative' },
  defaultBadge: { position: 'absolute', top: '-10px', right: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#4f46e5', color: '#ffffff', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  signaturePreview: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' },
  signatureImage: { maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' },
  noSignature: { color: '#9ca3af', fontSize: '13px' },
  signatureInfo: { marginBottom: '12px' },
  signatureName: { margin: '0 0 4px', fontSize: '16px', fontWeight: '600' },
  signatureRole: { margin: 0, fontSize: '13px', color: '#6b7280' },
  signatureType: { margin: '8px 0 0', fontSize: '12px', color: '#9ca3af' },
  signatureActions: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  signatureActionBtn: { background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: '#6b7280', borderRadius: '8px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { width: '100%', maxWidth: '500px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '600' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalBody: { padding: '24px', overflowY: 'auto' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', borderTop: '1px solid var(--border-color)' },
  cancelButton: { padding: '10px 20px', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  uploadSection: { marginTop: '20px' },
  uploadZone: { padding: '32px', border: '2px dashed', borderRadius: '12px', textAlign: 'center', cursor: 'pointer' },
  uploadedImage: { maxHeight: '100px', maxWidth: '100%', objectFit: 'contain' }
}
