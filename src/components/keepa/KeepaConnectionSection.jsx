import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, CheckCircle2, Unplug, KeyRound, ExternalLink } from 'lucide-react'
import Button from '../Button'
import { useApp } from '../../context/AppContext'
import {
  getKeepaConnection,
  upsertKeepaConnection,
  deleteKeepaConnection,
} from '../../lib/keepa'

/**
 * KeepaConnectionSection — Settings widget for connecting a Keepa account.
 *
 * Mirrors the AiConnectionSection layout for visual consistency: same card,
 * same "Connected" badge, same disconnect flow. We don't have a separate
 * "Wizard" because Keepa only needs a single API key — the form fits in
 * the section itself.
 *
 * BYOC mental model:
 *  - If the user has connected their own Keepa account, the platform pays
 *    nothing — every Keepa lookup spends *their* token budget.
 *  - If they haven't and the platform exposes a fallback, calls still work
 *    (using the platform's $19/mo shared subscription).
 *  - Otherwise the Research panel shows a "Connect Keepa" CTA pointing here.
 */
export default function KeepaConnectionSection({ darkMode = false }) {
  const { t } = useTranslation()
  const { activeOrgId } = useApp()

  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const reload = useCallback(async () => {
    if (!activeOrgId) { setLoading(false); return }
    setLoading(true)
    try {
      const conn = await getKeepaConnection(activeOrgId)
      setConnection(conn)
      setLoadError(null)
    } catch (err) {
      setLoadError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => { reload() }, [reload])

  const handleSave = async () => {
    const trimmed = (apiKeyInput || '').trim()
    if (trimmed.length < 16) {
      setSaveError(t('settings.keepa.errorInvalid', 'La clau no sembla vàlida.'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await upsertKeepaConnection(activeOrgId, { apiKey: trimmed })
      setApiKeyInput('')
      setShowForm(false)
      await reload()
    } catch (err) {
      setSaveError(err?.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm(t('settings.keepa.confirmDisconnect', 'Segur que vols desconnectar Keepa? Perdràs els gràfics d\'historial.'))) return
    setDisconnecting(true)
    try {
      await deleteKeepaConnection(activeOrgId)
      setConnection(null)
    } finally {
      setDisconnecting(false)
    }
  }

  const muted = darkMode ? 'var(--muted-1)' : 'var(--text-2)'
  const ink = darkMode ? 'var(--border-1)' : 'var(--text-1)'
  const borderColor = darkMode ? 'var(--text-1)' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? 'var(--text-1)' : 'var(--surface-bg)'
  const softBg = darkMode ? '#11111a' : 'var(--surface-bg-2)'

  const hasConnection = Boolean(connection?.hasKey)

  return (
    <div style={{
      backgroundColor: cardBg, border: `1px solid ${borderColor}`,
      borderRadius: 12, padding: 20, color: ink,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LineChart size={18} color="var(--brand-1)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t('settings.keepa.title', 'Historial de preus i BSR (Keepa)')}
          </h3>
        </div>
        {hasConnection && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
            backgroundColor: 'rgba(63,191,154,0.18)', color: 'var(--success-ink, #2B7A66)',
          }}>
            <CheckCircle2 size={12} /> {t('settings.keepa.badge.connected', 'Connectat')}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: muted, fontSize: 13, margin: 0 }}>{t('common.loading', 'Carregant…')}</p>
      ) : hasConnection ? (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          backgroundColor: softBg, border: `1px solid ${borderColor}`,
        }}>
          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
            {t('settings.keepa.connected.service', 'Servei')}: <strong>Keepa</strong>
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            {t('settings.keepa.connected.keyMasked', 'Clau')}: <code style={{ fontSize: 12 }}>{connection.apiKeyMasked}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => { setApiKeyInput(''); setShowForm(true) }}>
              {t('settings.keepa.changeKey', 'Canviar clau')}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
              <Unplug size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              {disconnecting ? t('settings.keepa.disconnecting', 'Desconnectant…') : t('settings.keepa.disconnect', 'Desconnectar')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ margin: '0 0 12px', color: muted, fontSize: 13, lineHeight: 1.5 }}>
            {t('settings.keepa.pitch', 'Connecta la teva clau Keepa per veure l\'historial complet de preus, BSR, ratings i reviews de qualsevol ASIN dins les recerques. Cost: $19/mes al teu compte Keepa.')}
          </p>
          <a
            href="https://keepa.com/#!api"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--brand-1)', textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            {t('settings.keepa.getKey', 'Obtenir clau a keepa.com')}
            <ExternalLink size={12} />
          </a>
          <Button variant="primary" onClick={() => { setApiKeyInput(''); setShowForm(true) }}>
            <KeyRound size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {t('settings.keepa.connectCta', 'Connectar Keepa')}
          </Button>
        </div>
      )}

      {showForm && (
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 10,
          backgroundColor: softBg, border: `1px solid ${borderColor}`,
        }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6 }}>
            {t('settings.keepa.apiKeyLabel', 'Clau API Keepa')}
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={t('settings.keepa.apiKeyPlaceholder', 'Enganxa aquí la clau de keepa.com')}
            autoComplete="off"
            style={{
              width: '100%', padding: '9px 12px', fontSize: 13,
              border: `1px solid ${borderColor}`, borderRadius: 8,
              background: darkMode ? '#0a0a0f' : 'var(--surface-bg)',
              color: ink, fontFamily: 'var(--font-mono, monospace)',
              outline: 'none',
            }}
          />
          {saveError && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12,
              backgroundColor: 'rgba(229,83,83,0.10)', color: 'var(--danger-ink, #B0413F)',
            }}>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setSaveError(null); setApiKeyInput('') }}>
              {t('common.cancel', 'Cancel·lar')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving', 'Guardant…') : t('common.save', 'Guardar')}
            </Button>
          </div>
        </div>
      )}

      {loadError && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 8, fontSize: 12,
          backgroundColor: 'rgba(229,83,83,0.10)', color: 'var(--danger-ink, #B0413F)',
        }}>
          {loadError}
        </div>
      )}
    </div>
  )
}
