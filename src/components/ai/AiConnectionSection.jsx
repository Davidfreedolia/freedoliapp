import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, CheckCircle2, Unplug, Zap, Infinity as InfinityIcon } from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import { usePlanFeatures } from '../../hooks/usePlanFeatures'
import {
  getAiConnection,
  deleteAiConnection,
  getAiUsage,
  findProviderDescriptor,
} from '../../lib/ai/aiProvider'
import AiConnectionWizard from './AiConnectionWizard'

/**
 * AiConnectionSection — renders inside Settings.
 *
 * Shows monthly usage (x of y used), a "connect AI account" CTA if the org
 * doesn't have a provider yet, or the current provider + disconnect option if
 * it does. Opens the AiConnectionWizard modal for configuration.
 */
export default function AiConnectionSection({ darkMode = false }) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()
  const { features } = usePlanFeatures()

  const [connection, setConnection] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const reload = useCallback(async () => {
    if (!activeOrgId) { setLoading(false); return }
    setLoading(true)
    try {
      const [conn, use] = await Promise.all([
        getAiConnection(activeOrgId),
        getAiUsage(activeOrgId),
      ])
      setConnection(conn)
      setUsage(use)
      setLoadError(null)
    } catch (err) {
      setLoadError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => { reload() }, [reload])

  const handleDisconnect = async () => {
    if (!confirm(t('settings.ai.confirmDisconnect', 'Segur que vols desconnectar la teva IA? Tornaràs a la quota gratuïta.'))) return
    setDisconnecting(true)
    try {
      await deleteAiConnection(activeOrgId)
      setConnection(null)
    } finally {
      setDisconnecting(false)
    }
  }

  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? '#1b1b2a' : '#ffffff'

  const monthlyLimit = features?.ai_research_per_month ?? 5
  const unlimited = monthlyLimit === -1
  const used = usage?.monthly_count ?? 0
  const hasConnection = Boolean(connection?.hasKey)

  const providerDesc = connection?.provider ? findProviderDescriptor(connection.provider) : null

  return (
    <div style={{
      backgroundColor: cardBg, border: `1px solid ${borderColor}`,
      borderRadius: 12, padding: 20, color: ink,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="var(--brand-1,#1F5F63)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t('settings.ai.title', 'Potencia la teva IA')}
          </h3>
        </div>
        {hasConnection && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
            backgroundColor: 'rgba(63,191,154,0.18)', color: '#2ea082',
          }}>
            <CheckCircle2 size={12} /> {t('settings.ai.badge.connected', 'Connectat')}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>{t('common.loading', 'Carregant…')}</p>
      ) : (
        <>
          {/* Usage card (only relevant when on the system key) */}
          {!hasConnection && (
            <div style={{
              marginBottom: 16, padding: '14px 16px', borderRadius: 10,
              backgroundColor: darkMode ? '#11111a' : '#f7faf4',
              border: `1px solid ${borderColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t('settings.ai.usage.label', 'Anàlisis IA aquest mes')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: ink, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {unlimited ? (
                    <>
                      <InfinityIcon size={20} color="#3FBF9A" />
                      {t('settings.ai.usage.unlimited', 'Il·limitades')}
                    </>
                  ) : (
                    <>
                      {used} <span style={{ color: muted, fontSize: 14, fontWeight: 500 }}>
                        / {monthlyLimit} {t('settings.ai.usage.used', 'usades')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {!unlimited && used >= monthlyLimit && (
                <span style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                  backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545',
                }}>
                  {t('settings.ai.usage.exhausted', 'Quota esgotada')}
                </span>
              )}
            </div>
          )}

          {/* Connected state */}
          {hasConnection ? (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              backgroundColor: darkMode ? '#11111a' : '#f7faf4',
              border: `1px solid ${borderColor}`, marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                {t('settings.ai.connected.service', 'Servei d\'IA')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8 }}>
                {providerDesc?.label || connection.provider}
              </div>
              <div style={{ fontSize: 12, color: muted }}>
                {t('settings.ai.connected.keyMasked', 'Clau')}: <code style={{ fontSize: 12 }}>{connection.apiKeyMasked}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setWizardOpen(true)}>
                  {t('settings.ai.changeProvider', 'Canviar servei')}
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                  <Unplug size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {disconnecting ? t('settings.ai.disconnecting', 'Desconnectant…') : t('settings.ai.disconnect', 'Desconnectar')}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 12px', color: muted, fontSize: 13, lineHeight: 1.5 }}>
                {t('settings.ai.pitch', 'Connecta el teu propi compte d\'IA per obtenir anàlisis il·limitades. És com tenir un analista expert treballant per a tu 24/7.')}
              </p>
              <Button variant="primary" onClick={() => setWizardOpen(true)}>
                <Zap size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {t('settings.ai.connectCta', 'Connectar compte d\'IA')}
              </Button>
            </div>
          )}

          {loadError && (
            <div style={{
              marginTop: 10, padding: '8px 10px', borderRadius: 8, fontSize: 12,
              backgroundColor: 'rgba(242,108,108,0.16)', color: '#c94545',
            }}>
              {loadError}
            </div>
          )}
        </>
      )}

      <AiConnectionWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCompleted={reload}
        darkMode={darkMode}
      />
    </div>
  )
}
