import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Sparkles, Banknote, TrendingUp, Search, Wand2,
  GitCompare, CheckCircle2, ArrowRight, Play, Pause,
} from 'lucide-react'

/**
 * HeroMockup — a self-running "product tour" rendered fully in CSS/SVG.
 *
 * Instead of a static screenshot (or a real video file we don't have
 * yet), the mockup cycles through three scenes every ~3.6s:
 *   0. Refund Recovery — animated euros-recovered counter + findings
 *   1. AI Quote Comparison — ranked supplier cards
 *   2. AI Keyword Research — keyword rows with intent badges
 *
 * A bottom scene-rail lets the visitor scrub manually; a play/pause
 * toggle stops the loop. This gives the "watch the demo" feel with
 * zero video weight and perfect i18n.
 */

const SCENE_COUNT = 3
const SCENE_MS = 3600

export default function HeroMockup() {
  const { t, i18n } = useTranslation()
  const [scene, setScene] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [recovered, setRecovered] = useState(0)
  const timerRef = useRef(null)

  const moneyFmt = new Intl.NumberFormat(i18n.language || 'ca', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  })

  /* Scene auto-advance */
  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(
      () => setScene((s) => (s + 1) % SCENE_COUNT),
      SCENE_MS,
    )
    return () => clearTimeout(timerRef.current)
  }, [scene, playing])

  /* Counter animation — re-runs whenever scene 0 becomes active */
  useEffect(() => {
    if (scene !== 0) return
    const TARGET = 2347
    const start = performance.now()
    const dur = 1400
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setRecovered(Math.round(TARGET * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scene])

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

  const SCENE_META = [
    { Icon: Banknote,   tab: 'tools/refunds',  titleKey: 'hero.mock.refundTitle' },
    { Icon: GitCompare, tab: 'tools/quotes',   titleKey: 'hero.mock.quotesTitle' },
    { Icon: Search,     tab: 'tools/keywords', titleKey: 'hero.mock.keywordsTitle' },
  ]
  const meta = SCENE_META[scene]

  return (
    <div
      className="hero-mock"
      role="img"
      aria-label={t('hero.mockAlt', 'Demo del producte: les eines d\'IA en acció')}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        width: '100%', maxWidth: 560,
        transform: 'perspective(1400px) rotateY(-7deg) rotateX(3deg)',
        transformStyle: 'preserve-3d',
        transition: 'transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        willChange: 'transform',
        filter: 'drop-shadow(0 32px 80px rgba(0,0,0,0.45))',
      }}
    >
      <div style={{
        background: 'linear-gradient(180deg, rgba(13,40,44,0.96) 0%, rgba(7,28,32,0.96) 100%)',
        border: '1px solid rgba(110,203,195,0.18)',
        borderRadius: 18, overflow: 'hidden',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F26C6C' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#F4E27A' }} />
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#6ECBC3' }} />
          <span style={{
            marginLeft: 10, fontSize: 11, color: 'rgba(246,248,243,0.65)',
            fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.04em',
            transition: 'opacity 240ms ease',
          }}>
            app.freedoliapp.com / {meta.tab}
          </span>
          {/* Live demo pill */}
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#6ECBC3', background: 'rgba(110,203,195,0.12)',
            padding: '3px 8px', borderRadius: 999,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#6ECBC3',
              animation: 'ldPulse 1.6s ease-in-out infinite',
            }} />
            {t('hero.mock.liveDemo', 'Demo en directe')}
          </span>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', minHeight: 392 }}>
          {/* Mini sidebar */}
          <div style={{
            width: 64, flexShrink: 0, background: 'rgba(0,0,0,0.18)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '14px 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 14,
          }}>
            {[LayoutDashboard, Banknote, GitCompare, Search, Wand2, TrendingUp].map((Icon, i) => {
              const active = (i === 1 && scene === 0) || (i === 2 && scene === 1) || (i === 3 && scene === 2)
              return (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 10,
                  background: active ? 'rgba(244,226,122,0.16)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#F4E27A' : 'rgba(246,248,243,0.55)',
                  border: active ? '1px solid rgba(244,226,122,0.36)' : '1px solid transparent',
                  transition: 'background 280ms ease, color 280ms ease, border-color 280ms ease',
                }}>
                  <Icon size={16} />
                </span>
              )
            })}
          </div>

          {/* Main panel — scene-keyed for a soft cross-fade */}
          <div key={scene} style={{
            flex: 1, padding: '18px 22px 18px', color: '#F6F8F3',
            animation: 'fdSceneIn 420ms cubic-bezier(0.2,0.7,0.2,1) both',
          }}>
            {/* Scene header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <meta.Icon size={16} color="#F4E27A" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {t(meta.titleKey)}
              </h4>
              <span style={{
                marginLeft: 'auto', fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                color: '#F4E27A', background: 'rgba(244,226,122,0.14)',
                padding: '2px 7px', borderRadius: 4, letterSpacing: '0.12em',
                textTransform: 'uppercase', fontWeight: 700,
              }}>
                IA
              </span>
            </div>

            {/* ── SCENE 0 — Refund Recovery ── */}
            {scene === 0 && (
              <>
                <div style={{
                  padding: '16px 18px', borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(244,226,122,0.10) 0%, rgba(110,203,195,0.06) 100%)',
                  border: '1px solid rgba(244,226,122,0.24)', marginBottom: 12,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { sev: 'high', cat: t('hero.mock.cat.lost', 'Estoc perdut'), amount: '€812' },
                    { sev: 'med',  cat: t('hero.mock.cat.fee',  'Fee duplicada'), amount: '€247' },
                    { sev: 'med',  cat: t('hero.mock.cat.ret',  'Devolució no reembossada'), amount: '€189' },
                  ].map((row, i) => {
                    const s = row.sev === 'high'
                      ? { bg: 'rgba(242,108,108,0.14)', fg: '#F26C6C' }
                      : { bg: 'rgba(240,180,41,0.16)',  fg: '#F0B429' }
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                        borderLeft: `3px solid ${s.fg}`, borderRadius: 8,
                      }}>
                        <span style={{
                          fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                          letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.fg,
                        }}>{row.sev}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{row.cat}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#7FE0BD' }}>
                          {row.amount}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── SCENE 1 — AI Quote Comparison ── */}
            {scene === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Shenzhen Locks Co.', score: 91, badge: t('hero.mock.best', 'Millor'), good: true,
                    note: t('hero.mock.q1', 'FOB · 30/70 · 25 dies lead time') },
                  { name: 'Ningbo Hardware',    score: 74, badge: null, good: false,
                    note: t('hero.mock.q2', 'EXW · 100% avançat · MOQ alt') },
                  { name: 'Yiwu Trading Ltd.',  score: 63, badge: null, good: false,
                    note: t('hero.mock.q3', 'Preu baix però senyals de risc') },
                ].map((q, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${q.good ? 'rgba(127,224,189,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    borderLeft: `3px solid ${q.good ? '#7FE0BD' : 'rgba(255,255,255,0.12)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{q.name}</span>
                      {q.badge && (
                        <span style={{
                          fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(127,224,189,0.18)', color: '#7FE0BD',
                        }}>★ {q.badge}</span>
                      )}
                      <span style={{
                        marginLeft: 'auto', fontSize: 13, fontWeight: 700,
                        color: q.good ? '#7FE0BD' : 'rgba(246,248,243,0.6)',
                      }}>{q.score}/100</span>
                    </div>
                    {/* score bar */}
                    <div style={{ marginTop: 7, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${q.score}%`, height: '100%', borderRadius: 3,
                        background: q.good
                          ? 'linear-gradient(90deg, #6ECBC3, #7FE0BD)'
                          : 'rgba(246,248,243,0.28)',
                      }} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(246,248,243,0.66)' }}>
                      {q.note}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── SCENE 2 — AI Keyword Research ── */}
            {scene === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { kw: 'cadenat bicicleta', intent: 'commercial', vol: 'high', cpc: '€0.42' },
                  { kw: 'cadenat u antirobatori', intent: 'commercial', vol: 'mid', cpc: '€0.55' },
                  { kw: 'millor cadenat 2026', intent: 'comparison', vol: 'mid', cpc: '€0.38' },
                  { kw: 'com triar un cadenat', intent: 'informational', vol: 'low', cpc: '€0.21' },
                  { kw: 'cadenat bici elèctrica', intent: 'commercial', vol: 'high', cpc: '€0.61' },
                ].map((row, i) => {
                  const intentColor = {
                    commercial: '#7FE0BD', comparison: '#F26C6C', informational: '#6ECBC3',
                  }[row.intent]
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.kw}
                      </span>
                      <span style={{
                        fontSize: 9, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '2px 6px', borderRadius: 4,
                        background: `${intentColor}22`, color: intentColor,
                      }}>{row.intent.slice(0, 4)}</span>
                      <span style={{ fontSize: 10, color: 'rgba(246,248,243,0.6)', width: 30, textAlign: 'right',
                        fontFamily: '"JetBrains Mono", monospace' }}>{row.vol}</span>
                      <span style={{ fontSize: 11, color: '#F4E27A', fontWeight: 700, width: 44, textAlign: 'right',
                        fontFamily: '"JetBrains Mono", monospace' }}>{row.cpc}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* AI activity feed — shared across scenes */}
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(110,203,195,0.08)', border: '1px solid rgba(110,203,195,0.20)',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Sparkles size={14} color="#6ECBC3" />
              <span style={{ fontSize: 11.5, color: 'rgba(246,248,243,0.85)', lineHeight: 1.4 }}>
                <strong style={{ color: '#6ECBC3' }}>{t('hero.mock.aiTag', 'IA · Claude Sonnet')}</strong>{' '}
                {scene === 0 && t('hero.mock.aiMsg0', 'ha trobat 3 reembossaments amb evidència suficient.')}
                {scene === 1 && t('hero.mock.aiMsg1', 'recomana Shenzhen Locks: millors payment terms i lead time.')}
                {scene === 2 && t('hero.mock.aiMsg2', '38 keywords agrupades per intenció amb CPC estimat.')}
              </span>
            </div>
          </div>
        </div>

        {/* Scene rail + controls */}
        <div style={{
          padding: '9px 14px', background: 'rgba(0,0,0,0.18)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t('hero.mock.pause', 'Pausa') : t('hero.mock.play', 'Reprodueix')}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(246,248,243,0.8)', cursor: 'pointer', padding: 0,
            }}
          >
            {playing ? <Pause size={10} /> : <Play size={10} />}
          </button>
          {/* Scene progress segments */}
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setScene(i); setPlaying(false) }}
                aria-label={`Scene ${i + 1}`}
                style={{
                  flex: 1, height: 4, borderRadius: 2, padding: 0, cursor: 'pointer',
                  border: 'none',
                  background: i === scene ? '#6ECBC3' : 'rgba(255,255,255,0.10)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'background 240ms ease',
                }}
              >
                {i === scene && playing && (
                  <span style={{
                    position: 'absolute', inset: 0, transformOrigin: 'left',
                    background: 'rgba(246,248,243,0.45)',
                    animation: `fdSceneBar ${SCENE_MS}ms linear both`,
                  }} />
                )}
              </button>
            ))}
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
            color: 'rgba(246,248,243,0.55)', letterSpacing: '0.06em', flexShrink: 0 }}>
            <CheckCircle2 size={10} color="#7FE0BD" />
            {t('hero.mock.connected', 'SPAPI · Stripe · BYOK IA')}
            <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </div>
  )
}
