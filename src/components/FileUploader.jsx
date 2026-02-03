import { useState, useRef } from 'react'
import { Upload, X, Check, Loader, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { driveService } from '../lib/googleDrive'
import Button from './Button'

export default function FileUploader({ folderId, onUploadComplete, label = 'Arrossega arxius aquí' }) {
  const { darkMode } = useApp()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    await uploadFiles(files)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    await uploadFiles(files)
  }

  const uploadFiles = async (files) => {
    if (!folderId || files.length === 0) return
    
    setUploading(true)
    setError(null)
    const uploaded = []
    const failed = []

    for (const file of files) {
      try {
        // Validar mida (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          failed.push({ name: file.name, error: 'Fitxer massa gran (màx 10MB)' })
          setError(`${file.name} és massa gran (màx 10MB)`)
          continue
        }

        const result = await driveService.uploadFile(file, folderId)
        uploaded.push({
          name: file.name,
          id: result.id,
          driveId: result.id,  // Per compatibilitat
          driveUrl: result.webViewLink,  // Per compatibilitat
          webViewLink: result.webViewLink,
          size: file.size
        })
      } catch (err) {
        console.error('Error uploading file:', err)
        
        // Si és error d'autenticació, no continuar amb altres fitxers
        if (err.message === 'AUTH_REQUIRED') {
          setError('Sessió expirada. Reconecta Google Drive.')
          setUploading(false)
          alert('Reconnecta Google Drive. La sessió ha expirat.')
          return
        }
        
        failed.push({ 
          name: file.name, 
          error: err.message || 'Error desconegut' 
        })
        setError(`Error pujant ${file.name}: ${err.message || 'Error desconegut'}`)
      }
    }

    setUploadedFiles(prev => [...prev, ...uploaded])
    setUploading(false)

    // Mostrar resum d'errors si n'hi ha
    if (failed.length > 0) {
      const errorMsg = `${failed.length} fitxer(s) no s'han pogut pujar:\n${failed.map(f => `- ${f.name}: ${f.error}`).join('\n')}`
      alert(errorMsg)
    }

    // Només cridar onUploadComplete amb els que s'han pujat correctament
    if (onUploadComplete && uploaded.length > 0) {
      onUploadComplete(uploaded)
    }

    // Netejar després de 3 segons
    setTimeout(() => {
      setUploadedFiles([])
    }, 3000)
  }

  const clearCompleted = () => {
    setUploadedFiles([])
  }

  return (
    <div style={styles.container}>
      {/* Drop zone */}
      <div
        style={{
          ...styles.dropZone,
          backgroundColor: isDragging ? '#4f46e510' : (darkMode ? '#1f1f2e' : '#f9fafb'),
          borderColor: isDragging ? '#4f46e5' : '#d1d5db'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div style={styles.uploadingState}>
            <Loader size={24} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#4f46e5' }}>Pujant...</span>
          </div>
        ) : (
          <>
            <Upload size={24} color={isDragging ? '#4f46e5' : '#9ca3af'} />
            <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>{label}</span>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Màxim 10MB per arxiu</span>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div style={styles.uploadedList}>
          {uploadedFiles.map((file, idx) => (
            <div key={idx} style={{
              ...styles.uploadedItem,
              backgroundColor: darkMode ? '#1f1f2e' : '#f0fdf4'
            }}>
              <Check size={16} color="#22c55e" />
              <span style={{ color: darkMode ? '#ffffff' : '#111827', flex: 1 }}>{file.name}</span>
              <span style={{ color: '#22c55e', fontSize: '12px' }}>Completat</span>
            </div>
          ))}
          <Button variant="danger" onClick={clearCompleted}>
            Netejar completats
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.error}>
          <X size={14} />
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    marginBottom: '16px'
  },
  dropZone: {
    padding: '32px',
    borderRadius: '12px',
    border: '2px dashed',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  uploadingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  uploadedList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  uploadedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '14px'
  },
  clearBtn: {
    alignSelf: 'flex-start',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  error: {
    marginTop: '12px',
    padding: '10px 12px',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    borderRadius: '8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
}
