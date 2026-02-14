import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Image, File, MoreVertical, ExternalLink, Download, Edit, Trash2, Loader, RefreshCw, AlertCircle, FolderPlus, CloudOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { driveService } from '../lib/googleDrive'
import { updateProjectArtsFinalsFolderId } from '../lib/supabase'
import { showToast } from './Toast'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import DriveStatus from './DriveStatus'

// Icones per tipus de fitxer
const getFileIcon = (mimeType, name) => {
  if (mimeType?.includes('image')) return Image
  if (mimeType?.includes('pdf') || name?.endsWith('.pdf')) return FileText
  if (mimeType?.includes('spreadsheet') || name?.endsWith('.xlsx') || name?.endsWith('.xls')) return FileText
  if (mimeType?.includes('document') || name?.endsWith('.docx') || name?.endsWith('.doc')) return FileText
  return File
}

// Formatar mida
const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Formatar data
const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ca-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateString
  }
}

export default function ArtsFinalsSection({ project, darkMode, onProjectUpdated }) {
  const { demoMode } = useApp()
  const isDriveReady = typeof driveService.isAuthenticated === 'function' && driveService.isAuthenticated()
  const [folderId, setFolderId] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)
  const [deletingFile, setDeletingFile] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [fileToRename, setFileToRename] = useState(null)
  const [newFileName, setNewFileName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  
  const fileInputRef = useRef(null)
  const dropzoneRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  // Load folder ID from project
  useEffect(() => {
    if (project?.arts_finals_folder_id) {
      setFolderId(project.arts_finals_folder_id)
    } else {
      setFolderId(null)
      setFiles([])
    }
  }, [project?.arts_finals_folder_id])

  // Load files when folder ID changes
  useEffect(() => {
    if (folderId && isDriveReady && !demoMode) {
      loadFiles()
    } else {
      setFiles([])
    }
  }, [folderId, isDriveReady, demoMode])

  // Close menu when clicking outside
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

  const loadFiles = async () => {
    if (!folderId || demoMode) return
    
    setLoading(true)
    setError(null)
    try {
      const filesList = await driveService.listFolderFiles(folderId)
      setFiles(filesList || [])
    } catch (err) {
      console.error('Error loading files:', err)
      if (err.message === 'AUTH_REQUIRED') {
        setError('Sessió expirada. Reconecta Google Drive.')
        showToast('Sessió de Drive expirada. Reconecta a Configuració.', 'error')
      } else {
        setError('Error carregant fitxers: ' + (err.message || 'Error desconegut'))
      }
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (demoMode) {
      showToast('Desactivat en mode demo', 'warning')
      return
    }

    if (!isDriveReady) {
      showToast('Connecta Google Drive primer', 'error')
      return
    }

    if (!project?.project_code || !project?.name) {
      showToast('Error: Falten dades del projecte', 'error')
      return
    }

    setCreatingFolder(true)
    setError(null)
    try {
      // Crear carpeta Arts Finals per al projecte
      const newFolderId = await driveService.ensureProjectArtsFinalsFolder({
        projectId: project.id,
        projectCode: project.project_code,
        projectName: project.name,
        arts_finals_folder_id: null
      })

      // Guardar folder ID al projecte
      await updateProjectArtsFinalsFolderId(project.id, newFolderId)
      
      setFolderId(newFolderId)
      
      // Actualizar projecte en el parent
      if (onProjectUpdated) {
        onProjectUpdated({ ...project, arts_finals_folder_id: newFolderId })
      }
      
      showToast('Carpeta Arts Finals creada correctament', 'success')
      
      // Carregar fitxers (buit inicialment)
      await loadFiles()
    } catch (err) {
      console.error('Error creating folder:', err)
      if (err.message === 'AUTH_REQUIRED') {
        setError('Sessió expirada. Reconecta Google Drive.')
        showToast('Sessió de Drive expirada. Reconecta a Configuració.', 'error')
      } else {
        const errorMsg = err.message || 'Error desconegut'
        setError('Error creant carpeta: ' + errorMsg)
        showToast('Error creant carpeta: ' + errorMsg, 'error')
      }
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (folderId && isDriveReady && !demoMode && !uploading) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setDragActive(false)
    if (!folderId || !isDriveReady || demoMode || uploading) return
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFiles(files)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await handleFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFiles = async (files) => {
    if (!folderId || demoMode) {
      showToast('Carpeta no disponible', 'error')
      return
    }

    if (!isDriveReady) {
      showToast('Connecta Google Drive primer', 'error')
      return
    }

    setUploading(true)
    setError(null)

    const uploaded = []
    const errors = []

    for (const file of files) {
      try {
        // Validar mida (max 100MB per Arts Finals)
        if (file.size > 100 * 1024 * 1024) {
          errors.push({ name: file.name, error: 'Fitxer massa gran (màx 100MB)' })
          continue
        }

        const result = await driveService.uploadFile(file, folderId)
        uploaded.push(result)
        showToast(`${file.name} pujat correctament`, 'success')
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err)
        if (err.message === 'AUTH_REQUIRED') {
          setError('Sessió expirada. Reconecta Google Drive.')
          showToast('Sessió de Drive expirada. Reconecta a Configuració.', 'error')
          setUploading(false)
          return
        }
        errors.push({ name: file.name, error: err.message || 'Error desconegut' })
      }
    }

    setUploading(false)

    if (errors.length > 0) {
      const errorMsg = `${errors.length} fitxer(s) no s'han pogut pujar:\n${errors.map(e => `- ${e.name}: ${e.error}`).join('\n')}`
      showToast(errorMsg, 'error')
    }

    // Refresh files list
    if (uploaded.length > 0) {
      await loadFiles()
    }
  }

  const handleView = async (file) => {
    try {
      const url = file.webViewLink || await driveService.openDriveFileUrl(file.id)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Error opening file:', err)
      showToast('Error obrint fitxer', 'error')
    }
  }

  const handleDownload = async (file) => {
    try {
      const url = file.webContentLink || file.webViewLink
      if (url) {
        window.open(url, '_blank')
      } else {
        const fileInfo = await driveService.getFileInfo(file.id)
        const downloadUrl = fileInfo.webContentLink || fileInfo.webViewLink
        if (downloadUrl) {
          window.open(downloadUrl, '_blank')
        } else {
          showToast('No s\'ha pogut obtenir l\'enllaç de descàrrega', 'error')
        }
      }
    } catch (err) {
      console.error('Error downloading file:', err)
      showToast('Error descarregant fitxer', 'error')
    }
  }

  const handleRename = async () => {
    if (!fileToRename || !newFileName.trim() || demoMode) return

    setRenaming(true)
    try {
      await driveService.renameFile(fileToRename.id, newFileName.trim())
      showToast('Fitxer reanomenat correctament', 'success')
      setShowRenameModal(false)
      setFileToRename(null)
      setNewFileName('')
      await loadFiles()
    } catch (err) {
      console.error('Error renaming file:', err)
      if (err.message === 'AUTH_REQUIRED') {
        showToast('Sessió expirada. Reconecta Google Drive.', 'error')
      } else {
        showToast('Error reanomenant fitxer: ' + (err.message || 'Error desconegut'), 'error')
      }
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (!fileToDelete || demoMode) return

    setDeletingFile(true)
    try {
      await driveService.deleteFile(fileToDelete.id)
      showToast('Fitxer eliminat correctament', 'success')
      setShowDeleteModal(false)
      setFileToDelete(null)
      await loadFiles()
    } catch (err) {
      console.error('Error deleting file:', err)
      if (err.message === 'AUTH_REQUIRED') {
        showToast('Sessió expirada. Reconecta Google Drive.', 'error')
      } else {
        showToast('Error eliminant fitxer: ' + (err.message || 'Error desconegut'), 'error')
      }
    } finally {
      setDeletingFile(false)
    }
  }

  // State 1: Drive NOT connected
  if (!isDriveReady) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: darkMode ? '#15151f' : '#ffffff',
        borderRadius: '12px',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Arts Finals
        </h3>
        <div style={{
          padding: '24px',
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderRadius: '8px',
          border: `1px dashed ${darkMode ? '#374151' : '#d1d5db'}`,
          textAlign: 'center'
        }}>
          <CloudOff size={32} color={darkMode ? '#9ca3af' : '#6b7280'} style={{ marginBottom: '12px' }} />
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Connecta Google Drive per usar Arts Finals
          </p>
          <DriveStatus />
        </div>
      </div>
    )
  }

  // State 2: Drive connected BUT folder not created
  if (!folderId) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: darkMode ? '#15151f' : '#ffffff',
        borderRadius: '12px',
        border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Arts Finals
        </h3>
        <div style={{
          padding: '24px',
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{
            margin: '0 0 16px 0',
            fontSize: '14px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Encara no hi ha carpeta d'Arts Finals per aquest projecte.
          </p>
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder || demoMode}
            style={{
              padding: '10px 20px',
              backgroundColor: demoMode ? '#6b7280' : '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: demoMode ? 'not-allowed' : creatingFolder ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: creatingFolder ? 0.7 : 1
            }}
          >
            {creatingFolder ? (
              <>
                <Loader size={16} className="animate-spin" />
                Creant...
              </>
            ) : (
              <>
                <FolderPlus size={16} />
                Crear carpeta
              </>
            )}
          </button>
          {demoMode && (
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '12px',
              color: darkMode ? '#6b7280' : '#9ca3af',
              fontStyle: 'italic'
            }}>
              Desactivat en mode demo
            </p>
          )}
        </div>
      </div>
    )
  }

  // State 3: Drive connected AND folder exists
  const FileIcon = getFileIcon(null, null)

  return (
    <div style={{
      padding: '24px',
      backgroundColor: darkMode ? '#15151f' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          Arts Finals
        </h3>
        <button
          onClick={loadFiles}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: darkMode ? '#9ca3af' : '#6b7280',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '6px',
            fontSize: '12px',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualitzar
        </button>
      </div>

      {/* Dropzone */}
      <div
        ref={dropzoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && !demoMode && fileInputRef.current?.click()}
        style={{
          padding: '32px',
          backgroundColor: dragActive
            ? (darkMode ? '#1f1f2e' : '#f3f4f6')
            : (darkMode ? '#1f1f2e' : '#f9fafb'),
          border: `2px dashed ${
            dragActive
              ? '#4f46e5'
              : (darkMode ? '#374151' : '#d1d5db')
          }`,
          borderRadius: '12px',
          textAlign: 'center',
          cursor: uploading || demoMode ? 'not-allowed' : 'pointer',
          opacity: uploading || demoMode ? 0.6 : 1,
          marginBottom: '24px',
          transition: 'all 0.2s'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={uploading || demoMode}
        />
        {uploading ? (
          <>
            <Loader size={32} color={darkMode ? '#9ca3af' : '#6b7280'} className="animate-spin" style={{ marginBottom: '12px' }} />
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              Pujant fitxers...
            </p>
          </>
        ) : demoMode ? (
          <>
            <Upload size={32} color={darkMode ? '#6b7280' : '#9ca3af'} style={{ marginBottom: '12px' }} />
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: darkMode ? '#6b7280' : '#9ca3af',
              fontStyle: 'italic'
            }}>
              Desactivat en mode demo
            </p>
          </>
        ) : (
          <>
            <Upload size={32} color={darkMode ? '#9ca3af' : '#6b7280'} style={{ marginBottom: '12px' }} />
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: darkMode ? '#9ca3af' : '#6b7280',
              marginBottom: '4px'
            }}>
              Arrossega fitxers aquí o clica per seleccionar
            </p>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: darkMode ? '#6b7280' : '#9ca3af'
            }}>
              PDF, JPG, PNG, DOCX, XLSX (màx 100MB)
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2',
          border: `1px solid ${darkMode ? '#991b1b' : '#fecaca'}`,
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} color="#ef4444" />
          <span style={{
            fontSize: '13px',
            color: darkMode ? '#fca5a5' : '#dc2626'
          }}>
            {error}
          </span>
        </div>
      )}

      {/* Files list */}
      {loading ? (
        <div style={{
          padding: '32px',
          textAlign: 'center'
        }}>
          <Loader size={24} color={darkMode ? '#9ca3af' : '#6b7280'} className="animate-spin" />
          <p style={{
            margin: '12px 0 0 0',
            fontSize: '14px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Carregant...
          </p>
        </div>
      ) : files.length === 0 ? (
        <div style={{
          padding: '32px',
          textAlign: 'center'
        }}>
          <FileIcon size={32} color={darkMode ? '#6b7280' : '#9ca3af'} style={{ marginBottom: '12px' }} />
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Encara no hi ha arxius.
          </p>
        </div>
      ) : (
        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
              }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Nom
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Tipus
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Mida
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  Modificat
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: darkMode ? '#9ca3af' : '#6b7280',
                  textTransform: 'uppercase',
                  width: '48px'
                }}>
                  Accions
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType, file.name)
                return (
                  <tr
                    key={file.id}
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
                    <td style={{
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Icon size={18} color={darkMode ? '#9ca3af' : '#6b7280'} />
                      <span style={{
                        fontSize: '14px',
                        color: darkMode ? '#ffffff' : '#111827'
                      }}>
                        {file.name}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '13px',
                      color: darkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      {file.mimeType || '-'}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontSize: '13px',
                      color: darkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      {formatSize(file.size)}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '13px',
                      color: darkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      {formatDate(file.modifiedTime)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right'
                    }}>
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-block'
                        }}
                        data-menu-container
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === file.id ? null : file.id)
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
                        {menuOpen === file.id && (
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
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleView(file)
                                setMenuOpen(null)
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: darkMode ? '#ffffff' : '#111827',
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
                              <ExternalLink size={16} />
                              Veure / Obrir
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(file)
                                setMenuOpen(null)
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: darkMode ? '#ffffff' : '#111827',
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
                              <Download size={16} />
                              Descarregar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setFileToRename(file)
                                setNewFileName(file.name)
                                setShowRenameModal(true)
                                setMenuOpen(null)
                              }}
                              disabled={demoMode}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: demoMode ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                color: demoMode ? (darkMode ? '#6b7280' : '#9ca3af') : (darkMode ? '#ffffff' : '#111827'),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background-color 0.2s',
                                opacity: demoMode ? 0.5 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!demoMode) {
                                  e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#f3f4f6'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Edit size={16} />
                              Reanomenar
                            </button>
                            <div style={{
                              height: '1px',
                              backgroundColor: darkMode ? '#374151' : '#e5e7eb',
                              margin: '4px 0'
                            }} />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setFileToDelete(file)
                                setShowDeleteModal(true)
                                setMenuOpen(null)
                              }}
                              disabled={demoMode}
                              style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                cursor: demoMode ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                color: demoMode ? (darkMode ? '#6b7280' : '#9ca3af') : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background-color 0.2s',
                                opacity: demoMode ? 0.5 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!demoMode) {
                                  e.currentTarget.style.backgroundColor = darkMode ? '#7f1d1d' : '#fee2e2'
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setFileToDelete(null)
        }}
        onConfirm={handleDelete}
        entityName={fileToDelete?.name || ''}
        entityType="fitxer"
        isDeleting={deletingFile}
        darkMode={darkMode}
      />

      {/* Rename Modal */}
      {showRenameModal && (
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
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            if (!renaming) {
              setShowRenameModal(false)
              setFileToRename(null)
              setNewFileName('')
            }
          }}
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
            <div style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                Reanomenar fitxer
              </h3>
            </div>
            <div style={{
              padding: '24px'
            }}>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !renaming && newFileName.trim()) {
                    handleRename()
                  }
                  if (e.key === 'Escape') {
                    setShowRenameModal(false)
                    setFileToRename(null)
                    setNewFileName('')
                  }
                }}
                disabled={renaming}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: darkMode ? '#1f1f2e' : '#ffffff',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: darkMode ? '#ffffff' : '#111827',
                  marginBottom: '16px'
                }}
                autoFocus
              />
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => {
                    setShowRenameModal(false)
                    setFileToRename(null)
                    setNewFileName('')
                  }}
                  disabled={renaming}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: renaming ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel·lar
                </button>
                <button
                  onClick={handleRename}
                  disabled={renaming || !newFileName.trim()}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: renaming || !newFileName.trim() ? '#6b7280' : '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: renaming || !newFileName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {renaming && <Loader size={14} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  )
}
