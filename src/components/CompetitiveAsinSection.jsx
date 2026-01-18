import { useEffect, useMemo, useState } from 'react'
import { Barcode, ExternalLink, Save } from 'lucide-react'
import { getProductIdentifiers, upsertProductIdentifiers } from '../lib/supabase'
import { getPhaseSurfaceStyles } from '../utils/phaseStyles'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'

const SIZE_TIERS = [
  { value: '', label: 'Selecciona mida' },
  { value: 'small_standard', label: 'Petit estàndard' },
  { value: 'large_standard', label: 'Gran estàndard' },
  { value: 'small_oversize', label: 'Petit oversize' },
  { value: 'medium_oversize', label: 'Mitjà oversize' },
  { value: 'large_oversize', label: 'Gran oversize' },
  { value: 'special_oversize', label: 'Especial oversize' }
]

const hexToRgba = (hex, alpha) => {
  if (!hex) return ''
  const normalized = hex.replace('#', '')
  const isShort = normalized.length === 3
  const expanded = isShort
    ? normalized.split('').map((ch) => ch + ch).join('')
    : normalized
  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const extractMarketplace = (host) => {
  if (!host) return 'es'
  if (host.endsWith('amazon.com')) return 'com'
  if (host.endsWith('amazon.co.uk')) return 'co.uk'
  if (host.endsWith('amazon.de')) return 'de'
  if (host.endsWith('amazon.fr')) return 'fr'
  if (host.endsWith('amazon.it')) return 'it'
  if (host.endsWith('amazon.es')) return 'es'
  return 'es'
}

const extractAsin = (input) => {
  if (!input) return null
  const trimmed = input.trim()
  if (/^[A-Z0-9]{10}$/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  try {
    const url = new URL(trimmed)
    const marketplace = extractMarketplace(url.hostname)
    const dpMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/i)
    if (dpMatch?.[1]) return { asin: dpMatch[1].toUpperCase(), marketplace }
    const gpMatch = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i)
    if (gpMatch?.[1]) return { asin: gpMatch[1].toUpperCase(), marketplace }
    const asinParam = url.searchParams.get('asin')
    if (asinParam && /^[A-Z0-9]{10}$/i.test(asinParam)) {
      return { asin: asinParam.toUpperCase(), marketplace }
    }
  } catch {
    return null
  }
  return null
}

const getAmazonUrl = (asin, marketplace = 'es') => {
  const domain = marketplace === 'com' ? 'amazon.com' : `amazon.${marketplace}`
  return `https://${domain}/dp/${asin}`
}

const COMPETITOR_STORAGE_PREFIX = 'competitive_asin_meta_'

export default function CompetitiveAsinSection({ projectId, darkMode, phaseStyle }) {
  const [loading, setLoading] = useState(true)
  const [savingAsin, setSavingAsin] = useState(false)
  const [asinInput, setAsinInput] = useState('')
  const [amazonUrl, setAmazonUrl] = useState('')
  const [asinError, setAsinError] = useState('')
  const [capturedAsin, setCapturedAsin] = useState(null)
  const [marketplace, setMarketplace] = useState('es')
  const [meta, setMeta] = useState({
    competitor_price: '',
    category_guess: '',
    size_tier: '',
    weight_g: '',
    brand: '',
    package_dimensions: ''
  })
  const saveButtonState = useButtonState()
  const hasPhaseStyle = Boolean(phaseStyle?.bg && phaseStyle?.accent)
  const phaseSurface = getPhaseSurfaceStyles(phaseStyle, { darkMode, borderWidth: 2 })
  const inputBorderColor = hasPhaseStyle
    ? hexToRgba(phaseStyle.accent, 0.25)
    : '#d1d5db'

  const storageKey = useMemo(() => `${COMPETITOR_STORAGE_PREFIX}${projectId}`, [projectId])

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!projectId) return
      setLoading(true)
      try {
        const identifiers = await getProductIdentifiers(projectId)
        if (!isMounted) return
        if (identifiers?.asin) {
          setCapturedAsin(identifiers.asin)
        }
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          setMeta(prev => ({ ...prev, ...parsed }))
          setAmazonUrl(parsed.amazon_url || '')
        }
      } catch (err) {
        console.error('Error carregant ASIN competidor:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [projectId, storageKey])

  const handleSaveAsin = async () => {
    setAsinError('')
    const inputValue = asinInput.trim() || amazonUrl.trim()
    if (!inputValue) return
    const extracted = extractAsin(inputValue)
    const asinValue = typeof extracted === 'string' ? extracted : extracted?.asin
    if (!asinValue) {
      setAsinError('Format invàlid. Introdueix una URL d\'Amazon o un ASIN de 10 caràcters.')
      return
    }

    setSavingAsin(true)
    try {
      const existing = await getProductIdentifiers(projectId)
      await upsertProductIdentifiers(projectId, {
        gtin_type: existing?.gtin_type || null,
        gtin_code: existing?.gtin_code || null,
        fnsku: existing?.fnsku || null,
        exemption_reason: existing?.exemption_reason || null,
        asin: asinValue
      })
      setCapturedAsin(asinValue)
      if (typeof extracted === 'object' && extracted?.marketplace) {
        setMarketplace(extracted.marketplace)
      }
      setAsinInput('')
    } catch (err) {
      console.error('Error guardant ASIN:', err)
      setAsinError('Error guardant l\'ASIN: ' + (err.message || 'Error desconegut'))
    } finally {
      setSavingAsin(false)
    }
  }

  const handleClearAsin = () => {
    setCapturedAsin(null)
    setAsinInput('')
  }

  const handleSaveMeta = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...meta,
        amazon_url: amazonUrl.trim()
      }))
    } catch (err) {
      console.error('Error guardant dades competidor:', err)
    }
  }

  if (loading) {
    return (
      <div style={{
        ...styles.section,
        ...(hasPhaseStyle ? phaseSurface.cardStyle : {}),
        background: hasPhaseStyle ? phaseSurface.cardStyle.background : undefined
      }}>
        <div style={styles.loading}>Carregant ASIN competidor...</div>
      </div>
    )
  }

  return (
    <div style={{
      ...styles.section,
      ...(hasPhaseStyle ? phaseSurface.cardStyle : {}),
      background: hasPhaseStyle ? phaseSurface.cardStyle.background : undefined
    }}>
      <div style={styles.header}>
        <h3 style={{
          ...styles.title,
          color: darkMode ? '#ffffff' : '#111827'
        }}>
          <Barcode size={20} />
          ASIN competidor i snapshot
        </h3>
        {capturedAsin && (
          <a
            href={getAmazonUrl(capturedAsin, marketplace)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            <ExternalLink size={14} />
            Veure a Amazon
          </a>
        )}
      </div>

      <div style={styles.asinBlock}>
        {!capturedAsin ? (
          <>
            <div style={styles.field}>
              <label style={{
                ...styles.label,
                color: darkMode ? '#e5e7eb' : '#374151'
              }}>
                ASIN competidor (obligatori)
              </label>
              <div style={styles.asinInputRow}>
                <input
                  type="text"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value)}
                  placeholder="Ex: B08XYZ1234"
                  style={{
                    ...styles.input,
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    borderColor: inputBorderColor
                  }}
                />
              </div>
            </div>
            <div style={styles.field}>
              <label style={{
                ...styles.label,
                color: darkMode ? '#e5e7eb' : '#374151'
              }}>
                URL d'Amazon (opcional)
              </label>
              <input
                type="text"
                value={amazonUrl}
                onChange={(e) => setAmazonUrl(e.target.value)}
                placeholder="Pega una URL d'Amazon per extreure l'ASIN"
                style={{
                  ...styles.input,
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  borderColor: inputBorderColor
                }}
              />
            </div>
            <button
              onClick={handleSaveAsin}
              disabled={savingAsin || (!asinInput.trim() && !amazonUrl.trim())}
              style={{
                ...styles.captureButton,
                opacity: (savingAsin || (!asinInput.trim() && !amazonUrl.trim())) ? 0.6 : 1,
                cursor: (savingAsin || (!asinInput.trim() && !amazonUrl.trim())) ? 'not-allowed' : 'pointer',
                marginTop: '8px'
              }}
            >
              {savingAsin ? 'Guardant...' : 'Capturar ASIN'}
            </button>
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              Cal un ASIN per desbloquejar el snapshot de competència.
            </div>
          </>
        ) : (
          <div style={{
            ...styles.asinCaptured,
            color: darkMode ? '#e5e7eb' : '#111827'
          }}>
            <div>
              ASIN capturat: <strong>{capturedAsin}</strong>
              {marketplace && (
                <span style={styles.marketplace}>({marketplace.toUpperCase()})</span>
              )}
            </div>
            <button onClick={handleClearAsin} style={styles.replaceButton}>
              Canviar
            </button>
          </div>
        )}
        {asinError && (
          <div style={styles.error}>{asinError}</div>
        )}
      </div>

      {capturedAsin && (
        <>
          <div style={{
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            Snapshot de competidor
          </div>
          <div style={styles.metaGrid}>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Preu competidor</label>
          <input
            type="number"
            value={meta.competitor_price}
            onChange={(e) => setMeta({ ...meta, competitor_price: e.target.value })}
            placeholder="Ex: 39.99"
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          />
        </div>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Categoria estimada</label>
          <input
            type="text"
            value={meta.category_guess}
            onChange={(e) => setMeta({ ...meta, category_guess: e.target.value })}
            placeholder="Ex: Electrònica"
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          />
        </div>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Mida FBA</label>
          <select
            value={meta.size_tier}
            onChange={(e) => setMeta({ ...meta, size_tier: e.target.value })}
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          >
            {SIZE_TIERS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Pes estimat (g)</label>
          <input
            type="number"
            value={meta.weight_g}
            onChange={(e) => setMeta({ ...meta, weight_g: e.target.value })}
            placeholder="Ex: 450"
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          />
        </div>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Marca</label>
          <input
            type="text"
            value={meta.brand}
            onChange={(e) => setMeta({ ...meta, brand: e.target.value })}
            placeholder="Ex: MarcaX"
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          />
        </div>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>Dimensions (opcional)</label>
          <input
            type="text"
            value={meta.package_dimensions}
            onChange={(e) => setMeta({ ...meta, package_dimensions: e.target.value })}
            placeholder="Ex: 20x10x6 cm"
            style={{
              ...styles.input,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
          />
        </div>
          </div>

          <div style={styles.saveRow}>
            <button
              onClick={handleSaveMeta}
              {...saveButtonState}
              style={getButtonStyles({
                variant: 'primary',
                darkMode,
                disabled: false,
                isHovered: saveButtonState.isHovered,
                isActive: saveButtonState.isActive
              })}
            >
              <Save size={16} />
              Guardar dades competidor
            </button>
            <span style={{
              ...styles.helper,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              Guardat localment per projecte.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  section: {
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    marginBottom: '24px'
  },
  loading: {
    fontSize: '14px',
    color: '#6b7280'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#4f46e5',
    textDecoration: 'none'
  },
  asinBlock: {
    marginBottom: '20px'
  },
  asinInputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  asinCaptured: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '14px',
    color: '#111827'
  },
  marketplace: {
    marginLeft: '8px',
    color: '#6b7280',
    fontSize: '12px'
  },
  captureButton: {
    padding: '10px 16px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px'
  },
  replaceButton: {
    padding: '8px 12px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  error: {
    marginTop: '8px',
    color: '#dc2626',
    fontSize: '13px'
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px'
  },
  saveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  helper: {
    fontSize: '12px',
    color: '#6b7280'
  }
}
