import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Banknote,         // Refund recovery
  GitCompare,       // Quote comparison
  Wand2,            // Listing optimizer
  Search,           // Keyword research
  LineChart,        // Keepa
  MousePointerClick, // Chrome extension
} from 'lucide-react'

/**
 * AiSuiteSection — the new centerpiece of the Freedoliapp landing.
 *
 * Asymmetric editorial layout:
 *   ┌──────────────────────────────┬───────────────┐
 *   │                              │  Quote        │
 *   │   REFUND RECOVERY  (big)     │  Comparison   │
 *   │   live counter • CTA         │  (small)      │
 *   │                              ├───────────────┤
 *   │                              │  Listing      │
 *   │                              │  Optimizer    │
 *   └──────────────────────────────┴───────────────┘
 *   ┌──────────┬──────────┬──────────┐
 *   │  Keyword │  Keepa   │  Chrome  │
 *   │  Research│  History │  Extension│
 *   └──────────┴──────────┴──────────┘
 *
 * Motion:
 *   - IntersectionObserver flips an `is-in-view` class on the section,
 *     triggering a staggered reveal of all cards via CSS transitions.
 *   - The centerpiece "recovered euros" counter ticks once on first view.
 */
export default function AiSuiteSection() {
  const { t } = useTranslation()
  const sectionRef = useRef(null)
  const [recovered, setRecovered] = useState(0)
  const TARGET = 2347 // illustrative figure (€2,347 recovered in a beta test)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const onIntersect = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in-view')
          // Animate the counter once
          const start = performance.now()
          const duration = 1400
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - p, 3)
            setRecovered(Math.round(TARGET * eased))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.disconnect() // run once
          return
        }
      }
    }

    const observer = new IntersectionObserver(onIntersect, { threshold: 0.18 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="ai-suite" className="ld-ai-suite">
      <div className="ld-ai-suite__inner">
        {/* Eyebrow */}
        <span className="ld-ai-suite__eyebrow">
          <span className="ld-ai-suite__eyebrow-dot" />
          {t('landing.aiSuite.eyebrow', 'Nou · 6 eines IA + Extensió Chrome')}
        </span>

        {/* Title + lede */}
        <h2 className="ld-ai-suite__title">
          {t('landing.aiSuite.titleStart', 'L\'IA fa la feina avorrida.')}
          <br />
          <em>{t('landing.aiSuite.titleEm', 'Tu recuperes diners reals.')}</em>
        </h2>
        <p className="ld-ai-suite__lede">
          {t('landing.aiSuite.lede', 'Connecta el teu propi compte d\'IA (Anthropic, OpenAI, Gemini, Mistral, Groq, Ollama) i desbloqueja una suite d\'eines pensades per a sellers FBA seriosos. Sense quotes per anàlisi. Sense pintura sobre cartró.')}
        </p>

        {/* Centerpiece + secondary stack */}
        <div className="ld-ai-suite__grid">
          {/* ── Centerpiece: Refund Recovery ── */}
          <article className="ld-ai-card ld-ai-card--center">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <span className="ld-ai-card__icon">
                <Banknote size={22} />
              </span>
              <span className="ld-ai-card__chip ld-ai-card__chip--new">
                <span>★</span> {t('landing.aiSuite.tag.topRoi', 'Top ROI')}
              </span>
            </div>

            <h3 className="ld-ai-card__title">
              {t('landing.aiSuite.refund.title', 'Recuperació de diners FBA, automatitzada')}
            </h3>

            <div className="ld-ai-card__counter" aria-live="polite">
              <span className="ld-ai-card__counter-num">
                {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(recovered)}
              </span>
              <span className="ld-ai-card__counter-unit">
                {t('landing.aiSuite.refund.unit', 'recuperats al beta')}
              </span>
            </div>

            <p className="ld-ai-card__text">
              {t('landing.aiSuite.refund.text', "L'IA escaneja 18 mesos d'events Amazon: estoc perdut, fees duplicades, devolucions sense reemborsament, anomalies de càrrecs. Et donem el text exacte per obrir el cas a Seller Support. Sense comissió sobre el recuperat.")}
            </p>

            <div className="ld-ai-card__meta">
              <span className="ld-ai-card__meta-item">
                <strong>—</strong> {t('landing.aiSuite.refund.meta1', 'Sense comissió')}
              </span>
              <span className="ld-ai-card__meta-item">
                <strong>SPAPI</strong> {t('landing.aiSuite.refund.meta2', 'Cobreix 18 mesos')}
              </span>
              <span className="ld-ai-card__meta-item">
                <strong>BYOK</strong> {t('landing.aiSuite.refund.meta3', 'Amb la teva IA')}
              </span>
            </div>
          </article>

          {/* ── Secondary stack: quote + listing ── */}
          <div className="ld-ai-suite__stack">
            <article className="ld-ai-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="ld-ai-card__icon">
                  <GitCompare size={20} />
                </span>
                <span className="ld-ai-card__chip ld-ai-card__chip--unique">
                  {t('landing.aiSuite.tag.unique', 'Únic')}
                </span>
              </div>
              <h3 className="ld-ai-card__title">{t('landing.aiSuite.quotes.title', 'Comparativa IA de pressupostos')}</h3>
              <p className="ld-ai-card__text">
                {t('landing.aiSuite.quotes.text', 'Drag-and-drop dels PDFs dels proveïdors. La IA ordena per preu, MOQ, lead time i payment terms, alerta de senyals sospitosos i et dóna palanques de negociació concretes.')}
              </p>
            </article>

            <article className="ld-ai-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="ld-ai-card__icon">
                  <Wand2 size={20} />
                </span>
                <span className="ld-ai-card__chip ld-ai-card__chip--byok">
                  {t('landing.aiSuite.tag.byok', 'BYOK')}
                </span>
              </div>
              <h3 className="ld-ai-card__title">{t('landing.aiSuite.listing.title', 'Optimitzador de Listing')}</h3>
              <p className="ld-ai-card__text">
                {t('landing.aiSuite.listing.text', "Enganxa el teu listing actual. L'IA el reescriu per a SEO + conversió respectant els límits Amazon (200 / 250 / 2000 chars), amb scoring per secció.")}
              </p>
            </article>
          </div>
        </div>

        {/* ── Tools row: keyword + keepa + chrome ── */}
        <div className="ld-ai-suite__tools">
          <article className="ld-ai-tool">
            <span className="ld-ai-tool__tag ld-ai-tool__tag--new">{t('landing.aiSuite.tag.new', 'Nou')}</span>
            <span className="ld-ai-tool__icon"><Search size={18} /></span>
            <h4 className="ld-ai-tool__title">{t('landing.aiSuite.keywords.title', 'Recerca de Keywords')}</h4>
            <p className="ld-ai-tool__text">
              {t('landing.aiSuite.keywords.text', "Autocomplete d'Amazon + IA: 25-40 keywords per intenció, volum, competència i CPC suggerit. Sense pagar Cerebro.")}
            </p>
          </article>

          <article className="ld-ai-tool">
            <span className="ld-ai-tool__tag ld-ai-tool__tag--byok">{t('landing.aiSuite.tag.byoc', 'BYOC')}</span>
            <span className="ld-ai-tool__icon"><LineChart size={18} /></span>
            <h4 className="ld-ai-tool__title">{t('landing.aiSuite.keepa.title', 'Historial Keepa')}</h4>
            <p className="ld-ai-tool__text">
              {t('landing.aiSuite.keepa.text', 'Preu, BSR, valoracions i reviews en charts dins de cada recerca. Si ja pagues Keepa, connecta la teva clau i no et costa res més.')}
            </p>
          </article>

          <article className="ld-ai-tool">
            <span className="ld-ai-tool__tag ld-ai-tool__tag--new">{t('landing.aiSuite.tag.new', 'Nou')}</span>
            <span className="ld-ai-tool__icon"><MousePointerClick size={18} /></span>
            <h4 className="ld-ai-tool__title">{t('landing.aiSuite.chrome.title', 'Extensió Chrome')}</h4>
            <p className="ld-ai-tool__text">
              {t('landing.aiSuite.chrome.text', "Captura qualsevol ASIN d'Amazon en un clic. 12 marketplaces. La pàgina de recerca s'obre amb el producte ja precarregat.")}
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
