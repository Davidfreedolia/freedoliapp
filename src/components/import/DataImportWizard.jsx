import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  HelpCircle, Sparkles,
} from 'lucide-react'
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
 * DataImportWizard — 4-step wizard following the FreedoliApp pattern
 * (ClickUp-inspired): one question per step, big pills for source selection,
 * single primary CTA, bottom nav + progress bar.
 *
 * Flow: source → upload → mapping+preview → done.
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
      const detected = detectSource({
        columns: result.columns,
        kind: result.kind,
        rawJson: result.rawJson,
      })
      setAutoDetect(detected)
      if (sourceId === 'generic' || detected.confidence >= 0.85) {
        setSourceId(detected.sourceId)
        if (detected.subType) setSubType(detected.subType)
      }

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

  const cardBg = darkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
  const muted = darkMode ? '#9CA3AF' : '#6B7280'
  const ink = darkMode ? '#E8E8ED' : '#1A1A2E'
  const pageBg = darkMode ? 'var(--bg-dark, #15151f)' : '#F6F8F3'
  const shell = {
    backgroundColor: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 16,
    color: ink,
    fontFamily: 'Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 480,
  }

  const sourcesByGroup = useMemo(() => {
    const map = new Map()
    for (const g of SOURCE_GROUPS) map.set(g.id, [])
    for (const s of IMPORT_SOURCES) {
      if (map.has(s.group)) map.get(s.group).push(s)
    }
    return map
  }, [])

  const SourcePill = ({ s }) => {
    const selected = sourceId === s.id
    return (
      <button
        type="button"
        onClick={() => { setSourceId(s.id); setSubType(null) }}
        className={`wizard-pill${selected ? ' wizard-pill--selected' : ''}`}
        style={{
          backgroundColor: selected ? 'rgba(110,203,195,0.12)' : (darkMode ? 'rgba(255,255,255,0.03)' : '#FFFFFF'),
          color: ink,
          borderColor: selected ? '#6ECBC3' : border,
        }}
      >
        {s.recommended && (
          <span className="wizard-pill__badge">
            {t('dataImport.badge.recommended', 'Recomanat')}
          </span>
        )}
        {s.popular === 'ES' && !s.recommended && (
          <span className="wizard-pill__badge" style={{
            backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545',
          }}>
            {t('dataImport.badge.popularEs', 'Popular ES')}
          </span>
        )}
        <strong>{s.label}</strong>
        <span className="wizard-pill__caption">{s.tagline}</span>
      </button>
    )
  }

  const totalSteps = 4
  const progressPct = (step / totalSteps) * 100

  return (
    <div style={shell}>
      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === STEP_SOURCE && (
          <div className="wizard-step">
            <h2 className="wizard-step__title" style={{ color: ink }}>
              {t('dataImport.source.title', 'Des de quina eina vols importar?')}
            </h2>
            <p className="wizard-step__subtitle" style={{ color: muted }}>
              {t('dataImport.source.subtitle', 'Si no la veus o fas servir Excel propi, tria "Excel / CSV genèric".')}
            </p>

            {SOURCE_GROUPS.map((group) => {
              const items = sourcesByGroup.get(group.id) || []
              if (!items.length) return null
              return (
                <div key={group.id} style={{ width: '100%', maxWidth: 720, marginBottom: 18 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: muted,
                    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
                    textAlign: 'left',
                  }}>
                    {t(group.labelKey, group.defaultLabel)}
                  </div>
                  <div className="wizard-pills" style={{ maxWidth: '100%' }}>
                    {items.map((s) => <SourcePill key={s.id} s={s} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === STEP_UPLOAD && (
          <div className="wizard-step">
            <h2 className="wizard-step__title" style={{ color: ink }}>
              {t('dataImport.upload.title', 'Puja el fitxer exportat')}
            </h2>
            <p className="wizard-step__subtitle" style={{ color: muted }}>
              {t('dataImport.upload.subtitle', { defaultValue: 'Acceptem CSV, TSV, XLSX i JSON. Font: {{source}}.', source: sourceLabel })}
            </p>

            {/* Sellerboard sub-type selector — render as pills when applicable */}
            {sourceId === 'sellerboard' && (
              <div style={{ width: '100%', maxWidth: 540, marginBottom: 18 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: muted,
                  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
                }}>
                  {t('dataImport.sellerboard.selectType', 'Tipus de dades de Sellerboard')}
                </div>
                <div className="wizard-pills" style={{ maxWidth: '100%' }}>
                  {SELLERBOARD_SUBTYPES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSubType(st.id)}
                      className={`wizard-pill${subType === st.id ? ' wizard-pill--selected' : ''}`}
                      style={{
                        backgroundColor: subType === st.id ? 'rgba(110,203,195,0.12)' : cardBg,
                        color: ink,
                        borderColor: subType === st.id ? '#6ECBC3' : border,
                        minHeight: 44,
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{t(st.labelKey, st.defaultLabel)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: 36, border: `2px dashed ${border}`, borderRadius: 14,
                cursor: 'pointer', textAlign: 'center', gap: 8,
                backgroundColor: darkMode ? 'rgba(110,203,195,0.06)' : '#FFFFFF',
                width: '100%', maxWidth: 540,
              }}
            >
              <Upload size={32} color="#6ECBC3" />
              <strong style={{ fontSize: 15, color: ink }}>
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

            <button
              type="button"
              onClick={() => setShowGuide(true)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: muted, fontSize: 12, marginTop: 12, padding: 0,
                fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              <HelpCircle size={12} />
              {t('dataImport.guide.cta', 'Com exportar de {{source}}?', { source: sourceLabel })}
            </button>

            {parseError && (
              <div style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 10,
                backgroundColor: 'rgba(242,108,108,0.14)', color: '#c94545', fontSize: 13,
                width: '100%', maxWidth: 540,
              }}>
                <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {parseError}
              </div>
            )}

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
          <div className="wizard-step" style={{ alignItems: 'stretch', padding: '24px 24px 16px' }}>
            <h2 className="wizard-step__title" style={{ color: ink, textAlign: 'center' }}>
              {t('dataImport.mapping.title', 'Confirma com es lligen les columnes')}
            </h2>
            <p className="wizard-step__subtitle" style={{ color: muted, textAlign: 'center', alignSelf: 'center' }}>
              {t('dataImport.mapping.subtitle', {
                defaultValue: '{{rows}} files i {{columns}} columnes detectades. Ajusta el mapping si cal.',
                rows: parsed.rows.length,
                columns: parsed.columns.length,
              })}
            </p>

            {autoDetect && autoDetect.sourceId !== 'generic' && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                backgroundColor: 'rgba(110,203,195,0.14)', color: ink, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Sparkles size={14} color="#6ECBC3" />
                <span>
                  {t('dataImport.autoDetect.hint', {
                    defaultValue: 'Detectat com a {{source}}{{subType}}.',
                    source: getSource(autoDetect.sourceId)?.label || autoDetect.sourceId,
                    subType: autoDetect.subType ? ` (${autoDetect.subType})` : '',
                  })}
                </span>
              </div>
            )}

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

            <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${border}`, borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#F6F8F3', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('dataImport.mapping.target', 'Camp FreedoliApp')}
                    </th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {t('dataImport.mapping.column', 'Columna del fitxer')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target) => {
                    const m = mapping[target]
                    return (
                      <tr key={target} style={{ borderTop: `1px solid ${border}` }}>
                        <td style={{ padding: '8px 14px', color: ink, fontFamily: 'monospace', fontSize: 12 }}>{target}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <select
                            value={m?.column || ''}
                            onChange={(e) => updateMapping(target, e.target.value || null)}
                            style={{
                              width: '100%', padding: '6px 10px', borderRadius: 8,
                              border: `1px solid ${border}`,
                              backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
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

            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#1F5F63', fontWeight: 600 }}>
                {t('dataImport.mapping.preview', 'Previsualització (3 files)')}
              </summary>
              <pre style={{
                marginTop: 8, padding: 10, borderRadius: 8,
                backgroundColor: darkMode ? 'rgba(0,0,0,0.3)' : '#F6F8F3',
                fontSize: 11, maxHeight: 220, overflow: 'auto', color: ink,
              }}>
                {JSON.stringify(mappedRows.slice(0, 3), null, 2)}
              </pre>
            </details>
          </div>
        )}

        {step === STEP_DONE && summary && (
          <div className="wizard-step">
            <CheckCircle2 size={56} color="#6ECBC3" style={{ marginBottom: 10 }} />
            <h2 className="wizard-step__title" style={{ color: ink }}>
              {t('dataImport.done.title', 'Importació completada')}
            </h2>
            <ul style={{
              listStyle: 'none', padding: 0, margin: '4px 0 16px', color: ink, fontSize: 14,
              display: 'grid', gap: 4, textAlign: 'center',
            }}>
              <li>{t('dataImport.done.projects', { defaultValue: 'Projectes creats: {{count}}', count: summary.projects })}</li>
              <li>{t('dataImport.done.incomes', { defaultValue: 'Ingressos importats: {{count}}', count: summary.incomes })}</li>
              <li>{t('dataImport.done.expenses', { defaultValue: 'Despeses importades: {{count}}', count: summary.expenses })}</li>
              <li>{t('dataImport.done.research', { defaultValue: 'Informes de recerca importats: {{count}}', count: summary.research })}</li>
            </ul>
            {summary.errors?.length > 0 && (
              <div style={{
                textAlign: 'left', marginTop: 8, padding: '10px 12px', borderRadius: 8,
                backgroundColor: 'rgba(242,217,78,0.25)', color: '#8a7318', fontSize: 12,
                width: '100%', maxWidth: 460,
              }}>
                <strong>{t('dataImport.done.errors', 'Errors:')}</strong>
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            <Button variant="secondary" onClick={reset}>
              {t('dataImport.done.another', 'Importar un altre fitxer')}
            </Button>
          </div>
        )}
      </div>

      {/* Progress bar (always visible while in flow) */}
      {step < STEP_DONE && (
        <div className="wizard-progress" style={{ backgroundColor: border }}>
          <div className="wizard-progress__bar" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Bottom navigation */}
      {step < STEP_DONE && (
        <div className="wizard-nav" style={{ borderColor: border }}>
          {step > STEP_SOURCE ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              {t('common.buttons.back', 'Enrere')}
            </Button>
          ) : <span />}

          {step === STEP_SOURCE && (
            <Button variant="primary" onClick={() => setStep(STEP_UPLOAD)}>
              {t('common.buttons.continue', 'Continuar')}
              <ArrowRight size={14} style={{ marginLeft: 6, verticalAlign: -2 }} />
            </Button>
          )}

          {step === STEP_MAPPING && (
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? t('dataImport.mapping.submitting', 'Important…')
                : t('dataImport.mapping.submit', {
                    defaultValue: 'Importar {{count}} files',
                    count: parsed?.rows?.length ?? 0,
                  })}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
