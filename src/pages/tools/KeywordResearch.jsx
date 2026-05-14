import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Sparkles, Copy, Check, TrendingUp } from 'lucide-react'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { useApp } from '../../context/AppContext'
import { showToast } from '../../components/Toast'
import { researchKeywords } from '../../lib/ai/aiTools'

const MARKETPLACES = ['ES', 'US', 'UK', 'DE', 'FR', 'IT', 'NL', 'PL', 'SE', 'MX', 'CA', 'BR']

const INTENT_COLORS = {
  informational: { bg: 'rgba(110, 203, 195, 0.16)', fg: 'var(--brand-1)' },
  commercial:    { bg: 'rgba(63, 191, 154, 0.16)',  fg: 'var(--success-ink, #2B7A66)' },
  branded:       { bg: 'rgba(240, 180, 41, 0.16)',  fg: 'var(--warning-ink, #7A5F22)' },
  comparison:    { bg: 'rgba(229, 83, 83, 0.12)',   fg: 'var(--danger-ink, #B0413F)' },
}

/**
 * Keyword Research — given a seed term or ASIN, generate a keyword report
 * using Amazon autocomplete + the org's BYOK AI provider.
 */
export default function KeywordResearch() {
  const { t, i18n } = useTranslation()
  const { darkMode } = useApp()

  const [seedTerm, setSeedTerm] = useState('')
  const [seedAsin, setSeedAsin] = useState('')
  const [marketplace, setMarketplace] = useState('ES')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleRun = async () => {
    if (!seedTerm.trim() && !seedAsin.trim()) {
      showToast(t('tools.keywords.errorSeedRequired', 'Introdueix un terme o un ASIN.'), 'warning')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const language = ['ca', 'es', 'en'].includes(i18n.language) ? i18n.language : 'ca'
      const res = await researchKeywords({
        seed_term: seedTerm.trim() || undefined,
        seed_asin: seedAsin.trim() || undefined,
        marketplace,
        language,
      })
      setResult(res)
      if (res?.status === 'no_provider') {
        showToast(res.message || t('tools.keywords.noProvider', "Connecta el teu compte d'IA a Settings."), 'warning')
      } else if (res?.status !== 'ok') {
        showToast(res?.message || t('tools.keywords.genericError', "No s'ha pogut generar el report."), 'error')
      }
    } catch (err) {
      showToast(err?.message || String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyAll = async () => {
    if (!Array.isArray(result?.keywords)) return
    const text = result.keywords.map((k) => k.keyword).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  const muted = darkMode ? 'var(--muted-1)' : 'var(--text-2)'
  const ink = darkMode ? 'var(--border-1)' : 'var(--text-1)'
  const borderColor = darkMode ? 'var(--text-1)' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? '#15151f' : 'var(--surface-bg)'
  const softBg = darkMode ? '#1f1f2e' : 'var(--surface-bg-2)'

  const inputBase = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: `1px solid ${borderColor}`, borderRadius: 8,
    background: cardBg, color: ink, outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Header title={
        <span className="page-title-with-icon">
          <Search size={22} />
          {t('tools.keywords.title', 'Recerca de Keywords')}
        </span>
      } />

      <div style={{ padding: '20px 32px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <p style={{ color: muted, fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
          {t('tools.keywords.intro', "Introdueix un terme o un ASIN. El sistema cerca a l'autocomplete d'Amazon i la teva IA genera 25-40 keywords agrupades per intenció, amb volum estimat, competència i CPC suggerit.")}
        </p>

        {/* Form */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
                {t('tools.keywords.seedTerm', 'Terme inicial')}
              </label>
              <input value={seedTerm} onChange={(e) => setSeedTerm(e.target.value)} style={inputBase} placeholder={t('tools.keywords.seedPlaceholder', 'ex: yoga mat antilliscant')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
                {t('tools.keywords.seedAsin', 'O ASIN')}
              </label>
              <input value={seedAsin} onChange={(e) => setSeedAsin(e.target.value.toUpperCase())} style={{ ...inputBase, fontFamily: 'var(--font-mono, monospace)' }} placeholder="B0XXXXXXXX" maxLength={10} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
                {t('tools.keywords.marketplace', 'Marketplace')}
              </label>
              <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} style={inputBase}>
                {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Button variant="primary" onClick={handleRun} disabled={loading}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              {loading ? t('tools.keywords.running', 'Cercant…') : t('tools.keywords.run', 'Cercar')}
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 32, textAlign: 'center', color: muted, fontSize: 13 }}>
            {t('tools.keywords.running', 'Cercant a Amazon autocomplete + generant report amb IA…')}
          </div>
        )}

        {/* Result */}
        {result?.status === 'ok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Summary */}
            {result.summary && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('tools.keywords.summary', 'Resum executiu')}
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: ink, lineHeight: 1.5 }}>{result.summary}</p>
              </div>
            )}

            {/* Autocomplete chips */}
            {Array.isArray(result.autocomplete) && result.autocomplete.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('tools.keywords.autocomplete', 'Suggeriments Amazon')}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {result.autocomplete.map((s, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: softBg, color: ink, border: `1px solid ${borderColor}`,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords table */}
            {Array.isArray(result.keywords) && result.keywords.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>
                    {t('tools.keywords.tableTitle', '{{n}} keywords trobades', { n: result.keywords.length })}
                  </span>
                  <button onClick={copyAll} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    {copied ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                    {t('tools.keywords.copyAll', 'Copiar totes')}
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: softBg }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.keywords.kw', 'Keyword')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.keywords.intent', 'Intenció')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.keywords.volume', 'Volum')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.keywords.competition', 'Competència')}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.keywords.cpc', 'CPC')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.keywords.map((kw, i) => {
                        const intent = INTENT_COLORS[kw.intent] || INTENT_COLORS.informational
                        return (
                          <tr key={i} style={{ borderTop: `1px solid ${borderColor}` }}>
                            <td style={{ padding: '10px 16px', color: ink, fontWeight: 600 }}>
                              {kw.keyword}
                              {kw.why && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{kw.why}</div>}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: intent.bg, color: intent.fg }}>
                                {kw.intent || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: ink, textTransform: 'capitalize' }}>{kw.est_monthly_volume || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: ink, textTransform: 'capitalize' }}>{kw.competition || '—'}</td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: ink }}>
                              {kw.suggested_cpc ? `${kw.suggested_cpc.min}-${kw.suggested_cpc.max} ${kw.suggested_cpc.currency}` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Long-tail + questions + negatives */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {Array.isArray(result.long_tail) && result.long_tail.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    <TrendingUp size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                    {t('tools.keywords.longTail', 'Long-tail')}
                  </span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 12, lineHeight: 1.7 }}>
                    {result.long_tail.map((kw, i) => <li key={i}>{kw}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(result.questions) && result.questions.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{t('tools.keywords.questions', 'Preguntes dels compradors')}</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: ink, fontSize: 12, lineHeight: 1.7 }}>
                    {result.questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
              {Array.isArray(result.negative_keywords) && result.negative_keywords.length > 0 && (
                <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{t('tools.keywords.negatives', 'Negative keywords')}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {result.negative_keywords.map((nk, i) => (
                      <span key={i} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(229,83,83,0.10)', color: 'var(--danger-ink, #B0413F)' }}>{nk}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {result && result.status !== 'ok' && !loading && (
          <div style={{ padding: '12px 14px', background: 'rgba(229,83,83,0.10)', border: '1px solid rgba(229,83,83,0.32)', borderRadius: 8, color: 'var(--danger-ink, #B0413F)', fontSize: 13 }}>
            {result.message || result.status}
          </div>
        )}
      </div>
    </div>
  )
}
