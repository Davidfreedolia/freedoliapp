import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Barcode, ExternalLink, Save } from 'lucide-react'
import Button from './Button'
import { getProductIdentifiers, upsertProductIdentifiers } from '../lib/supabase'
import { getPhaseSurfaceStyles } from '../utils/phaseStyles'
import { useApp } from '../context/AppContext'
import { getButtonStyles, useButtonState } from '../utils/buttonStyles'

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
  const { t } = useTranslation()
  const { activeOrgId } = useApp()
  const SIZE_TIERS = [
    { value: '', label: t('competitiveAsin.sizeTiers.select') },
    { value: 'small_standard',   label: t('competitiveAsin.sizeTiers.smallStandard') },
    { value: 'large_standard',   label: t('competitiveAsin.sizeTiers.largeStandard') },
    { value: 'small_oversize',   label: t('competitiveAsin.sizeTiers.smallOversize') },
    { value: 'medium_oversize',  label: t('competitiveAsin.sizeTiers.mediumOversize') },
    { value: 'large_oversize',   label: t('competitiveAsin.sizeTiers.largeOversize') },
    { value: 'special_oversize', label: t('competitiveAsin.sizeTiers.specialOversize') }
  ]
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
    package_dimensions: '',
    model: '',
    country_of_origin: '',
    dimensions_cm: '',
    bsr_main_rank: '',
    bsr_main_category: '',
    bsr_sub_rank: '',
    bsr_sub_category: '',
    rating: '',
    review_count: '',
    launch_date: '',
    main_image_url: ''
  })
  const [detailsText, setDetailsText] = useState('')
  const [parseWarning, setParseWarning] = useState('')
  const saveButtonState = useButtonState()
  const hasPhaseStyle = Boolean(phaseStyle?.bg && phaseStyle?.accent)
  const phaseSurface = getPhaseSurfaceStyles(phaseStyle, { darkMode, borderWidth: 2 })
  const inputBorderColor = 'var(--border-1)'

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
      setAsinError(t('competitiveAsin.errors.invalidFormat'))
      return
    }

    setSavingAsin(true)
    try {
      if (!activeOrgId) {
        setAsinError(t('competitiveAsin.errors.noWorkspace'))
        setSavingAsin(false)
        return
      }
      const existing = await getProductIdentifiers(projectId)
      await upsertProductIdentifiers(projectId, {
        gtin_type: existing?.gtin_type || null,
        gtin_code: existing?.gtin_code || null,
        fnsku: existing?.fnsku || null,
        exemption_reason: existing?.exemption_reason || null,
        asin: asinValue
      }, activeOrgId)
      setCapturedAsin(asinValue)
      if (typeof extracted === 'object' && extracted?.marketplace) {
        setMarketplace(extracted.marketplace)
      }
      setAsinInput('')
    } catch (err) {
      console.error('Error guardant ASIN:', err)
      setAsinError(t('competitiveAsin.errors.saveAsin', { error: err.message || t('common.unknownError') }))
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

  const parseNumber = (value) => {
    if (!value) return ''
    const normalized = value.replace(/\./g, '').replace(',', '.').trim()
    const numeric = Number.parseFloat(normalized)
    return Number.isFinite(numeric) ? numeric.toString() : ''
  }

  const parseWeightToGrams = (raw) => {
    if (!raw) return ''
    const normalized = raw.toLowerCase().replace(',', '.')
    const match = normalized.match(/([\d.]+)\s*(kg|g|lb|oz)/i)
    if (!match) return ''
    const value = Number.parseFloat(match[1])
    if (!Number.isFinite(value)) return ''
    const unit = match[2]
    if (unit === 'kg') return Math.round(value * 1000).toString()
    if (unit === 'g') return Math.round(value).toString()
    if (unit === 'lb') return Math.round(value * 453.592).toString()
    if (unit === 'oz') return Math.round(value * 28.3495).toString()
    return ''
  }

  const parseDimensionsToCm = (raw) => {
    if (!raw) return ''
    const normalized = raw.toLowerCase().replace(',', '.')
    const numbers = normalized.match(/[\d.]+/g)
    if (!numbers || numbers.length < 3) return raw.trim()
    const isInches = normalized.includes('pulg') || normalized.includes('inch')
    const converted = numbers.slice(0, 3).map((num) => {
      const value = Number.parseFloat(num)
      if (!Number.isFinite(value)) return null
      return isInches ? value * 2.54 : value
    })
    if (converted.some(value => value == null)) return raw.trim()
    return `${converted.map(value => value.toFixed(2)).join(' x ')} cm`
  }

  const handleParseDetails = () => {
    setParseWarning('')
    const text = detailsText || ''
    if (!text.trim()) {
      setParseWarning(t('competitiveAsin.warnings.pasteFirst'))
      return
    }

    const nextMeta = { ...meta }
    let matched = 0

    const grabLine = (labelRegex) => {
      const match = text.match(labelRegex)
      return match ? match[1].trim() : ''
    }

    const asinFromText = grabLine(/ASIN\s*[:：]\s*([A-Z0-9]{10})/i)
    if (asinFromText) {
      matched += 1
      if (!capturedAsin) {
        setAsinInput(asinFromText)
      }
    }

    const brand = grabLine(/Fabricante\s*[:：]\s*([^\n]+)/i)
    if (brand) {
      matched += 1
      nextMeta.brand = brand
    }
    const model = grabLine(/N[uú]mero de modelo\s*[:：]\s*([^\n]+)/i)
    if (model) {
      matched += 1
      nextMeta.model = model
    }
    const country = grabLine(/Pa[ií]s de origen\s*[:：]\s*([^\n]+)/i)
    if (country) {
      matched += 1
      nextMeta.country_of_origin = country
    }
    const dimensionsRaw = grabLine(/Dimensiones del producto\s*[:：]\s*([^\n]+)/i)
    if (dimensionsRaw) {
      matched += 1
      nextMeta.dimensions_cm = parseDimensionsToCm(dimensionsRaw)
    }
    const weightRaw = grabLine(/Peso del producto\s*[:：]\s*([^\n]+)/i)
    const weightParsed = parseWeightToGrams(weightRaw)
    if (weightParsed) {
      matched += 1
      nextMeta.weight_g = weightParsed
    }
    const launchDate = grabLine(/Producto en Amazon(?:\.es)?\s*desde\s*[:：]?\s*([^\n]+)/i)
    if (launchDate) {
      matched += 1
      nextMeta.launch_date = launchDate
    }

    const bsrBlockMatch = text.match(/Clasificaci[oó]n en los m[aá]s vendidos de Amazon\s*[:：]\s*([^\n]+(?:\n[^\n]+){0,3})/i)
    if (bsrBlockMatch?.[1]) {
      const bsrBlock = bsrBlockMatch[1]
      const rankMatches = Array.from(bsrBlock.matchAll(/n[ºo]\s*\.?\s*([\d.]+)\s+en\s+([^\n(]+)/gi))
      if (rankMatches[0]) {
        matched += 1
        nextMeta.bsr_main_rank = rankMatches[0][1].replace(/\./g, '')
        nextMeta.bsr_main_category = rankMatches[0][2].trim()
      }
      if (rankMatches[1]) {
        matched += 1
        nextMeta.bsr_sub_rank = rankMatches[1][1].replace(/\./g, '')
        nextMeta.bsr_sub_category = rankMatches[1][2].trim()
      }
    }

    const ratingMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*de\s*5\s*estrellas/i)
    if (ratingMatch?.[1]) {
      matched += 1
      nextMeta.rating = parseNumber(ratingMatch[1])
    }
    const reviewsMatch = text.match(/([\d.,]+)\s*valoraciones/i)
    if (reviewsMatch?.[1]) {
      matched += 1
      nextMeta.review_count = reviewsMatch[1].replace(/[.,]/g, '')
    }

    if (!matched) {
      setParseWarning(t('competitiveAsin.warnings.noFields'))
      return
    }

    setMeta(nextMeta)
  }

  if (loading) {
    return (
      <div style={{
        ...styles.section,
        ...(hasPhaseStyle ? phaseSurface.cardStyle : {}),
        background: hasPhaseStyle ? phaseSurface.cardStyle.background : undefined
      }}>
        <div style={styles.loading}>{t('competitiveAsin.loading')}</div>
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
          {t('competitiveAsin.title')}
        </h3>
        {capturedAsin && (
          <a
            href={getAmazonUrl(capturedAsin, marketplace)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            <ExternalLink size={14} />
            {t('competitiveAsin.viewOnAmazon')}
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
                {t('competitiveAsin.fields.competitorAsin')}
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
                {t('competitiveAsin.fields.amazonUrl')}
              </label>
              <input
                type="text"
                value={amazonUrl}
                onChange={(e) => setAmazonUrl(e.target.value)}
                placeholder={t('competitiveAsin.placeholders.amazonUrl')}
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
              {savingAsin ? t('common.saving') : t('competitiveAsin.actions.capture')}
            </button>
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {t('competitiveAsin.helpers.needAsin')}
            </div>
          </>
        ) : (
          <div style={{
            ...styles.asinCaptured,
            color: darkMode ? '#e5e7eb' : '#111827'
          }}>
            <div>
              {t('competitiveAsin.captured')}: <strong>{capturedAsin}</strong>
              {marketplace && (
                <span style={styles.marketplace}>({marketplace.toUpperCase()})</span>
              )}
            </div>
            <Button variant="secondary" onClick={handleClearAsin}>
              {t('competitiveAsin.actions.change')}
            </Button>
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
            {t('competitiveAsin.snapshotTitle')}
          </div>
          <div style={styles.metaGrid}>
        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>{t('competitiveAsin.fields.competitorPrice')}</label>
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
          }}>{t('competitiveAsin.fields.estimatedCategory')}</label>
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
          }}>{t('competitiveAsin.fields.fbaSize')}</label>
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
          }}>{t('competitiveAsin.fields.estimatedWeight')}</label>
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
          }}>{t('competitiveAsin.fields.brand')}</label>
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
          }}>{t('competitiveAsin.fields.dimensionsOptional')}</label>
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
              {t('competitiveAsin.actions.saveCompetitorData')}
            </button>
            <span style={{
              ...styles.helper,
              color: darkMode ? '#9ca3af' : '#6b7280'
            }}>
              {t('competitiveAsin.helpers.savedLocally')}
            </span>
          </div>
        </>
      )}

      <div style={styles.detailsCard}>
        <div style={styles.detailsHeader}>
          <h4 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '600',
            color: darkMode ? '#ffffff' : '#111827'
          }}>
            {t('competitiveAsin.detailsTitle')}
          </h4>
          <span style={{
            fontSize: '12px',
            color: darkMode ? '#9ca3af' : '#6b7280'
          }}>
            {t('competitiveAsin.detailsSubtitle')}
          </span>
        </div>

        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>ASIN</label>
          <input
            type="text"
            value={capturedAsin || asinInput}
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

        <div style={styles.field}>
          <label style={{
            ...styles.label,
            color: darkMode ? '#e5e7eb' : '#374151'
          }}>{t('competitiveAsin.fields.amazonUrl')}</label>
          <input
            type="text"
            value={amazonUrl}
            onChange={(e) => setAmazonUrl(e.target.value)}
            placeholder={t('competitiveAsin.placeholders.amazonUrlShort')}
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
          }}>{t('competitiveAsin.fields.pasteDetails')}</label>
          <textarea
            value={detailsText}
            onChange={(e) => setDetailsText(e.target.value)}
            placeholder="Ex: Fabricante: ... ASIN: ... Dimensiones del producto: ..."
            style={{
              ...styles.textarea,
              backgroundColor: '#ffffff',
              color: '#111827',
              borderColor: inputBorderColor
            }}
            rows={6}
          />
        </div>

        {parseWarning && (
          <div style={styles.warningText}>{parseWarning}</div>
        )}

        <div style={styles.detailsActions}>
          <button
            onClick={handleParseDetails}
            style={styles.secondaryButton}
          >
            {t('competitiveAsin.actions.parse')}
          </button>
          <button
            onClick={handleSaveMeta}
            style={styles.captureButton}
          >
            {t('common.save')}
          </button>
        </div>

        <div style={styles.metaGrid}>
          <div style={styles.field}>
            <label style={{
              ...styles.label,
              color: darkMode ? '#e5e7eb' : '#374151'
            }}>{t('competitiveAsin.fields.brand')}</label>
            <input
              type="text"
              value={meta.brand}
              onChange={(e) => setMeta({ ...meta, brand: e.target.value })}
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
            }}>{t('competitiveAsin.fields.model')}</label>
            <input
              type="text"
              value={meta.model}
              onChange={(e) => setMeta({ ...meta, model: e.target.value })}
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
            }}>{t('competitiveAsin.fields.countryOfOrigin')}</label>
            <input
              type="text"
              value={meta.country_of_origin}
              onChange={(e) => setMeta({ ...meta, country_of_origin: e.target.value })}
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
            }}>{t('competitiveAsin.fields.dimensionsCm')}</label>
            <input
              type="text"
              value={meta.dimensions_cm}
              onChange={(e) => setMeta({ ...meta, dimensions_cm: e.target.value })}
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
            }}>{t('competitiveAsin.fields.weight')}</label>
            <input
              type="number"
              value={meta.weight_g}
              onChange={(e) => setMeta({ ...meta, weight_g: e.target.value })}
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
            }}>{t('competitiveAsin.fields.bsrMain')}</label>
            <input
              type="text"
              value={meta.bsr_main_rank}
              onChange={(e) => setMeta({ ...meta, bsr_main_rank: e.target.value })}
              placeholder="nº"
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
            }}>{t('competitiveAsin.fields.bsrMainCategory')}</label>
            <input
              type="text"
              value={meta.bsr_main_category}
              onChange={(e) => setMeta({ ...meta, bsr_main_category: e.target.value })}
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
            }}>{t('competitiveAsin.fields.bsrSub')}</label>
            <input
              type="text"
              value={meta.bsr_sub_rank}
              onChange={(e) => setMeta({ ...meta, bsr_sub_rank: e.target.value })}
              placeholder="nº"
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
            }}>{t('competitiveAsin.fields.bsrSubCategory')}</label>
            <input
              type="text"
              value={meta.bsr_sub_category}
              onChange={(e) => setMeta({ ...meta, bsr_sub_category: e.target.value })}
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
            }}>{t('competitiveAsin.fields.rating')}</label>
            <input
              type="text"
              value={meta.rating}
              onChange={(e) => setMeta({ ...meta, rating: e.target.value })}
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
            }}>{t('competitiveAsin.fields.reviewCount')}</label>
            <input
              type="text"
              value={meta.review_count}
              onChange={(e) => setMeta({ ...meta, review_count: e.target.value })}
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
            }}>{t('competitiveAsin.fields.launchDate')}</label>
            <input
              type="text"
              value={meta.launch_date}
              onChange={(e) => setMeta({ ...meta, launch_date: e.target.value })}
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
            }}>{t('competitiveAsin.fields.mainImageUrl')}</label>
            <input
              type="text"
              value={meta.main_image_url}
              onChange={(e) => setMeta({ ...meta, main_image_url: e.target.value })}
              placeholder="https://..."
              style={{
                ...styles.input,
                backgroundColor: '#ffffff',
                color: '#111827',
                borderColor: inputBorderColor
              }}
            />
          </div>
        </div>

        {meta.main_image_url && (
          <div style={styles.imagePreview}>
            <img src={meta.main_image_url} alt="Amazon main" style={styles.imagePreviewImg} />
          </div>
        )}
      </div>
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
  },
  detailsCard: {
    marginTop: '24px',
    padding: '20px',
    borderRadius: '14px',
    border: '1px dashed var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  detailsHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    resize: 'vertical'
  },
  detailsActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  secondaryButton: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: 'transparent',
    fontSize: '13px',
    cursor: 'pointer'
  },
  warningText: {
    fontSize: '12px',
    color: '#f59e0b'
  },
  imagePreview: {
    marginTop: '8px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    display: 'flex',
    justifyContent: 'center'
  },
  imagePreviewImg: {
    maxWidth: '100%',
    maxHeight: '180px',
    objectFit: 'contain'
  }
}
