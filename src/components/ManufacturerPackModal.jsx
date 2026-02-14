import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Upload, Loader, AlertTriangle, CheckCircle2, Package } from 'lucide-react'
import { generateManufacturerPack } from '../lib/generateManufacturerPack'
import { getCompanySettings, updateManufacturerPackGenerated, markManufacturerPackAsSent } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { logAudit } from '../lib/auditLog'
import Button from './Button'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

/**
 * Modal per generar Manufacturer Pack (ZIP amb múltiples PDFs)
 */
export default function ManufacturerPackModal({
  isOpen,
  onClose,
  po,
  project,
  supplier,
  readiness,
  identifiers,
  darkMode,
  onRefresh
}) {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [companySettings, setCompanySettings] = useState(null)
  const [driveReady, setDriveReady] = useState(false)
  const [selection, setSelection] = useState({
    includePO: true,
    includeFnskuLabels: true,
    includePackingList: true,
    includeCartonLabels: true
  })
  const [labelsConfig, setLabelsConfig] = useState({
    quantity: readiness?.labels_qty || 30,
    template: readiness?.labels_template || 'A4_30UP',
    includeSku: true,
    includeName: true
  })
  const [validationErrors, setValidationErrors] = useState([])

  useEffect(() => {
    if (isOpen) {
      loadCompanySettings()
      checkDriveConnection()
      validateReadiness()
    }
  }, [isOpen, readiness, identifiers])

  const loadCompanySettings = async () => {
    try {
      const settings = await getCompanySettings()
      setCompanySettings(settings)
    } catch (err) {
      console.error('Error carregant company settings:', err)
    }
  }

  const checkDriveConnection = async () => {
    try {
      const isValid = await driveService.verifyToken()
      setDriveReady(isValid)
    } catch (err) {
      setDriveReady(false)
    }
  }

  const validateReadiness = () => {
    const errors = []
    
    // Validar que readiness existeix per Packing List i Carton Labels
    if (selection.includePackingList || selection.includeCartonLabels) {
      if (!readiness) {
        errors.push('Amazon readiness data not initialized. Please fill in the Amazon Ready section first.')
      } else {
        // Validar camps crítics per Packing List
        if (!readiness.cartons_count || readiness.cartons_count <= 0) {
          errors.push('Cartons count is required for Packing List')
        }
        if (!readiness.units_per_carton || readiness.units_per_carton <= 0) {
          errors.push('Units per carton is required for Packing List')
        }
        if (!readiness.carton_length_cm || !readiness.carton_width_cm || !readiness.carton_height_cm) {
          errors.push('Carton dimensions (L/W/H) are required for Packing List')
        }
        if (!readiness.carton_weight_kg || readiness.carton_weight_kg <= 0) {
          errors.push('Carton weight is required for Packing List')
        }

        // Validar per Carton Labels
        if (selection.includeCartonLabels && !readiness.cartons_count) {
          errors.push('Cartons count is required for Carton Labels')
        }
      }
    }

    // Validar FNSKU labels
    if (selection.includeFnskuLabels) {
      if (readiness?.needs_fnsku !== false) {
        if (!identifiers || !identifiers.fnsku) {
          errors.push('FNSKU is required for FNSKU labels. Please set it in the project identifiers or disable FNSKU requirement in Amazon Ready section.')
        }
      }
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  useEffect(() => {
    validateReadiness()
  }, [selection, readiness, identifiers])

  const handleGenerate = async (uploadToDrive = false) => {
    if (!validateReadiness()) {
      setError('Please fix validation errors before generating the pack')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generar ZIP (retorna { zipBlob, version })
      const result = await generateManufacturerPack({
        poData: po,
        supplier,
        project,
        companySettings,
        amazonReadiness: readiness,
        identifiers,
        selection,
        fnskuLabelsConfig: labelsConfig
      })

      const { zipBlob, version } = result

      // Guardar versió i timestamp de generació
      try {
        await updateManufacturerPackGenerated(po.id, version)
      } catch (dbError) {
        console.error('Error guardant versió del pack:', dbError)
        // No bloquejar si falla guardar a BD
      }

      // Descarregar ZIP amb versió al nom
      const versionSuffix = version > 1 ? `_v${version}` : ''
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ManufacturerPack_${po.po_number || po.id}${versionSuffix}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Upload a Drive si està connectat i s'ha demanat
      let driveUploaded = false
      if (uploadToDrive && driveReady) {
        try {
          // Obtenir carpeta del projecte
          if (project?.drive_folder_id) {
            // Crear subcarpeta PurchaseOrders si no existeix
            const purchaseOrdersFolder = await driveService.findOrCreateFolder(
              '03_PurchaseOrders',
              project.drive_folder_id
            )

            // Crear subcarpeta per aquesta PO
            const poFolder = await driveService.findOrCreateFolder(
              po.po_number || `PO_${po.id}`,
              purchaseOrdersFolder.id
            )

            // Pujar ZIP amb versió al nom
            const versionSuffix = version > 1 ? `_v${version}` : ''
            const zipFile = new File([zipBlob], `ManufacturerPack_${po.po_number || po.id}${versionSuffix}.zip`, {
              type: 'application/zip'
            })

            await driveService.uploadFile(zipFile, poFolder.id, `ManufacturerPack_${po.po_number || po.id}${versionSuffix}.zip`)
            driveUploaded = true
          }
        } catch (driveError) {
          console.error('Error pujant a Drive:', driveError)
          // No bloquejar si falla l'upload a Drive
        }
      }

      // Audit log
      try {
        await logAudit({
          entityType: 'purchase_order',
          entityId: po.id,
          action: 'manufacturer_pack_generated',
          status: 'success',
          message: 'Manufacturer pack generated successfully',
          meta: {
            po_number: po.po_number,
            documents: {
              po: selection.includePO,
              fnsku_labels: selection.includeFnskuLabels,
              packing_list: selection.includePackingList,
              carton_labels: selection.includeCartonLabels
            },
            drive_uploaded: driveUploaded,
            labels_template: labelsConfig.template,
            labels_quantity: labelsConfig.quantity,
            pack_version: version
          }
        })
      } catch (auditError) {
        console.warn('Error registrant audit log:', auditError)
      }

      onClose()
    } catch (err) {
      console.error('Error generant manufacturer pack:', err)
      setError(err.message || 'Error generant el pack del fabricant')
      
      // Audit log error
      try {
        await logAudit({
          entityType: 'purchase_order',
          entityId: po.id,
          action: 'manufacturer_pack_generated',
          status: 'error',
          message: 'Error generating manufacturer pack',
          meta: {
            error: err.message
          }
        })
      } catch (auditError) {
        // Ignorar errors d'audit log
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const styles = {
    overlay: {
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
      backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#111827',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: darkMode ? '#9ca3af' : '#6b7280',
      padding: '4px'
    },
    section: {
      marginBottom: '20px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: darkMode ? '#e5e7eb' : '#374151',
      marginBottom: '12px'
    },
    checkboxGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      color: darkMode ? '#ffffff' : '#111827',
      fontSize: '14px'
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '13px',
      fontWeight: '500',
      color: darkMode ? '#e5e7eb' : '#374151'
    },
    errorBox: {
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#fee2e2',
      border: '1px solid #fca5a5',
      marginBottom: '16px'
    },
    errorText: {
      color: '#991b1b',
      fontSize: '13px',
      margin: 0
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px'
    },
    button: {
      flex: 1,
      padding: '12px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'opacity 0.2s'
    },
    buttonPrimary: {
      backgroundColor: '#4f46e5',
      color: '#ffffff'
    },
    buttonSecondary: {
      backgroundColor: darkMode ? '#374151' : '#e5e7eb',
      color: darkMode ? '#ffffff' : '#111827'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Package size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Generate Manufacturer Pack
          </h2>
          <Button variant="ghost" onClick={onClose} aria-label="Tancar">
            <X size={20} />
          </Button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div style={styles.errorBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={16} color="#991b1b" />
              <strong style={styles.errorText}>Validation Errors:</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((err, idx) => (
                <li key={idx} style={styles.errorText}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Document Selection */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Documents to Include</h3>
          <div style={styles.checkboxGroup}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={selection.includePO}
                onChange={e => setSelection({ ...selection, includePO: e.target.checked })}
              />
              <span style={{ color: darkMode ? '#e5e7eb' : '#374151' }}>PO PDF</span>
            </label>
            
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={selection.includeFnskuLabels}
                onChange={e => setSelection({ ...selection, includeFnskuLabels: e.target.checked })}
                disabled={readiness?.needs_fnsku !== false && (!identifiers || !identifiers.fnsku)}
              />
              <span style={{ 
                color: (readiness?.needs_fnsku !== false && (!identifiers || !identifiers.fnsku))
                  ? '#9ca3af'
                  : (darkMode ? '#e5e7eb' : '#374151')
              }}>
                FNSKU Labels PDF
                {readiness?.needs_fnsku !== false && (!identifiers || !identifiers.fnsku) && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>
                    (FNSKU required)
                  </span>
                )}
              </span>
            </label>
            
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={selection.includePackingList}
                onChange={e => setSelection({ ...selection, includePackingList: e.target.checked })}
              />
              <span style={{ color: darkMode ? '#e5e7eb' : '#374151' }}>Packing List PDF</span>
            </label>
            
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={selection.includeCartonLabels}
                onChange={e => setSelection({ ...selection, includeCartonLabels: e.target.checked })}
                disabled={!readiness?.cartons_count}
              />
              <span style={{ 
                color: !readiness?.cartons_count
                  ? '#9ca3af'
                  : (darkMode ? '#e5e7eb' : '#374151')
              }}>
                Carton Labels PDF
                {!readiness?.cartons_count && (
                  <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>
                    (Cartons count required)
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* FNSKU Labels Configuration */}
        {selection.includeFnskuLabels && identifiers?.fnsku && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>FNSKU Labels Configuration</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>Quantity</label>
              <input
                type="number"
                value={labelsConfig.quantity}
                onChange={e => setLabelsConfig({ ...labelsConfig, quantity: parseInt(e.target.value) || 0 })}
                style={styles.input}
                min="1"
              />
            </div>

            <div>
              <label style={styles.label}>Template</label>
              <select
                value={labelsConfig.template}
                onChange={e => setLabelsConfig({ ...labelsConfig, template: e.target.value })}
                style={styles.input}
              >
                <option value="A4_30UP">A4 30UP (Avery 5160)</option>
                <option value="LABEL_40x30">Label 40x30mm</option>
                <option value="ZEBRA_40x30">Zebra 40x30mm</option>
              </select>
            </div>
          </div>
        )}

        {/* Pack Status */}
        {readiness?.manufacturer_pack_generated_at && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: readiness.manufacturer_pack_sent_at ? '#d1fae5' : '#fef3c7',
            border: `1px solid ${readiness.manufacturer_pack_sent_at ? '#10b981' : '#fbbf24'}`,
            marginBottom: '16px',
            fontSize: '13px',
            color: readiness.manufacturer_pack_sent_at ? '#065f46' : '#92400e'
          }}>
            {readiness.manufacturer_pack_sent_at ? (
              <>
                ✅ Pack sent to manufacturer on {new Date(readiness.manufacturer_pack_sent_at).toLocaleDateString()}
                {readiness.manufacturer_pack_version > 1 && (
                  <span> (Version {readiness.manufacturer_pack_version})</span>
                )}
              </>
            ) : (
              <>
                📦 Pack generated on {new Date(readiness.manufacturer_pack_generated_at).toLocaleDateString()}
                {readiness.manufacturer_pack_version > 1 && (
                  <span> (Version {readiness.manufacturer_pack_version})</span>
                )}
                <br />
                <button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      await markManufacturerPackAsSent(po.id)
                      // Recarregar readiness per actualitzar UI
                      if (onRefresh) {
                        await onRefresh()
                      }
                      // Tancar modal després de marcar com enviat
                      onClose()
                    } catch (err) {
                      setError('Error marking pack as sent: ' + (err.message || 'Unknown error'))
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ✓ {t('common.markAsSent')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Drive Status */}
        {!driveReady && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400e'
          }}>
            ⚠️ {t('errors.driveDisconnected')}
          </div>
        )}

        {/* Buttons */}
        <div style={styles.buttons}>
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading || validationErrors.length > 0}
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              ...((loading || validationErrors.length > 0) && styles.buttonDisabled)
            }}
          >
            {loading ? (
              <>
                <Loader size={16} className="spin" />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Generate & Download ZIP
              </>
            )}
          </button>

          {driveReady && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || validationErrors.length > 0}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...((loading || validationErrors.length > 0) && styles.buttonDisabled)
              }}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Generate & Upload to Drive
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
