import { useTranslation } from 'react-i18next'
import { Boxes, Briefcase, Workflow, Quote, ExternalLink } from 'lucide-react'

/**
 * BuiltForSection — replaces the previous stock-photo "testimonials"
 * carousel. Two reasons for the swap:
 *
 *   1. The old testimonials used fake Unsplash portraits paired with
 *      Spanish-sounding names — prospects spot it immediately and it
 *      damages trust.
 *   2. We're in closed beta. Pretending we have hundreds of users is
 *      worse than owning the stage we're in.
 *
 * The new section says, honestly:
 *   "This is who we're for. This is who we're not."
 *   plus a small founder note + the beta-status callout.
 */

const PERSONAS = [
  {
    Icon: Boxes,
    titleKey: 'landing.builtFor.p1.title',
    bodyKey:  'landing.builtFor.p1.body',
    skuKey:   'landing.builtFor.p1.sku',
  },
  {
    Icon: Briefcase,
    titleKey: 'landing.builtFor.p2.title',
    bodyKey:  'landing.builtFor.p2.body',
    skuKey:   'landing.builtFor.p2.sku',
  },
  {
    Icon: Workflow,
    titleKey: 'landing.builtFor.p3.title',
    bodyKey:  'landing.builtFor.p3.body',
    skuKey:   'landing.builtFor.p3.sku',
  },
]

export default function BuiltForSection() {
  const { t } = useTranslation()

  return (
    <section
      id="built-for"
      style={{
        padding: '80px 0 96px',
        background: '#f8faf7',
        position: 'relative',
      }}
    >
      <div className="container">
        {/* Header */}
        <div className="text-center" style={{ maxWidth: 700, margin: '0 auto 44px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(31,95,99,0.08)', color: 'var(--brand-1, #1F5F63)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
          }}>
            {t('landing.builtFor.eyebrow', 'Qui ho fa servir')}
          </span>
          <h2 className="ld-section-title mt-3">
            {t('landing.builtFor.title', 'Pensat per a marques FBA que ja venen')}
          </h2>
          <p className="ld-section-sub mt-2" style={{ fontSize: 16, color: '#5F7476' }}>
            {t('landing.builtFor.sub', "Si encara estàs cercant el teu primer producte, queda't a Helium 10. Si ja tens marca i necessites operar-la millor, llegeix:")}
          </p>
        </div>

        {/* Persona cards */}
        <div className="row row-cols-1 row-cols-md-3 g-4" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {PERSONAS.map((p, i) => (
            <div key={i} className="col">
              <div style={{
                height: '100%',
                background: 'var(--surface-bg, #fff)',
                border: '1px solid rgba(31,95,99,0.10)',
                borderRadius: 18, padding: '22px 22px 20px',
                boxShadow: '0 12px 30px rgba(15, 36, 38, 0.05)',
                transition: 'transform 280ms ease, box-shadow 280ms ease, border-color 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 18px 44px rgba(15, 36, 38, 0.10)'
                e.currentTarget.style.borderColor = 'rgba(110,203,195,0.40)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(15, 36, 38, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(31,95,99,0.10)'
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(110,203,195,0.16)',
                  color: 'var(--brand-1, #1F5F63)',
                  marginBottom: 14,
                }}>
                  <p.Icon size={20} />
                </div>
                <h3 style={{
                  fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
                  fontSize: 22, lineHeight: 1.2, color: '#1A2E30',
                  letterSpacing: '-0.01em', margin: '0 0 4px',
                }}>
                  {t(p.titleKey)}
                </h3>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                  textTransform: 'uppercase', color: 'var(--brand-1, #1F5F63)',
                  fontFamily: '"JetBrains Mono", monospace', marginBottom: 12,
                }}>
                  {t(p.skuKey)}
                </div>
                <p style={{
                  margin: 0, fontSize: 14, color: '#243333', lineHeight: 1.55,
                }}>
                  {t(p.bodyKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Founder note + beta status */}
        <div style={{
          maxWidth: 820, margin: '44px auto 0',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(31,95,99,0.04) 0%, rgba(110,203,195,0.06) 100%)',
          border: '1px solid rgba(31,95,99,0.12)',
          borderRadius: 18,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 22,
          alignItems: 'flex-start',
        }}>
          {/* Avatar block */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-1, #1F5F63) 0%, #6ECBC3 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#F6F8F3', flexShrink: 0,
            fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
            fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em',
            border: '3px solid #F6F8F3',
            boxShadow: '0 6px 16px rgba(15, 36, 38, 0.18)',
          }}>
            D
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A2E30' }}>
                {t('landing.builtFor.founderName', 'David — fundador de Freedoliapp')}
              </span>
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                fontSize: 10, fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                background: 'rgba(244,226,122,0.20)',
                color: '#7A5F22', border: '1px solid rgba(240,180,41,0.36)',
              }}>
                {t('landing.builtFor.betaBadge', 'En beta tancada')}
              </span>
            </div>
            <Quote size={14} color="var(--brand-1, #1F5F63)" style={{ marginBottom: 6, opacity: 0.7 }} />
            <p style={{
              margin: 0, fontSize: 15, color: '#243333', lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              {t('landing.builtFor.founderQuote', "He estat venent a Amazon prou anys per cansar-me de saltar entre 10 eines. Freedoliapp és la plataforma que volia tenir: pipeline operatiu + IA que treballa amb la teva clau + recuperació de diners automàtica. Estem en beta, no et venc fum. Si ets un dels primers 20 a entrar, parles directament amb mi.")}
            </p>
            <a
              href="mailto:david@freedolia.com?subject=Beta%20Freedoliapp"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 12, fontSize: 13, fontWeight: 600,
                color: 'var(--brand-1, #1F5F63)', textDecoration: 'none',
                borderBottom: '1px solid rgba(31,95,99,0.30)',
                paddingBottom: 1,
              }}
            >
              {t('landing.builtFor.contactCta', 'Escriu-me directament')}
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
