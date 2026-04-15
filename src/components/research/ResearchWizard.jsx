import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Sparkles, CheckCircle2, Circle, Loader2, Zap, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import Button from '../Button'
import ResearchReport from './ResearchReport'
import AiConnectionWizard from '../ai/AiConnectionWizard'

/**
 * ResearchWizard — modal with 3 steps: Input → Progress → Result
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   initialAsin?: string
 *   initialDescription?: string
 *   initialMarketplace?: string       // e.g. 'ES'
 *   projectId?: string | null         // optional: associate report with project
 *   onCompleted?: (report) => void    // callback after successful analysis
 *   darkMode?: boolean
 */
const MARKETPLACES = ['ES', 'DE', 'FR', 'IT', 'UK', 'US']

const PROGRESS_STEPS = [
  { key: 'amazon', labelKey: 'research.progress.amazon', defaultLabel: 'Cercant dades a Amazon…' },
  { key: 'alibaba', labelKey: 'research.progress.alibaba', defaultLabel: 'Cercant preus a Alibaba…' },
  { key: 'onecom688', labelKey: 'research.progress.onecom688', defaultLabel: 'Cercant preus a 1688…' },
  { key: 'zentrada', labelKey: 'research.progress.zentrada', defaultLabel: 'Cercant preus a Zentrada…' },
  { key: 'ai', labelKey: 'research.progress.ai', defaultLabel: 'Analitzant amb IA…' },
]

export default function ResearchWizard({
  isOpen,
  onClose,
  initialAsin = '',
  initialDescription = '',
  initialMarketplace = 'ES',
  projectId = null,
  onCompleted,
  darkMode = false,
}) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()

  const [step, setStep] = useState('input') // 'input' | 'progress' | 'result' | 'error'
  const [asin, setAsin] = useState(initialAsin)
  const [description, setDescription] = useState(initialDescription)
  const [marketplace, setMarketplace] = useState(initialMarketplace)
  const [validationError, setValidationError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [result, setResult] = useState(null)
  const [activeProgressStep, setActiveProgressStep] = useState(0)
  const [aiWizardOpen, setAiWizardOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setAsin(initialAsin)
      setDescription(initialDescription)
      setMarketplace(initialMarketplace || 'ES')
      setValidationError('')
      setFetchError('')
      setResult(null)
      setActiveProgressStep(0)
    }
  }, [isOpen, initialAsin, initialDescription, initialMarketplace])

  const isValidAsin = (s) => /^B0[A-Z0-9]{8}$/i.test((s || '').trim())

  const canSubmit = useMemo(() => {
    if (!marketplace) return false
    if (asin && !isValidAsin(asin)) return false
    if (!asin && !description.trim()) return false
    return Boolean(activeOrgId)
  }, [asin, description, marketplace, activeOrgId])

  const handleSubmit = async () => {
    setValidationError('')
    setFetchError('')

    if (!activeOrgId) {
      setValidationError(t('research.errors.noOrg', 'No hi ha organització activa.'))
      return
    }
    if (asin && !isValidAsin(asin)) {
      setValidationError(t('research.errors.invalidAsin', 'ASIN no vàlid. Format: B0XXXXXXXX'))
      return
    }
    if (!asin && !description.trim()) {
      setValidationError(t('research.errors.inputRequired', 'Introdueix un ASIN o una descripció.'))
      return
    }

    setStep('progress')
    setActiveProgressStep(0)

    // Advance progress steps visually (cosmetic — real work happens in single call)
    const ticker = setInterval(() => {
      setActiveProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 1))
    }, 2500)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('research-orchestrator', {
        body: {
          asin: asin.trim().toUpperCase(),
          description: description.trim(),
          marketplace,
          org_id: activeOrgId,
          project_id: projectId ?? null,
        },
      })

      clearInterval(ticker)

      if (error) {
        setFetchError(error.message || t('research.errors.generic', 'Error a la recerca.'))
        setStep('error')
        return
      }
      if (data?.error) {
        setFetchError(data.error)
        setStep('error')
        return
      }

      setResult(data)
      setActiveProgressStep(PROGRESS_STEPS.length)
      setStep('result')
      if (onCompleted) onCompleted(data)
    } catch (err) {
      clearInterval(ticker)
      setFetchError(err?.message || String(err))
      setStep('error')
    }
  }

  if (!isOpen) return null

  const overlayBg = 'rgba(0,0,0,0.55)'
  const modalBg = darkMode ? '#15151f' : '#ffffff'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    backgroundColor: darkMode ? '#0f0f17' : '#fafbf7',
    color: ink,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: overlayBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'progress') onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: step === 'result' ? 860 : 560,
          maxHeight: '92vh',
          backgroundColor: modalBg,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${borderColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="var(--brand-1,#1F5F63)" />
            <h2 style={{ margin: 0, fontSize: 16, color: ink, fontWeight: 700 }}>
              {t('research.wizard.title', 'Recerca IA de producte')}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'progress'}
            aria-label={t('common.close', 'Tanca')}
            style={{
              background: 'transparent', border: 'none', cursor: step === 'progress' ? 'not-allowed' : 'pointer',
              padding: 6, borderRadius: 6, color: muted, opacity: step === 'progress' ? 0.4 : 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {step === 'input' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, color: muted, fontSize: 13 }}>
                {t('research.wizard.intro', 'Introdueix un ASIN o una descripció. L\'IA cercarà dades de mercat i proveïdors i generarà un informe de viabilitat.')}
              </p>

              <div>
                <label style={labelStyle}>{t('research.wizard.asinLabel', 'ASIN')}</label>
                <input
                  type="text"
                  value={asin}
                  onChange={(e) => setAsin(e.target.value)}
                  placeholder="B0XXXXXXXX"
                  maxLength={10}
                  style={inputStyle}
                />
              </div>

              <div style={{ textAlign: 'center', color: muted, fontSize: 12, margin: '4px 0' }}>
                — {t('common.or', 'o')} —
              </div>

              <div>
                <label style={labelStyle}>{t('research.wizard.descLabel', 'Descripció del producte')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.substring(0, 200))}
                  placeholder={t('research.wizard.descPlaceholder', 'Ex: silicone kitchen utensils set')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <div style={{ fontSize: 11, color: muted, textAlign: 'right', marginTop: 4 }}>
                  {description.length}/200
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('research.wizard.marketplaceLabel', 'Marketplace')}</label>
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  style={inputStyle}
                >
                  {MARKETPLACES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {validationError && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  backgroundColor: 'rgba(242,108,108,0.12)', color: '#c94545', fontSize: 13,
                }}>
                  {validationError}
                </div>
              )}
            </div>
          )}

          {step === 'progress' && (
            <div style={{ padding: '12px 4px' }}>
              <p style={{ margin: '0 0 16px 0', color: muted, fontSize: 13 }}>
                {t('research.wizard.progressIntro', 'Analitzant dades. Això pot trigar 15-45 segons.')}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PROGRESS_STEPS.map((s, idx) => {
                  const isActive = idx === activeProgressStep
                  const isDone = idx < activeProgressStep
                  return (
                    <li key={s.key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      color: isDone ? 'var(--success-1,#3FBF9A)' : isActive ? ink : muted,
                      fontSize: 14,
                    }}>
                      {isDone
                        ? <CheckCircle2 size={18} />
                        : isActive
                          ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Circle size={18} />}
                      <span>{t(s.labelKey, s.defaultLabel)}</span>
                    </li>
                  )
                })}
              </ul>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 'result' && result && (
            <>
              {/* Quota banner — shown when the system key was used, either as a
                  gentle nudge (remaining quota) or as a hard block when exceeded. */}
              {(() => {
                const aiMeta = result.ai_meta || {}
                if (aiMeta.quota_exceeded) {
                  return (
                    <div style={{
                      marginBottom: 12, padding: '12px 14px', borderRadius: 10,
                      backgroundColor: 'rgba(242,217,78,0.25)', color: '#8a7318',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <strong>{t('research.quota.exhaustedTitle', 'Has esgotat les teves anàlisis IA gratuïtes d\'aquest mes')}</strong>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          {t('research.quota.exhaustedBody', 'Connecta el teu compte d\'IA per desbloquejar anàlisis il·limitades.')}
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => setAiWizardOpen(true)}>
                        <Zap size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                        {t('research.quota.unlockCta', 'Desbloquejar')}
                      </Button>
                    </div>
                  )
                }
                if (aiMeta.provider_source === 'system' && typeof aiMeta.monthly_count === 'number' && typeof aiMeta.monthly_limit === 'number' && aiMeta.monthly_limit !== -1) {
                  const remaining = Math.max(0, aiMeta.monthly_limit - aiMeta.monthly_count)
                  return (
                    <div style={{
                      marginBottom: 12, padding: '10px 14px', borderRadius: 10,
                      backgroundColor: 'rgba(110,203,195,0.14)', color: ink,
                      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                    }}>
                      <Sparkles size={14} color="var(--brand-1,#1F5F63)" />
                      <span style={{ flex: 1 }}>
                        {t('research.quota.remainingBanner', {
                          defaultValue: 'Aquesta anàlisi s\'ha fet amb la teva quota gratuïta ({{remaining}} de {{limit}} restants).',
                          remaining,
                          limit: aiMeta.monthly_limit,
                        })}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => setAiWizardOpen(true)}>
                        {t('research.quota.connectCta', 'Connectar IA pròpia')}
                      </Button>
                    </div>
                  )
                }
                return null
              })()}
              <ResearchReport
                report={result.ai_analysis}
                meta={{
                  asin: result.asin,
                  description: result.description,
                  marketplace: result.marketplace,
                  sources_used: result.sources_used,
                  report_id: result.report_id,
                }}
                darkMode={darkMode}
              />
            </>
          )}

          {step === 'error' && (
            <div>
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                backgroundColor: 'rgba(242,108,108,0.14)', color: '#c94545', fontSize: 13, marginBottom: 12,
              }}>
                {fetchError || t('research.errors.generic', 'Error a la recerca.')}
              </div>
              <Button variant="secondary" onClick={() => setStep('input')}>
                {t('common.retry', 'Torna a provar')}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'input' && (
          <div style={{
            padding: '12px 20px', borderTop: `1px solid ${borderColor}`,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel', 'Cancel·la')}</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              {t('research.wizard.submit', 'Analitzar')}
            </Button>
          </div>
        )}
        {step === 'result' && (
          <div style={{
            padding: '12px 20px', borderTop: `1px solid ${borderColor}`,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <Button variant="ghost" onClick={onClose}>{t('common.close', 'Tanca')}</Button>
          </div>
        )}
      </div>

      <AiConnectionWizard
        isOpen={aiWizardOpen}
        onClose={() => setAiWizardOpen(false)}
        darkMode={darkMode}
      />
    </div>
  )
}
