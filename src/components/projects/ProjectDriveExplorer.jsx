import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ExternalLink,
  Download,
  Folder,
  FileText,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  RefreshCw,
  Search,
  Receipt,
  ShoppingCart,
  FileDown,
  Truck,
  BadgeCheck,
  Box,
  Tag,
  Image
} from 'lucide-react'
import Button from '../Button'
import FileUploader from '../FileUploader'
import { storageService } from '../../lib/storageService'

export default function ProjectDriveExplorer({
  projectId,
  darkMode,
  onUploadComplete,
  readOnly = false,
  fixedFolderId = null,
  onActivePathChange
}) {
  const { i18n } = useTranslation()
  const locale = i18n?.language?.startsWith('en')
    ? 'en'
    : i18n?.language?.startsWith('es')
    ? 'es'
    : 'ca'
  const copy = {
    ca: {
      projectDocs: 'Documents del projecte',
      sections: 'Seccions',
      explorer: 'Fitxers',
      preview: 'Vista prèvia',
      loading: 'Carregant...',
      newFolder: 'Nova carpeta',
      newFolderTooltip: 'Crea una subcarpeta dins d’aquesta secció',
      back: 'Enrere',
      backTooltip: 'Torna a la carpeta anterior',
      refreshLink: 'Actualitza enllaç',
      refreshLinkTooltip: 'Regenera l’enllaç temporal',
      open: 'Obre',
      download: 'Descarrega',
      delete: 'Esborra',
      deleteTooltip: 'Elimina l’arxiu',
      emptyNoProject: 'Selecciona un projecte per veure els documents.',
      emptySections: 'Sense seccions',
      emptyFolderTitle: 'Carpeta buida',
      emptyFolderSub: '',
      noFileSelected: 'Selecciona un fitxer per previsualitzar-lo.',
      previewUnavailable: 'Previsualització no disponible.',
      imagePreviewError: "No es pot previsualitzar. Obre l'arxiu.",
      dragTitle: 'Deixa anar els fitxers per pujar-los',
      dragSub: 'Es pujaran a aquesta carpeta',
      newFolderTitle: 'Nova carpeta',
      newFolderPlaceholder: 'Nom de la carpeta',
      create: 'Crear',
      cancel: 'Cancel·lar',
      validationRequired: 'Escriu un nom de carpeta.',
      validationInvalid: 'Nom no vàlid. Treu caràcters especials.',
      validationExists: 'Aquesta carpeta ja existeix.',
      errorPermission: 'No tens permís per veure o pujar documents d’aquest projecte.',
      errorSession: 'Sessió expirada. Torna a iniciar sessió.',
      errorNetwork: 'Error de xarxa. Torna-ho a provar.',
      errorGeneric: 'Alguna cosa ha fallat.',
      deleteConfirmTitle: 'Esborrar arxiu?',
      deleteConfirmText: 'Aquesta acció no es pot desfer.',
      deleteConfirm: 'Esborra'
    },
    en: {
      projectDocs: 'Project documents',
      sections: 'Sections',
      explorer: 'Files',
      preview: 'Preview',
      loading: 'Loading...',
      newFolder: 'New folder',
      newFolderTooltip: 'Create a subfolder in this section',
      back: 'Back',
      backTooltip: 'Go to previous folder',
      refreshLink: 'Refresh link',
      refreshLinkTooltip: 'Regenerate temporary link',
      open: 'Open',
      download: 'Download',
      delete: 'Delete',
      deleteTooltip: 'Delete file',
      emptyNoProject: 'Select a project to view documents.',
      emptySections: 'No sections',
      emptyFolderTitle: 'Empty folder',
      emptyFolderSub: '',
      noFileSelected: 'Select a file to preview it.',
      previewUnavailable: 'Preview not available.',
      imagePreviewError: "Can’t preview. Open the file.",
      dragTitle: 'Drop files to upload',
      dragSub: "They’ll be uploaded to this folder",
      newFolderTitle: 'New folder',
      newFolderPlaceholder: 'Folder name',
      create: 'Create',
      cancel: 'Cancel',
      validationRequired: 'Enter a folder name.',
      validationInvalid: 'Invalid name. Remove special characters.',
      validationExists: 'This folder already exists.',
      errorPermission: "You don’t have permission to view or upload documents for this project.",
      errorSession: 'Session expired. Please sign in again.',
      errorNetwork: 'Network error. Try again.',
      errorGeneric: 'Something went wrong.',
      deleteConfirmTitle: 'Delete file?',
      deleteConfirmText: "This action can’t be undone.",
      deleteConfirm: 'Delete'
    },
    es: {
      projectDocs: 'Documentos del proyecto',
      sections: 'Secciones',
      explorer: 'Archivos',
      preview: 'Vista previa',
      loading: 'Cargando...',
      newFolder: 'Nueva carpeta',
      newFolderTooltip: 'Crea una subcarpeta en esta sección',
      back: 'Atrás',
      backTooltip: 'Vuelve a la carpeta anterior',
      refreshLink: 'Actualizar enlace',
      refreshLinkTooltip: 'Regenera el enlace temporal',
      open: 'Abrir',
      download: 'Descargar',
      delete: 'Eliminar',
      deleteTooltip: 'Elimina el archivo',
      emptyNoProject: 'Selecciona un proyecto para ver los documentos.',
      emptySections: 'Sin secciones',
      emptyFolderTitle: 'Carpeta vacía',
      emptyFolderSub: '',
      noFileSelected: 'Selecciona un archivo para previsualizarlo.',
      previewUnavailable: 'Vista previa no disponible.',
      imagePreviewError: 'No se puede previsualizar. Abre el archivo.',
      dragTitle: 'Suelta los archivos para subirlos',
      dragSub: 'Se subirán a esta carpeta',
      newFolderTitle: 'Nueva carpeta',
      newFolderPlaceholder: 'Nombre de la carpeta',
      create: 'Crear',
      cancel: 'Cancelar',
      validationRequired: 'Escribe un nombre de carpeta.',
      validationInvalid: 'Nombre no válido. Quita caracteres especiales.',
      validationExists: 'Esta carpeta ya existe.',
      errorPermission: 'No tienes permiso para ver o subir documentos de este proyecto.',
      errorSession: 'Sesión caducada. Inicia sesión otra vez.',
      errorNetwork: 'Error de red. Inténtalo de nuevo.',
      errorGeneric: 'Algo ha fallado.',
      deleteConfirmTitle: '¿Eliminar archivo?',
      deleteConfirmText: 'Esta acción no se puede deshacer.',
      deleteConfirm: 'Eliminar'
    }
  }
  const c = copy[locale]
  const projectRootPath = projectId ? `projects/${projectId}/` : null
  const rootId = fixedFolderId || projectRootPath
  const [selectedFolderId, setSelectedFolderId] = useState(rootId)
  const [projectFolders, setProjectFolders] = useState([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [explorerFolders, setExplorerFolders] = useState([])
  const [explorerFiles, setExplorerFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [errorFiles, setErrorFiles] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [folderStack, setFolderStack] = useState([])
  const [imageError, setImageError] = useState(false)
  const foldersSeq = useRef(0)
  const filesSeq = useRef(0)
  const [selectedFileUrl, setSelectedFileUrl] = useState('')
  const signedUrlCache = useRef(new Map())
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const dragDepthRef = useRef(0)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderError, setNewFolderError] = useState(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingFile, setDeletingFile] = useState(false)
  const dropzoneRef = useRef(null)
  const errorMessage = c.errorPermission
  const sessionMessage = c.errorSession
  const networkMessage = c.errorNetwork
  const genericMessage = c.errorGeneric

  const sanitizeFolderName = (value) => value.replace(/[\\/:*?"<>|]/g, '').trim()
  const isPermissionError = (message) => /permission|denied|rls|not authorized|jwt/i.test(message || '')
  const isNetworkError = (message) => /network|failed to fetch/i.test(message || '')
  const isSessionError = (message) => /401|unauthorized/i.test(message || '')

  const getSignedUrlCached = async (path, { force = false } = {}) => {
    if (!path) return ''
    const cached = signedUrlCache.current.get(path)
    if (!force && cached && Date.now() - cached.ts < 240000) {
      return cached.url
    }
    const url = await storageService.getSignedUrl(path)
    signedUrlCache.current.set(path, { url, ts: Date.now() })
    return url
  }


  const loadProjectFolders = async () => {
    if (!projectRootPath) return
    const seq = ++foldersSeq.current
    setLoadingFolders(true)
    try {
      const contents = await storageService.listFolder(projectRootPath)
      if (seq !== foldersSeq.current) return
      const folders = (contents || [])
        .filter(item => item?.id === null)
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
        .map(item => ({
          key: item.name,
          label: (item.name || '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          prefix: `${projectRootPath}${item.name}/`,
          icon: Folder
        }))
      setProjectFolders(folders)
    } catch (err) {
      if (seq !== foldersSeq.current) return
      setProjectFolders([])
    } finally {
      if (seq === foldersSeq.current) setLoadingFolders(false)
    }
  }

  const loadFolderContents = async (folderId) => {
    if (!folderId) return
    const seq = ++filesSeq.current
    setLoadingFiles(true)
    setErrorFiles(null)
    try {
      const contents = await storageService.listFolder(folderId)
      if (seq !== filesSeq.current) return
      const folderItems = (contents || [])
        .filter(item => item?.id === null)
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
      const fileItems = (contents || [])
        .filter(item => item?.id !== null)
        .filter(item => item?.name !== '.keep' && item?.name !== '.folder')
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
      setExplorerFolders(folderItems.map(item => ({ ...item, path: `${folderId}${item.name}/` })))
      const filesWithPath = fileItems.map(item => ({ ...item, path: `${folderId}${item.name}` }))
      setExplorerFiles(filesWithPath)
      setSelectedFile(prev => (prev && filesWithPath.find(f => f.path === prev.path)) ? prev : (filesWithPath[0] || null))
    } catch (err) {
      if (seq !== filesSeq.current) return
      const message = err?.message || ''
      // Detecta si l'error indica que les carpetes no existeixen (404 o permisos quan no hi ha contingut)
      const resolved = isPermissionError(message)
        ? errorMessage
        : isSessionError(message)
        ? sessionMessage
        : isNetworkError(message)
        ? networkMessage
        : genericMessage
      setErrorFiles(resolved)
      setExplorerFolders([])
      setExplorerFiles([])
      setSelectedFile(null)
    } finally {
      if (seq === filesSeq.current) setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (!rootId) return
    setSelectedFolderId(rootId)
    setFolderStack([])
  }, [rootId])

  useEffect(() => {
    if (!rootId) {
      setExplorerFolders([])
      setExplorerFiles([])
      setSelectedFile(null)
      setFolderStack([])
      filesSeq.current += 1
      foldersSeq.current += 1
    }
  }, [rootId])

  useEffect(() => {
    if (projectRootPath) {
      loadProjectFolders()
    } else {
      setProjectFolders([])
    }
  }, [projectId, projectRootPath])

  useEffect(() => {
    if (!selectedFolderId) return
    loadFolderContents(selectedFolderId)
  }, [selectedFolderId])

  useEffect(() => {
    setShowNewFolder(false)
    setNewFolderName('')
    setNewFolderError(null)
  }, [selectedFolderId])

  useEffect(() => {
    setImageError(false)
  }, [selectedFile?.path])

  useEffect(() => {
    let isActive = true
    const loadUrl = async () => {
      if (!selectedFile?.path) {
        setSelectedFileUrl('')
        return
      }
      try {
        const url = await getSignedUrlCached(selectedFile.path)
        if (isActive) setSelectedFileUrl(url)
      } catch {
        if (isActive) setSelectedFileUrl('')
      }
    }
    loadUrl()
    return () => {
      isActive = false
    }
  }, [selectedFile?.path])

  const handleUploadDone = (uploaded) => {
    if (onUploadComplete) onUploadComplete(uploaded)
    if (selectedFolderId) loadFolderContents(selectedFolderId)
  }

  const uploadFilesToFolder = async (files, targetFolderId) => {
    if (!targetFolderId || !files?.length) return
    if (!targetFolderId.endsWith('/')) {
      setErrorFiles(errorMessage)
      return
    }
    const uploaded = []
    for (const file of files) {
      try {
        await storageService.uploadFile(`${targetFolderId}${file.name}`, file)
        uploaded.push({
          name: file.name,
          path: `${targetFolderId}${file.name}`,
          size: file.size
        })
      } catch (err) {
        const message = err?.message || ''
        const resolved = isPermissionError(message)
          ? errorMessage
          : isSessionError(message)
          ? sessionMessage
          : isNetworkError(message)
          ? networkMessage
          : genericMessage
        setErrorFiles(resolved)
        break
      }
    }
    if (uploaded.length && onUploadComplete) onUploadComplete(uploaded)
    if (targetFolderId === selectedFolderId) loadFolderContents(targetFolderId)
  }

  const handleDragEnter = (e) => {
    if (readOnly || !canUpload) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingFiles(true)
  }

  const handleDragLeave = (e) => {
    if (readOnly || !canUpload) return
    e.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDraggingFiles(false)
    }
  }

  const handleDragOver = (e) => {
    if (readOnly || !canUpload) return
    e.preventDefault()
    setIsDraggingFiles(true)
  }

  const handleFolderDrop = (e, targetFolderId) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly) return
    if (!canUpload) return
    dragDepthRef.current = 0
    setIsDraggingFiles(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    uploadFilesToFolder(dropped, targetFolderId)
  }

  const handlePanelDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly || !canUpload) return
    dragDepthRef.current = 0
    setIsDraggingFiles(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    uploadFilesToFolder(dropped, selectedFolderId)
  }

  const handleEnterFolder = (folder) => {
    if (!folder?.path) return
    setFolderStack(prev => [...prev, selectedFolderId])
    setSelectedFolderId(folder.path)
  }

  const handleBack = () => {
    if (fixedFolderId) return
    if (!folderStack.length) return
    const next = [...folderStack]
    const previousId = next.pop()
    setFolderStack(next)
    if (previousId) setSelectedFolderId(previousId)
  }

  const handleCreateFolder = async () => {
    if (!selectedFolderId) return
    const trimmed = newFolderName.trim()
    const cleaned = sanitizeFolderName(newFolderName)
    if (!cleaned) {
      setNewFolderError(c.validationRequired)
      return
    }
    if (cleaned !== trimmed) {
      setNewFolderError(c.validationInvalid)
      return
    }
    const exists = explorerFolders.some(folder => (folder?.name || '').toLowerCase() === cleaned.toLowerCase())
    if (exists) {
      setNewFolderError(c.validationExists)
      return
    }
    setCreatingFolder(true)
    setNewFolderError(null)
    try {
      await storageService.createFolder(`${selectedFolderId}${cleaned}/`)
      setShowNewFolder(false)
      setNewFolderName('')
      loadFolderContents(selectedFolderId)
      // If we're at project root, refresh the folders list
      if (selectedFolderId === projectRootPath && projectRootPath && !fixedFolderId) {
        await loadProjectFolders()
      }
    } catch (err) {
      const message = err?.message || ''
      const resolved = isPermissionError(message)
        ? errorMessage
        : isSessionError(message)
        ? sessionMessage
        : isNetworkError(message)
        ? networkMessage
        : genericMessage
      setNewFolderError(resolved)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteFile = async () => {
    if (!selectedFile?.path) return
    setDeletingFile(true)
    try {
      await storageService.deleteFile(selectedFile.path)
      setDeleteConfirmOpen(false)
      setSelectedFile(null)
      setSelectedFileUrl('')
      loadFolderContents(selectedFolderId)
    } catch (err) {
      const message = err?.message || ''
      const resolved = isPermissionError(message)
        ? errorMessage
        : isSessionError(message)
        ? sessionMessage
        : isNetworkError(message)
        ? networkMessage
        : genericMessage
      setErrorFiles(resolved)
    } finally {
      setDeletingFile(false)
    }
  }

  const handleRefreshUrl = async () => {
    if (!selectedFile?.path) return
    try {
      const url = await getSignedUrlCached(selectedFile.path, { force: true })
      setSelectedFileUrl(url)
    } catch (err) {
      setSelectedFileUrl('')
    }
  }

  const handleDownload = () => {
    if (!selectedFileUrl) return
    window.open(selectedFileUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpen = () => {
    if (!selectedFileUrl) return
    window.open(selectedFileUrl, '_blank', 'noopener,noreferrer')
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  const formatDate = (value) => {
    if (!value) return ''
    try {
      return new Date(value).toLocaleDateString('ca-ES')
    } catch {
      return ''
    }
  }
  const isImage = (file) => file?.mimeType?.startsWith('image/')
    || /\.(png|jpg|jpeg|gif|webp)$/i.test(file?.name || '')
  const isPdf = (file) => file?.mimeType?.includes('pdf')
    || /\.pdf$/i.test(file?.name || '')
  const pdfPreviewUrl = selectedFileUrl || ''
  const previewImageUrl = selectedFileUrl || ''
  const canUpload = Boolean(!readOnly && selectedFolderId)
  const isEmpty = !loadingFiles && !errorFiles && explorerFolders.length === 0 && explorerFiles.length === 0

  const renderPreview = (full = false) => (
    <div className="projects-drive__previewBody" style={{ background: 'var(--surface-bg)' }}>
      {!selectedFile ? (
        <div style={{ color: 'var(--muted-1)' }}>{c.noFileSelected}</div>
      ) : isImage(selectedFile) && previewImageUrl && !imageError ? (
        <img
          src={previewImageUrl}
          alt=""
          onError={() => setImageError(true)}
          style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
        />
      ) : isPdf(selectedFile) && pdfPreviewUrl ? (
        <iframe title="preview" src={pdfPreviewUrl} style={{ width: '100%', height: full ? '100%' : '100%', border: 'none' }} />
      ) : isImage(selectedFile) && imageError ? (
        <div style={{ color: 'var(--muted-1)' }}>{c.imagePreviewError}</div>
      ) : (
        <div style={{ color: 'var(--muted-1)' }}>{c.previewUnavailable}</div>
      )}
    </div>
  )

  if (!rootId) {
    return (
      <div className="projects-drive__box">
        <div style={{ padding: 12, color: 'var(--muted-1)' }}>
          {c.loading}
        </div>
      </div>
    )
  }

  const activeFolder = projectFolders.find((folder) => selectedFolderId?.startsWith(folder.prefix))
  const activeFolderLabel = activeFolder?.label || ''
  const activeSubPath = activeFolder
    ? selectedFolderId?.replace(activeFolder.prefix, '').replace(/\/$/, '')
    : selectedFolderId?.replace(projectRootPath || '', '').replace(/\/$/, '')
  const breadcrumbLabel = activeSubPath ? `${activeFolderLabel} / ${activeSubPath}` : activeFolderLabel

  useEffect(() => {
    onActivePathChange?.(breadcrumbLabel || '')
  }, [breadcrumbLabel, onActivePathChange])

  return (
    <div className="projects-drive__grid">
      <div className="projects-drive__box">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__boxTitle">{c.sections}</div>
          {!readOnly && canUpload && !fixedFolderId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewFolder(true)}
              title={c.newFolderTooltip}
              aria-label={c.newFolder}
            >
              <Plus size={16} />
            </Button>
          )}
        </div>
        <div className="projects-drive__list">
          {loadingFolders ? (
            <div className="projects-drive__row">
              <span className="projects-drive__rowMain">{c.loading}</span>
            </div>
          ) : projectFolders.length === 0 ? (
            <div className="projects-drive__row">
              <span className="projects-drive__rowMain">{c.emptySections}</span>
            </div>
          ) : projectFolders.map((folder) => {
            const isActive = selectedFolderId === folder.prefix
            const FolderIcon = folder.icon || Folder
            return (
              <button
                key={folder.key}
                type="button"
                className={`projects-drive__row ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedFolderId(folder.prefix)
                  setFolderStack([])
                }}
              >
                <span className="projects-drive__rowMain">
                  <FolderIcon size={16} style={{ color: 'var(--coral-1)' }} />
                  {folder.label}
                </span>
                <span className="projects-drive__rowSub">{isActive ? '•' : ''}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="projects-drive__box projects-drive__box--files">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__path">
            <span className="projects-drive__pathLabel">{c.explorer}</span>
            {breadcrumbLabel ? (
              <span className="projects-drive__pathPill">{breadcrumbLabel}</span>
            ) : null}
          </div>
          {!fixedFolderId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={!folderStack.length}
                title={!folderStack.length ? 'No hi ha carpeta anterior' : c.backTooltip}
                aria-label={c.back}
              >
                <ArrowLeft size={16} />
              </Button>
            </div>
          )}
        </div>
        {showNewFolder && !readOnly && (
          <div style={{
            padding: 12,
            borderTop: '1px solid var(--border-color)',
            background: 'var(--surface-bg)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted-1)', marginBottom: 8 }}>
              {c.newFolderTitle}
            </div>
            <input
              type="text"
              value={newFolderName}
              placeholder={c.newFolderPlaceholder}
              onChange={(e) => {
                setNewFolderName(e.target.value)
                if (newFolderError) setNewFolderError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setShowNewFolder(false)
                  setNewFolderName('')
                  setNewFolderError(null)
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--surface-bg)',
                color: 'var(--text-1)',
                fontSize: 14
              }}
            />
            {newFolderError && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger-1)' }}>
                {newFolderError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewFolder(false)
                  setNewFolderName('')
                  setNewFolderError(null)
                }}
              >
                <X size={14} />
                {c.cancel}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateFolder}
                disabled={creatingFolder}
              >
                {c.create}
              </Button>
            </div>
          </div>
        )}
        <div
          className="projects-drive__files"
          style={{ position: 'relative' }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={readOnly ? undefined : handlePanelDrop}
        >
          <div className={`projects-drive__dragOverlay ${isDraggingFiles ? 'is-on' : ''}`}>
              <div>{c.dragTitle}</div>
              <div className="projects-drive__dragOverlayNote">
                {c.dragSub}
              </div>
          </div>
          {errorFiles && (
            <div className="projects-drive__fileRow">
              <div className="projects-drive__fileMain">
                <div className="projects-drive__fileName">{errorFiles}</div>
              </div>
            </div>
          )}
          {!readOnly && !canUpload && (
            <div className="projects-drive__fileRow">
              <div className="projects-drive__fileMain">
                <div className="projects-drive__fileName">
                  Selecciona una carpeta per pujar arxius.
                </div>
              </div>
            </div>
          )}
          {loadingFiles && (
            <div className="projects-drive__fileRow">
              <div className="projects-drive__fileMain">
                <div className="projects-drive__fileName">Carregant...</div>
              </div>
            </div>
          )}
          {isEmpty ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '24px 12px',
              color: 'var(--muted-1)',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.emptyFolderTitle}</div>
            </div>
          ) : (
            <>
              {explorerFolders.map((folder) => {
                const label = (folder.name || '').replace(/^\d+_/, '')
                return (
                  <button
                    key={folder.id}
                    type="button"
                    className="projects-drive__fileRow"
                    onClick={() => handleEnterFolder(folder)}
                    onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
                    onDrop={readOnly ? undefined : (e) => handleFolderDrop(e, folder.path)}
                  >
                    <div className="projects-drive__fileMain">
                      <div className="projects-drive__fileName" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Folder size={16} />
                        {label || 'Carpeta'}
                      </div>
                      <div className="projects-drive__fileMeta">Carpeta</div>
                    </div>
                  </button>
                )
              })}
              {explorerFiles.map((file) => {
            const isActive = selectedFile?.path === file.path
            const ext = (file.name || '').split('.').pop()?.toUpperCase() || 'FILE'
            return (
              <button
                key={file.path}
                type="button"
                className={`projects-drive__fileRow ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="projects-drive__fileMain">
                  <div className="projects-drive__fileName" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} />
                    {file.name || 'Fitxer'}
                  </div>
                  <div className="projects-drive__fileMeta">
                    {formatDate(file.modifiedTime || file.createdTime)}{file.size ? ` · ${formatSize(file.size)}` : ''}
                  </div>
                </div>
                <div className="projects-drive__fileTag">{ext}</div>
              </button>
            )
              })}
            </>
          )}
        </div>
        {canUpload && !readOnly && !selectedFolderId?.endsWith('/research/') && (
          <div className="projects-drive__dropzone" ref={dropzoneRef}>
            <FileUploader
              folderId={selectedFolderId}
              onUploadComplete={handleUploadDone}
              label="Arrossega fitxers aquí"
            />
          </div>
        )}
      </div>

      <div className="projects-drive__previewBox">
        <div className="projects-drive__previewHeader">
          <div className="projects-drive__previewTitle">{selectedFile?.name || c.preview}</div>
          <div className="projects-drive__previewActions">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpen}
              disabled={!selectedFileUrl}
              title={!selectedFileUrl ? c.noFileSelected : c.open}
              aria-label={c.open}
            >
              <ExternalLink size={14} />
            </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshUrl}
                disabled={!selectedFile}
                title={!selectedFile ? c.noFileSelected : c.refreshLinkTooltip}
                aria-label={c.refreshLink}
              >
                <RefreshCw size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!selectedFileUrl}
              title={!selectedFileUrl ? 'No hi ha enllaç de descàrrega' : c.download}
              aria-label={c.download}
            >
              <Download size={14} />
            </Button>
            {!readOnly && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={!selectedFile}
                title={!selectedFile ? c.noFileSelected : c.deleteTooltip}
                aria-label={c.delete}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
        {renderPreview()}
      </div>
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setIsFullscreen(false)}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface-bg-2)',
              opacity: 0.9
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 'min(1100px, 96vw)',
              height: 'min(80vh, 800px)',
              background: 'var(--surface-bg)',
              borderRadius: 12,
              padding: 12,
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                {selectedFile?.name || c.preview}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
                Tancar
              </Button>
            </div>
            <div style={{ flex: 1, marginTop: 8 }}>
              {renderPreview(true)}
            </div>
          </div>
        </div>
      )}
      {deleteConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--surface-bg-2)',
              opacity: 0.9
            }}
          />
          <div
            style={{
              position: 'relative',
              width: 'min(420px, 94vw)',
              background: 'var(--surface-bg)',
              borderRadius: 12,
              padding: 16,
              boxShadow: 'var(--shadow-soft)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
              {c.deleteConfirmTitle}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted-1)' }}>
              {c.deleteConfirmText}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {c.cancel}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteFile}
                disabled={deletingFile}
              >
                {c.deleteConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
