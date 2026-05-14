import { useTranslation } from 'react-i18next'
import {
  Sparkles, AlertTriangle, TrendingUp, TrendingDown, BellRing, ArrowUpRight,
} from 'lucide-react'

/**
 * VisualMockupAi — illustration for the second visual section ("the
 * AI is your second brain"). Renders a decision-engine snapshot: a
 * sparkline-style trend, two AI-surfaced insights as cards, and a
 * "today's decisions" inbox. All pure CSS/SVG.
 */
export default function VisualMockupAi() {
  const { t } = useTranslation()

  return (
    <div style={{
      position: 'relative',
      borderRadius: 22,
      padding: '28px 26px 30px',
      background:
        'radial-gradient(ellipse 90% 70% at 100% 0%, rgba(244,226,122,0.16) 0%, transparent 60%),' +
        'linear-gradient(180deg, #0E3A40 0%, #07232A 100%)',
      color: '#F6F8F3',
      border: '1px solid rgba(244,226,122,0.24)',
      boxShadow: '0 22px 60px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {/* noise */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.04 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
          backgroundSize: '220px 220px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(244,226,122,0.20)', color: '#F4E27A',
          }}>
            <Sparkles size={14} />
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#F4E27A',
            fontFamily: '"JetBrains Mono", monospace',
          }}>
            {t('visualAi.kicker', "Decisions d'avui · IA prioritzades")}
          </span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <BellRing size={12} color="#F26C6C" />
            <span style={{
              fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
              color: '#F26C6C', letterSpacing: '0.08em', fontWeight: 700,
            }}>
              3 {t('visualAi.urgent', 'urgents')}
            </span>
          </span>
        </div>

        {/* Sparkline-style KPIs row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18,
        }}>
          {[
            { label: t('visualAi.kpi.margin', 'Marge mig'), value: '32%', delta: '+4pp', up: true },
            { label: t('visualAi.kpi.cash',   'Caixa 30d'),  value: '€18k', delta: '+€2.1k', up: true },
            { label: t('visualAi.kpi.stockout','Stockouts'),  value: '0',   delta: '−3', up: true },
          ].map((k, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.10em', textTransform: 'uppercase',
                color: 'rgba(246,248,243,0.6)', fontWeight: 700, marginBottom: 4,
              }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
                  fontSize: 22, lineHeight: 1, color: '#F6F8F3',
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                }}>{k.value}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: k.up ? '#7FE0BD' : '#F26C6C',
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                }}>
                  {k.up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                  {k.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sparkline SVG */}
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(110,203,195,0.06)',
          border: '1px solid rgba(110,203,195,0.16)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: 'rgba(246,248,243,0.65)', fontWeight: 700,
            }}>
              {t('visualAi.trend', 'Profit · 30 dies')}
            </span>
            <span style={{ fontSize: 11, color: '#7FE0BD', fontWeight: 700 }}>+18.4%</span>
          </div>
          <svg viewBox="0 0 320 60" width="100%" height="50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ECBC3" stopOpacity="0.55"/>
                <stop offset="100%" stopColor="#6ECBC3" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path
              d="M0,46 L20,42 L40,44 L60,38 L80,40 L100,32 L120,34 L140,28 L160,30 L180,22 L200,26 L220,18 L240,20 L260,14 L280,18 L300,10 L320,12"
              fill="none" stroke="#6ECBC3" strokeWidth="2" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,46 L20,42 L40,44 L60,38 L80,40 L100,32 L120,34 L140,28 L160,30 L180,22 L200,26 L220,18 L240,20 L260,14 L280,18 L300,10 L320,12 L320,60 L0,60 Z"
              fill="url(#sparkGrad)"
            />
          </svg>
        </div>

        {/* AI insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              sev: 'high',
              icon: AlertTriangle,
              title: t('visualAi.insight1.title', 'Cal reordenar SKU-7382 abans del 28/05'),
              body:  t('visualAi.insight1.body',  'Velocitat actual 14u/dia, stock per 11 dies. Confiança IA: 92%.'),
              cta:   t('visualAi.insight1.cta',   'Veure decisió'),
            },
            {
              sev: 'med',
              icon: TrendingUp,
              title: t('visualAi.insight2.title', 'Proveïdor C va apujar preu 8% sense avisar'),
              body:  t('visualAi.insight2.body',  'IA ha detectat la pujada en l\'última PO. Recomana renegociar o anar a B.'),
              cta:   t('visualAi.insight2.cta',   'Obrir negociació'),
            },
          ].map((ins, i) => {
            const sev = ins.sev === 'high'
              ? { bg: 'rgba(242,108,108,0.14)', fg: '#F26C6C', borderL: '#F26C6C' }
              : { bg: 'rgba(240,180,41,0.16)',  fg: '#F4E27A', borderL: '#F4E27A' }
            return (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${sev.borderL}`,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: sev.bg, color: sev.fg,
                }}>
                  <ins.icon size={13} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#F6F8F3', lineHeight: 1.35 }}>
                    {ins.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(246,248,243,0.72)', marginTop: 3, lineHeight: 1.5 }}>
                    {ins.body}
                  </div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 700, color: '#6ECBC3',
                  whiteSpace: 'nowrap',
                }}>
                  {ins.cta}
                  <ArrowUpRight size={11} />
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
