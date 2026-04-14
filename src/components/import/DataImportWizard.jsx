import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import { parseImportFile } from '../../lib/import/importParser'
import { IMPORT_SOURCES } from '../../lib/import/columnDictionaries'
import { proposeMapping, applyMapping, listTargets } from '../../lib/import/columnMapper'
import { executeImport } from '../../lib/import/importExecutor'

/**
 * DataImportWizard — 4-step wizard: source → upload → mapping → confirm/execute
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
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [mapping, setMapping] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState(null)

  const sourceLabel = IMPORT_SOURCES.find((s) => s.id === sourceId)?.label || sourceId

  useEffect(() => {
    if (parsed?.columns) {
      const proposal = proposeMapping(parsed.columns, sourceId)
      setMapping(proposal)
    }
  }, [parsed, sourceId])

  const targets = useMemo(() => listTargets(sourceId), [sourceId])

  const handleFileChosen = async (f) => {
    if (!f) return
    setFile(f)
    setParseError(null)
    setParsed(null)
    try {
      const result = await parseImportFile(f)
      if (!result.rows?.length) throw new Error(t('dataImport.errors.empty', 'El fitxer no conté files de dades.'))
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
      const mappedRows = applyMapping(parsed.rows, mapping)
      const res = await executeImport(mappedRows, { orgId: activeOrgId, userId, sourceLabel })
      setSummary(res)
      setStep(STEP_DONE)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep(STEP_SOURCE)
    setSourceId('generic')
    setFile(null)
    setParsed(null)
    setParseError(null)
    setMapping({})
    setSummary(null)
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

  return (
    <div style={{ ...shell }}>
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
            {t('dataImport.source.subtitle', 'Escull la font del fitxer. Si no la trobes, usa l\'opció genèrica.')}
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10,
          }}>
            {IMPORT_SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSourceId(s.id)}
                style={{
                  textAlign: 'left', padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${sourceId === s.id ? 'var(--brand-1,#1F5F63)' : borderColor}`,
                  backgroundColor: sourceId === s.id ? 'rgba(31,95,99,0.08)' : 'transparent',
                  color: ink, fontSize: 13, fontWeight: 600,
                }}
              >
                {s.label}
                {s.id === 'generic' && (
                  <div style={{ fontSize: 11, color: muted, marginTop: 4, fontWeight: 400 }}>
                    {t('dataImport.source.genericHint', 'Qualsevol Excel/CSV; tu defineixes el mapping')}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="primary" onClick={() => setStep(STEP_UPLOAD)}>
              {t('common.buttons.continue', 'Continuar')}
            </Button>
          </div>
        </div>
      )}

      {step === STEP_UPLOAD && (
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>
            {t('dataImport.upload.title', 'Puja el fitxer exportat')}
          </h2>
          <p style={{ margin: '0 0 16px', color: muted, fontSize: 13 }}>
            {t('dataImport.upload.subtitle', { defaultValue: 'Formats acceptats: CSV, TSV, XLSX, JSON. Font: {{source}}.', source: sourceLabel })}
          </p>
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
          <div style={{ maxHeight: 360, overflowY: 'auto', border: `1px solid ${borderColor}`, borderRadius: 8 }}>
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
          {/* Preview first 3 rows of mapped data */}
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--brand-1,#1F5F63)', fontWeight: 600 }}>
              {t('dataImport.mapping.preview', 'Previsualització (3 files)')}
            </summary>
            <pre style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              backgroundColor: darkMode ? '#0f0f17' : '#f4f6f0',
              fontSize: 11, maxHeight: 220, overflow: 'auto', color: ink,
            }}>
              {JSON.stringify(applyMapping(parsed.rows.slice(0, 3), mapping), null, 2)}
            </pre>
          </details>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
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
