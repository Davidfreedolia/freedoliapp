import { useTranslation } from 'react-i18next'

/**
 * BuiltOnRow — honest "infrastructure credibility" strip.
 *
 * Replaces the old logos strip (which leaned on competitor favicons via
 * Google's favicon service and implied a partnership that doesn't exist).
 * Instead we state, truthfully, what the product actually runs on. Every
 * name here is a real dependency a developer could verify — so it builds
 * trust instead of faking it.
 *
 * Rendered as inline SVG wordmarks so there are no external image
 * requests and no broken-favicon console noise.
 */

const STACK = [
  { id: 'amazon',    label: 'Amazon SP-API' },
  { id: 'stripe',    label: 'Stripe' },
  { id: 'supabase',  label: 'Supabase' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai',    label: 'OpenAI' },
  { id: 'keepa',     label: 'Keepa' },
]

export default function BuiltOnRow() {
  const { t } = useTranslation()

  return (
    <section
      style={{
        padding: '34px 0 30px',
        background: 'var(--surface-bg, #fff)',
        borderTop: '1px solid rgba(31,95,99,0.08)',
        borderBottom: '1px solid rgba(31,95,99,0.08)',
      }}
    >
      <div className="container">
        <p style={{
          textAlign: 'center', margin: '0 0 18px',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: '#5F7476',
          fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
        }}>
          {t('landing.builtOn.label', 'Construït sobre infraestructura de confiança')}
        </p>
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          alignItems: 'center', gap: '14px 26px',
        }}>
          {STACK.map((s) => (
            <span
              key={s.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontSize: 15, fontWeight: 700, color: '#243333',
                letterSpacing: '-0.01em',
                opacity: 0.72,
                transition: 'opacity 200ms ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.72' }}
            >
              <span aria-hidden="true" style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: 2,
                background: 'var(--brand-2, #6ECBC3)',
                transform: 'rotate(45deg)',
              }} />
              {s.label}
            </span>
          ))}
        </div>
        <p style={{
          textAlign: 'center', margin: '16px 0 0',
          fontSize: 12.5, color: '#5F7476', lineHeight: 1.5,
          maxWidth: 620, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {t('landing.builtOn.note', 'Dades a la regió UE · xifrat extrem a extrem · la teva clau d\'IA, el teu compte. Cap intermediari.')}
        </p>
      </div>
    </section>
  )
}
