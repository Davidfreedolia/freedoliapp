import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  ArrowLeft, 
  ChevronRight, 
  Check,
  Upload,
  FileText,
  FolderOpen,
  ExternalLink,
  Plus,
  AlertCircle,
  ClipboardList,
  ShoppingCart,
  Package,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getProject, updateProject, getDocuments, createDocument } from '../lib/supabase'
import { driveService, PROJECT_SUBFOLDERS } from '../lib/googleDrive'
import Header from '../components/Header'
import FileUploader from '../components/FileUploader'
import FileBrowser from '../components/FileBrowser'
import IdentifiersSection from '../components/IdentifiersSection'
import ProfitabilityCalculator from '../components/ProfitabilityCalculator'
import QuickSupplierPriceEstimate from '../components/QuickSupplierPriceEstimate'
import TasksSection from '../components/TasksSection'
import QuotesSection from '../components/QuotesSection'
import DecisionLog from '../components/DecisionLog'
import { useBreakpoint } from '../hooks/useBreakpoint'

const PHASES = [
  { id: 1, name: 'Recerca', icon: '🔍', color: '#6366f1', description: 'Investigació de producte i mercat' },
  { id: 2, name: 'Viabilitat', icon: '📊', color: '#8b5cf6', description: 'Anàlisi de costos i rentabilitat' },
  { id: 3, name: 'Proveïdors', icon: '🏭', color: '#ec4899', description: 'Cerca i negociació amb fabricants' },
  { id: 4, name: 'Mostres', icon: '📦', color: '#f59e0b', description: 'Sol·licitud i verificació de mostres' },
  { id: 5, name: 'Producció', icon: '⚙️', color: '#10b981', description: 'Fabricació i control de qualitat' },
  { id: 6, name: 'Listing', icon: '📝', color: '#3b82f6', description: 'Creació del listing a Amazon' },
  { id: 7, name: 'Live', icon: '🚀', color: '#22c55e', description: 'Producte actiu, seguiment vendes' }
]

// Mapeig fase -> carpeta Drive
const PHASE_FOLDER_MAP = {
  1: '01_Research',
  2: '01_Research', // Viabilitat també usa Research
  3: '02_Quotations',
  4: '08_Samples',
  5: '03_PurchaseOrders',
  6: '09_Listings',
  7: '09_Listings'
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { darkMode, driveConnected, refreshProjects } = useApp()
  const { isMobile, isTablet } = useBreakpoint()
  const { t } = useTranslation()
  
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectFolders, setProjectFolders] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    loadProject()
  }, [id])

  useEffect(() => {
    if (project && driveConnected) {
      loadDriveFolders()
    }
  }, [project, driveConnected])

  const loadProject = async () => {
    setLoading(true)
    try {
      const data = await getProject(id)
      if (!data) {
        navigate('/projects')
        return
      }
      setProject(data)
      const docs = await getDocuments(id)
      setDocuments(Array.isArray(docs) ? docs : [])
    } catch (err) {
      console.error('Error carregant projecte:', err)
      // Don't navigate immediately, show error state instead
      setProject(null)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const loadDriveFolders = async () => {
    if (!project) return
    
    try {
      // Usar ensureProjectDriveFolders per garantir idempotència
      const folders = await driveService.ensureProjectDriveFolders({
        id: project.id,
        project_code: project?.project_code || '',
        sku: project?.sku || '',
        name: project?.name || '',
        drive_folder_id: project?.drive_folder_id || null
      })
      
      if (folders) {
        setProjectFolders(folders)
        
        // Si no tenia drive_folder_id, guardar-lo ara
        if (!project.drive_folder_id && folders?.main?.id) {
          try {
            await updateProject(id, { drive_folder_id: folders.main.id })
            setProject({ ...project, drive_folder_id: folders.main.id })
          } catch (e) {
            console.warn('Error guardant drive_folder_id:', e)
          }
        }
        
        // Seleccionar carpeta segons fase actual
        const folderName = PHASE_FOLDER_MAP[project?.current_phase]
        if (folders?.subfolders && folderName && folders.subfolders[folderName]) {
          setSelectedFolder(folders.subfolders[folderName])
        }
      }
    } catch (err) {
      console.error('Error amb carpetes Drive:', err)
      // Don't show alert, just log - Drive is optional
      setProjectFolders(null)
    }
  }

  const handlePhaseChange = async (newPhase) => {
    // Bloquejar canvi de fase si està DISCARDED
    if (project.decision === 'DISCARDED') {
      alert('No es pot canviar la fase d\'un projecte descartat. Restaura el projecte primer.')
      return
    }
    
    try {
      await updateProject(id, { current_phase: newPhase })
      setProject({ ...project, current_phase: newPhase })
      await refreshProjects()
      
      // Redirigir al Dashboard després d'editar el projecte
      navigate('/')
    } catch (err) {
      console.error('Error actualitzant fase:', err)
    }
  }

  const handleRestoreProject = async () => {
    if (!confirm('Estàs segur que vols restaurar aquest projecte? Tornarà a l\'estat HOLD.')) return
    
    try {
      await updateProject(id, { decision: 'HOLD' })
      setProject({ ...project, decision: 'HOLD' })
      await refreshProjects()
      alert('Projecte restaurat correctament')
    } catch (err) {
      console.error('Error restaurant projecte:', err)
      alert('Error restaurant projecte: ' + err.message)
    }
  }

  const handleUploadComplete = async (files) => {
    // Guardar referències a Supabase (evita duplicats automàticament)
    let savedCount = 0
    let errorCount = 0
    const { logSuccess, logError } = await import('../lib/auditLog')
    
    for (const file of files) {
      try {
        const doc = await createDocument({
          project_id: id,
          name: file.name,
          file_url: file.webViewLink || file.driveUrl,
          drive_file_id: file.id,
          category: getCategoryForPhase(project?.current_phase || 1),
          file_size: file.size
        })
        savedCount++
        // Audit log: document pujat correctament
        await logSuccess('document', 'upload', doc.id, 'Document uploaded to Drive', {
          project_id: id,
          file_name: file.name,
          file_size: file.size,
          drive_file_id: file.id
        })
      } catch (err) {
        console.error('Error guardant document:', err)
        errorCount++
        // Audit log: error pujant document
        await logError('document', 'upload', err, {
          project_id: id,
          file_name: file.name,
          file_size: file.size,
          drive_file_id: file.id
        })
      }
    }
    
    // Recarregar documents
    try {
      const docs = await getDocuments(id)
      setDocuments(docs || [])
    } catch (err) {
      console.error('Error recarregant documents:', err)
    }
    
    // Mostrar feedback si hi ha errors
    if (errorCount > 0) {
      alert(`${errorCount} document(s) no s'han pogut guardar correctament.`)
    }
  }

  const getCategoryForPhase = (phase) => {
    const map = {
      1: 'analysis',
      2: 'analysis',
      3: 'quotation',
      4: 'sample',
      5: 'po',
      6: 'listing',
      7: 'other'
    }
    return map[phase] || 'other'
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <Header title="Carregant..." />
        <div style={styles.loading}>Carregant projecte...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <Header title="Projecte no trobat" />
        <div style={{
          padding: '48px',
          textAlign: 'center',
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderRadius: '16px',
          border: `1px solid ${darkMode ? '#2a2a3a' : '#e5e7eb'}`,
          margin: '24px'
        }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{
            margin: '0 0 8px',
            fontSize: '20px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Projecte no trobat
          </h2>
          <p style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            El projecte que busques no existeix o no tens accés.
          </p>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Tornar a Projectes
          </button>
        </div>
      </div>
    )
  }

  const currentPhase = PHASES.find(p => p.id === project.current_phase) || PHASES[0]

  return (
    <div style={styles.container}>
      <Header title={project.name} />

      <div style={{
        ...styles.content,
        padding: isMobile ? '16px' : '32px'
      }}>
        {/* Banner DISCARDED */}
        {project.decision === 'DISCARDED' && (
          <div style={{
            ...styles.discardedBanner,
            backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
            borderColor: '#ef4444'
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                Aquest projecte ha estat descartat
              </strong>
              <span style={{ color: darkMode ? '#fca5a5' : '#991b1b', fontSize: '13px' }}>
                {project.discarded_reason || 'No s\'ha proporcionat una raó.'}
                {project.discarded_at && (
                  <span style={{ display: 'block', marginTop: '4px' }}>
                    Data: {new Date(project.discarded_at).toLocaleDateString('ca-ES')}
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleRestoreProject}
              style={styles.restoreButton}
            >
              {t('common.restore')} Projecte
            </button>
          </div>
        )}

        {/* Back button & Project info */}
        <div style={styles.topBar}>
          <button onClick={() => navigate('/projects')} style={styles.backButton}>
            <ArrowLeft size={18} />
            Tornar
          </button>
          <div style={styles.projectMeta}>
            <span style={styles.projectCode}>{project.project_code}</span>
            {project.sku && (
              <span style={styles.sku}>SKU: {project.sku}</span>
            )}
          </div>
        </div>

        {/* Phase Timeline */}
        <div style={{
          ...styles.timelineSection,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{
            ...styles.sectionTitle,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Progrés del Projecte
          </h3>
          
          <div style={{
            ...styles.timeline,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '12px' : '0',
            overflowX: 'visible'
          }}>
            {PHASES.map((phase, index) => {
              const isActive = phase.id === project.current_phase
              const isCompleted = phase.id < project.current_phase
              
              return (
                <div key={phase.id} style={styles.timelineItem}>
                  <button
                    onClick={() => handlePhaseChange(phase.id)}
                    style={{
                      ...styles.phaseButton,
                      backgroundColor: isActive ? phase.color : (isCompleted ? `${phase.color}30` : 'var(--bg-secondary)'),
                      borderColor: isActive || isCompleted ? phase.color : 'var(--border-color)',
                      color: isActive ? '#ffffff' : (isCompleted ? phase.color : '#6b7280')
                    }}
                  >
                    {isCompleted ? <Check size={20} /> : <span style={{ fontSize: '20px' }}>{phase.icon}</span>}
                  </button>
                  <span style={{
                    ...styles.phaseName,
                    color: isActive ? phase.color : (darkMode ? '#9ca3af' : '#6b7280'),
                    fontWeight: isActive ? '600' : '400'
                  }}>
                    {phase.name}
                  </span>
                  {index < PHASES.length - 1 && !isMobile && (
                    <div style={{
                      ...styles.timelineConnector,
                      backgroundColor: isCompleted ? phase.color : 'var(--border-color)'
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current phase info */}
          <div style={{
            ...styles.currentPhaseInfo,
            backgroundColor: `${currentPhase.color}10`,
            borderColor: currentPhase.color
          }}>
            <div style={styles.currentPhaseHeader}>
              <span style={{ fontSize: '24px' }}>{currentPhase.icon}</span>
              <div>
                <h4 style={{ margin: 0, color: currentPhase.color }}>{currentPhase.name}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{currentPhase.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Identifiers Section */}
        <IdentifiersSection projectId={id} darkMode={darkMode} />

        {/* Tasks Section */}
        <TasksSection 
          entityType="project" 
          entityId={id} 
          darkMode={darkMode} 
        />

        {/* Decision Block - Visible a fase Research (1) */}
        {project.current_phase === 1 && (
          <div style={{
            marginBottom: '24px',
            padding: '20px',
            borderRadius: '12px',
            backgroundColor: darkMode ? '#15151f' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: darkMode ? '#ffffff' : '#111827'
            }}>
              Decision
            </h3>
            <DecisionLog 
              entityType="project" 
              entityId={id} 
              darkMode={darkMode}
              allowedDecisions={[
                { value: 'go', label: 'GO', icon: CheckCircle2, color: '#10b981' },
                { value: 'hold', label: 'HOLD', icon: Clock, color: '#f59e0b' },
                { value: 'discarded', label: 'DISCARDED', icon: XCircle, color: '#ef4444' }
              ]}
            />
          </div>
        )}

        {/* Quick Supplier Price Estimate - Visible a fase Research (1) */}
        {project.current_phase === 1 && (
          <div style={{
            marginBottom: '24px'
          }}>
            <QuickSupplierPriceEstimate 
              projectId={id} 
              darkMode={darkMode}
              onCopyToProfitability={(priceInEUR) => {
                // Trigger update in ProfitabilityCalculator via ref or state
                // For now, we'll use a custom event
                window.dispatchEvent(new CustomEvent('copyPriceToCOGS', { 
                  detail: { price: priceInEUR } 
                }))
              }}
            />
          </div>
        )}

        {/* Quick Profitability Calculator - Visible a fase Research (1) */}
        {project.current_phase === 1 && (
          <div style={{
            marginBottom: '24px'
          }}>
            <ProfitabilityCalculator projectId={id} darkMode={darkMode} />
          </div>
        )}

        {/* Supplier Quotes Section - Visible desde fase 2 (Viabilitat) */}
        {project.current_phase >= 2 && (
          <div style={{
            marginBottom: '24px'
          }}>
            <QuotesSection projectId={id} darkMode={darkMode} />
          </div>
        )}

        {/* Drive Integration */}
        <div style={styles.driveSection}>
          {/* Folder selector */}
          {driveConnected && projectFolders ? (
            <div style={{
              ...styles.foldersPanel,
              backgroundColor: darkMode ? '#15151f' : '#ffffff'
            }}>
              <h3 style={{
                ...styles.sectionTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                <FolderOpen size={20} />
                Carpetes del Projecte
              </h3>
              
              <div style={styles.foldersList}>
                {PROJECT_SUBFOLDERS.map(folderName => {
                  const folder = projectFolders.subfolders?.[folderName]
                  const isSelected = selectedFolder?.name === folderName
                  
                  return (
                    <button
                      key={folderName}
                      onClick={() => folder && setSelectedFolder(folder)}
                      disabled={!folder}
                      style={{
                        ...styles.folderButton,
                        backgroundColor: isSelected ? '#4f46e510' : 'transparent',
                        borderColor: isSelected ? '#4f46e5' : 'var(--border-color)',
                        opacity: folder ? 1 : 0.5
                      }}
                    >
                      <FolderOpen size={16} color={isSelected ? '#4f46e5' : '#6b7280'} />
                      <span style={{
                        color: isSelected ? '#4f46e5' : (darkMode ? '#ffffff' : '#111827')
                      }}>
                        {folderName.replace(/^\d+_/, '')}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Open in Drive link */}
              <a 
                href={`https://drive.google.com/drive/folders/${projectFolders.main.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.driveLink}
              >
                <ExternalLink size={14} />
                Obrir a Google Drive
              </a>
            </div>
          ) : (
            <div style={{
              ...styles.driveWarning,
              backgroundColor: darkMode ? '#15151f' : '#ffffff'
            }}>
              <AlertCircle size={20} color="#f59e0b" />
              <span>Connecta Google Drive per gestionar documents</span>
            </div>
          )}

          {/* File browser & uploader */}
          {selectedFolder && (
            <div style={styles.filesPanel}>
              <FileUploader
                folderId={selectedFolder.id}
                onUploadComplete={handleUploadComplete}
                label={`Arrossega arxius a ${selectedFolder.name?.replace(/^\d+_/, '')}`}
              />
              
              <FileBrowser
                folderId={selectedFolder.id}
                folderName={selectedFolder.name?.replace(/^\d+_/, '')}
                allowDelete={true}
              />
            </div>
          )}
        </div>

        {/* Actions per fase */}
        <div style={{
          ...styles.actionsSection,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <h3 style={{
            ...styles.sectionTitle,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Accions del Projecte
          </h3>
          
          <div style={styles.actionsGrid}>
            {/* Briefing - disponible des de fase 3 */}
            {project.current_phase >= 3 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#8b5cf6'}} 
                onClick={() => navigate(`/projects/${id}/briefing`)}
              >
                <ClipboardList size={18} />
                Briefing del Producte
              </button>
            )}
            
            {/* Nova Comanda - disponible des de fase 3 */}
            {project.current_phase >= 3 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#4f46e5'}} 
                onClick={() => navigate(`/orders?project=${id}`)}
              >
                <ShoppingCart size={18} />
                Crear Comanda (PO)
              </button>
            )}
            
            {/* Gestionar Stock - fase 7 */}
            {project.current_phase === 7 && (
              <button 
                style={{...styles.actionButton, backgroundColor: '#22c55e', border: '1px solid #16a34a'}} 
                onClick={() => navigate(`/inventory?project=${id}`)}
              >
                <Package size={18} />
                Gestionar Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  discardedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '2px solid',
    marginBottom: '24px'
  },
  restoreButton: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  content: {
    padding: '32px',
    overflowY: 'auto'
  },
  loading: {
    padding: '64px',
    textAlign: 'center',
    color: '#6b7280'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer'
  },
  projectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  projectCode: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4f46e5'
  },
  sku: {
    fontSize: '13px',
    padding: '4px 10px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '6px',
    color: '#6b7280'
  },
  timelineSection: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  timeline: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    marginBottom: '24px'
  },
  timelineItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    position: 'relative',
    flex: 1
  },
  phaseButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    zIndex: 1
  },
  phaseName: {
    fontSize: '12px',
    textAlign: 'center'
  },
  timelineConnector: {
    position: 'absolute',
    top: '24px',
    left: '50%',
    width: '100%',
    height: '2px'
  },
  currentPhaseInfo: {
    padding: '16px 20px',
    borderRadius: '12px',
    borderLeft: '4px solid'
  },
  currentPhaseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  driveSection: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '200px 1fr' : '280px 1fr'),
    gap: isMobile ? '16px' : '24px',
    marginBottom: '24px'
  },
  foldersPanel: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  foldersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '16px'
  },
  folderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: '1px solid',
    borderRadius: '8px',
    background: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  driveLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#4f46e5',
    textDecoration: 'none'
  },
  driveWarning: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    color: '#6b7280'
  },
  filesPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  actionsSection: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)'
  },
  actionsGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: '1px solid #3730a3',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  }
}
