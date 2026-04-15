import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { parseImportFile } from '../../lib/import/importParser'
import { IMPORT_SOURCES, SOURCE_GROUPS, getSource } from '../../lib/import/columnDictionaries'
import { proposeMapping, applyMapping, listTargets } from '../../lib/import/columnMapper'
import { executeImport, computePreviewSummary } from '../../lib/import/importExecutor'
import { detectSource, SELLERBOARD_SUBTYPES } from '../../lib/import/sourceDetector'
import { detectCurrency, inferFormatFromRows } from '../../lib/import/currencyDetector'
import ImportPreviewSummary from './ImportPreviewSummary'
import ExportGuide from './ExportGuide'

/**
 * DataImportWizard — 4-step wizard: source → upload → mapping+preview → confirm/done.
 *
 * The source-selection grid is grouped by category (Amazon / Accounting / Projects /
 * Database / Generic). After a file is parsed we auto-detect the source and
 * pre-fill the mapping, but the user can override at any point.
 */
const STEP_SOURCE = 1
const STEP_UPLOAD = 2
const STEP_MAPPING = 3
const STEP_DONE = 4

export default function DataImportWizard({ darkMode = false }) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()

  const [step, setStep] = useState(STEP_SOURCE)
  const [sourceId, setSourceId] = useState('generic')
  const [subType, setSubType] = useState(null)
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [mapping, setMapping] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [numberFormat, setNumberFormat] = useState(null)
  const [currency, setCurrency] = useState('EUR')
  const [autoDetect, setAutoDetect] = useState(null)

  const currentSource = getSource(sourceId) || IMPORT_SOURCES[IMPORT_SOURCES.length - 1]
  const sourceLabel = currentSource?.label || sourceId

  useEffect(() => {
    if (parsed?.columns) {
      const proposal = proposeMapping(parsed.columns, sourceId)
      setMapping(proposal)
    }
  }, [parsed, sourceId])

  const targets = useMemo(() => listTargets(sourceId), [sourceId])

  // Mapped rows used for preview — memoized so ImportPreviewSummary recomputes cheaply.
  const mappedRows = useMemo(() => {
    if (!parsed?.rows) return []
    return applyMapping(parsed.rows, mapping)
  }, [parsed, mapping])

  const preview = useMemo(() => {
    if (mappedRows.length === 0) return null
    return computePreviewSummary(mappedRows, { sourceId, subType, numberFormat })
  }, [mappedRows, sourceId, subType, numberFormat])

  const handleFileChosen = async (f) => {
    if (!f) return
    setFile(f)
    setParseError(null)
    setParsed(null)
    setAutoDetect(null)
    try {
      const result = await parseImportFile(f)
      if (!result.rows?.length) {
        throw new Error(t('dataImport.errors.empty', 'El fitxer no conté files de dades.'))
      }
      // Auto-detect source (+ sub-type for Sellerboard).
      const detected = detectSource({
        columns: result.columns,
        kind: result.kind,
        rawJson: result.rawJson,
      })
      setAutoDetect(detected)

      // Only apply detection if the user hadn't explicitly picked a specific source
      // (i.e., left "generic") or if detection is very confident.
      if (sourceId === 'generic' || detected.confidence >= 0.85) {
        setSourceId(detected.sourceId)
        if (detected.subType) setSubType(detected.subType)
      }

      // Sniff currency + number format from sample values.
      const numericCols = []
      for (const col of result.columns) {
        const lower = col.toLowerCase()
        if (/revenue|ventas|umsatz|profit|gewinn|beneficio|cost|coste|cogs|fees|ppc|storage|amount|importe|total/.test(lower)) {
          numericCols.push(col)
        }
      }
      const fmt = inferFormatFromRows(result.rows, numericCols.length ? numericCols : result.columns)
      setNumberFormat(fmt)
      const samples = []
      for (const row of result.rows.slice(0, 10)) {
        for (const col of numericCols) samples.push(row[col])
      }
      setCurrency(detectCurrency(samples, null))

      setParsed(result)
      setStep(STEP_MAPPING)
    } catch (err) {
      setParseError(err?.message || String(err))
    }
  }

  const updateMapping = (target, column) => {
    setMapping((prev) => ({
      ...prev,
      [target]: column ? { column, score: 1.0 } : null,
    }))
  }

  const handleSubmit = async () => {
    if (!parsed || !activeOrgId) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      const res = await executeImport(mappedRows, {
        orgId: activeOrgId,
        userId,
        sourceId,
        subType,
        sourceLabel,
        numberFormat,
      })
      setSummary(res)
      setStep(STEP_DONE)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep(STEP_SOURCE)
    setSourceId('generic')
    setSubType(null)
    setFile(null)
    setParsed(null)
    setParseError(null)
    setMapping({})
    setSummary(null)
    setAutoDetect(null)
  }

  const cardBg = darkMode ? '#1b1b2a' : '#ffffff'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const shell = {
    backgroundColor: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: 20,
    color: ink,
  }

  // Stepper
  const stepPill = (idx, label) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      color: step >= idx ? 'var(--brand-1,#1F5F63)' : muted,
      fontSize: 13, fontWeight: 600,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%',
        backgroundColor: step >= idx ? 'var(--brand-1,#1F5F63)' : 'transparent',
        color: step >= idx ? '#fff' : muted,
        border: `1px solid ${step >= idx ? 'var(--brand-1,#1F5F63)' : borderColor}`,
        fontSize: 12,
      }}>{idx}</span>
      {label}
    </div>
  )

  const SourceCard = ({ s }) => {
    const selected = sourceId === s.id
    return (
      <button
        type="button"
        onClick={() => { setSourceId(s.id); setSubType(null) }}
        style={{
          position: 'relative',
          textAlign: 'left', padding: 14, borderRadius: 10, cursor: 'pointer',
          border: `1.5px solid ${selected ? 'var(--brand-1,#1F5F63)' : borderColor}`,
          backgroundColor: selected ? 'rgba(31,95,99,0.08)' : 'transparent',
          color: ink, fontSize: 13, fontWeight: 600,
          display: 'flex', flexDirection: 'column', gap: 4, minHeight: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{s.label}</span>
          {s.recommended && (
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 10,
              backgroundColor: 'rgba(63,191,154,0.18)', color: '#2ea082', fontWeight: 700,
            }}>
              {t('dataImport.badge.recommended', 'Recomanat')}
            </span>
          )}
          {s.popular === 'ES' && (
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 10,
              backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545', fontWeight: 700,
            }}>
              {t('dataImport.badge.popularEs', 'Popular a Espanya')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: muted, fontWeight: 400 }}>{s.tagline}</div>
      </button>
    )
  }

  const sourcesByGroup = useMemo(() => {
    const map = new Map()
    for (const g of SOURCE_GROUPS) map.set(g.id, [])
    for (const s of IMPORT_SOURCES) {
      if (map.has(s.group)) map.get(s.group).push(s)
    }
    return map
  }, [])

  return (
    <div style={shell}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {stepPill(1, t('dataImport.steps.source', 'Font'))}
        <ArrowRight size={14} color={muted} />
        {stepPill(2, t('dataImport.steps.upload', 'Puja'))}
        <ArrowRight size={14} color={muted} />
        {stepPill(3, t('dataImport.steps.mapping', 'Mapping'))}
        <ArrowRight size={14} color={muted} />
        {stepPill(4, t('dataImport.steps.done', 'Fet'))}
      </div>

      {step === STEP_SOURCE && (
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
            {t('dataImport.source.title', 'Des de quina eina vols importar?')}
          </h2>
          <p style={{ margin: '0 0 16px', color: muted, fontSize: 13 }}>
            {t('dataImport.source.subtitle', 'Escull la font. Si no saps quina és o no és a la llista, tria "Excel / CSV genèric".')}
          </p>

          {SOURCE_GROUPS.map((group) => {
            const items = sourcesByGroup.get(group.id) || []
            if (!items.length) return null
            return (
              <div key={group.id} style={{ marginBottom: 18 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: muted,
                  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
                }}>
                  {t(group.labelKey, group.defaultLabel)}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}>
                  {items.map((s) => <SourceCard key={s.id} s={s} />)}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="primary" onClick={() => setStep(STEP_UPLOAD)}>
              {t('common.buttons.continue', 'Continuar')}
            </Button>
          </div>
        </div>
      )}

      {step === STEP_UPLOAD && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
                {t('dataImport.upload.title', 'Puja el fitxer exportat')}
              </h2>
              <p style={{ margin: '0 0 16px', color: muted, fontSize: 13 }}>
                {t('dataImport.upload.subtitle', { defaultValue: 'Formats acceptats: CSV, TSV, XLSX, JSON. Font: {{source}}.', source: sourceLabel })}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowGuide(true)}>
              <HelpCircle size={14} style={{ marginRight: 4 }} />
              {t('dataImport.guide.cta', 'Com exportar?')}
            </Button>
          </div>

          {/* Sellerboard sub-type selector */}
          {sourceId === 'sellerboard' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6 }}>
                {t('dataImport.sellerboard.selectType', 'Quin tipus de dades vols importar?')}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 8,
              }}>
                {SELLERBOARD_SUBTYPES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSubType(st.id)}
                    style={{
                      padding: 10, borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${subType === st.id ? 'var(--brand-1,#1F5F63)' : borderColor}`,
                      backgroundColor: subType === st.id ? 'rgba(31,95,99,0.08)' : 'transparent',
                      color: ink, fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {t(st.labelKey, st.defaultLabel)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 40, border: `2px dashed ${borderColor}`, borderRadius: 12,
              cursor: 'pointer', textAlign: 'center', gap: 8,
              backgroundColor: darkMode ? 'rgba(31,95,99,0.08)' : '#fafbf7',
            }}
          >
            <Upload size={28} color="var(--brand-1,#1F5F63)" />
            <strong style={{ fontSize: 14, color: ink }}>
              {file ? file.name : t('dataImport.upload.drop', 'Fes clic o arrossega un fitxer aquí')}
            </strong>
            <span style={{ color: muted, fontSize: 12 }}>
              {t('dataImport.upload.formats', 'CSV · TSV · XLSX · XLS · JSON')}
            </span>
            <input
              type="file"
              accept=".csv,.tsv,.xlsx,.xls,.xlsm,.json"
              style={{ display: 'none' }}
              onChange={(e) => handleFileChosen(e.target.files?.[0])}
            />
          </label>
          {parseError && (
            <div style={{
              marginTop: 12, padding: '10px 12px', borderRadius: 8,
              backgroundColor: 'rgba(242,108,108,0.14)', color: '#c94545', fontSize: 13,
            }}>
              <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              {parseError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <Button variant="ghost" onClick={() => setStep(STEP_SOURCE)}>
              {t('common.buttons.back', 'Enrere')}
            </Button>
          </div>

          <ExportGuide
            sourceId={sourceId}
            sourceLabel={sourceLabel}
            isOpen={showGuide}
            onClose={() => setShowGuide(false)}
            darkMode={darkMode}
          />
        </div>
      )}

      {step === STEP_MAPPING && parsed && (
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
            {t('dataImport.mapping.title', 'Revisa el mapping de columnes')}
          </h2>
          <p style={{ margin: '0 0 16px', color: muted, fontSize: 13 }}>
            {t('dataImport.mapping.subtitle', {
              defaultValue: 'Hem detectat {{rows}} files i {{columns}} columnes. Ajusta el mapping si cal.',
              rows: parsed.rows.length,
              columns: parsed.columns.length,
            })}
          </p>

          {/* Auto-detect notice */}
          {autoDetect && autoDetect.sourceId !== 'generic' && (
            <div style={{
              marginBottom: 12, padding: '10px 12px', borderRadius: 8,
              backgroundColor: 'rgba(110,203,195,0.14)', color: ink, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Sparkles size={14} color="var(--brand-1,#1F5F63)" />
              <span>
                {t('dataImport.autoDetect.hint', {
                  defaultValue: 'Hem detectat que el fitxer sembla de {{source}}{{subType}}.',
                  source: getSource(autoDetect.sourceId)?.label || autoDetect.sourceId,
                  subType: autoDetect.subType ? ` (${autoDetect.subType})` : '',
                })}
              </span>
            </div>
          )}

          {/* Preview summary */}
          {preview && (
            <div style={{ marginBottom: 12 }}>
              <ImportPreviewSummary
                preview={preview}
                sourceLabel={sourceLabel}
                currency={currency}
                darkMode={darkMode}
              />
            </div>
          )}

          <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${borderColor}`, borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ backgroundColor: darkMode ? '#12121c' : '#f4f6f0', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: muted, fontWeight: 600 }}>
                    {t('dataImport.mapping.target', 'Camp FreedoliApp')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: muted, fontWeight: 600 }}>
                    {t('dataImport.mapping.column', 'Columna del fitxer')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => {
                  const m = mapping[target]
                  return (
                    <tr key={target} style={{ borderTop: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '8px 12px', color: ink, fontFamily: 'monospace' }}>{target}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <select
                          value={m?.column || ''}
                          onChange={(e) => updateMapping(target, e.target.value || null)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 6,
                            border: `1px solid ${borderColor}`,
                            backgroundColor: darkMode ? '#0f0f17' : '#ffffff',
                            color: ink, fontSize: 13, fontFamily: 'inherit',
                          }}
                        >
                          <option value="">{t('dataImport.mapping.none', '— No mapejat —')}</option>
                          {parsed.columns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {m && m.score < 1 && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: muted }}>
                            {t('dataImport.mapping.fuzzy', 'auto-detectat')}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--brand-1,#1F5F63)', fontWeight: 600 }}>
              {t('dataImport.mapping.preview', 'Previsualització (3 files)')}
            </summary>
            <pre style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              backgroundColor: darkMode ? '#0f0f17' : '#f4f6f0',
              fontSize: 11, maxHeight: 220, overflow: 'auto', color: ink,
            }}>
              {JSON.stringify(mappedRows.slice(0, 3), null, 2)}
            </pre>
          </details>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => setStep(STEP_UPLOAD)}>
              {t('common.buttons.back', 'Enrere')}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? t('dataImport.mapping.submitting', 'Important…')
                : t('dataImport.mapping.submit', {
                    defaultValue: 'Importar {{count}} files',
                    count: parsed.rows.length,
                  })}
            </Button>
          </div>
        </div>
      )}

      {step === STEP_DONE && summary && (
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
          <CheckCircle2 size={40} color="var(--success-1,#3FBF9A)" style={{ marginBottom: 10 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            {t('dataImport.done.title', 'Importació completada')}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', color: ink, fontSize: 14 }}>
            <li>{t('dataImport.done.projects', { defaultValue: 'Projectes creats: {{count}}', count: summary.projects })}</li>
            <li>{t('dataImport.done.incomes', { defaultValue: 'Ingressos importats: {{count}}', count: summary.incomes })}</li>
            <li>{t('dataImport.done.expenses', { defaultValue: 'Despeses importades: {{count}}', count: summary.expenses })}</li>
            <li>{t('dataImport.done.research', { defaultValue: 'Informes de recerca importats: {{count}}', count: summary.research })}</li>
          </ul>
          {summary.errors?.length > 0 && (
            <div style={{
              textAlign: 'left', marginTop: 12, padding: '10px 12px', borderRadius: 8,
              backgroundColor: 'rgba(242,217,78,0.25)', color: '#8a7318', fontSize: 12,
            }}>
              <strong>{t('dataImport.done.errors', 'Errors:')}</strong>
              <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <Button variant="secondary" onClick={reset}>
              {t('dataImport.done.another', 'Importar un altre fitxer')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
