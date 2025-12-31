import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Barcode, 
  Plus, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Search,
  RefreshCw,
  Package,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { 
  getGtinPool, 
  addGtinToPool, 
  releaseGtinFromProject,
  supabase
} from '../lib/supabase'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { getModalStyles } from '../utils/responsiveStyles'

export default function GTINPoolSection({ darkMode }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const modalStyles = getModalStyles(isMobile, darkMode)
  const [gtins, setGtins] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(null) // null = All, 'available', 'assigned'
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadGtins()
  }, [statusFilter])

  const loadGtins = async () => {
    setLoading(true)
    try {
      const data = await getGtinPool(statusFilter)
      setGtins(data || [])
    } catch (err) {
      console.error('Error carregant GTIN pool:', err)
    }
    setLoading(false)
  }

  // Estadístiques
  const stats = {
    total: gtins.length,
    available: gtins.filter(g => g.status === 'available').length,
    assigned: gtins.filter(g => g.status === 'assigned').length,
    archived: gtins.filter(g => g.status === 'archived').length
  }

  // Filtrar GTINs
  const filteredGtins = gtins.filter(gtin => {
    // Búsqueda específica por gtin_code
    const matchesSearch = !searchTerm || 
      gtin.gtin_code?.toLowerCase().includes(searchTerm.toLowerCase())
    // Filtro de estado: null = All, 'available', 'assigned'
    const matchesStatus = !statusFilter || gtin.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Validar format GTIN
  const validateGtin = (code) => {
    if (!code) return false
    const cleaned = code.toString().trim().replace(/\D/g, '')
    // EAN: 13 dígits, UPC: 12 dígits
    return cleaned.length === 13 || cleaned.length === 12
  }

  // Detectar tipus GTIN
  const detectGtinType = (code) => {
    const cleaned = code.toString().trim().replace(/\D/g, '')
    if (cleaned.length === 13) return 'EAN'
    if (cleaned.length === 12) return 'UPC'
    return null
  }

  // Processar Excel/CSV
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Detectar si és CSV o Excel (per ara només CSV)
      const rows = lines.map(line => {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
        return {
          gtin_code: parts[0] || '',
          gtin_type: parts[1] || '',
          notes: parts[2] || ''
        }
      })

      // Validar i detectar tipus
      const validated = rows.map((row, index) => {
        const code = row.gtin_code
        const type = row.gtin_type || detectGtinType(code)
        
        return {
          ...row,
          gtin_type: type || 'EAN',
          valid: validateGtin(code),
          row: index + 1
        }
      })

      // Detectar duplicats
      const codes = validated.map(v => v.gtin_code).filter(Boolean)
      const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index)
      const existingCodes = gtins.map(g => g.gtin_code).filter(Boolean)
      const conflicts = validated.filter(v => existingCodes.includes(v.gtin_code))

      setImportPreview({
        rows: validated,
        duplicates: [...new Set(duplicates)],
        conflicts: conflicts.map(c => c.gtin_code),
        valid: validated.filter(v => v.valid).length,
        invalid: validated.filter(v => !v.valid).length
      })
    } catch (err) {
      console.error('Error processant fitxer:', err)
      alert('Error processant el fitxer: ' + err.message)
    }
    setImporting(false)
  }

  // Confirmar importació
  const handleConfirmImport = async () => {
    if (!importPreview) return

    setImporting(true)
    try {
      const validRows = importPreview.rows.filter(r => r.valid && !importPreview.conflicts.includes(r.gtin_code))
      
      const toInsert = validRows.map(row => ({
        gtin_code: row.gtin_code.trim().replace(/\D/g, ''),
        gtin_type: row.gtin_type || detectGtinType(row.gtin_code) || 'EAN',
        notes: row.notes || null,
        status: 'available'
      }))

      // Inserir en batch
      for (const gtin of toInsert) {
        try {
          await addGtinToPool(gtin)
        } catch (err) {
          // Si ja existeix, continuar
          if (err.code !== '23505') throw err
        }
      }

      await loadGtins()
      setShowImportModal(false)
      setImportPreview(null)
      alert(`${toInsert.length} codis GTIN importats correctament`)
    } catch (err) {
      console.error('Error important GTINs:', err)
      alert('Error important GTINs: ' + err.message)
    }
    setImporting(false)
  }

  // Alliberar GTIN
  const handleReleaseGtin = async (gtinId) => {
    if (!confirm('Estàs segur que vols alliberar aquest GTIN? Es podrà assignar a un altre projecte.')) return

    try {
      await releaseGtinFromProject(gtinId)
      await loadGtins()
      alert('GTIN alliberat correctament')
    } catch (err) {
      console.error('Error alliberant GTIN:', err)
      alert('Error alliberant GTIN: ' + err.message)
    }
  }

  // Arxivar GTIN
  const handleArchiveGtin = async (gtinId) => {
    try {
      const { error } = await supabase
        .from('gtin_pool')
        .update({ status: 'archived' })
        .eq('id', gtinId)

      if (error) throw error
      
      await loadGtins()
    } catch (err) {
      console.error('Error arxivant GTIN:', err)
      alert('Error arxivant GTIN: ' + err.message)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header amb stats */}
      <div style={{
        ...styles.header,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'flex-start'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            ...styles.title,
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            <Barcode size={24} />
            GTIN Pool
          </h2>
          <p style={{
            ...styles.subtitle,
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            Gestiona els codis EAN/UPC disponibles per assignar a projectes
          </p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          style={{
            ...styles.importButton,
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <Upload size={18} />
          Import GTINs
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div style={{
          ...styles.statCard,
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderColor: darkMode ? '#374151' : '#e5e7eb'
        }}>
          <Package size={20} color="#4f46e5" />
          <div>
            <span style={{...styles.statValue, color: '#4f46e5'}}>{stats.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
        </div>
        <div style={{
          ...styles.statCard,
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderColor: darkMode ? '#374151' : '#e5e7eb'
        }}>
          <CheckCircle2 size={20} color="#22c55e" />
          <div>
            <span style={{...styles.statValue, color: '#22c55e'}}>{stats.available}</span>
            <span style={styles.statLabel}>Disponibles</span>
          </div>
        </div>
        <div style={{
          ...styles.statCard,
          backgroundColor: darkMode ? '#15151f' : '#ffffff',
          borderColor: darkMode ? '#374151' : '#e5e7eb'
        }}>
          <Package size={20} color="#f59e0b" />
          <div>
            <span style={{...styles.statValue, color: '#f59e0b'}}>{stats.assigned}</span>
            <span style={styles.statLabel}>Assignats</span>
          </div>
        </div>
        {stats.available < 5 && stats.available > 0 && (
          <div style={{
            ...styles.alertCard,
            backgroundColor: darkMode ? '#7f1d1d' : '#fef2f2',
            borderColor: '#ef4444'
          }}>
            <AlertTriangle size={20} color="#ef4444" />
            <div>
              <span style={{...styles.alertText, color: '#ef4444'}}>
                Només {stats.available} disponibles
              </span>
              <span style={styles.alertLabel}>Considera comprar més</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{
        ...styles.toolbar,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={{
          ...styles.searchContainer,
          backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb',
          width: isMobile ? '100%' : 'auto',
          marginBottom: isMobile ? '12px' : '0'
        }}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Buscar per codi GTIN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              ...styles.searchInput,
              color: darkMode ? '#ffffff' : '#111827'
            }}
          />
        </div>
        <div style={{
          ...styles.toolbarRight,
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '100%' : 'auto',
          gap: isMobile ? '8px' : '12px'
        }}>
          <div style={{
            ...styles.filterButtons,
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={() => setStatusFilter(null)}
              style={{
                ...styles.filterButton,
                backgroundColor: statusFilter === null ? '#4f46e5' : (darkMode ? '#1f1f2e' : '#ffffff'),
                color: statusFilter === null ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                borderColor: statusFilter === null ? '#4f46e5' : 'var(--border-color)',
                flex: isMobile ? 1 : 'none'
              }}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              style={{
                ...styles.filterButton,
                backgroundColor: statusFilter === 'available' ? '#22c55e' : (darkMode ? '#1f1f2e' : '#ffffff'),
                color: statusFilter === 'available' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                borderColor: statusFilter === 'available' ? '#22c55e' : 'var(--border-color)',
                flex: isMobile ? 1 : 'none'
              }}
            >
              Available
            </button>
            <button
              onClick={() => setStatusFilter('assigned')}
              style={{
                ...styles.filterButton,
                backgroundColor: statusFilter === 'assigned' ? '#f59e0b' : (darkMode ? '#1f1f2e' : '#ffffff'),
                color: statusFilter === 'assigned' ? '#ffffff' : (darkMode ? '#9ca3af' : '#6b7280'),
                borderColor: statusFilter === 'assigned' ? '#f59e0b' : 'var(--border-color)',
                flex: isMobile ? 1 : 'none'
              }}
            >
              Assigned
            </button>
          </div>
          <button onClick={loadGtins} style={{
            ...styles.refreshButton,
            width: isMobile ? '100%' : 'auto'
          }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Taula */}
      {loading ? (
        <div style={styles.loading}>Carregant...</div>
      ) : filteredGtins.length === 0 ? (
        <div style={{
          ...styles.empty,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <Barcode size={48} color="#9ca3af" />
          <p style={{ color: '#6b7280' }}>
            {gtins.length === 0 
              ? 'No hi ha codis GTIN al pool. Importa\'n alguns per començar.'
              : 'No hi ha codis que coincideixin amb els filtres.'
            }
          </p>
        </div>
      ) : isMobile ? (
        // Vista móvil: Cards
        <div style={styles.cardsContainer}>
          {filteredGtins.map(gtin => (
            <div
              key={gtin.id}
              style={{
                ...styles.gtinCard,
                backgroundColor: darkMode ? '#15151f' : '#ffffff',
                borderColor: darkMode ? '#374151' : '#e5e7eb'
              }}
            >
              <div style={styles.cardHeader}>
                <div>
                  <div style={{
                    ...styles.cardGtinCode,
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {gtin.gtin_code || 'GTIN_EXEMPT'}
                  </div>
                  <div style={styles.cardBadges}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: gtin.gtin_type === 'EAN' ? '#4f46e515' : '#f59e0b15',
                      color: gtin.gtin_type === 'EAN' ? '#4f46e5' : '#f59e0b'
                    }}>
                      {gtin.gtin_type}
                    </span>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: gtin.status === 'available' ? '#22c55e15' : 
                                       gtin.status === 'assigned' ? '#f59e0b15' : '#6b728015',
                      color: gtin.status === 'available' ? '#22c55e' : 
                            gtin.status === 'assigned' ? '#f59e0b' : '#6b7280'
                    }}>
                      {gtin.status === 'available' ? 'Disponible' : 
                       gtin.status === 'assigned' ? 'Assignat' : 'Arxivat'}
                    </span>
                  </div>
                </div>
              </div>
              
              {gtin.projects && (
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Projecte:</span>
                  <a
                    href={`/projects/${gtin.assigned_to_project_id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(`/projects/${gtin.assigned_to_project_id}`)
                    }}
                    style={{
                      ...styles.projectLink,
                      color: '#4f46e5'
                    }}
                  >
                    {gtin.projects.name}
                    {gtin.projects.sku_internal && ` (${gtin.projects.sku_internal})`}
                    <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                  </a>
                </div>
              )}
              
              {gtin.notes && (
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Notes:</span>
                  <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>{gtin.notes}</span>
                </div>
              )}
              
              <div style={styles.cardActions}>
                {gtin.status === 'assigned' && (
                  <button
                    onClick={() => handleReleaseGtin(gtin.id)}
                    style={styles.actionButton}
                  >
                    <X size={14} />
                    Alliberar
                  </button>
                )}
                {gtin.status !== 'archived' && (
                  <button
                    onClick={() => handleArchiveGtin(gtin.id)}
                    style={{...styles.actionButton, color: '#6b7280'}}
                  >
                    Arxivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vista desktop: Tabla
        <div style={{
          ...styles.tableContainer,
          backgroundColor: darkMode ? '#15151f' : '#ffffff'
        }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: darkMode ? '#1f1f2e' : '#f9fafb' }}>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Codi GTIN</th>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Tipus</th>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Estat</th>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Projecte Assignat</th>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Notes</th>
                <th style={{...styles.th, color: darkMode ? '#9ca3af' : '#6b7280'}}>Accions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGtins.map(gtin => (
                <tr key={gtin.id} style={styles.tr}>
                  <td style={{
                    ...styles.td,
                    fontFamily: 'monospace',
                    fontWeight: '600',
                    color: darkMode ? '#ffffff' : '#111827'
                  }}>
                    {gtin.gtin_code || 'GTIN_EXEMPT'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: gtin.gtin_type === 'EAN' ? '#4f46e515' : '#f59e0b15',
                      color: gtin.gtin_type === 'EAN' ? '#4f46e5' : '#f59e0b'
                    }}>
                      {gtin.gtin_type}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: gtin.status === 'available' ? '#22c55e15' : 
                                       gtin.status === 'assigned' ? '#f59e0b15' : '#6b728015',
                      color: gtin.status === 'available' ? '#22c55e' : 
                            gtin.status === 'assigned' ? '#f59e0b' : '#6b7280'
                    }}>
                      {gtin.status === 'available' ? 'Disponible' : 
                       gtin.status === 'assigned' ? 'Assignat' : 'Arxivat'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {gtin.projects ? (
                      <a
                        href={`/projects/${gtin.assigned_to_project_id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(`/projects/${gtin.assigned_to_project_id}`)
                        }}
                        style={{
                          ...styles.projectLink,
                          color: '#4f46e5'
                        }}
                      >
                        {gtin.projects.name}
                        {gtin.projects.sku_internal && ` (${gtin.projects.sku_internal})`}
                        <ExternalLink size={12} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                      </a>
                    ) : (
                      <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>-</span>
                    )}
                  </td>
                  <td style={{...styles.td, color: darkMode ? '#9ca3af' : '#6b7280'}}>
                    {gtin.notes || '-'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {gtin.status === 'assigned' && (
                        <button
                          onClick={() => handleReleaseGtin(gtin.id)}
                          style={styles.actionButton}
                          title="Alliberar GTIN"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {gtin.status !== 'archived' && (
                        <button
                          onClick={() => handleArchiveGtin(gtin.id)}
                          style={{...styles.actionButton, color: '#6b7280'}}
                          title="Arxivar"
                        >
                          Arxivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Import */}
      {showImportModal && (
        <div style={{...styles.modalOverlay, ...modalStyles.overlay}} onClick={() => setShowImportModal(false)}>
          <div
            style={{
              ...styles.modal,
              ...modalStyles.modal
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{
                ...styles.modalTitle,
                color: darkMode ? '#ffffff' : '#111827'
              }}>
                <FileSpreadsheet size={20} />
                Import GTINs des de Excel/CSV
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportPreview(null)
                }}
                style={styles.modalClose}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {!importPreview ? (
                <div>
                  <p style={{
                    ...styles.helpText,
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}>
                    Format esperat (CSV):<br />
                    <code style={styles.code}>
                      gtin_code,gtin_type,notes<br />
                      8437012345678,EAN,Lot GS1 març<br />
                      012345678905,UPC,Compra online
                    </code>
                  </p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      ...styles.uploadZone,
                      borderColor: darkMode ? '#374151' : '#d1d5db',
                      backgroundColor: darkMode ? '#15151f' : '#f9fafb'
                    }}
                  >
                    <Upload size={32} color="#9ca3af" />
                    <p style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      Clica per seleccionar fitxer CSV
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.previewStats}>
                    <div style={styles.previewStat}>
                      <CheckCircle2 size={20} color="#22c55e" />
                      <span>{importPreview.valid} vàlids</span>
                    </div>
                    <div style={styles.previewStat}>
                      <AlertTriangle size={20} color="#ef4444" />
                      <span>{importPreview.invalid} invàlids</span>
                    </div>
                    {importPreview.duplicates.length > 0 && (
                      <div style={styles.previewStat}>
                        <AlertTriangle size={20} color="#f59e0b" />
                        <span>{importPreview.duplicates.length} duplicats al fitxer</span>
                      </div>
                    )}
                    {importPreview.conflicts.length > 0 && (
                      <div style={styles.previewStat}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <span>{importPreview.conflicts.length} ja existeixen</span>
                      </div>
                    )}
                  </div>

                  <div style={styles.previewTable}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Fila</th>
                          <th style={styles.th}>Codi</th>
                          <th style={styles.th}>Tipus</th>
                          <th style={styles.th}>Estat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.slice(0, 20).map((row, idx) => (
                          <tr key={idx}>
                            <td style={styles.td}>{row.row}</td>
                            <td style={styles.td}>{row.gtin_code}</td>
                            <td style={styles.td}>{row.gtin_type}</td>
                            <td style={styles.td}>
                              {!row.valid && <span style={{ color: '#ef4444' }}>Invàlid</span>}
                              {importPreview.conflicts.includes(row.gtin_code) && (
                                <span style={{ color: '#f59e0b' }}>Ja existeix</span>
                              )}
                              {row.valid && !importPreview.conflicts.includes(row.gtin_code) && (
                                <span style={{ color: '#22c55e' }}>✓ Vàlid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.rows.length > 20 && (
                      <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
                        ... i {importPreview.rows.length - 20} més
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportPreview(null)
                }}
                style={styles.cancelButton}
              >
                Cancel·lar
              </button>
              {importPreview && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importing || importPreview.valid === 0}
                  style={{
                    ...styles.confirmButton,
                    opacity: (importing || importPreview.valid === 0) ? 0.6 : 1
                  }}
                >
                  {importing ? 'Important...' : `Importar ${importPreview.rows.filter(r => r.valid && !importPreview.conflicts.includes(r.gtin_code)).length} codis`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { 
    padding: '16px',
    '@media (min-width: 768px)': {
      padding: '32px'
    }
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    gap: '16px'
  },
  title: {
    margin: '0 0 8px',
    fontSize: '24px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px'
  },
  importButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    justifyContent: 'center',
    whiteSpace: 'nowrap'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid'
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  alertCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid'
  },
  alertText: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600'
  },
  alertLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  },
  toolbarRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  searchContainer: {
    flex: 1,
    minWidth: '200px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 16px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)'
  },
  searchInput: {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    background: 'transparent'
  },
  filterButtons: {
    display: 'flex',
    gap: '8px'
  },
  filterButton: {
    padding: '12px 20px',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  projectLink: {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'opacity 0.2s'
  },
  refreshButton: {
    padding: '12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  loading: {
    padding: '64px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '64px',
    textAlign: 'center',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  tableContainer: {
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '14px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border-color)'
  },
  tr: {
    borderBottom: '1px solid var(--border-color)'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#6b7280'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500'
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#ef4444'
  },
  modalOverlay: {
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
  },
  modal: {
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px'
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  helpText: {
    marginBottom: '20px',
    fontSize: '13px',
    lineHeight: '1.6'
  },
  code: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#1f1f2e',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginTop: '8px'
  },
  uploadZone: {
    padding: '40px',
    border: '2px dashed',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  previewStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  previewStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  previewTable: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  // Mobile cards
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  gtinCard: {
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardGtinCode: {
    fontFamily: 'monospace',
    fontWeight: '600',
    fontSize: '16px',
    marginBottom: '8px'
  },
  cardBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  cardRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cardLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap'
  }
}

