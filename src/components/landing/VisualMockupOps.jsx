import { useTranslation } from 'react-i18next'
import {
  Sparkles, Search, FileText, Boxes, Truck, Store, CheckCircle2,
} from 'lucide-react'

/**
 * VisualMockupOps — illustration for the first visual section ("end to
 * end pipeline"). Renders the 6 project phases as a glowing pipeline,
 * each with status dots, and a hovering AI agent commenting on the
 * current phase. Pure CSS/SVG, no PNG dependency.
 */
export default function VisualMockupOps() {
  const { t } = useTranslation()

  const PHASES = [
    { Icon: Search,   labelKey: 'visualOps.phase.research',  done: true,  hint: t('visualOps.phaseHint.research',  'IA: 12 keywords') },
    { Icon: FileText, labelKey: 'visualOps.phase.viability', done: true,  hint: t('visualOps.phaseHint.viability', 'GO — 32% marge') },
    { Icon: Boxes,    labelKey: 'visualOps.phase.suppliers', done: true,  hint: t('visualOps.phaseHint.suppliers', '4 pressupostos · IA OK') },
    { Icon: FileText, labelKey: 'visualOps.phase.samples',   done: false, hint: t('visualOps.phaseHint.samples',   'Esperant mostres') },
    { Icon: Truck,    labelKey: 'visualOps.phase.shipment',  done: false, hint: '' },
    { Icon: Store,    labelKey: 'visualOps.phase.live',      done: false, hint: '' },
  ]

  return (
    <div style={{
      position: 'relative',
      borderRadius: 22,
      padding: '28px 26px 32px',
      background:
        'radial-gradient(ellipse 100% 80% at 0% 0%, rgba(110,203,195,0.18) 0%, transparent 60%),' +
        'linear-gradient(180deg, #0E3A40 0%, #07232A 100%)',
      color: '#F6F8F3',
      border: '1px solid rgba(110,203,195,0.20)',
      boxShadow: '0 22px 60px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      {/* Decorative noise overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' seed='2'/><feColorMatrix values='0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.04 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
          backgroundSize: '220px 220px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(110,203,195,0.16)', color: '#6ECBC3',
          }}>
            <Sparkles size={14} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#6ECBC3',
            fontFamily: '"JetBrains Mono", monospace' }}>
            {t('visualOps.kicker', 'Projecte FBA #042 · IA assistint')}
          </span>
        </div>

        {/* Pipeline */}
        <div style={{ position: 'relative', paddingLeft: 8 }}>
          {/* Vertical line */}
          <span aria-hidden="true" style={{
            position: 'absolute', left: 22, top: 12, bottom: 12,
            width: 2, background:
              'linear-gradient(180deg, #6ECBC3 0%, #6ECBC3 50%, rgba(110,203,195,0.18) 50%, rgba(110,203,195,0.18) 100%)',
            borderRadius: 2,
          }} />

          {PHASES.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 0', position: 'relative',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 10,
                background: p.done ? 'rgba(127,224,189,0.18)' : 'rgba(255,255,255,0.06)',
                border: p.done ? '1px solid rgba(127,224,189,0.4)' : '1px solid rgba(255,255,255,0.10)',
                color: p.done ? '#7FE0BD' : 'rgba(246,248,243,0.55)',
                position: 'relative', zIndex: 2,
                flexShrink: 0,
              }}>
                {p.done
                  ? <CheckCircle2 size={15} />
                  : <p.Icon size={14} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: p.done ? '#F6F8F3' : 'rgba(246,248,243,0.75)',
                  letterSpacing: '-0.005em',
                }}>
                  {t(p.labelKey, p.labelKey)}
                </div>
                {p.hint && (
                  <div style={{
                    fontSize: 11, color: '#7FE0BD', marginTop: 2,
                    fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.02em',
                  }}>
                    ↳ {p.hint}
                  </div>
                )}
              </div>
              {p.done && (
                <span style={{
                  fontSize: 9, fontFamily: '"JetBrains Mono", monospace',
                  letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase',
                  padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(127,224,189,0.16)', color: '#7FE0BD',
                }}>
                  {t('visualOps.done', 'Fet')}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* AI assist callout */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 12,
          background: 'rgba(244,226,122,0.10)',
          border: '1px solid rgba(244,226,122,0.30)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: 'rgba(244,226,122,0.18)', color: '#F4E27A',
          }}>
            <Sparkles size={13} />
          </span>
          <div>
            <div style={{ fontSize: 11, color: '#F4E27A', fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              fontFamily: '"JetBrains Mono", monospace' }}>
              {t('visualOps.aiTag', 'IA · Suggeriment')}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(246,248,243,0.92)', lineHeight: 1.5, marginTop: 3 }}>
              {t('visualOps.aiMsg', 'El proveïdor B té MOQ 200 més baix però 5 dies més de lead time. Si caixa és prioritat ara, recomano B.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
