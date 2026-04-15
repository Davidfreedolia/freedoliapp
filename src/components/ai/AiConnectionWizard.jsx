import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
  ExternalLink, Loader2,
} from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import {
  AI_PROVIDERS,
  AI_PROVIDERS_ADVANCED,
  testAiConnection,
  upsertAiConnection,
} from '../../lib/ai/aiProvider'

/**
 * AiConnectionWizard — 3-step modal applying the FreedoliApp wizard pattern
 * (ClickUp-inspired): one question per step, big provider pills with a single
 * primary CTA, bottom progress bar, generous whitespace.
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

  const muted = darkMode ? '#9CA3AF' : '#6B7280'
  const ink = darkMode ? '#E8E8ED' : '#1A1A2E'
  const border = darkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'
  const modalBg = darkMode ? '#15151f' : '#F6F8F3'
  const surface = darkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF'

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid ${border}`,
    backgroundColor: surface,
    color: ink,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
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

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100

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
        width: '100%', maxWidth: 620, maxHeight: '92vh', overflow: 'hidden',
        backgroundColor: modalBg, borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)', color: ink,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Roboto, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} color="#6ECBC3" />
            <span style={{ fontSize: 13, fontWeight: 600, color: muted }}>
              {t('settings.ai.wizard.title', 'Connectar compte d\'IA')}
            </span>
          </div>
          <button
            onClick={() => { reset(); onClose() }}
            aria-label={t('common.close', 'Tanca')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: muted, padding: 6, borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* STEP 1 — provider */}
          {step === 1 && (
            <div className="wizard-step">
              <h2 className="wizard-step__title" style={{ color: ink }}>
                {t('settings.ai.wizard.step1Title', 'Quin servei d\'IA vols connectar?')}
              </h2>
              <p className="wizard-step__subtitle" style={{ color: muted }}>
                {t('settings.ai.wizard.step1Intro', 'Pots canviar-lo més endavant. Recomanem Anthropic per a anàlisis de viabilitat.')}
              </p>
              <div className="wizard-pills">
                {allProviders.map((p) => {
                  const selected = provider === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`wizard-pill${selected ? ' wizard-pill--selected' : ''}`}
                      style={{
                        backgroundColor: selected ? 'rgba(110,203,195,0.12)' : surface,
                        color: ink,
                        borderColor: selected ? '#6ECBC3' : border,
                      }}
                    >
                      {p.recommended && (
                        <span className="wizard-pill__badge">
                          {t('settings.ai.wizard.recommended', 'Recomanat')}
                        </span>
                      )}
                      <strong style={{ fontSize: 14 }}>{p.label}</strong>
                      <span className="wizard-pill__caption">{p.tagline}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: muted, fontSize: 12, marginTop: 16, padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {showAdvanced
                  ? t('settings.ai.wizard.hideAdvanced', 'Amagar opcions avançades')
                  : t('settings.ai.wizard.showAdvanced', 'Veure més proveïdors')}
              </button>
            </div>
          )}

          {/* STEP 2 — key */}
          {step === 2 && (
            <div className="wizard-step">
              <h2 className="wizard-step__title" style={{ color: ink }}>
                {t('settings.ai.wizard.step2Title', {
                  defaultValue: 'Enganxa la teva clau de {{provider}}',
                  provider: currentDesc.label,
                })}
              </h2>
              <p className="wizard-step__subtitle" style={{ color: muted }}>
                {t('settings.ai.wizard.step2Intro', 'No la compartim. Només la fem servir per a les teves anàlisis.')}
              </p>

              <div style={{ width: '100%', maxWidth: 460 }}>
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
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    style={{ ...inputStyle, marginTop: 10 }}
                  />
                )}

                {currentDesc.getKeyUrl && (
                  <a
                    href={currentDesc.getKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, color: '#1F5F63',
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                      gap: 4, marginTop: 12,
                    }}
                  >
                    {t('settings.ai.wizard.whereIsKey', 'On trobo la meva clau?')}
                    <ExternalLink size={12} />
                  </a>
                )}

                {testResult && (
                  <div
                    style={{
                      marginTop: 14, padding: '10px 12px', borderRadius: 10, fontSize: 13,
                      backgroundColor: testResult.ok ? 'rgba(63,191,154,0.18)' : 'rgba(242,108,108,0.16)',
                      color: testResult.ok ? '#2ea082' : '#c94545',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {testResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {testResult.ok
                      ? t('settings.ai.wizard.testOk', {
                          defaultValue: 'Connectat correctament ({{ms}}ms)',
                          ms: testResult.latencyMs ?? '—',
                        })
                      : t('settings.ai.wizard.testError', {
                          defaultValue: 'Aquesta clau no funciona. Error: {{error}}',
                          error: testResult.error,
                        })}
                  </div>
                )}

                {saveError && (
                  <div style={{
                    marginTop: 14, padding: '10px 12px', borderRadius: 10,
                    backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545', fontSize: 13,
                  }}>
                    <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — done */}
          {step === 3 && (
            <div className="wizard-step">
              <CheckCircle2 size={56} color="#6ECBC3" style={{ marginBottom: 12 }} />
              <h2 className="wizard-step__title" style={{ color: ink }}>
                {t('settings.ai.wizard.doneTitle', 'Tot llest!')}
              </h2>
              <p className="wizard-step__subtitle" style={{ color: muted }}>
                {t('settings.ai.wizard.doneBody', 'La teva IA està connectada. Ara pots fer anàlisis il·limitades.')}
              </p>
              <Button variant="primary" onClick={() => { reset(); onClose() }}>
                {t('settings.ai.wizard.doneCta', 'Fet')}
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="wizard-progress">
          <div className="wizard-progress__bar" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Bottom navigation (steps 1-2 only) */}
        {step < 3 && (
          <div className="wizard-nav">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {t('common.buttons.back', 'Enrere')}
              </Button>
            ) : <span />}

            {step === 1 && (
              <Button variant="primary" onClick={() => setStep(2)}>
                {t('common.buttons.continue', 'Continuar')}
                <ArrowRight size={14} style={{ marginLeft: 6, verticalAlign: -2 }} />
              </Button>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  onClick={handleVerify}
                  disabled={testing || !apiKey.trim()}
                >
                  {testing
                    ? <><Loader2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> {t('settings.ai.wizard.verifying', 'Verificant…')}</>
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
