import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, Image, AlertCircle, Eye, Trash2, Edit, MoreVertical, X, Save, Loader, RefreshCw } from 'lucide-react'
import { uploadReceipt, deleteReceipt, getExpenseAttachments, getAttachmentSignedUrl, updateAttachmentName, replaceReceipt, validateReceiptFile } from '../lib/supabase'
import { showToast } from './Toast'
import DeleteConfirmationModal from './DeleteConfirmationModal'

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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewType, setPreviewType] = useState(null) // 'image' or 'pdf'
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [attachmentToRename, setAttachmentToRename] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState({}) // { fileId: { file: File, progress: number, error: string } }
  const [replacingFileId, setReplacingFileId] = useState(null)

  // Cargar attachments cuando expenseId cambia
  useEffect(() => {
    if (expenseId) {
      loadAttachments()
    } else {
      setAttachments([])
    }
  }, [expenseId])

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('[data-menu-container]')) {
        setMenuOpen(null)
      }
    }
    
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [menuOpen])

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
    // Use helper from supabase.js for consistency
    const validation = validateReceiptFile(file)
    if (!validation.ok) {
      throw new Error(validation.error)
    }
    return true
  }

  const handleFiles = async (files, replaceAttachmentId = null) => {
    if (!expenseId) {
      showToast('Guarda l\'expense primer per pujar receipts', 'error')
      return
    }

    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // Si es un replace, solo procesar el primer archivo
    const filesToProcess = replaceAttachmentId ? [fileArray[0]] : fileArray

    if (replaceAttachmentId) {
      setReplacingFileId(replaceAttachmentId)
    } else {
      setUploading(true)
    }
    setError(null)

    const results = []
    const errors = []

    for (const file of filesToProcess) {
      const fileId = replaceAttachmentId || `upload-${Date.now()}-${file.name}`
      
      // Agregar a uploadingFiles
      setUploadingFiles(prev => ({
        ...prev,
        [fileId]: { file, progress: 0, error: null }
      }))

      try {
        validateFile(file)
        
        // Upload o Replace
        let result
        if (replaceAttachmentId) {
          result = await replaceReceipt(file, replaceAttachmentId)
          // Show cleanup warning if present
          if (result.cleanupWarning) {
            showToast(result.cleanupWarning, 'warning')
          }
        } else {
          result = await uploadReceipt(file, expenseId)
        }
        
        results.push(result)
        
        // Actualizar estado: éxito
        setUploadingFiles(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 100 }
        }))
        
        showToast(
          replaceAttachmentId 
            ? `Fitxer substituit correctament: ${file.name}` 
            : `${file.name} pujat correctament`, 
          'success'
        )
      } catch (err) {
        console.error(`Error ${replaceAttachmentId ? 'replacing' : 'uploading'} ${file.name}:`, err)
        
        // Handle demo mode blocking
        const errorMessage = err.message || 'Error desconegut'
        const isDemoBlocked = errorMessage === 'Disabled in demo mode'
        
        errors.push({ file: file.name, error: errorMessage, fileId })
        
        // Actualizar estado: error
        setUploadingFiles(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], error: errorMessage }
        }))
        
        showToast(
          isDemoBlocked 
            ? 'Desactivat en mode demo'
            : `Error ${replaceAttachmentId ? 'substituint' : 'pujant'} ${file.name}: ${errorMessage}`, 
          'error'
        )
      }
    }

    if (replaceAttachmentId) {
      setReplacingFileId(null)
    } else {
      setUploading(false)
    }

    // Recargar attachments después de subir/reemplazar
    if (results.length > 0) {
      await loadAttachments()
      if (onAttachmentsChanged) {
        onAttachmentsChanged(results)
      }
      // Limpiar uploadingFiles después de un delay
      setTimeout(() => {
        setUploadingFiles(prev => {
          const updated = { ...prev }
          filesToProcess.forEach((_, idx) => {
            const fileId = Object.keys(prev).find(k => prev[k].file?.name === filesToProcess[idx].name) || `upload-${idx}`
            delete updated[fileId]
          })
          return updated
        })
      }, 2000)
    }

    // Mostrar resumen de errores si hay
    if (errors.length > 0 && results.length === 0) {
      setError(`${errors.length} fitxer(s) no s'han pogut ${replaceAttachmentId ? 'substituir' : 'pujar'}`)
    }
  }

  const handleRetryUpload = async (fileId) => {
    const uploadInfo = uploadingFiles[fileId]
    if (!uploadInfo || !uploadInfo.file) return

    // Reset error
    setUploadingFiles(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], error: null, progress: 0 }
    }))

    // Retry upload
    await handleFiles([uploadInfo.file])
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

  // Drag & Drop handlers - Improved to work reliably
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragActive to false if we're leaving the dropzone itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
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

  const handleDeleteClick = (attachment) => {
    setMenuOpen(null)
    setAttachmentToDelete(attachment)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!attachmentToDelete) return

    setDeleting(true)
    try {
      await deleteReceipt(attachmentToDelete.id)
      showToast('Receipt eliminat correctament', 'success')
      await loadAttachments()
      if (onAttachmentsChanged) {
        onAttachmentsChanged([])
      }
      setShowDeleteModal(false)
      setAttachmentToDelete(null)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error deleting attachment:', err)
      }
      showToast('Error eliminant receipt: ' + (err.message || 'Error desconegut'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setAttachmentToDelete(null)
  }

  const handleView = async (attachment) => {
    try {
      setMenuOpen(null)
      // Obtener signed URL (1 hora de validez)
      const signedUrl = await getAttachmentSignedUrl(attachment.file_path)
      if (!signedUrl) {
        showToast('Error obrint l\'arxiu', 'error')
        return
      }

      // Check if it's an image or PDF
      const isImage = attachment.mime_type?.startsWith('image/') || 
                     attachment.file_name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
      
      if (isImage) {
        // Open in modal preview
        setPreviewUrl(signedUrl)
        setPreviewType('image')
        setShowPreviewModal(true)
      } else {
        // Open PDF in new window
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Error getting signed URL:', err)
      showToast('Error obrint l\'arxiu: ' + (err.message || 'Error desconegut'), 'error')
    }
  }

  const handleRenameClick = (attachment) => {
    setMenuOpen(null)
    setAttachmentToRename(attachment)
    setNewFileName(attachment.file_name)
    setShowRenameModal(true)
  }

  const handleReplaceClick = (attachment) => {
    setMenuOpen(null)
    
    // Check demo mode first
    const checkDemoMode = async () => {
      try {
        const { getDemoMode } = await import('../lib/demoModeFilter')
        const demoMode = await getDemoMode()
        if (demoMode) {
          showToast('Desactivat en mode demo', 'error')
          return
        }
      } catch (err) {
        // Continue if check fails
      }
      
      // Trigger file picker para reemplazar
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/pdf,image/jpeg,image/png'
      input.multiple = false
      input.onchange = async (e) => {
        const files = e.target.files
        if (files && files.length > 0) {
          await handleFiles(files, attachment.id)
        }
      }
      input.click()
    }
    
    checkDemoMode()
  }

  const handleConfirmRename = async () => {
    if (!attachmentToRename || !newFileName.trim()) {
      showToast('El nom del fitxer és obligatori', 'error')
      return
    }

    setRenaming(true)
    try {
      await updateAttachmentName(attachmentToRename.id, newFileName.trim())
      showToast('Fitxer renombrat correctament', 'success')
      await loadAttachments()
      setShowRenameModal(false)
      setAttachmentToRename(null)
      setNewFileName('')
    } catch (err) {
      console.error('Error renaming attachment:', err)
      showToast('Error renombrant fitxer: ' + (err.message || 'Error desconegut'), 'error')
    } finally {
      setRenaming(false)
    }
  }

  const handleCancelRename = () => {
    setShowRenameModal(false)
    setAttachmentToRename(null)
    setNewFileName('')
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


  // DEV-ONLY: Generate test receipt for automated testing
  const handleGenerateTestReceipt = async () => {
    if (!expenseId) {
      showToast('Guarda l\'expense primer', 'error');
      return;
    }

    try {
      // Create a minimal valid PNG file (1x1 transparent pixel)
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const blob = new Blob([pngData], { type: 'image/png' });
      const timestamp = new Date().getTime();
      const file = new File([blob], `test-receipt-${timestamp}.png`, {
        type: 'image/png',
        lastModified: timestamp
      });

      // Use the existing upload pipeline
      await handleFiles([file]);
      console.log('Test receipt generated and uploaded:', file.name);
    } catch (error) {
      console.error('Error generating test receipt:', error);
      showToast('Error generant receipt de prova', 'error');
    }
  };

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
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && expenseId && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            multiple
            onChange={handleFileSelect}
            style={styles.fileInput}
            disabled={uploading || !expenseId}
          />

        {/* DEV-ONLY: Test receipt generator button */}
        {import.meta.env.DEV && expenseId && (
          <div style={{marginTop: '12px', textAlign: 'center'}}>
            <button
              onClick={handleGenerateTestReceipt}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#0969DA',
                border: '1px solid #D0D7DE',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🧪 Generar rebut de prova
            </button>
          </div>
        )}
          
          {uploading ? (
            <>
              <Loader size={24} color="#4f46e5" style={{...styles.uploadIcon, animation: 'spin 1s linear infinite'}} />
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

      {/* Uploading files list (before they appear in attachments table) */}
      {Object.keys(uploadingFiles).length > 0 && (
        <div style={{ marginTop: '16px' }}>
          {Object.entries(uploadingFiles).map(([fileId, uploadInfo]) => {
            if (uploadInfo.error) {
              return (
                <div
                  key={fileId}
                  style={{
                    padding: '12px',
                    backgroundColor: darkMode ? '#1f1f2e' : '#fee2e2',
                    border: `1px solid ${darkMode ? '#374151' : '#fecaca'}`,
                    borderRadius: '6px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: darkMode ? '#ffffff' : '#991b1b',
                        marginBottom: '4px'
                      }}>
                        {uploadInfo.file.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: darkMode ? '#fca5a5' : '#dc2626'
                      }}>
                        {uploadInfo.error}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRetryUpload(fileId)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      backgroundColor: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <RefreshCw size={14} />
                    Reintentar
                  </button>
                </div>
              )
            }
            
            return (
              <div
                key={fileId}
                style={{
                  padding: '12px',
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <Loader size={18} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {uploadInfo.file.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    marginTop: '2px'
                  }}>
                    Pujant...
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && attachments.length > 0 && (
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{
                borderBottom: `2px solid ${darkMode ? '#374151' : '#e5e7eb'}`
              }}>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: '600',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>Fitxer</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: '600',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>Mida</th>
                <th style={{
                  textAlign: 'left',
                  padding: '12px',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: '600',
                  fontSize: '12px',
                  textTransform: 'uppercase'
                }}>Data</th>
                <th style={{
                  textAlign: 'right',
                  padding: '12px',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  fontWeight: '600',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  width: '80px'
                }}>Accions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr 
                  key={attachment.id}
                  style={{
                    borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = darkMode ? '#1f1f2e' : '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {replacingFileId === attachment.id ? (
                        <Loader size={18} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        getFileIcon(attachment.mime_type, attachment.file_name)
                      )}
                      <span style={{
                        color: darkMode ? '#ffffff' : '#111827',
                        fontWeight: '500',
                        opacity: replacingFileId === attachment.id ? 0.6 : 1
                      }}>
                        {attachment.file_name}
                      </span>
                      {replacingFileId === attachment.id && (
                        <span style={{
                          fontSize: '12px',
                          color: '#4f46e5',
                          fontStyle: 'italic'
                        }}>
                          (Substituint...)
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    {formatFileSize(attachment.size)}
                  </td>
                  <td style={{
                    padding: '12px',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    fontSize: '13px'
                  }}>
                    {formatDate(attachment.created_at)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div 
                      style={{ position: 'relative', display: 'inline-block' }} 
                      data-menu-container
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === attachment.id ? null : attachment.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          color: darkMode ? '#9ca3af' : '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#e5e7eb'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen === attachment.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '4px',
                            backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            minWidth: '160px',
                            zIndex: 1000,
                            overflow: 'hidden'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleView(attachment)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: darkMode ? '#ffffff' : '#111827',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Eye size={14} />
                            Obrir
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRenameClick(attachment)
                            }}
                            disabled={replacingFileId === attachment.id}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: replacingFileId === attachment.id ? 'not-allowed' : 'pointer',
                              color: darkMode ? '#ffffff' : '#111827',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s',
                              opacity: replacingFileId === attachment.id ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (replacingFileId !== attachment.id) {
                                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Edit size={14} />
                            Renombrar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReplaceClick(attachment)
                            }}
                            disabled={replacingFileId === attachment.id || uploading}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: (replacingFileId === attachment.id || uploading) ? 'not-allowed' : 'pointer',
                              color: darkMode ? '#ffffff' : '#111827',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s',
                              opacity: (replacingFileId === attachment.id || uploading) ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (replacingFileId !== attachment.id && !uploading) {
                                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Upload size={14} />
                            {replacingFileId === attachment.id ? 'Substituint...' : 'Substituir'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(attachment)
                            }}
                            disabled={replacingFileId === attachment.id || deleting}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              cursor: (replacingFileId === attachment.id || deleting) ? 'not-allowed' : 'pointer',
                              color: '#ef4444',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s',
                              opacity: (replacingFileId === attachment.id || deleting) ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (replacingFileId !== attachment.id && !deleting) {
                                e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#fee2e2'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !expenseId && attachments.length === 0 && (
        <div style={styles.uploadHint}>(No hi ha receipts pendents d'adjuntar)</div>
      )}

      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        itemName={attachmentToDelete?.file_name || ''}
        entityType="Receipt"
        isDeleting={deleting}
        darkMode={darkMode}
      />

      {/* Image Preview Modal */}
      {showPreviewModal && previewUrl && previewType === 'image' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => {
            setShowPreviewModal(false)
            setPreviewUrl(null)
            setPreviewType(null)
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowPreviewModal(false)
                setPreviewUrl(null)
                setPreviewType(null)
              }}
              style={{
                position: 'absolute',
                top: '-40px',
                right: 0,
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <X size={20} />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && attachmentToRename && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1500,
            padding: '20px'
          }}
          onClick={handleCancelRename}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: darkMode ? '#15151f' : '#ffffff',
              borderRadius: '16px',
              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                Renombrar fitxer
              </h3>
              <button
                onClick={handleCancelRename}
                disabled={renaming}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: renaming ? 'not-allowed' : 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: renaming ? 0.5 : 1
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: darkMode ? '#ffffff' : '#111827',
                marginBottom: '8px'
              }}>
                Nom del fitxer
              </label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                disabled={renaming}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
                  color: darkMode ? '#ffffff' : '#111827',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4f46e5'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = darkMode ? '#374151' : '#e5e7eb'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !renaming && newFileName.trim()) {
                    handleConfirmRename()
                  }
                  if (e.key === 'Escape') {
                    handleCancelRename()
                  }
                }}
                autoFocus
              />
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '20px 24px',
              borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
            }}>
              <button
                onClick={handleCancelRename}
                disabled={renaming}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: renaming ? 'not-allowed' : 'pointer',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  transition: 'opacity 0.2s',
                  opacity: renaming ? 0.5 : 1
                }}
              >
                Cancel·lar
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={renaming || !newFileName.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (renaming || !newFileName.trim()) ? 'not-allowed' : 'pointer',
                  backgroundColor: (renaming || !newFileName.trim()) ? '#9ca3af' : '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s',
                  opacity: (renaming || !newFileName.trim()) ? 0.5 : 1
                }}
              >
                {renaming ? (
                  'Renombrant...'
                ) : (
                  <>
                    <Save size={14} />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
