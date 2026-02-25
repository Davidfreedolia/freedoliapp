import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  Barcode,
  Globe,
  Database,
  RefreshCw,
  BookOpen,
  ExternalLink,
  Settings as SettingsIcon,
  Users
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getCompanySettings, updateCompanySettings, uploadCompanyLogo, deleteCompanyLogo, supabase, getAuditLogs, updateLanguage, getCurrentUserId } from '../lib/supabase'
import { clearDemoData, generateDemoData, checkDemoExists } from '../lib/demoSeed'
import Header from '../components/Header'
import Button from '../components/Button'
import GTINPoolSection from '../components/GTINPoolSection'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'
import { showToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { darkMode, refreshProjects, demoMode, toggleDemoMode } = useApp()
  const { t, i18n } = useTranslation()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('company')
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'ca')
  const [auditLogs, setAuditLogs] = useState([])
  const [statusFilter, setStatusFilter] = useState(null)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [resettingDemo, setResettingDemo] = useState(false)
  
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
  const [companyLogoUrl, setCompanyLogoUrl] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef(null)

  // S7.3: Workspace / billing (org, seats, members)
  const [org, setOrg] = useState(null)
  const [seatsUsed, setSeatsUsed] = useState(0)
  const [members, setMembers] = useState([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [addMemberUserId, setAddMemberUserId] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    loadLanguage()
  }, [])

  const loadWorkspace = async () => {
    setWorkspaceLoading(true)
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        setWorkspaceLoading(false)
        return
      }
      const { data: membershipRow, error: memErr } = await supabase
        .from('org_memberships')
        .select('*, orgs(*)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      if (memErr || !membershipRow) {
        setWorkspaceLoading(false)
        return
      }
      const currentOrg = membershipRow.orgs ?? membershipRow.org ?? null
      if (!currentOrg) {
        setWorkspaceLoading(false)
        return
      }
      setOrg(currentOrg)
      const { count } = await supabase
        .from('org_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrg.id)
      setSeatsUsed(count ?? 0)
      const { data: membersData } = await supabase
        .from('org_memberships')
        .select('user_id, role')
        .eq('org_id', currentOrg.id)
      setMembers(membersData ?? [])
    } catch (err) {
      console.error('Error loading workspace:', err)
    }
    setWorkspaceLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'workspace') {
      loadWorkspace()
    }
  }, [activeTab])

  const loadLanguage = async () => {
    try {
      const settings = await getCompanySettings()
      if (settings?.language && ['ca', 'en', 'es'].includes(settings.language)) {
        setCurrentLanguage(settings.language)
        i18n.changeLanguage(settings.language)
        localStorage.setItem('freedolia_language', settings.language)
      }
    } catch (err) {
      console.warn('Error carregant idioma:', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [activeTab, statusFilter])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const userId = await getCurrentUserId()
      const [companyRes, signaturesRes] = await Promise.all([
        getCompanySettings(),
        supabase.from('signatures').select('*').eq('user_id', userId).order('created_at', { ascending: true })
      ])
      if (companyRes) setCompanyData(companyRes)
      setCompanyLogoUrl(companyRes?.logo_url ?? null)
      setSignatures(signaturesRes.data || [])
    } catch (err) {
      console.error('Error carregant configuració:', err)
    }
    setLoading(false)
  }

  const handleLogoFile = async (e) => {
    if (demoMode) return
    const file = e.target?.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      showToast(t('settings.logoFormatError') || 'Format no vàlid. Usa PNG, JPEG, SVG o WebP.', 'error')
      return
    }
    setLogoUploading(true)
    try {
      const url = await uploadCompanyLogo(file)
      setCompanyLogoUrl(url)
      showToast(t('settings.logoSaved') || 'Logo guardat.', 'success')
    } catch (err) {
      console.error('Error pujant logo:', err)
      showToast(t('settings.logoUploadError') || 'Error en pujar el logo.', 'error')
    }
    setLogoUploading(false)
    e.target.value = ''
  }

  const handleRemoveLogo = async () => {
    if (demoMode) return
    try {
      await deleteCompanyLogo()
      setCompanyLogoUrl(null)
      showToast(t('settings.logoRemoved') || 'Logo eliminat.', 'success')
    } catch (err) {
      console.error('Error eliminant logo:', err)
      showToast(t('settings.logoRemoveError') || 'Error en eliminar el logo.', 'error')
    }
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
      showToast(t('settings.errorSaving'), 'error')
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
      showToast(t('settings.selectImage'), 'error')
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
      showToast(t('settings.nameAndImageRequired'), 'error')
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
      showToast(t('settings.errorSavingSignature'), 'error')
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

  const seatLimit = org?.seat_limit ?? null
  const seatLimitReached = seatLimit != null && seatsUsed >= seatLimit

  const handleAddMember = async () => {
    const uid = addMemberUserId.trim()
    if (!uid || !org) return
    if (seatLimitReached) {
      showToast('Seat limit reached. Upgrade your plan to add more members.', 'error')
      return
    }
    setAddingMember(true)
    try {
      const { error } = await supabase
        .from('org_memberships')
        .insert({ org_id: org.id, user_id: uid, role: 'member' })
      if (error) throw error
      showToast('Member added.', 'success')
      setAddMemberUserId('')
      loadWorkspace()
    } catch (err) {
      console.error('Error adding member:', err)
      showToast(err?.message || 'Error adding member.', 'error')
    }
    setAddingMember(false)
  }

  const handleManageBilling = async () => {
    if (!org?.id || billingLoading) return
    setBillingLoading(true)
    try {
      const { data: portalData, error: portalError } = await supabase.functions.invoke('stripe_create_portal', {
        body: { org_id: org.id }
      })
      if (portalData?.url) {
        window.location.href = portalData.url
        return
      }
      const noCustomer = portalError?.message?.includes('No customer') || portalData?.error === 'No customer yet'
      if (noCustomer || !portalData?.url) {
        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke('stripe_create_checkout', {
          body: { org_id: org.id }
        })
        if (checkoutData?.url) {
          window.location.href = checkoutData.url
          return
        }
        console.error('Checkout failed', checkoutErr)
      } else {
        console.error('Portal failed', portalError)
      }
      showToast('Billing unavailable', 'error')
    } catch (err) {
      console.error('Billing error', err)
      showToast('Billing unavailable', 'error')
    } finally {
      setBillingLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Header
          title={
            <span className="page-title-with-icon">
              <SettingsIcon size={22} />
              Configuració
            </span>
          }
        />
        <div style={styles.loading}>{t('settings.loading')}</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Header
        title={
          <span className="page-title-with-icon">
            <SettingsIcon size={22} />
            Configuració
          </span>
        }
      />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <Button
            variant={activeTab === 'company' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('company')}
            style={{
              ...styles.tab,
              color: activeTab === 'company' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <Building2 size={18} /> Dades Empresa
          </Button>
          <Button
            variant={activeTab === 'signatures' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('signatures')}
            style={{
              ...styles.tab,
              color: activeTab === 'signatures' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <PenTool size={18} /> Signatures
          </Button>
          <Button
            variant={activeTab === 'gtin' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('gtin')}
            style={{
              ...styles.tab,
              color: activeTab === 'gtin' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <Barcode size={18} /> GTIN Pool
          </Button>
          <Button
            variant={activeTab === 'audit' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('audit')}
            style={{
              ...styles.tab,
              color: activeTab === 'audit' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <FileText size={18} /> Audit Log
          </Button>
          <Button
            variant={activeTab === 'workspace' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('workspace')}
            style={{
              ...styles.tab,
              color: activeTab === 'workspace' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280')
            }}
          >
            <Users size={18} /> Workspace
          </Button>
        </div>

        {/* Company Tab */}
        {activeTab === 'company' && (
          <div style={{...styles.section, backgroundColor: darkMode ? '#15151f' : '#ffffff'}}>
            <div style={styles.sectionHeader}>
              <h2 style={{...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                <Building2 size={20} /> Dades de l'Empresa
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saved ? <><Check size={16} /> {t('settings.saved')}</> : saving ? t('settings.saving') : <><Save size={16} /> {t('settings.save')}</>}
              </Button>
            </div>

            {/* Language Selector */}
            <div style={{
              ...styles.subsection,
              marginBottom: '32px',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
            }}>
              <h3 style={{
                ...styles.subsectionTitle,
                color: darkMode ? '#ffffff' : '#111827',
                marginBottom: '16px'
              }}>
                <Globe size={16} />
                Idioma / Language
              </h3>
              <div style={styles.formGroup}>
                <label style={{
                  ...styles.label,
                  color: darkMode ? '#e5e7eb' : '#374151'
                }}>
                  Selecciona l'idioma
                </label>
                <select
                  value={currentLanguage}
                  onChange={async (e) => {
                    const newLang = e.target.value
                    setCurrentLanguage(newLang)
                    i18n.changeLanguage(newLang)
                    await updateLanguage(newLang)
                  }}
                  style={{
                    ...styles.input,
                    backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#111827',
                    borderColor: darkMode ? '#374151' : '#d1d5db',
                    maxWidth: '300px'
                  }}
                >
                  <option value="ca">Català</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            {/* Help Manual */}
            <div style={{
              ...styles.subsection,
              marginBottom: '32px',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
            }}>
              <h3 style={{
                ...styles.subsectionTitle,
                color: darkMode ? '#ffffff' : '#111827',
                marginBottom: '16px'
              }}>
                <BookOpen size={16} />
                Manual d'ús
              </h3>
              <p style={{
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                Consulta el manual complet amb informació detallada sobre totes les funcionalitats de Freedoliapp.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/help')}
              >
                <BookOpen size={16} />
                {t('settings.openManual')}
                <ExternalLink size={14} />
              </Button>
            </div>

            {/* Demo Mode Section */}
            <div style={{
              ...styles.subsection,
              marginBottom: '32px',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
            }}>
              <h3 style={{
                ...styles.subsectionTitle,
                color: darkMode ? '#ffffff' : '#111827',
                marginBottom: '16px'
              }}>
                <Database size={16} />
                Dades Demo
              </h3>
              <p style={{
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                Les dades demo permeten veure l'aplicació funcionant sense crear res manualment.
              </p>
              <div style={styles.formGroup}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: darkMode ? '#e5e7eb' : '#374151'
                }}>
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={async (e) => {
                      const newValue = e.target.checked
                      try {
                        await toggleDemoMode(newValue)
                        showToast(newValue ? t('settings.demoModeEnabled') : t('settings.demoModeDisabled'), 'success')
                      } catch (err) {
                        console.error('Error toggling demo mode:', err)
                        showToast(t('settings.demoModeError'), 'error')
                      }
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Activar mode demo</span>
                </label>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Vols generar dades demo? Això crearà 10 projectes, POs, quotes, GTINs, finances, tasks i notes.')) return
                    setResettingDemo(true)
                    try {
                      // Activar demo_mode
                      await updateCompanySettings({ demo_mode: true })
                      setDemoMode(true)
                      
                      // Check if demo data already exists
                      const hasDemo = await checkDemoExists()
                      if (hasDemo) {
                        if (!confirm('Ja existeixen dades demo. Vols eliminar-les i crear noves?')) {
                          setResettingDemo(false)
                          return
                        }
                        const clearResult = await clearDemoData()
                        if (!clearResult.success) {
                          showToast(t('settings.errorClearingDemo') + ': ' + clearResult.message, 'error')
                          setResettingDemo(false)
                          return
                        }
                      }
                      
                      // Generate new demo data
                      const genResult = await generateDemoData()
                      if (genResult.success) {
                        showToast(t('settings.demoDataGenerated'), 'success', 5000)
                        await refreshProjects()
                        // Redirect to dashboard after 2 seconds
                        setTimeout(() => {
                          navigate('/app')
                        }, 2000)
                      } else {
                        showToast(t('settings.errorGeneratingDemo') + ': ' + genResult.message, 'error')
                      }
                    } catch (err) {
                      console.error('Error generating demo:', err)
                      showToast(t('settings.errorGeneratingDemo'), 'error')
                    } finally {
                      setResettingDemo(false)
                    }
                  }}
                  disabled={resettingDemo}
                >
                  <Database size={16} style={{ animation: resettingDemo ? 'spin 1s linear infinite' : 'none' }} />
                  {resettingDemo ? 'Generant...' : 'Generar Dades Demo'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Vols regenerar les dades demo? Això eliminarà les dades demo existents i crearà noves.')) return
                    setResettingDemo(true)
                    try {
                      // Clear existing demo data
                      const clearResult = await clearDemoData()
                      if (!clearResult.success) {
                        showToast('Error netejant dades demo: ' + clearResult.message, 'error')
                        return
                      }
                      // Generate new demo data
                      const genResult = await generateDemoData()
                      if (genResult.success) {
                        showToast(t('settings.demoDataRegenerated'), 'success')
                        await refreshProjects()
                      } else {
                        showToast(t('settings.errorGeneratingDemo') + ': ' + genResult.message, 'error')
                      }
                    } catch (err) {
                      console.error('Error resetting demo:', err)
                      showToast(t('settings.errorRegeneratingDemo'), 'error')
                    } finally {
                      setResettingDemo(false)
                    }
                  }}
                  disabled={resettingDemo}
                >
                  <RefreshCw size={16} style={{ animation: resettingDemo ? 'spin 1s linear infinite' : 'none' }} />
                  {resettingDemo ? 'Regenerant...' : 'Regenerar Dades Demo'}
                </Button>
              </div>
            </div>

            <p style={styles.sectionDescription}>Aquestes dades s'utilitzaran per generar els documents (PO, Briefings...)</p>

            {/* Logo empresa (company_settings.logo_url); desactivat en demo_mode */}
            <div className={`settings-logo-section ${demoMode ? 'settings-logo-section--disabled' : ''}`}>
              <h3 className="settings-logo-title">{t('settings.logo') || 'Logo empresa'}</h3>
              <div className="settings-logo-body">
                {companyLogoUrl ? (
                  <>
                    <div className="settings-logo-preview-wrap">
                      <img src={companyLogoUrl} alt="Logo empresa" className="settings-logo-preview" />
                    </div>
                    <div className="settings-logo-actions">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoFile}
                        className="settings-logo-file-input"
                        disabled={demoMode}
                      />
                      <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading || demoMode}>
                        {logoUploading ? (t('settings.saving') || 'Guardant...') : (t('settings.changeLogo') || 'Canviar logo')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={logoUploading || demoMode}>
                        <Trash2 size={16} /> {t('settings.removeLogo') || 'Eliminar'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className="settings-logo-upload-zone"
                    onClick={() => !logoUploading && !demoMode && logoInputRef.current?.click()}
                    role="button"
                    tabIndex={demoMode ? -1 : 0}
                    onKeyDown={(e) => e.key === 'Enter' && !logoUploading && !demoMode && logoInputRef.current?.click()}
                  >
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoFile}
                      className="settings-logo-file-input"
                      disabled={demoMode}
                    />
                    {logoUploading ? (
                      <span className="settings-logo-upload-text">{t('settings.saving') || 'Guardant...'}</span>
                    ) : (
                      <>
                        <Upload size={28} className="settings-logo-upload-icon" />
                        <span className="settings-logo-upload-text">{t('settings.uploadLogo') || 'Puja el logo de l\'empresa'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

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
              <Button variant="primary" size="sm" onClick={handleNewSignature} style={styles.addButton}>
                <Plus size={18} /> Nova Signatura
              </Button>
            </div>

            <div style={styles.signaturesGrid}>
              {signatures.length === 0 ? (
                <div style={styles.emptySignatures}>
                  <PenTool size={48} color="#d1d5db" />
                  <p>No hi ha signatures configurades</p>
                  <Button variant="primary" size="sm" onClick={handleNewSignature} style={styles.addButton}>
                    <Plus size={18} /> Afegir Signatura
                  </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(sig)}
                          style={styles.signatureActionBtn}
                          title="Fer per defecte"
                        >
                          <Star size={16} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingSignature(sig); setShowSignatureModal(true) }}
                        style={styles.signatureActionBtn}
                        title="Editar"
                      >
                        <PenTool size={16} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteSignature(sig)}
                        style={styles.signatureActionBtn}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </Button>
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
                <Button
                  variant={statusFilter === null ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(null)}
                  style={{
                    ...styles.filterButton,
                    color: statusFilter === null ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  Tots
                </Button>
                <Button
                  variant={statusFilter === 'success' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('success')}
                  style={{
                    ...styles.filterButton,
                    color: statusFilter === 'success' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  <CheckCircle2 size={14} /> Èxits
                </Button>
                <Button
                  variant={statusFilter === 'error' ? 'danger' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('error')}
                  style={{
                    ...styles.filterButton,
                    color: statusFilter === 'error' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                    borderColor: darkMode ? '#374151' : '#d1d5db'
                  }}
                >
                  <AlertCircle size={14} /> Errors
                </Button>
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

        {/* Workspace Tab — S7.3: Plan, Status, Seats, Members */}
        {activeTab === 'workspace' && (
          <div style={{ ...styles.section, backgroundColor: darkMode ? '#15151f' : '#ffffff' }}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, color: darkMode ? '#ffffff' : '#111827' }}>
                <Users size={20} /> Workspace
              </h2>
            </div>

            {workspaceLoading ? (
              <div style={styles.loading}>Carregant...</div>
            ) : !org ? (
              <p style={{ color: 'var(--text-secondary, #6b7280)', margin: 0 }}>No workspace found.</p>
            ) : (
              <>
                {/* Subscription / Plan info */}
                <div style={{
                  ...styles.subsection,
                  marginBottom: '24px',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                }}>
                  <h3 style={{ ...styles.subsectionTitle, color: darkMode ? '#ffffff' : '#111827', marginBottom: '16px' }}>
                    <CreditCard size={16} /> Subscription
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-1)', marginBottom: '4px' }}>Plan</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>{org.plan_id ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-1)', marginBottom: '4px' }}>Status</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>{org.billing_status ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-1)', marginBottom: '4px' }}>Seats used</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>{seatsUsed}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--muted-1)', marginBottom: '4px' }}>Seat limit</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: darkMode ? '#e5e7eb' : '#111827' }}>{org.seat_limit ?? '—'}</div>
                    </div>
                  </div>
                  {(org.stripe_customer_id || org.stripe_subscription_id) && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-1)', fontSize: '12px', color: 'var(--muted-1)' }}>
                      <div>Customer: {org.stripe_customer_id || '—'}</div>
                      <div>Subscription: {org.stripe_subscription_id || '—'}</div>
                    </div>
                  )}
                  <div style={{ marginTop: '16px' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                    >
                      {billingLoading ? 'Opening…' : 'Manage billing'}
                    </Button>
                  </div>
                </div>

                {/* Members + Add member */}
                <div style={{
                  ...styles.subsection,
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
                }}>
                  <h3 style={{ ...styles.subsectionTitle, color: darkMode ? '#ffffff' : '#111827', marginBottom: '16px' }}>
                    <Users size={16} /> Members
                  </h3>
                  {members.length === 0 ? (
                    <p style={{ color: 'var(--muted-1)', margin: '0 0 16px', fontSize: 14 }}>No members yet.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {members.map((m) => (
                        <li key={m.user_id} style={{ fontSize: 14, color: darkMode ? '#e5e7eb' : '#374151' }}>
                          <code style={{ fontSize: 12, background: darkMode ? '#15151f' : '#fff', padding: '4px 8px', borderRadius: 6 }}>{String(m.user_id).slice(0, 8)}…</code>
                          <span style={{ marginLeft: 8, color: 'var(--muted-1)' }}>({m.role})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {seatLimitReached && (
                    <p style={{ color: 'var(--danger-1)', fontSize: 14, marginBottom: 12 }}>
                      Seat limit reached. Upgrade your plan to add more members.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="User ID (UUID)"
                      value={addMemberUserId}
                      onChange={(e) => setAddMemberUserId(e.target.value)}
                      style={{
                        ...styles.input,
                        maxWidth: 280,
                        backgroundColor: darkMode ? '#15151f' : '#fff',
                        color: darkMode ? '#fff' : '#111827',
                        borderColor: darkMode ? '#374151' : '#d1d5db'
                      }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddMember}
                      disabled={seatLimitReached || addingMember || !addMemberUserId.trim()}
                    >
                      {addingMember ? 'Adding…' : 'Add member'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Signatura */}
      {showSignatureModal && editingSignature && (() => {
        const modalStyles = getModalStyles(isMobile, darkMode)
        return (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowSignatureModal(false)}>
          <div style={{...styles.modal, ...modalStyles.modal}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{...styles.modalTitle, color: darkMode ? '#ffffff' : '#111827'}}>
                {editingSignature.id ? 'Editar Signatura' : 'Nova Signatura'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSignatureModal(false)} style={styles.closeButton}>
                <X size={20} />
              </Button>
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
              <Button variant="secondary" size="sm" onClick={() => setShowSignatureModal(false)} style={styles.cancelButton}>
                Cancel·lar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveSignature} disabled={saving} style={styles.saveButton}>
                {saving ? 'Guardant...' : <><Save size={16} /> Guardar</>}
              </Button>
            </div>
          </div>
        </div>
        )
      })()}
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
