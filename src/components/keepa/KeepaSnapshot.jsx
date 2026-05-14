import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, TrendingUp, Star, MessageCircle, ExternalLink } from 'lucide-react'
import { fetchKeepaHistory } from '../../lib/keepa'

/**
 * Compact strip with the latest Keepa snapshot for an ASIN — to surface
 * inside the Research Report and (later) the Project Detail view.
 *
 * States rendered:
 *   - loading    → 4 skeleton tiles
 *   - ok         → 4 metric tiles (price, BSR, rating, reviews)
 *   - not_connected → small CTA "Connect Keepa in Settings"
 *   - error      → small inline message (doesn't crash the parent view)
 *
 * Component is intentionally non-fatal: any Keepa hiccup just collapses
 * the strip; the rest of the research report stays usable.
 */
export default function KeepaSnapshot({ asin, marketplace = 'ES', darkMode = false }) {
  const { t } = useTranslation()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    if (!asin) { setState({ status: 'idle' }); return }
    setState({ status: 'loading' })
    fetchKeepaHistory({ asin, marketplace })
      .then((res) => {
        if (!cancelled) setState(res || { status: 'error' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err?.message })
      })
    return () => { cancelled = true }
  }, [asin, marketplace])

  if (state.status === 'idle') return null

  const muted = darkMode ? 'var(--muted-1)' : 'var(--text-2)'
  const ink = darkMode ? 'var(--border-1)' : 'var(--text-1)'
  const borderColor = darkMode ? 'var(--text-1)' : 'rgba(31,95,99,0.14)'
  const cardBg = darkMode ? 'var(--surface-bg)' : 'var(--surface-bg)'

  const Wrapper = ({ children, footer }) => (
    <div style={{
      backgroundColor: cardBg, border: `1px solid ${borderColor}`,
      borderRadius: 12, padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <LineChart size={14} color="var(--brand-1)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {t('research.keepa.title', 'Snapshot Keepa')}
        </span>
        {state.source && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: muted,
            background: state.source === 'user' ? 'rgba(63,191,154,0.16)' : 'var(--surface-bg-2)',
            padding: '2px 8px', borderRadius: 999, fontWeight: 600, letterSpacing: 0.5,
          }}>
            {state.source === 'user' ? t('research.keepa.byoc', 'Connexió pròpia') : t('research.keepa.shared', 'Compartit')}
          </span>
        )}
      </div>
      {children}
      {footer && (
        <div style={{ marginTop: 10, fontSize: 11, color: muted }}>{footer}</div>
      )}
    </div>
  )

  const Tile = ({ icon: Icon, label, value, sublabel, accent = 'var(--brand-1)' }) => (
    <div style={{
      flex: '1 1 0', minWidth: 110,
      padding: '10px 12px', borderRadius: 10,
      backgroundColor: 'var(--surface-bg-2)',
      border: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: muted, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        <Icon size={11} color={accent} />
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: ink, lineHeight: 1.1 }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 10, color: muted }}>{sublabel}</div>
      )}
    </div>
  )

  if (state.status === 'loading') {
    return (
      <Wrapper>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              flex: '1 1 0', minWidth: 110, height: 64,
              borderRadius: 10, backgroundColor: 'var(--surface-bg-2)',
              border: `1px solid ${borderColor}`,
              animation: 'pulse 1.4s ease-in-out infinite',
            }} />
          ))}
        </div>
      </Wrapper>
    )
  }

  if (state.status === 'not_connected') {
    return (
      <Wrapper>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13, color: ink, lineHeight: 1.4 }}>
            {t('research.keepa.connectPitch', 'Connecta Keepa per veure l\'historial de preus, BSR, valoracions i reviews d\'aquest ASIN.')}
          </p>
          <a
            href="/app/settings?tab=ai"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, color: 'var(--brand-1)',
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            {t('research.keepa.openSettings', 'Connectar a Settings')}
            <ExternalLink size={11} />
          </a>
        </div>
      </Wrapper>
    )
  }

  if (state.status === 'invalid_asin' || state.status === 'invoke_error') {
    return null // silently hide
  }

  if (state.status === 'upstream_error') {
    return (
      <Wrapper footer={state.message || ''}>
        <div style={{ fontSize: 12, color: muted }}>
          {t('research.keepa.upstreamError', 'No s\'ha pogut llegir Keepa ara mateix. Torna-ho a provar més tard.')}
        </div>
      </Wrapper>
    )
  }

  if (state.status !== 'ok' || !state.data?.snapshot) {
    return null
  }

  const s = state.data.snapshot
  const currency = state.marketplace === 'US' ? 'USD' : state.marketplace === 'UK' ? 'GBP' : 'EUR'

  const fmtPrice = (cents) => {
    if (cents == null) return '—'
    const n = Number(cents) / 100
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n)
  }

  const fmtBsr = (b) => b == null ? '—' : `#${new Intl.NumberFormat().format(Number(b))}`
  const fmtReviews = (n) => n == null ? '—' : new Intl.NumberFormat().format(Number(n))
  const fmtRating = (r) => r == null ? '—' : Number(r).toFixed(1)

  return (
    <Wrapper footer={state.tokens_left != null ? t('research.keepa.tokensLeft', { count: state.tokens_left, defaultValue: `Tokens Keepa restants: ${state.tokens_left}` }) : null}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tile
          icon={LineChart}
          label={t('research.keepa.priceAmazon', 'Preu Amazon')}
          value={fmtPrice(s.amazon_price_cents ?? s.new_price_cents)}
          sublabel={s.amazon_price_cents != null && s.new_price_cents != null && s.amazon_price_cents !== s.new_price_cents
            ? `${t('research.keepa.newPrice', '3rd party')}: ${fmtPrice(s.new_price_cents)}`
            : null}
        />
        <Tile
          icon={TrendingUp}
          label={t('research.keepa.bsr', 'BSR')}
          value={fmtBsr(s.bsr)}
          accent="var(--coral-1)"
        />
        <Tile
          icon={Star}
          label={t('research.keepa.rating', 'Valoració')}
          value={fmtRating(s.rating)}
          sublabel={s.rating != null ? '/ 5.0' : null}
          accent="var(--warning-1)"
        />
        <Tile
          icon={MessageCircle}
          label={t('research.keepa.reviews', 'Reviews')}
          value={fmtReviews(s.reviews_count)}
          accent="var(--success-1)"
        />
      </div>
    </Wrapper>
  )
}
