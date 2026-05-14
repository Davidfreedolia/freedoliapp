import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, Sparkles, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { useApp } from '../../context/AppContext'
import { showToast } from '../../components/Toast'
import { scanRefundRecovery } from '../../lib/ai/aiTools'

const SEVERITY_STYLES = {
  high:   { bg: 'rgba(229,83,83,0.10)', fg: 'var(--danger-ink, #B0413F)', border: 'rgba(229,83,83,0.32)' },
  medium: { bg: 'rgba(240,180,41,0.15)', fg: 'var(--warning-ink, #7A5F22)', border: 'rgba(240,180,41,0.40)' },
  low:    { bg: 'rgba(31,95,99,0.08)',   fg: 'var(--brand-1)', border: 'rgba(31,95,99,0.22)' },
}

const CATEGORY_LABELS = {
  lost_inventory:      'tools.refunds.cat.lost',
  damaged:             'tools.refunds.cat.damaged',
  return_not_refunded: 'tools.refunds.cat.return',
  fee_anomaly:         'tools.refunds.cat.fee',
  duplicate_charge:    'tools.refunds.cat.duplicate',
}

/**
 * Refund Recovery — scans imported Amazon financial events for missing
 * reimbursements and produces a list of recoverable amounts with the
 * concrete next-step to file each case with Amazon Seller Support.
 */
export default function RefundRecovery() {
  const { t, i18n } = useTranslation()
  const { darkMode } = useApp()

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(null)

  const handleScan = async () => {
    setLoading(true)
    setResult(null)
    try {
      const language = ['ca', 'es', 'en'].includes(i18n.language) ? i18n.language : 'ca'
      const res = await scanRefundRecovery({ language })
      setResult(res)
      if (res?.status === 'no_data') {
        showToast(res.message || t('tools.refunds.noData', "Importa primer els teus settlement reports."), 'info')
      } else if (res?.status === 'no_provider') {
        showToast(res.message || t('tools.refunds.noProvider', "Connecta el teu compte d'IA a Settings."), 'warning')
      } else if (res?.status !== 'ok') {
        showToast(res?.message || t('tools.refunds.genericError', "No s'ha pogut completar el scan."), 'error')
      }
    } catch (err) {
      showToast(err?.message || String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyAction = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(idx)
      setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  const muted = darkMode ? 'var(--muted-1)' : 'var(--text-2)'
  const ink = darkMode ? 'var(--border-1)' : 'var(--text-1)'
  const borderColor = darkMode ? 'var(--text-1)' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? '#15151f' : 'var(--surface-bg)'
  const softBg = darkMode ? '#1f1f2e' : 'var(--surface-bg-2)'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title={
        <span className="page-title-with-icon">
          <Banknote size={22} />
          {t('tools.refunds.title', 'Recuperació de diners FBA')}
        </span>
      } />

      <div style={{ padding: '20px 32px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <p style={{ color: muted, fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
          {t('tools.refunds.intro', "Analitzem els teus events financers Amazon importats i la IA detecta reembossaments perduts: estoc no recuperat, fees duplicades, devolucions sense refund, etc. Et donem el text exacte per obrir el cas a Seller Support.")}
        </p>

        {/* Scan card */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ink }}>
                {t('tools.refunds.scanCardTitle', 'Scan dels últims 18 mesos')}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: muted, maxWidth: 560 }}>
                {t('tools.refunds.scanCardBody', "Amazon permet obrir casos durant 18 mesos. Aquesta finestra és la que escanegem per defecte.")}
              </p>
            </div>
            <Button variant="primary" onClick={handleScan} disabled={loading}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              {loading ? t('tools.refunds.scanning', 'Escanejant…') : t('tools.refunds.scanCta', 'Escanejar ara')}
            </Button>
          </div>
        </div>

        {loading && (
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 32, textAlign: 'center', color: muted, fontSize: 13 }}>
            {t('tools.refunds.scanning', 'Analitzant events financers amb IA…')}
          </div>
        )}

        {result?.status === 'ok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Totals */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t('tools.refunds.events', 'Events analitzats')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{result.totals?.events_analyzed ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t('tools.refunds.suspicious', 'Sospitosos')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{result.totals?.suspicious_count ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {t('tools.refunds.estimated', 'Estimació recuperable')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-ink, #2B7A66)' }}>
                    {Number(result.totals?.estimated_recoverable ?? 0).toFixed(2)} {result.totals?.currency || 'EUR'}
                  </div>
                </div>
              </div>
              {result.summary && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: ink, lineHeight: 1.5 }}>{result.summary}</p>
              )}
            </div>

            {/* Findings */}
            {Array.isArray(result.findings) && result.findings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.findings.map((f, i) => {
                  const sev = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.low
                  const catLabelKey = CATEGORY_LABELS[f.category]
                  return (
                    <div key={i} style={{
                      background: cardBg, border: `1px solid ${borderColor}`,
                      borderRadius: 12, padding: 16,
                      borderLeft: `4px solid ${sev.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: sev.bg, color: sev.fg, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {f.severity}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>
                            {catLabelKey ? t(catLabelKey, f.category) : (f.category || '—')}
                          </span>
                          {f.reference && (
                            <code style={{ fontSize: 11, color: muted, fontFamily: 'var(--font-mono, monospace)' }}>
                              {f.reference}
                            </code>
                          )}
                          {f.date && (
                            <span style={{ fontSize: 11, color: muted }}>{f.date}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success-ink, #2B7A66)' }}>
                          {Math.abs(Number(f.amount || 0)).toFixed(2)} {f.currency || 'EUR'}
                        </div>
                      </div>
                      {f.explanation && (
                        <p style={{ margin: '0 0 8px', fontSize: 13, color: ink, lineHeight: 1.5 }}>{f.explanation}</p>
                      )}
                      {f.action && (
                        <div style={{ marginTop: 8, padding: '10px 12px', background: softBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {t('tools.refunds.action', 'Acció a Seller Support')}
                            </span>
                            <button onClick={() => copyAction(f.action, i)} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                              {copied === i ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                              {t('common.copy', 'Copiar')}
                            </button>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: ink, lineHeight: 1.5 }}>{f.action}</p>
                        </div>
                      )}
                    </div>
                  )
                })}

                <a
                  href="https://sellercentral.amazon.es/help/hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color: 'var(--brand-1)', textDecoration: 'none',
                    alignSelf: 'flex-end',
                  }}
                >
                  {t('tools.refunds.openSeller', 'Obrir Seller Central')}
                  <ExternalLink size={11} />
                </a>
              </div>
            ) : (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 28, textAlign: 'center', color: muted, fontSize: 13 }}>
                {t('tools.refunds.allClean', "No hem trobat reembossaments perduts en aquest període. Bona feina d'auditoria!")}
              </div>
            )}
          </div>
        )}

        {result && (result.status === 'no_data' || result.status === 'no_provider' || result.status === 'no_org') && !loading && (
          <div style={{ padding: '16px', background: 'rgba(240,180,41,0.10)', border: '1px solid rgba(240,180,41,0.40)', borderRadius: 8, color: 'var(--warning-ink, #7A5F22)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={16} />
            <span>{result.message || result.status}</span>
          </div>
        )}

        {result && !['ok', 'no_data', 'no_provider', 'no_org'].includes(result.status) && !loading && (
          <div style={{ padding: '12px 14px', background: 'rgba(229,83,83,0.10)', border: '1px solid rgba(229,83,83,0.32)', borderRadius: 8, color: 'var(--danger-ink, #B0413F)', fontSize: 13 }}>
            {result.message || result.status}
          </div>
        )}
      </div>
    </div>
  )
}
