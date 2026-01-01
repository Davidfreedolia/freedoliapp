import { useState, useEffect, useCallback } from 'react'
import { FileText, Image, File, Download, Trash2, RefreshCw, ExternalLink, FolderOpen } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { driveService } from '../lib/googleDrive'

// Icones per tipus de fitxer
const getFileIcon = (mimeType, name) => {
  if (mimeType?.includes('image')) return Image
  if (mimeType?.includes('pdf') || name?.endsWith('.pdf')) return FileText
  if (mimeType?.includes('spreadsheet') || name?.endsWith('.xlsx') || name?.endsWith('.xls')) return FileText
  if (mimeType?.includes('document') || name?.endsWith('.docx') || name?.endsWith('.doc')) return FileText
  return File
}

// Colors per tipus
const getFileColor = (mimeType, name) => {
  if (mimeType?.includes('image')) return '#8b5cf6'
  if (mimeType?.includes('pdf') || name?.endsWith('.pdf')) return '#ef4444'
  if (mimeType?.includes('spreadsheet') || name?.endsWith('.xlsx')) return '#22c55e'
  if (mimeType?.includes('document') || name?.endsWith('.docx')) return '#3b82f6'
  return '#6b7280'
}

// Formatar mida
const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FileBrowser({ folderId, folderName = 'Carpeta', allowDelete = false, onRefresh }) {
  const { darkMode } = useApp()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const contents = await driveService.listFolderContents(folderId)
      // Filtrar només fitxers (no carpetes)
      const filesList = contents.filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
      setFiles(filesList)
    } catch (err) {
      console.error('Error loading files:', err)
      setError('Error carregant fitxers')
    }
    setLoading(false)
  }, [folderId])

  useEffect(() => {
    if (folderId) {
      loadFiles()
    }
  }, [folderId, loadFiles])

  const handleDelete = async (file) => {
    if (!confirm(`Segur que vols eliminar "${file.name}"?`)) return
    try {
      await driveService.deleteFile(file.id)
      setFiles(prev => prev.filter(f => f.id !== file.id))
    } catch (err) {
      console.error('Error deleting file:', err)
      alert('Error eliminant el fitxer')
    }
  }

  const handleRefresh = () => {
    loadFiles()
    if (onRefresh) onRefresh()
  }

  if (loading) {
    return (
      <div style={{
        ...styles.container,
        backgroundColor: darkMode ? '#15151f' : '#ffffff'
      }}>
        <div style={styles.loading}>
          <RefreshCw size={20} color="#6b7280" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: '#6b7280' }}>Carregant...</span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      ...styles.container,
      backgroundColor: darkMode ? '#15151f' : '#ffffff'
    }}>
      {/* Header */}
      <div style={styles.header}>
        <h4 style={{ ...styles.title, color: darkMode ? '#ffffff' : '#111827' }}>
          {folderName}
        </h4>
        <button onClick={handleRefresh} style={styles.refreshBtn}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Files list */}
      {error ? (
        <div style={styles.error}>{error}</div>
      ) : files.length === 0 ? (
        <div style={styles.empty}>
          <FolderOpen size={32} color="#d1d5db" />
          <span style={{ color: '#6b7280' }}>Carpeta buida</span>
        </div>
      ) : (
        <div style={styles.filesList}>
          {files.map(file => {
            const FileIcon = getFileIcon(file.mimeType, file.name)
            const fileColor = getFileColor(file.mimeType, file.name)
            
            return (
              <div key={file.id} style={{
                ...styles.fileItem,
                backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb'
              }}>
                <div style={{ ...styles.fileIcon, backgroundColor: `${fileColor}15` }}>
                  <FileIcon size={18} color={fileColor} />
                </div>
                <div style={styles.fileInfo}>
                  <span style={{ ...styles.fileName, color: darkMode ? '#ffffff' : '#111827' }}>
                    {file.name}
                  </span>
                  <span style={styles.fileMeta}>
                    {formatSize(file.size)}
                  </span>
                </div>
                <div style={styles.fileActions}>
                  <a
                    href={file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.actionBtn}
                  >
                    <ExternalLink size={14} />
                  </a>
                  {allowDelete && (
                    <button onClick={() => handleDelete(file)} style={{ ...styles.actionBtn, color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid var(--border-color)'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600'
  },
  refreshBtn: {
    padding: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '6px'
  },
  loading: {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  empty: {
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  error: {
    padding: '16px',
    color: '#ef4444',
    textAlign: 'center'
  },
  filesList: {
    padding: '8px'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '4px'
  },
  fileIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileInfo: {
    flex: 1,
    minWidth: 0
  },
  fileName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fileMeta: {
    fontSize: '12px',
    color: '#6b7280'
  },
  fileActions: {
    display: 'flex',
    gap: '4px'
  },
  actionBtn: {
    padding: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center'
  }
}
