import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink, Loader2 } from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import {
  AI_PROVIDERS,
  AI_PROVIDERS_ADVANCED,
  testAiConnection,
  upsertAiConnection,
} from '../../lib/ai/aiProvider'

/**
 * AiConnectionWizard — 3-step modal: provider → key → success.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onCompleted?: () => void
 *   darkMode?: boolean
 */
export default function AiConnectionWizard({ isOpen, onClose, onCompleted, darkMode = false }) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()

  const [step, setStep] = useState(1)
  const [provider, setProvider] = useState('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const allProviders = useMemo(
    () => [...AI_PROVIDERS, ...(showAdvanced ? AI_PROVIDERS_ADVANCED : [])],
    [showAdvanced],
  )
  const currentDesc = allProviders.find((p) => p.id === provider) || AI_PROVIDERS[0]

  if (!isOpen) return null

  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const modalBg = darkMode ? '#15151f' : '#ffffff'

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${borderColor}`,
    backgroundColor: darkMode ? '#0f0f17' : '#fafbf7',
    color: ink, fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  const reset = () => {
    setStep(1); setProvider('anthropic'); setApiKey(''); setBaseUrl('')
    setShowAdvanced(false); setTestResult(null); setSaveError(null)
  }

  const handleVerify = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAiConnection({
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || null,
      })
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await upsertAiConnection(activeOrgId, {
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || null,
      })
      setStep(3)
      if (onCompleted) onCompleted()
    } catch (err) {
      setSaveError(err?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose() } }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden',
        backgroundColor: modalBg, borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)', color: ink,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${borderColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--brand-1,#1F5F63)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {t('settings.ai.wizard.title', 'Connectar compte d\'IA')}
            </h2>
          </div>
          <button
            onClick={() => { reset(); onClose() }}
            aria-label="close"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muted, padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {/* STEP 1 — provider */}
          {step === 1 && (
            <div>
              <p style={{ margin: '0 0 12px', color: muted, fontSize: 13 }}>
                {t('settings.ai.wizard.step1Intro', 'Escull un servei d\'IA. Pots canviar-lo més endavant.')}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}>
                {allProviders.map((p) => {
                  const selected = provider === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      style={{
                        textAlign: 'left', padding: 14, borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${selected ? 'var(--brand-1,#1F5F63)' : borderColor}`,
                        backgroundColor: selected ? 'rgba(31,95,99,0.08)' : 'transparent',
                        color: ink, display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 13 }}>{p.label}</strong>
                        {p.recommended && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 10,
                            backgroundColor: 'rgba(63,191,154,0.18)', color: '#2ea082', fontWeight: 700,
                          }}>
                            {t('settings.ai.wizard.recommended', 'Recomanat')}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: muted }}>{p.tagline}</span>
                      {p.getKeyUrl && (
                        <a
                          href={p.getKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 11, color: 'var(--brand-1,#1F5F63)',
                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2,
                          }}
                        >
                          {t('settings.ai.wizard.howToGetKey', 'Com obtenir un compte?')}
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: muted, fontSize: 12, marginTop: 12, padding: 0,
                }}
              >
                {showAdvanced
                  ? t('settings.ai.wizard.hideAdvanced', 'Amagar opcions avançades')
                  : t('settings.ai.wizard.showAdvanced', 'Opcions avançades')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <Button variant="primary" onClick={() => setStep(2)}>
                  {t('common.buttons.continue', 'Continuar')}
                  <ArrowRight size={14} style={{ marginLeft: 6, verticalAlign: -2 }} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 — key */}
          {step === 2 && (
            <div>
              <p style={{ margin: '0 0 12px', color: muted, fontSize: 13 }}>
                {t('settings.ai.wizard.step2Intro', {
                  defaultValue: 'Enganxa la teva clau privada de {{provider}}. No la compartim, només la fem servir per fer anàlisis pel teu compte.',
                  provider: currentDesc.label,
                })}
              </p>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>
                {t('settings.ai.wizard.keyLabel', 'La teva clau privada')}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentDesc.keyPrefix ? `${currentDesc.keyPrefix}…` : 'sk-…'}
                style={inputStyle}
                autoComplete="off"
                spellCheck={false}
              />

              {provider === 'ollama' && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>
                    {t('settings.ai.wizard.baseUrlLabel', 'URL de l\'Ollama')}
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={inputStyle}
                  />
                </div>
              )}

              {currentDesc.getKeyUrl && (
                <a
                  href={currentDesc.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: 'var(--brand-1,#1F5F63)',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                  }}
                >
                  {t('settings.ai.wizard.whereIsKey', 'On trobo la meva clau?')}
                  <ExternalLink size={12} />
                </a>
              )}

              {testResult && (
                <div
                  style={{
                    marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 13,
                    backgroundColor: testResult.ok ? 'rgba(63,191,154,0.18)' : 'rgba(242,108,108,0.16)',
                    color: testResult.ok ? '#2ea082' : '#c94545',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {testResult.ok
                    ? <CheckCircle2 size={14} />
                    : <AlertTriangle size={14} />}
                  {testResult.ok
                    ? t('settings.ai.wizard.testOk', {
                        defaultValue: 'Connectat correctament ({{ms}}ms)',
                        ms: testResult.latencyMs ?? '—',
                      })
                    : t('settings.ai.wizard.testError', {
                        defaultValue: 'Aquesta clau no funciona. Assegura\'t que l\'has copiat sencera. Error: {{error}}',
                        error: testResult.error,
                      })}
                </div>
              )}

              {saveError && (
                <div style={{
                  marginTop: 12, padding: '10px 12px', borderRadius: 8,
                  backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545', fontSize: 13,
                }}>
                  <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {t('common.buttons.back', 'Enrere')}
                </Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="secondary"
                    onClick={handleVerify}
                    disabled={testing || !apiKey.trim()}
                  >
                    {testing
                      ? <><Loader2 size={14} className="spin" style={{ marginRight: 6, verticalAlign: -2 }} /> {t('settings.ai.wizard.verifying', 'Verificant…')}</>
                      : t('settings.ai.wizard.verify', 'Verificar')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving || !apiKey.trim() || (testResult && !testResult.ok)}
                  >
                    {saving ? t('settings.ai.wizard.saving', 'Desant…') : t('settings.ai.wizard.connect', 'Connectar')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — done */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <CheckCircle2 size={42} color="#3FBF9A" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
                {t('settings.ai.wizard.doneTitle', 'Connectat!')}
              </h3>
              <p style={{ margin: '0 0 16px', color: muted, fontSize: 13 }}>
                {t('settings.ai.wizard.doneBody', 'La teva IA està connectada. Ara pots fer anàlisis il·limitades.')}
              </p>
              <Button variant="primary" onClick={() => { reset(); onClose() }}>
                {t('settings.ai.wizard.doneCta', 'Fet')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
