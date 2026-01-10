import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, Image, AlertCircle, Eye, Trash2, Download } from 'lucide-react'
import { uploadReceipt, deleteReceipt, getExpenseAttachments, getAttachmentSignedUrl } from '../lib/supabase'
import { showToast } from './Toast'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function ReceiptUploader({ 
  expenseId, 
  onAttachmentsChanged,
  darkMode 
}) {
  const fileInputRef = useRef(null)
  const dropzoneRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Cargar attachments cuando expenseId cambia
  useEffect(() => {
    if (expenseId) {
      loadAttachments()
    } else {
      setAttachments([])
    }
  }, [expenseId])

  const loadAttachments = async () => {
    if (!expenseId) return
    
    setLoading(true)
    try {
      const data = await getExpenseAttachments(expenseId)
      setAttachments(data || [])
    } catch (err) {
      console.error('Error loading attachments:', err)
      showToast('Error carregant attachments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`${file.name}: Tipus no permès. Només PDF, JPG i PNG.`)
    }
    if (file.size > MAX_SIZE) {
      throw new Error(`${file.name}: Massa gran (màx 10MB)`)
    }
    return true
  }

  const handleFiles = async (files) => {
    if (!expenseId) {
      showToast('Guarda l\'expense primer per pujar receipts', 'error')
      return
    }

    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setUploading(true)
    setError(null)

    const results = []
    const errors = []

    for (const file of fileArray) {
      try {
        validateFile(file)
        const result = await uploadReceipt(file, expenseId)
        results.push(result)
        showToast(`${file.name} pujat correctament`, 'success')
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err)
        errors.push({ file: file.name, error: err.message || 'Error desconegut' })
        showToast(`Error pujant ${file.name}: ${err.message || 'Error desconegut'}`, 'error')
      }
    }

    setUploading(false)

    // Recargar attachments después de subir
    if (results.length > 0) {
      await loadAttachments()
      if (onAttachmentsChanged) {
        onAttachmentsChanged(results)
      }
    }

    // Mostrar resumen de errores si hay
    if (errors.length > 0 && results.length === 0) {
      setError(`${errors.length} fitxer(s) no s'han pogut pujar`)
    }
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
    // Reset input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!expenseId) {
      showToast('Guarda l\'expense primer per pujar receipts', 'error')
      return
    }

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleDelete = async (attachmentId, fileName) => {
    if (!confirm(`Eliminar aquest receipt: ${fileName}?`)) return

    try {
      await deleteReceipt(attachmentId)
      showToast('Receipt eliminat', 'success')
      await loadAttachments()
      if (onAttachmentsChanged) {
        onAttachmentsChanged([])
      }
    } catch (err) {
      console.error('Error deleting attachment:', err)
      showToast('Error eliminant receipt: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const handleView = async (attachment) => {
    try {
      // Obtener signed URL (1 hora de validez)
      const signedUrl = await getAttachmentSignedUrl(attachment.file_path)
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      } else {
        showToast('Error obrint l\'arxiu', 'error')
      }
    } catch (err) {
      console.error('Error getting signed URL:', err)
      showToast('Error obrint l\'arxiu: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ca-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (mimeType, fileName) => {
    if (mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
      return <FileText size={18} color="#ef4444" />
    }
    return <Image size={18} color="#3b82f6" />
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
      marginBottom: '12px',
      display: 'block'
    },
    dropzone: {
      border: `2px dashed ${dragActive ? '#4f46e5' : darkMode ? '#374151' : '#d1d5db'}`,
      borderRadius: '8px',
      padding: '24px',
      textAlign: 'center',
      cursor: expenseId ? 'pointer' : 'not-allowed',
      transition: 'all 0.2s',
      backgroundColor: dragActive 
        ? (darkMode ? '#1f1f2e' : '#f3f4f6')
        : (darkMode ? '#0a0a0f' : '#ffffff'),
      opacity: expenseId ? 1 : 0.6
    },
    dropzoneDisabled: {
      borderColor: darkMode ? '#374151' : '#d1d5db',
      backgroundColor: darkMode ? '#0a0a0f' : '#f9fafb'
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
    warningBox: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '6px',
      color: '#92400e',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    attachmentsList: {
      marginTop: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    attachmentItem: {
      padding: '12px',
      backgroundColor: darkMode ? '#0a0a0f' : '#ffffff',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    },
    attachmentLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
      minWidth: 0
    },
    attachmentInfo: {
      flex: 1,
      minWidth: 0
    },
    attachmentName: {
      fontSize: '14px',
      fontWeight: '500',
      color: darkMode ? '#ffffff' : '#111827',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    attachmentMeta: {
      fontSize: '12px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      marginTop: '2px'
    },
    attachmentActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexShrink: 0
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
      color: darkMode ? '#ffffff' : '#111827',
      transition: 'background-color 0.2s'
    },
    deleteButton: {
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '6px',
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center',
      transition: 'opacity 0.2s'
    },
    loadingText: {
      fontSize: '13px',
      color: darkMode ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      padding: '12px'
    }
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>Receipts (PDF, JPG, PNG)</label>
      
      {!expenseId ? (
        <div style={{...styles.warningBox, marginTop: 0}}>
          <AlertCircle size={16} />
          <span>Guarda l'expense primer per pujar receipts</span>
        </div>
      ) : (
        <div
          ref={dropzoneRef}
          style={{
            ...styles.dropzone,
            ...(uploading ? styles.dropzoneDisabled : {})
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && expenseId && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileSelect}
            style={styles.fileInput}
            disabled={uploading || !expenseId}
          />
          
          {uploading ? (
            <>
              <Upload size={24} style={{...styles.uploadIcon, animation: 'pulse 1s ease-in-out infinite'}} />
              <div style={styles.uploadText}>Pujant receipts...</div>
            </>
          ) : (
            <>
              <Upload size={24} style={styles.uploadIcon} />
              <div style={styles.uploadText}>
                Arrossega fitxers aquí o clica per seleccionar
              </div>
              <div style={styles.uploadHint}>
                PDF, JPG o PNG (màx 10MB per fitxer). Múltiples fitxers permesos.
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div style={styles.loadingText}>Carregant attachments...</div>
      )}

      {!loading && attachments.length > 0 && (
        <div style={styles.attachmentsList}>
          {attachments.map((attachment) => (
            <div key={attachment.id} style={styles.attachmentItem}>
              <div style={styles.attachmentLeft}>
                {getFileIcon(attachment.mime_type, attachment.file_name)}
                <div style={styles.attachmentInfo}>
                  <div style={styles.attachmentName}>{attachment.file_name}</div>
                  <div style={styles.attachmentMeta}>
                    {formatFileSize(attachment.size)} • {formatDate(attachment.created_at)}
                  </div>
                </div>
              </div>
              <div style={styles.attachmentActions}>
                <button
                  onClick={() => handleView(attachment)}
                  style={styles.actionButton}
                  title="Obrir receipt"
                >
                  <Eye size={14} />
                  Obrir
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.file_name)}
                  style={styles.deleteButton}
                  title="Eliminar receipt"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !expenseId && attachments.length === 0 && (
        <div style={styles.uploadHint}>(No hi ha receipts pendents d'adjuntar)</div>
      )}
    </div>
  )
}
