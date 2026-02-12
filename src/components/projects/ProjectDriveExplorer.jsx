import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Download, Folder, FileText, Maximize2, ArrowLeft, FileDown } from 'lucide-react'
import Button from '../Button'
import FileUploader from '../FileUploader'

export default function ProjectDriveExplorer({
  projectFolders,
  driveServiceRef,
  driveConnected,
  darkMode,
  onUploadComplete,
  readOnly = false,
  fixedFolderId = null
}) {
  const navigate = useNavigate()
  const rootId = projectFolders?.main?.id || null
  const [selectedFolderId, setSelectedFolderId] = useState(fixedFolderId || rootId)
  const [rootFolders, setRootFolders] = useState([])
  const [explorerFolders, setExplorerFolders] = useState([])
  const [explorerFiles, setExplorerFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [errorFolders, setErrorFolders] = useState(null)
  const [errorFiles, setErrorFiles] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [folderStack, setFolderStack] = useState([])
  const [imageError, setImageError] = useState(false)
  const [authError, setAuthError] = useState(false)
  const foldersSeq = useRef(0)
  const filesSeq = useRef(0)

  const loadRootFolders = async (folderId) => {
    if (!folderId) return
    const driveService = driveServiceRef?.current
    if (!driveService?.listFolderContents) return
    const seq = ++foldersSeq.current
    setLoadingFolders(true)
    setErrorFolders(null)
    try {
      const contents = await driveService.listFolderContents(folderId)
      if (seq !== foldersSeq.current) return
      const subfolders = (contents || [])
        .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
      setRootFolders(subfolders)
    } catch (err) {
      if (seq !== foldersSeq.current) return
      if (err?.message === 'AUTH_REQUIRED') setAuthError(true)
      setErrorFolders(err?.message || 'Error carregant Drive')
      setRootFolders([])
    } finally {
      if (seq === foldersSeq.current) setLoadingFolders(false)
    }
  }

  const loadFolderContents = async (folderId) => {
    if (!folderId) return
    const driveService = driveServiceRef?.current
    if (!driveService?.listFolderContents) return
    const seq = ++filesSeq.current
    setLoadingFiles(true)
    setErrorFiles(null)
    try {
      const contents = await driveService.listFolderContents(folderId)
      if (seq !== filesSeq.current) return
      const folderItems = (contents || [])
        .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
      const fileItems = (contents || [])
        .filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
      setExplorerFolders(folderItems)
      setExplorerFiles(fileItems)
      setSelectedFile(prev => (prev && fileItems.find(f => f.id === prev.id)) ? prev : (fileItems[0] || null))
    } catch (err) {
      if (seq !== filesSeq.current) return
      if (err?.message === 'AUTH_REQUIRED') setAuthError(true)
      setErrorFiles(err?.message || 'Error carregant Drive')
      setExplorerFolders([])
      setExplorerFiles([])
      setSelectedFile(null)
    } finally {
      if (seq === filesSeq.current) setLoadingFiles(false)
    }
  }

  useEffect(() => {
    const initialId = fixedFolderId || rootId
    if (!initialId) return
    setSelectedFolderId(initialId)
    setFolderStack([])
    if (!fixedFolderId) loadRootFolders(rootId)
  }, [rootId, fixedFolderId])

  useEffect(() => {
    if (driveConnected && rootId && projectFolders) return
    setExplorerFolders([])
    setExplorerFiles([])
    setSelectedFile(null)
    setFolderStack([])
    filesSeq.current += 1
    foldersSeq.current += 1
  }, [driveConnected, rootId, projectFolders])

  useEffect(() => {
    if (!selectedFolderId) return
    loadFolderContents(selectedFolderId)
  }, [selectedFolderId])

  useEffect(() => {
    setImageError(false)
  }, [selectedFile?.id])

  const handleUploadDone = (uploaded) => {
    if (onUploadComplete) onUploadComplete(uploaded)
    if (selectedFolderId) loadFolderContents(selectedFolderId)
  }

  const uploadFilesToFolder = async (files, targetFolderId) => {
    if (!targetFolderId || !files?.length) return
    const driveService = driveServiceRef?.current
    if (!driveService?.uploadFile) return
    const uploaded = []
    for (const file of files) {
      try {
        const result = await driveService.uploadFile(file, targetFolderId)
        uploaded.push({
          name: file.name,
          id: result.id,
          webViewLink: result.webViewLink,
          size: file.size
        })
      } catch (err) {
        if (err?.message === 'AUTH_REQUIRED') break
      }
    }
    if (uploaded.length && onUploadComplete) onUploadComplete(uploaded)
    if (targetFolderId === selectedFolderId) loadFolderContents(targetFolderId)
  }

  const handleFolderDrop = (e, targetFolderId) => {
    e.preventDefault()
    e.stopPropagation()
    if (readOnly) return
    if (!canUpload) return
    const dropped = Array.from(e.dataTransfer.files || [])
    uploadFilesToFolder(dropped, targetFolderId)
  }

  const handlePanelDrop = (e) => {
    e.preventDefault()
    if (readOnly) return
    if (!canUpload) return
    const dropped = Array.from(e.dataTransfer.files || [])
    uploadFilesToFolder(dropped, selectedFolderId)
  }

  const handleEnterFolder = (folder) => {
    if (fixedFolderId) return
    if (!folder?.id) return
    setFolderStack(prev => [...prev, selectedFolderId])
    setSelectedFolderId(folder.id)
  }

  const handleBack = () => {
    if (fixedFolderId) return
    if (!folderStack.length) return
    const next = [...folderStack]
    const previousId = next.pop()
    setFolderStack(next)
    if (previousId) setSelectedFolderId(previousId)
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
  const pdfPreviewUrl = selectedFile?.id ? `https://drive.google.com/file/d/${selectedFile.id}/preview` : ''
  const previewImageUrl = selectedFile?.webContentLink || selectedFile?.webViewLink || ''
  const isGoogleWorkspace = selectedFile?.mimeType === 'application/vnd.google-apps.document'
    || selectedFile?.mimeType === 'application/vnd.google-apps.spreadsheet'
    || selectedFile?.mimeType === 'application/vnd.google-apps.presentation'
  const canExportPdf = Boolean(isGoogleWorkspace && driveServiceRef?.current?.exportFile)
  const canUpload = Boolean(!readOnly && driveConnected && selectedFolderId)
  const connectLabel = !driveConnected ? 'Connecta Drive' : (authError ? 'Reconnecta Drive' : 'Drive OK')

  const handleExportPdf = async () => {
    const driveService = driveServiceRef?.current
    if (!driveService?.exportFile || !selectedFile?.id) return
    try {
      const result = await driveService.exportFile(selectedFile.id, 'application/pdf')
      if (typeof result === 'string') {
        window.open(result, '_blank')
      } else if (result?.url) {
        window.open(result.url, '_blank')
      }
    } catch (err) {
      // Silent fail: export optional
    }
  }

  const renderPreview = (full = false) => (
    <div className="projects-drive__previewBody" style={{ background: 'var(--surface-bg)' }}>
      {!selectedFile ? (
        <div style={{ color: 'var(--muted-1)' }}>Selecciona un fitxer</div>
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
        <div style={{ color: 'var(--muted-1)' }}>No es pot previsualitzar. Obre a Drive.</div>
      ) : (
        <div style={{ color: 'var(--muted-1)' }}>Previsualització no disponible</div>
      )}
    </div>
  )

  if (!driveConnected) {
    return (
      <div className="projects-drive__box">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__boxTitle">Drive del projecte</div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/settings')}
            >
              {connectLabel}
            </Button>
          </div>
        </div>
        <div style={{ padding: 12, color: 'var(--muted-1)' }}>
          Connecta Google Drive per veure els documents del projecte.
        </div>
        <div style={{ padding: '0 12px 12px' }}>
          <Button variant="secondary" size="sm" onClick={() => { window.location.href = '/settings' }}>
            Connecta Drive
          </Button>
        </div>
      </div>
    )
  }

  if (!rootId) {
    return (
      <div className="projects-drive__box">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__boxTitle">Drive del projecte</div>
        </div>
        <div style={{ padding: 12, color: 'var(--muted-1)' }}>
          Carregant carpeta del projecte...
        </div>
      </div>
    )
  }

  return (
    <div className="projects-drive__grid">
      <div className="projects-drive__box">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__boxTitle">Carpetes</div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/settings')}
              disabled={driveConnected && !authError}
            >
              {connectLabel}
            </Button>
          </div>
        </div>
        <div className="projects-drive__list">
          {fixedFolderId ? (
            <div className="projects-drive__row">
              <span className="projects-drive__rowMain">Informe (Recerca)</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`projects-drive__row ${selectedFolderId === rootId ? 'is-active' : ''}`}
                onClick={() => setSelectedFolderId(rootId)}
              >
                <span className="projects-drive__rowMain">Projecte</span>
                <span className="projects-drive__rowSub">{selectedFolderId === rootId ? 'Seleccionada' : ''}</span>
              </button>
              {errorFolders && (
                <div className="projects-drive__row">
                  <span className="projects-drive__rowMain">{errorFolders}</span>
                </div>
              )}
              {!errorFolders && rootFolders.length === 0 ? (
                <div className="projects-drive__row">
                  <span className="projects-drive__rowMain">{loadingFolders ? 'Carregant...' : 'Sense carpetes'}</span>
                </div>
              ) : rootFolders.map((folder) => {
                const isActive = selectedFolderId === folder.id
                const label = (folder.name || '').replace(/^\d+_/, '')
                return (
                  <button
                    key={folder.id}
                    type="button"
                    className={`projects-drive__row ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <span className="projects-drive__rowMain">{label || 'Carpeta'}</span>
                    <span className="projects-drive__rowSub">{isActive ? 'Seleccionada' : ''}</span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

      <div className="projects-drive__box">
        <div className="projects-drive__boxHeader">
          <div className="projects-drive__boxTitle">Explorador</div>
          {!fixedFolderId && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={!folderStack.length}
                title={!folderStack.length ? 'No hi ha carpeta anterior' : 'Tornar enrere'}
              >
                <ArrowLeft size={14} />
                Back
              </Button>
            </div>
          )}
        </div>
        <div
          className="projects-drive__files"
          onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
          onDrop={readOnly ? undefined : handlePanelDrop}
        >
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
                  {!driveConnected
                    ? 'Connecta Google Drive per veure carpetes i pujar arxius.'
                    : 'Selecciona una carpeta per pujar arxius.'}
                </div>
              </div>
            </div>
          )}
          {!errorFiles && explorerFolders.length === 0 && explorerFiles.length === 0 ? (
            <div className="projects-drive__fileRow">
              <div className="projects-drive__fileMain">
                <div className="projects-drive__fileName">{loadingFiles ? 'Carregant...' : 'Carpeta buida'}</div>
              </div>
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
                    onDrop={readOnly ? undefined : (e) => handleFolderDrop(e, folder.id)}
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
            const isActive = selectedFile?.id === file.id
            const ext = (file.name || '').split('.').pop()?.toUpperCase() || 'FILE'
            return (
              <button
                key={file.id}
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
        {canUpload && !readOnly && (
          <div className="projects-drive__dropzone">
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
          <div className="projects-drive__previewTitle">{selectedFile?.name || 'Previsualització'}</div>
          <div className="projects-drive__previewActions">
            {selectedFile?.webViewLink && (
              <a
                href={selectedFile.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: '1px solid var(--btn-ghost-border)',
                  color: 'var(--btn-ghost-fg)',
                  background: 'var(--btn-ghost-bg)',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={14} />
                Open in Drive
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedFile?.webContentLink) return window.open(selectedFile.webContentLink, '_blank')
                if (selectedFile?.webViewLink) return window.open(selectedFile.webViewLink, '_blank')
              }}
              disabled={!selectedFile?.webContentLink && !selectedFile?.webViewLink}
              title={!selectedFile?.webContentLink && !selectedFile?.webViewLink ? 'No hi ha enllaç de descàrrega' : 'Descarregar'}
            >
              <Download size={14} />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              disabled={!selectedFile}
              title={!selectedFile ? 'Selecciona un fitxer' : 'Pantalla completa'}
            >
              <Maximize2 size={14} />
              Fullscreen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPdf}
              disabled={!selectedFile || !isGoogleWorkspace || !canExportPdf}
              title={
                !selectedFile
                  ? 'Selecciona un fitxer'
                  : !isGoogleWorkspace
                  ? 'Només per Google Docs/Sheets/Slides'
                  : !canExportPdf
                  ? 'Pending driveService.exportFile'
                  : 'Convertir a PDF'
              }
            >
              <FileDown size={14} />
              Convert to PDF
            </Button>
          </div>
        </div>
        {renderPreview()}
      </div>
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
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
                {selectedFile?.name || 'Previsualització'}
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
    </div>
  )
}
