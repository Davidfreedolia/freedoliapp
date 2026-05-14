import { useTranslation } from 'react-i18next'
import { Check, X, Minus } from 'lucide-react'

/**
 * ComparisonSection — head-to-head matrix vs. the two biggest names in
 * the FBA tool space. The honest pitch: we don't replace Helium 10 as
 * a product-research database, we replace the Notion/Asana/Sheets/Slack
 * glue that sellers wire up around their ops.
 *
 * Honesty matters here — prospects will know if we fudge. We mark the
 * cells where competitors clearly win with the same green-check icon
 * (e.g. Helium 10 product database).
 */

// Cell variants: 'yes' = green check, 'no' = red X, 'partial' = neutral dash
const ROWS = [
  { labelKey: 'landing.compare.row.workflow',      fd: 'yes',     h10: 'no',      sb: 'no'      },
  { labelKey: 'landing.compare.row.byok',          fd: 'yes',     h10: 'no',      sb: 'no'      },
  { labelKey: 'landing.compare.row.refund',        fd: 'yes',     h10: 'partial', sb: 'no'      },
  { labelKey: 'landing.compare.row.quotes',        fd: 'yes',     h10: 'no',      sb: 'no'      },
  { labelKey: 'landing.compare.row.po',            fd: 'yes',     h10: 'no',      sb: 'no'      },
  { labelKey: 'landing.compare.row.listing',       fd: 'yes',     h10: 'partial', sb: 'no'      },
  { labelKey: 'landing.compare.row.keywords',      fd: 'partial', h10: 'yes',     sb: 'no'      },
  { labelKey: 'landing.compare.row.productDb',     fd: 'no',      h10: 'yes',     sb: 'no'      },
  { labelKey: 'landing.compare.row.pnl',           fd: 'yes',     h10: 'partial', sb: 'yes'     },
  { labelKey: 'landing.compare.row.decisions',     fd: 'yes',     h10: 'no',      sb: 'no'      },
  { labelKey: 'landing.compare.row.langs',         fd: 'yes',     h10: 'no',      sb: 'partial' },
  { labelKey: 'landing.compare.row.chrome',        fd: 'yes',     h10: 'yes',     sb: 'no'      },
  { labelKey: 'landing.compare.row.gdpr',          fd: 'yes',     h10: 'partial', sb: 'partial' },
  { labelKey: 'landing.compare.row.startPrice',    fd: 'literal:€29/mo', h10: 'literal:$99/mo', sb: 'literal:$19/mo' },
]

function Cell({ kind, t }) {
  if (kind?.startsWith('literal:')) {
    return (
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
        fontSize: 12, fontWeight: 700, color: '#243333',
        letterSpacing: '0.02em',
      }}>
        {kind.slice('literal:'.length)}
      </span>
    )
  }
  if (kind === 'yes') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(63,191,154,0.16)', color: 'var(--success-ink, #2B7A66)',
      }} aria-label={t('landing.compare.aria.yes', 'Sí')}>
        <Check size={15} strokeWidth={2.5} />
      </span>
    )
  }
  if (kind === 'no') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(229,83,83,0.10)', color: 'var(--danger-ink, #B0413F)',
      }} aria-label={t('landing.compare.aria.no', 'No')}>
        <X size={15} strokeWidth={2.5} />
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%',
      background: 'rgba(95,116,118,0.12)', color: '#5F7476',
    }} aria-label={t('landing.compare.aria.partial', 'Parcial')}>
      <Minus size={15} strokeWidth={2.5} />
    </span>
  )
}

export default function ComparisonSection() {
  const { t } = useTranslation()

  return (
    <section
      id="compare"
      style={{
        padding: '80px 0 96px',
        background:
          'linear-gradient(180deg, #F6F8F3 0%, #EEF3EE 100%)',
        position: 'relative',
      }}
    >
      <div className="container">
        {/* Header */}
        <div className="text-center" style={{ maxWidth: 720, margin: '0 auto 40px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(31,95,99,0.08)', color: 'var(--brand-1, #1F5F63)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
          }}>
            {t('landing.compare.eyebrow', 'Comparativa honesta')}
          </span>
          <h2 className="ld-section-title mt-3">
            {t('landing.compare.title', 'En què som diferents (i en què no)')}
          </h2>
          <p className="ld-section-sub mt-2" style={{ fontSize: 16, color: '#5F7476' }}>
            {t('landing.compare.sub', "Helium 10 és el millor cercador de productes. Sellerboard és la millor calculadora de P&L. Nosaltres som la cola operativa que tu muntes amb Notion + Asana + Slack avui.")}
          </p>
        </div>

        {/* Matrix */}
        <div style={{
          maxWidth: 900, margin: '0 auto',
          background: 'var(--surface-bg, #fff)',
          borderRadius: 18,
          border: '1px solid rgba(31,95,99,0.10)',
          boxShadow: '0 16px 40px rgba(15, 36, 38, 0.08)',
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) repeat(3, minmax(80px, 1fr))',
            background: 'linear-gradient(180deg, rgba(110,203,195,0.10) 0%, transparent 100%)',
            borderBottom: '1px solid rgba(31,95,99,0.10)',
          }}>
            <div style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700,
              color: '#5F7476', textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
            }}>
              {t('landing.compare.feature', 'Feature')}
            </div>
            {[
              { label: 'Freedoliapp', accent: true },
              { label: 'Helium 10',   accent: false },
              { label: 'Sellerboard', accent: false },
            ].map((col, i) => (
              <div key={i} style={{
                padding: '14px 12px', textAlign: 'center',
                fontFamily: 'var(--ld-display, "DM Serif Display", Georgia, serif)',
                fontSize: 16, color: col.accent ? 'var(--brand-1, #1F5F63)' : '#243333',
                fontWeight: 600, letterSpacing: '-0.01em',
                position: 'relative',
              }}>
                {col.label}
                {col.accent && (
                  <span style={{
                    position: 'absolute', top: -6, right: 8,
                    padding: '2px 7px', borderRadius: 999,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: 'rgba(244,226,122,0.20)', color: '#7A5F22',
                    border: '1px solid rgba(240,180,41,0.40)',
                  }}>
                    {t('landing.compare.tu', 'Tu')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Body rows */}
          {ROWS.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) repeat(3, minmax(80px, 1fr))',
                alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : 'rgba(246,248,243,0.55)',
                borderTop: '1px solid rgba(31,95,99,0.06)',
              }}
            >
              <div style={{
                padding: '14px 20px',
                fontSize: 14, color: '#243333', fontWeight: 500,
              }}>
                {t(row.labelKey, row.labelKey)}
              </div>
              {[row.fd, row.h10, row.sb].map((cell, j) => (
                <div key={j} style={{
                  padding: '12px 8px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  background: j === 0 ? 'rgba(110,203,195,0.04)' : 'transparent',
                  borderLeft: j === 0 ? '1px solid rgba(110,203,195,0.20)' : '1px solid transparent',
                  borderRight: j === 0 ? '1px solid rgba(110,203,195,0.20)' : '1px solid transparent',
                }}>
                  <Cell kind={cell} t={t} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p style={{
          maxWidth: 720, margin: '24px auto 0', textAlign: 'center',
          fontSize: 12, color: '#5F7476', lineHeight: 1.55,
        }}>
          {t('landing.compare.footnote', '«Parcial» = la funció existeix de forma limitada en aquell producte. Per exemple, Helium 10 té un sistema bàsic de detecció de reembossaments però no està connectat al flux de gestió de la teva marca; nosaltres sí.')}
        </p>
      </div>
    </section>
  )
}
