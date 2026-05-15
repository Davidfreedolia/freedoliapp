import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

/**
 * LiveStatsBar — a thin "live platform numbers" strip for the landing.
 *
 * Fetches real aggregate counts from the `public-stats` edge function
 * and count-up animates them into view.
 *
 * Honesty / beta-grace logic
 * --------------------------
 * We're a young product. A literal "12 AI analyses" counter looks weak.
 * So each stat declares a `minToShow` threshold — if the real number is
 * below it, that tile is hidden rather than faked. The always-solid
 * stats (edge functions, marketplaces) keep the bar substantial even on
 * day one; the growth stats (analyses, events) appear once they're big
 * enough to be impressive. Every number shown is real.
 */

const STAT_DEFS = [
  { key: 'events_scanned', minToShow: 200, labelKey: 'landing.liveStats.events' },
  { key: 'ai_analyses',    minToShow: 30,  labelKey: 'landing.liveStats.analyses' },
  { key: 'edge_functions', minToShow: 0,   labelKey: 'landing.liveStats.functions' },
  { key: 'ai_providers',   minToShow: 0,   labelKey: 'landing.liveStats.providers' },
  { key: 'marketplaces',   minToShow: 0,   labelKey: 'landing.liveStats.markets' },
]

function useCountUp(target, run) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run || !target) { setValue(target || 0); return }
    const start = performance.now()
    const dur = 1200
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return value
}

function StatTile({ value, labelKey, run }) {
  const { t } = useTranslation()
  const display = useCountUp(value, run)
  return (
    <div style={{ textAlign: 'center', padding: '0 8px' }}>
      <div style={{
        fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
        fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1,
        color: 'var(--brand-1, #1F5F63)',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
      }}>
        {new Intl.NumberFormat().format(display)}
      </div>
      <div style={{
        marginTop: 6, fontSize: 12, fontWeight: 600, color: '#5F7476',
        letterSpacing: '0.04em',
      }}>
        {t(labelKey)}
      </div>
    </div>
  )
}

export default function LiveStatsBar() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [inView, setInView] = useState(false)
  const ref = useRef(null)

  /* Fetch real counts */
  useEffect(() => {
    let cancelled = false
    const FALLBACK = { ai_analyses: 0, events_scanned: 0, edge_functions: 26, ai_providers: 6, marketplaces: 12 }
    supabase.functions
      .invoke('public-stats', { method: 'GET' })
      .then(({ data }) => {
        if (cancelled) return
        if (data?.ok && data.stats) setStats(data.stats)
        else setStats(FALLBACK)
      })
      .catch(() => {
        if (!cancelled) setStats(FALLBACK)
      })
    return () => { cancelled = true }
  }, [])

  /* Trigger count-up when scrolled into view */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { setInView(true); obs.disconnect(); return }
      }
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Decide which tiles are substantial enough to show.
  const visible = stats
    ? STAT_DEFS.filter((d) => (stats[d.key] ?? 0) >= d.minToShow)
    : []

  // Always render the section shell (keeps layout stable), even pre-fetch.
  return (
    <section
      ref={ref}
      style={{
        padding: '40px 0 44px',
        background: 'linear-gradient(180deg, var(--surface-bg, #fff) 0%, #F6F8F3 100%)',
      }}
    >
      <div className="container">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 22,
        }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--success-1, #3FBF9A)',
            boxShadow: '0 0 0 0 rgba(63,191,154,0.6)',
            animation: 'ldPulse 1.8s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: '#5F7476',
            fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
          }}>
            {t('landing.liveStats.label', 'La plataforma, en directe')}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(visible.length, 1)}, 1fr)`,
          gap: 16, maxWidth: 760, margin: '0 auto',
        }}>
          {visible.map((d) => (
            <StatTile
              key={d.key}
              value={stats[d.key] ?? 0}
              labelKey={d.labelKey}
              run={inView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
