import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Barcode, Package, Save, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react'
import HelpIcon from './HelpIcon'
import {
  getProductIdentifiers,
  upsertProductIdentifiers,
  getAvailableGtinCodes,
  assignGtinFromPool,
  releaseGtinFromProject,
  supabase,
  getCurrentUserId
} from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

const GTIN_TYPES = [
  { value: 'EAN', label: 'EAN' },
  { value: 'UPC', label: 'UPC' },
  { value: 'GTIN_EXEMPT', label: 'GTIN Exempt' }
]

export default function IdentifiersSection({ projectId, darkMode }) {
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const [, setIdentifiers] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableGtins, setAvailableGtins] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignedGtinFromPool, setAssignedGtinFromPool] = useState(null)
  const [formData, setFormData] = useState({
    gtin_type: '',
    gtin_code: '',
    exemption_reason: '',
    asin: '',
    fnsku: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getProductIdentifiers(projectId)
      setIdentifiers(data)
      if (data) {
        setFormData({
          gtin_type: data.gtin_type || '',
          gtin_code: data.gtin_code || '',
          exemption_reason: data.exemption_reason || '',
          asin: data.asin || '',
          fnsku: data.fnsku || ''
        })
        
        // Comprovar si aquest GTIN ve del pool
        if (data.gtin_code) {
          const userId = await getCurrentUserId()
          if (userId) {
            const { data: poolGtin } = await supabase
              .from('gtin_pool')
              .select('id, status, assigned_to_project_id')
              .eq('gtin_code', data.gtin_code)
              .eq('user_id', userId)
              .eq('assigned_to_project_id', projectId)
              .single()
            
            if (poolGtin && poolGtin.status === 'assigned') {
              setAssignedGtinFromPool(poolGtin.id)
            } else {
              setAssignedGtinFromPool(null)
            }
          }
        } else {
          setAssignedGtinFromPool(null)
        }
      } else {
        setAssignedGtinFromPool(null)
      }
      
      // Carregar GTINs disponibles del pool
      const gtins = await getAvailableGtinCodes()
      setAvailableGtins(gtins || [])
    } catch (err) {
      console.error('Error carregant identifiers:', err)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    // Validacions
    let dataToSave = { ...formData }
    if (dataToSave.gtin_type === 'GTIN_EXEMPT') {
      if (!dataToSave.exemption_reason) {
        alert('La raó d\'exempció és obligatòria per GTIN_EXEMPT')
        return
      }
      // Netejar gtin_code si és GTIN_EXEMPT
      dataToSave.gtin_code = null
    } else if (dataToSave.gtin_type && !dataToSave.gtin_code) {
      alert('El codi GTIN és obligatori si no és exempt')
      return
    }

    setSaving(true)
    try {
      const saved = await upsertProductIdentifiers(projectId, dataToSave)
      setIdentifiers(saved)
      alert('Identificadors guardats correctament')
    } catch (err) {
      console.error('Error guardant identifiers:', err)
      alert('Error guardant identificadors: ' + (err.message || 'Error desconegut'))
    }
    setSaving(false)
  }

  const handleAssignFromPool = async (gtinPoolId) => {
    try {
      await assignGtinFromPool(gtinPoolId, projectId)
      await loadData() // Recarregar dades
      setShowAssignModal(false)
      alert('GTIN assignat correctament des del pool')
    } catch (err) {
      console.error('Error assignant GTIN:', err)
      alert('Error assignant GTIN: ' + (err.message || 'Error desconegut'))
    }
  }

  const handleReleaseGtin = async () => {
    if (!assignedGtinFromPool) return
    if (!confirm('Estàs segur que vols alliberar aquest GTIN? Es podrà assignar a un altre projecte.')) return

    try {
      await releaseGtinFromProject(assignedGtinFromPool)
      // Netejar product_identifiers (opcional, deixar per històric)
      await loadData()
      alert('GTIN alliberat correctament')
    } catch (err) {
      console.error('Error alliberant GTIN:', err)
      alert('Error alliberant GTIN: ' + (err.message || 'Error desconegut'))
    }
  }

  const handleGtinTypeChange = (gtinType) => {
    setFormData({
      ...formData,
      gtin_type: gtinType,
      gtin_code: gtinType === 'GTIN_EXEMPT' ? '' : formData.gtin_code,
      exemption_reason: gtinType === 'GTIN_EXEMPT' ? formData.exemption_reason : ''
    })
  }

  if (loading) {
    return (
      <div style={{
        ...styles.section,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={styles.loading}>Carregant identificadors...</div>
      </div>
    )
  }

  return (
    <div style={{
      ...styles.section,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      <div style={styles.header}>
        <h3 style={{
          ...styles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          <Barcode size={20} />
          Identificadors Amazon
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {assignedGtinFromPool && (
            <button
              onClick={handleReleaseGtin}
              style={{
                ...styles.releaseButton,
                backgroundColor: darkMode ? '#374151' : '#e5e7eb',
                color: darkMode ? '#9ca3af' : '#6b7280'
              }}
            >
              <X size={14} />
              Alliberar GTIN
            </button>
          )}
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={availableGtins.length === 0}
            style={{
              ...styles.assignButton,
              backgroundColor: availableGtins.length > 0 ? '#4f46e5' : (darkMode ? '#374151' : '#e5e7eb'),
              color: availableGtins.length > 0 ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
              cursor: availableGtins.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            <Plus size={14} />
            Assignar del pool ({availableGtins.length})
          </button>
        </div>
      </div>

      <div style={styles.form}>
        {/* GTIN Type */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Tipus GTIN
            <HelpIcon helpKey="amazon_ready.gtin" size="small" darkMode={darkMode} />
          </label>
          <select
            value={formData.gtin_type}
            onChange={e => handleGtinTypeChange(e.target.value)}
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          >
            <option value="">Selecciona un tipus</option>
            {GTIN_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* GTIN Code (si no és EXEMPT) */}
        {formData.gtin_type && formData.gtin_type !== 'GTIN_EXEMPT' && (
          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              Codi GTIN *
            </label>
            <input
              type="text"
              value={formData.gtin_code}
              onChange={e => setFormData({ ...formData, gtin_code: e.target.value })}
              placeholder="Ex: 1234567890123"
              style={{
                ...styles.input,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>
        )}

        {/* Exemption Reason (si és EXEMPT) */}
        {formData.gtin_type === 'GTIN_EXEMPT' && (
          <div style={styles.formGroup}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>
              Raó d'Exempció *
            </label>
            <textarea
              value={formData.exemption_reason}
              onChange={e => setFormData({ ...formData, exemption_reason: e.target.value })}
              placeholder="Explica per què aquest producte està exempt de GTIN"
              rows={3}
              style={{
                ...styles.textarea,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                color: darkMode ? '#ffffff' : '#111827',
                borderColor: darkMode ? '#374151' : '#d1d5db'
              }}
            />
          </div>
        )}

        {/* ASIN */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ASIN
            <HelpIcon helpKey="research.asin" size="small" darkMode={darkMode} />
          </label>
          <input
            type="text"
            value={formData.asin}
            onChange={e => setFormData({ ...formData, asin: e.target.value })}
            placeholder="Ex: B08XYZ1234"
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
        </div>

        {/* FNSKU */}
        <div style={styles.formGroup}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            FNSKU
            <HelpIcon helpKey="amazon_ready.fnsku" size="small" darkMode={darkMode} />
          </label>
          <input
            type="text"
            value={formData.fnsku}
            onChange={e => setFormData({ ...formData, fnsku: e.target.value })}
            placeholder="Ex: X001ABCD1234"
            style={{
              ...styles.input,
              backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
              color: darkMode ? '#ffffff' : '#111827',
              borderColor: darkMode ? '#374151' : '#d1d5db'
            }}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.saveButton,
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          <Save size={16} />
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      {/* Modal Assign from Pool */}
      {showAssignModal && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowAssignModal(false)}>
          <div
            style={{
              ...styles.modal,
              ...modalStyles.modal,
              backgroundColor: darkMode ? '#1f1f2e' : '#ffffff'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{
                ...styles.modalTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                Assignar GTIN del Pool
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              {availableGtins.length === 0 ? (
                <div style={styles.emptyMessage}>
                  <AlertCircle size={24} />
                  <p>No hi ha codis GTIN disponibles al pool</p>
                </div>
              ) : (
                <div style={styles.gtinList}>
                  {availableGtins.map(gtin => (
                    <div key={gtin.id} style={{
                      ...styles.gtinItem,
                      borderColor: darkMode ? '#374151' : '#e5e7eb',
                      backgroundColor: darkMode ? '#15151f' : '#f9fafb'
                    }}>
                      <div style={styles.gtinInfo}>
                        <div style={{
                          ...styles.gtinCode,
                          color: darkMode ? '#ffffff' : '#111827'
                        }}>
                          {gtin.gtin_code || 'GTIN_EXEMPT'}
                        </div>
                        <div style={{
                          ...styles.gtinType,
                          color: darkMode ? '#9ca3af' : '#6b7280'
                        }}>
                          {gtin.gtin_type}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignFromPool(gtin.id)}
                        style={{
                          ...styles.assignGtinButton,
                          backgroundColor: '#4f46e5',
                          color: '#ffffff'
                        }}
                      >
                        Assignar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  section: {
    padding: '24px',
    borderRadius: '16px',
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
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  assignButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  releaseButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #e5e7eb)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: '1px solid #3730a3',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '8px',
    transition: 'all 0.2s'
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
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
    width: '90%',
    maxWidth: '600px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  emptyMessage: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280'
  },
  gtinList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  gtinItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid'
  },
  gtinInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  gtinCode: {
    fontSize: '15px',
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  gtinType: {
    fontSize: '12px'
  },
  assignGtinButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
}


