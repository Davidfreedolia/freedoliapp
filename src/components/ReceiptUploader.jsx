import { useState, useRef } from 'react'
import { Upload, X, FileText, Image, RefreshCw, CheckCircle2, AlertCircle, Eye, Trash2 } from 'lucide-react'
import { uploadReceipt, deleteReceipt, getReceiptUrl, getCurrentUserId } from '../lib/supabase'
import { driveService } from '../lib/googleDrive'
import { showToast } from './Toast'
import { useApp } from '../context/AppContext'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function ReceiptUploader({ 
  expenseId, 
  currentReceiptUrl, 
  currentReceiptFilename,
  onReceiptUploaded,
  onReceiptDeleted,
  darkMode 
}) {
  const { driveConnected } = useApp()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const hasReceipt = currentReceiptUrl || uploadedFile

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipus
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipus de fitxer no permès. Només PDF, JPG i PNG.')
      showToast('Tipus de fitxer no permès', 'error')
      return
    }

    // Validar mida
    if (file.size > MAX_SIZE) {
      setError('El fitxer és massa gran. Màxim 10MB.')
      showToast('El fitxer és massa gran (màx 10MB)', 'error')
      return
    }

    await uploadFile(file)
  }

  const uploadFile = async (file, retry = false) => {
    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Upload a Supabase Storage
      const result = await uploadReceipt(file, expenseId)
      
      setUploadedFile({
        url: result.url,
        path: result.path,
        filename: result.filename,
        size: result.size
      })

      // Opcional: Upload a Google Drive si està connectat
      if (driveConnected && driveService.isAuthenticated()) {
        try {
          const userId = await getCurrentUserId()
          // Crear o obtenir carpeta "Receipts" al Drive
          const receiptsFolder = await driveService.findOrCreateFolder(
            'Receipts',
            null // Root o carpeta específica
          )
          
          const driveResult = await driveService.uploadFile(file, receiptsFolder.id, result.filename)
          
          // Guardar drive_file_id (opcional, es pot fer després)
          if (onReceiptUploaded) {
            onReceiptUploaded({
              ...result,
              drive_file_id: driveResult.id,
              drive_url: driveResult.webViewLink
            })
          }
        } catch (driveErr) {
          console.warn('Error uploading to Drive (non-critical):', driveErr)
          // No fallar si Drive falla, només mostrar warning
          if (onReceiptUploaded) {
            onReceiptUploaded(result)
          }
        }
      } else {
        if (onReceiptUploaded) {
          onReceiptUploaded(result)
        }
      }

      setUploadProgress(100)
      showToast('Receipt pujat correctament', 'success')
    } catch (err) {
      console.error('Error uploading receipt:', err)
      setError(err.message || 'Error pujant receipt')
      showToast('Error pujant receipt: ' + (err.message || 'Error desconegut'), 'error')
      
      if (!retry) {
        // Mostrar opció de retry
        setRetrying(true)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleRetry = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('Selecciona un fitxer primer')
      return
    }
    setRetrying(false)
    await uploadFile(fileInputRef.current.files[0], true)
  }

  const handleDelete = async () => {
    if (!confirm('Segur que vols eliminar aquest receipt?')) return

    try {
      const filePath = uploadedFile?.path || currentReceiptUrl
      if (filePath) {
        // Si és una URL completa, extreure el path
        const path = filePath.includes('/storage/v1/object/public/receipts/')
          ? filePath.split('/storage/v1/object/public/receipts/')[1]
          : filePath

        await deleteReceipt(path)
      }

      setUploadedFile(null)
      if (onReceiptDeleted) {
        onReceiptDeleted()
      }
      showToast('Receipt eliminat', 'success')
    } catch (err) {
      console.error('Error deleting receipt:', err)
      showToast('Error eliminant receipt', 'error')
    }
  }

  const handleView = () => {
    const url = uploadedFile?.url || currentReceiptUrl
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const getFileIcon = () => {
    const url = uploadedFile?.url || currentReceiptUrl
    if (!url) return null
    
    if (url.includes('.pdf')) {
      return <FileText size={20} color="#ef4444" />
    }
    return <Image size={20} color="#3b82f6" />
  }

  const getFileName = () => {
    return uploadedFile?.filename || currentReceiptFilename || 'receipt'
  }

  const styles = {
    container: {
      marginTop: '16px',
      padding: '16px',
      backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#ffffff' : '#111827',
      marginBottom: '8px',
      display: 'block'
    },
    uploadArea: {
      border: `2px dashed ${darkMode ? '#374151' : '#d1d5db'}`,
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff'
    },
    uploadAreaHover: {
      borderColor: '#4f46e5',
      backgroundColor: darkMode ? '#1f1f2e' : '#f3f4f6'
    },
    uploadIcon: {
      margin: '0 auto 12px',
      color: darkMode ? '#9ca3af' : '#6b7280'
    },
    uploadText: {
      fontSize: '14px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginBottom: '4px'
    },
    uploadHint: {
      fontSize: '12px',
      color: darkMode ? '#6b7280' : '#9ca3af'
    },
    fileInput: {
      display: 'none'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: darkMode ? '#374151' : '#e5e7eb',
      borderRadius: '4px',
      marginTop: '12px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4f46e5',
      transition: 'width 0.3s',
      borderRadius: '4px'
    },
    errorBox: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: '#fee2e2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      color: '#991b1b',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    retryButton: {
      marginTop: '8px',
      padding: '8px 16px',
      backgroundColor: '#f59e0b',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    receiptInfo: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    },
    receiptLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1
    },
    receiptName: {
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#ffffff' : '#111827'
    },
    receiptActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: darkMode ? '#374151' : '#e5e7eb',
      color: darkMode ? '#ffffff' : '#111827'
    },
    deleteButton: {
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center'
    }
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>Receipt (PDF, JPG, PNG)</label>
      
      {!hasReceipt ? (
        <div
          style={{
            ...styles.uploadArea,
            ...(uploading ? styles.uploadAreaHover : {})
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = '#4f46e5'
              e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#f3f4f6'
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = darkMode ? '#374151' : '#d1d5db'
              e.currentTarget.style.backgroundColor = darkMode ? '#0a0a0f' : '#ffffff'
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            style={styles.fileInput}
            disabled={uploading}
          />
          
          {uploading ? (
            <>
              <RefreshCw size={24} style={{ ...styles.uploadIcon, animation: 'spin 1s linear infinite' }} />
              <div style={styles.uploadText}>Pujant receipt...</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <Upload size={24} style={styles.uploadIcon} />
              <div style={styles.uploadText}>
                Clica per pujar un receipt
              </div>
              <div style={styles.uploadHint}>
                PDF, JPG o PNG (màx 10MB)
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={styles.receiptInfo}>
          <div style={styles.receiptLeft}>
            {getFileIcon()}
            <span style={styles.receiptName}>{getFileName()}</span>
          </div>
          <div style={styles.receiptActions}>
            <button
              onClick={handleView}
              style={styles.actionButton}
              title="Veure receipt"
            >
              <Eye size={14} />
              Veure
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={styles.actionButton}
              title="Reemplaçar receipt"
            >
              <Upload size={14} />
              Reemplaçar
            </button>
            <button
              onClick={handleDelete}
              style={styles.deleteButton}
              title="Eliminar receipt"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            style={styles.fileInput}
            disabled={uploading}
          />
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {retrying && error && (
        <button
          onClick={handleRetry}
          style={styles.retryButton}
        >
          <RefreshCw size={14} />
          Reintentar upload
        </button>
      )}
    </div>
  )
}

