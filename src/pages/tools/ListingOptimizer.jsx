import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Sparkles, Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { useApp } from '../../context/AppContext'
import { showToast } from '../../components/Toast'
import { optimizeListing } from '../../lib/ai/aiTools'

const MARKETPLACES = ['ES', 'US', 'UK', 'DE', 'FR', 'IT', 'NL', 'PL', 'SE', 'MX', 'CA', 'BR']

/**
 * Listing Optimizer — paste your current listing, get an AI-rewritten
 * version optimized for Amazon SEO + conversion. Uses the org's BYOK AI.
 */
export default function ListingOptimizer() {
  const { t, i18n } = useTranslation()
  const { darkMode } = useApp()

  const [marketplace, setMarketplace] = useState('ES')
  const [title, setTitle] = useState('')
  const [bullets, setBullets] = useState(['', '', '', '', ''])
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [keywordsText, setKeywordsText] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)

  const keywords = useMemo(
    () => keywordsText.split(/[\n,]/).map((k) => k.trim()).filter(Boolean),
    [keywordsText],
  )

  const handleOptimize = async () => {
    if (!title.trim()) {
      showToast(t('tools.listing.errorTitleRequired', 'El títol és obligatori'), 'warning')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const language = ['ca', 'es', 'en'].includes(i18n.language) ? i18n.language : 'ca'
      const res = await optimizeListing({
        marketplace,
        language,
        product: {
          title: title.trim(),
          bullets: bullets.filter((b) => b.trim()),
          description: description.trim(),
          brand: brand.trim(),
          keywords,
        },
      })
      setResult(res)
      if (res?.status === 'no_provider') {
        showToast(res.message || t('tools.listing.noProvider', "Connecta el teu compte d'IA a Settings."), 'warning')
      } else if (res?.status !== 'ok') {
        showToast(res?.message || t('tools.listing.genericError', "L'optimitzador no ha pogut completar la petició."), 'error')
      }
    } catch (err) {
      showToast(err?.message || String(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text, idx) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1200)
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
          <FileText size={22} />
          {t('tools.listing.title', 'Optimitzador de Listing')}
        </span>
      } />

      <div style={{ padding: '20px 32px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <p style={{ color: muted, fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
          {t('tools.listing.intro', "Enganxa el teu listing actual i la IA el reescriurà per a SEO + conversió respectant els límits d'Amazon (200 / 250 / 2000 chars). Utilitza la teva pròpia clau IA.")}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18 }}>
          {/* ── Input column ── */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 18 }}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 700, color: ink, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {t('tools.listing.inputTitle', 'Listing actual')}
            </h3>

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
              {t('tools.listing.marketplace', 'Marketplace')}
            </label>
            <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} style={{ ...inputBase, marginBottom: 12 }}>
              {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
              {t('tools.listing.brand', 'Marca (opcional)')}
            </label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} style={{ ...inputBase, marginBottom: 12 }} placeholder="Acme" />

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
              {t('tools.listing.titleField', 'Títol')} <span style={{ color: title.length > 200 ? 'var(--danger-ink, #B0413F)' : muted }}>· {title.length}/200</span>
            </label>
            <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} style={{ ...inputBase, marginBottom: 12, resize: 'vertical' }} placeholder={t('tools.listing.titlePlaceholder', 'Títol actual del producte')} />

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
              {t('tools.listing.bullets', 'Bullet points (5)')}
            </label>
            {bullets.map((b, i) => (
              <textarea
                key={i}
                value={b}
                onChange={(e) => setBullets((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                rows={2}
                style={{ ...inputBase, marginBottom: 6, resize: 'vertical' }}
                placeholder={`Bullet ${i + 1}`}
              />
            ))}

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginTop: 6, marginBottom: 4 }}>
              {t('tools.listing.description', 'Descripció')} <span style={{ color: muted }}>· {description.length}/2000</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputBase, marginBottom: 12, resize: 'vertical' }} placeholder={t('tools.listing.descriptionPlaceholder', 'Descripció actual')} />

            <label style={{ display: 'block', fontSize: 12, color: muted, fontWeight: 600, marginBottom: 4 }}>
              {t('tools.listing.targetKeywords', 'Keywords objectiu (una per línia o separades per comes)')}
            </label>
            <textarea value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} rows={3} style={{ ...inputBase, marginBottom: 16, resize: 'vertical' }} placeholder={'yoga mat\nnon-slip\neco-friendly'} />

            <Button variant="primary" onClick={handleOptimize} disabled={loading || !title.trim()} style={{ width: '100%' }}>
              <Sparkles size={14} style={{ marginRight: 6 }} />
              {loading ? t('tools.listing.optimizing', 'Optimitzant…') : t('tools.listing.optimize', 'Optimitzar amb IA')}
            </Button>
          </div>

          {/* ── Output column ── */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 18 }}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 700, color: ink, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {t('tools.listing.outputTitle', 'Versió optimitzada')}
            </h3>

            {!result && !loading && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: muted, fontSize: 13 }}>
                {t('tools.listing.outputEmpty', "Enganxa el teu listing i clica «Optimitzar amb IA». L'IA generarà títol, bullets, descripció i keywords backend optimitzats.")}
              </div>
            )}

            {loading && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: muted, fontSize: 13 }}>
                {t('tools.listing.optimizing', 'Optimitzant amb IA…')}
              </div>
            )}

            {result?.status === 'ok' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Scores */}
                {result.scores && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(result.scores).map(([k, v]) => (
                      <span key={k} style={{
                        padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: Number(v) >= 70 ? 'rgba(63,191,154,0.18)' : Number(v) >= 40 ? 'rgba(240,180,41,0.18)' : 'rgba(229,83,83,0.16)',
                        color: Number(v) >= 70 ? 'var(--success-ink, #2B7A66)' : Number(v) >= 40 ? 'var(--warning-ink, #7A5F22)' : 'var(--danger-ink, #B0413F)',
                      }}>
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* Optimized title */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.titleField', 'Títol')}</span>
                    <button onClick={() => copy(result.optimized?.title || '', 'title')} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      {copiedIdx === 'title' ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                      {t('common.copy', 'Copiar')}
                    </button>
                  </div>
                  <div style={{ padding: '8px 10px', background: softBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 13, color: ink, lineHeight: 1.4 }}>
                    {result.optimized?.title}
                  </div>
                </div>

                {/* Bullets */}
                {Array.isArray(result.optimized?.bullets) && result.optimized.bullets.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.bullets', 'Bullets')}</span>
                      <button onClick={() => copy((result.optimized.bullets || []).map((b, i) => `• ${b}`).join('\n'), 'bullets')} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        {copiedIdx === 'bullets' ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                        {t('common.copy', 'Copiar')}
                      </button>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {result.optimized.bullets.map((b, i) => (
                        <li key={i} style={{ fontSize: 13, color: ink, lineHeight: 1.45 }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Description */}
                {result.optimized?.description && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.description', 'Descripció')}</span>
                      <button onClick={() => copy(result.optimized.description, 'description')} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        {copiedIdx === 'description' ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                        {t('common.copy', 'Copiar')}
                      </button>
                    </div>
                    <div style={{ padding: '8px 10px', background: softBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 13, color: ink, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {result.optimized.description}
                    </div>
                  </div>
                )}

                {/* Backend keywords */}
                {result.optimized?.backend_keywords && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.backendKw', 'Backend keywords')}</span>
                      <button onClick={() => copy(result.optimized.backend_keywords, 'backend')} style={{ background: 'transparent', border: 'none', color: muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        {copiedIdx === 'backend' ? <Check size={12} color="var(--success-ink, #2B7A66)" /> : <Copy size={12} />}
                        {t('common.copy', 'Copiar')}
                      </button>
                    </div>
                    <code style={{ display: 'block', padding: '8px 10px', background: softBg, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 12, color: ink, fontFamily: 'var(--font-mono, monospace)', wordBreak: 'break-word' }}>
                      {result.optimized.backend_keywords}
                    </code>
                  </div>
                )}

                {/* Improvements */}
                {Array.isArray(result.improvements) && result.improvements.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.improvements', 'Millores aplicades')}</span>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {result.improvements.map((imp, i) => (
                        <li key={i} style={{ fontSize: 12, color: ink }}>
                          <strong style={{ color: 'var(--brand-1)' }}>{imp.field}:</strong> {imp.fix}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Keyword coverage */}
                {result.keyword_coverage && (Array.isArray(result.keyword_coverage.used) || Array.isArray(result.keyword_coverage.missed)) && (
                  <div style={{ padding: '10px 12px', background: softBg, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tools.listing.keywordCoverage', 'Cobertura de keywords')}</span>
                    {Array.isArray(result.keyword_coverage.used) && result.keyword_coverage.used.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <CheckCircle2 size={11} style={{ verticalAlign: -1, color: 'var(--success-ink, #2B7A66)' }} />
                        {' '}
                        <span style={{ color: 'var(--success-ink, #2B7A66)', fontWeight: 600 }}>{t('tools.listing.used', 'Usades')}:</span>{' '}
                        <span style={{ color: ink }}>{result.keyword_coverage.used.join(', ')}</span>
                      </div>
                    )}
                    {Array.isArray(result.keyword_coverage.missed) && result.keyword_coverage.missed.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        <AlertTriangle size={11} style={{ verticalAlign: -1, color: 'var(--warning-ink, #7A5F22)' }} />
                        {' '}
                        <span style={{ color: 'var(--warning-ink, #7A5F22)', fontWeight: 600 }}>{t('tools.listing.missed', 'Falten')}:</span>{' '}
                        <span style={{ color: ink }}>{result.keyword_coverage.missed.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {result && result.status !== 'ok' && !loading && (
              <div style={{ padding: '12px 14px', background: 'rgba(229,83,83,0.10)', border: '1px solid rgba(229,83,83,0.32)', borderRadius: 8, color: 'var(--danger-ink, #B0413F)', fontSize: 13 }}>
                {result.message || result.status}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
