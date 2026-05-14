import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Sparkles,
  Banknote,
  TrendingUp,
  Search,
  Wand2,
  GitCompare,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

/**
 * HeroMockup — fully CSS/SVG-driven dashboard preview shown on the
 * landing hero. Replaces the previous PNG screenshot (which had
 * un-translated i18n keys visible). Designed to do three jobs:
 *
 *   1. Show the AI angle immediately — "Refund Recovery" front-and-center
 *      with a live-feel ticker of recovered euros.
 *   2. Hint at the rest of the suite — a row of AI-tool chips, a
 *      mini sparkline, a "today's AI activity" feed.
 *   3. Look distinctive (not a stock dashboard mock) — petrol/glass
 *      surfaces, soft-yellow accents, JetBrains Mono ticker.
 *
 * 3D-tilt on hover mirrors the previous PNG behavior so the hero
 * keeps its kinetic feel.
 */
export default function HeroMockup() {
  const { t, i18n } = useTranslation()
  const [recovered, setRecovered] = useState(0)
  const TARGET = 2347

  useEffect(() => {
    const start = performance.now()
    const dur = 1600
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setRecovered(Math.round(TARGET * eased))
      if (p < 1) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  const moneyFmt = new Intl.NumberFormat(i18n.language || 'ca', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  })

  const onMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width  - 0.5) * 2
    const py = ((e.clientY - r.top)  / r.height - 0.5) * 2
    e.currentTarget.style.transform =
      `perspective(1400px) rotateY(${-px * 4 - 6}deg) rotateX(${py * 3 + 2}deg)`
  }
  const onMouseLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(1400px) rotateY(-7deg) rotateX(3deg)'
  }

  return (
    <div
      className="hero-mock"
      role="img"
      aria-label={t('hero.mockAlt', 'Captura del producte mostrant la suite d\'IA')}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        width: '100%',
        maxWidth: 560,
        transform: 'perspective(1400px) rotateY(-7deg) rotateX(3deg)',
        transformStyle: 'preserve-3d',
        transition: 'transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        willChange: 'transform',
        filter: 'drop-shadow(0 32px 80px rgba(0,0,0,0.45))',
      }}
    >
      {/* Outer chrome (window) */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(13,40,44,0.96) 0%, rgba(7,28,32,0.96) 100%)',
        border: '1px solid rgba(110,203,195,0.18)',
        borderRadius: 18,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F26C6C' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F4E27A' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#6ECBC3' }} />
          <span style={{
            marginLeft: 10, fontSize: 11, color: 'rgba(246,248,243,0.65)',
            fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em',
          }}>
            app.freedoliapp.com / tools / refunds
          </span>
        </div>

        {/* Body: two-column */}
        <div style={{ display: 'flex', minHeight: 380 }}>
          {/* Mini sidebar */}
          <div style={{
            width: 64, flexShrink: 0,
            background: 'rgba(0,0,0,0.18)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '14px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            {[LayoutDashboard, Search, Sparkles, GitCompare, Wand2, Banknote].map((Icon, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10,
                  background: i === 5 ? 'rgba(244,226,122,0.16)' : 'rgba(255,255,255,0.04)',
                  color: i === 5 ? '#F4E27A' : 'rgba(246,248,243,0.6)',
                  border: i === 5 ? '1px solid rgba(244,226,122,0.36)' : '1px solid transparent',
                }}
              >
                <Icon size={16} />
              </span>
            ))}
          </div>

          {/* Main */}
          <div style={{ flex: 1, padding: '18px 22px 22px', color: '#F6F8F3' }}>
            {/* Page title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Banknote size={16} color="#F4E27A" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {t('hero.mock.refundTitle', 'Recuperació diners FBA')}
              </h4>
              <span style={{
                marginLeft: 'auto',
                fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                color: '#F4E27A',
                background: 'rgba(244,226,122,0.14)',
                padding: '2px 7px', borderRadius: 4,
                letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
              }}>
                IA · scan
              </span>
            </div>

            {/* Big counter */}
            <div style={{
              padding: '16px 18px',
              borderRadius: 14,
              background:
                'linear-gradient(135deg, rgba(244,226,122,0.10) 0%, rgba(110,203,195,0.06) 100%)',
              border: '1px solid rgba(244,226,122,0.24)',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(246,248,243,0.65)', fontWeight: 700, marginBottom: 4 }}>
                {t('hero.mock.estimated', 'Estimació recuperable · 18 mesos')}
              </div>
              <div style={{
                fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
                fontSize: 38, lineHeight: 1, color: '#F4E27A',
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}>
                {moneyFmt.format(recovered)}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(246,248,243,0.7)' }}>
                {t('hero.mock.events', '12 sospitosos · 1.842 events analitzats')}
              </div>
            </div>

            {/* Findings list (mini) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { sev: 'high', cat: t('hero.mock.cat.lost', 'Estoc perdut'), amount: '€812' },
                { sev: 'med',  cat: t('hero.mock.cat.fee',  'Fee duplicada'), amount: '€247' },
                { sev: 'med',  cat: t('hero.mock.cat.ret',  'Devolució no reembossada'), amount: '€189' },
              ].map((row, i) => {
                const sevStyles = row.sev === 'high'
                  ? { bg: 'rgba(242,108,108,0.14)', fg: '#F26C6C' }
                  : { bg: 'rgba(240,180,41,0.16)',  fg: '#F0B429' }
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${sevStyles.fg}`,
                    borderRadius: 8,
                  }}>
                    <span style={{
                      fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 4,
                      background: sevStyles.bg, color: sevStyles.fg,
                    }}>
                      {row.sev}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#F6F8F3' }}>{row.cat}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#7FE0BD' }}>
                      {row.amount}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* AI activity feed */}
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: 'rgba(110,203,195,0.08)',
              border: '1px solid rgba(110,203,195,0.20)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Sparkles size={14} color="#6ECBC3" />
              <span style={{ fontSize: 12, color: 'rgba(246,248,243,0.85)', lineHeight: 1.4 }}>
                <strong style={{ color: '#6ECBC3' }}>
                  {t('hero.mock.aiTag', 'IA · Claude Sonnet')}
                </strong>{' '}
                {t('hero.mock.aiMsg', 'ha trobat 3 reembossaments amb evidència suficient. Text per Seller Support llest.')}
              </span>
            </div>

            {/* Bottom row: tool chips */}
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { Icon: GitCompare, label: t('hero.mock.tool.quotes', 'Pressupostos') },
                { Icon: Wand2,      label: t('hero.mock.tool.listing','Listing') },
                { Icon: Search,     label: t('hero.mock.tool.keywords','Keywords') },
                { Icon: TrendingUp, label: t('hero.mock.tool.keepa','Keepa') },
              ].map(({ Icon, label }, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999, fontSize: 11, color: 'rgba(246,248,243,0.75)',
                }}>
                  <Icon size={11} color="#6ECBC3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom hairline status bar */}
        <div style={{
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.18)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10, color: 'rgba(246,248,243,0.55)', letterSpacing: '0.06em',
        }}>
          <span>
            <span style={{ color: '#7FE0BD' }}>●</span> {t('hero.mock.connected', 'SPAPI · Stripe · BYOK IA')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={10} color="#7FE0BD" />
            {t('hero.mock.scanReady', 'Scan llest')}
            <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </div>
  )
}
