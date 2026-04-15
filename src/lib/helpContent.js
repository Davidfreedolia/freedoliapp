/**
 * helpContent.js — FAQ per context (ruta) per al HelpAssistant.
 *
 * NO confondre amb `src/help/helpContent.js` (tooltips de camps de formulari).
 * Aquest arxiu mapeja rutes a llistes de preguntes freqüents que es mostren
 * al panell del HelpAssistant. Els textos es resolen per i18n key.
 *
 * Estructura: { contextKey: { titleKey, faqs: [{ q: i18nKey, a: i18nKey }] } }
 *
 * Ordre de matching: les claus es comproven com a prefixos contra location.pathname.
 * `default` és el fallback. Posa rutes més específiques abans.
 */

export const HELP_CONTEXTS = [
  {
    match: '/app/import',
    titleKey: 'helpAssistant.contexts.import.title',
    faqs: [
      { q: 'helpAssistant.faq.import.export.q', a: 'helpAssistant.faq.import.export.a' },
      { q: 'helpAssistant.faq.import.formats.q', a: 'helpAssistant.faq.import.formats.a' },
      { q: 'helpAssistant.faq.import.excel.q', a: 'helpAssistant.faq.import.excel.a' },
      { q: 'helpAssistant.faq.import.duplicates.q', a: 'helpAssistant.faq.import.duplicates.a' },
    ],
  },
  {
    match: '/app/research',
    titleKey: 'helpAssistant.contexts.research.title',
    faqs: [
      { q: 'helpAssistant.faq.research.asin.q', a: 'helpAssistant.faq.research.asin.a' },
      { q: 'helpAssistant.faq.research.suppliers.q', a: 'helpAssistant.faq.research.suppliers.a' },
      { q: 'helpAssistant.faq.research.cost.q', a: 'helpAssistant.faq.research.cost.a' },
      { q: 'helpAssistant.faq.research.byok.q', a: 'helpAssistant.faq.research.byok.a' },
    ],
  },
  {
    match: '/app/settings',
    titleKey: 'helpAssistant.contexts.settings.title',
    faqs: [
      { q: 'helpAssistant.faq.settings.plan.q', a: 'helpAssistant.faq.settings.plan.a' },
      { q: 'helpAssistant.faq.settings.amazon.q', a: 'helpAssistant.faq.settings.amazon.a' },
      { q: 'helpAssistant.faq.settings.aiKey.q', a: 'helpAssistant.faq.settings.aiKey.a' },
    ],
  },
  {
    match: '/app/dashboard',
    titleKey: 'helpAssistant.contexts.dashboard.title',
    faqs: [
      { q: 'helpAssistant.faq.dashboard.firstProduct.q', a: 'helpAssistant.faq.dashboard.firstProduct.a' },
      { q: 'helpAssistant.faq.dashboard.kpis.q', a: 'helpAssistant.faq.dashboard.kpis.a' },
      { q: 'helpAssistant.faq.dashboard.amazon.q', a: 'helpAssistant.faq.dashboard.amazon.a' },
    ],
  },
  {
    // Activation / onboarding
    match: '/activate',
    titleKey: 'helpAssistant.contexts.onboarding.title',
    faqs: [
      { q: 'helpAssistant.faq.onboarding.help.q', a: 'helpAssistant.faq.onboarding.help.a' },
      { q: 'helpAssistant.faq.onboarding.skip.q', a: 'helpAssistant.faq.onboarding.skip.a' },
    ],
  },
  {
    match: 'default',
    titleKey: 'helpAssistant.contexts.default.title',
    faqs: [
      { q: 'helpAssistant.faq.dashboard.firstProduct.q', a: 'helpAssistant.faq.dashboard.firstProduct.a' },
      { q: 'helpAssistant.faq.import.formats.q', a: 'helpAssistant.faq.import.formats.a' },
      { q: 'helpAssistant.faq.research.asin.q', a: 'helpAssistant.faq.research.asin.a' },
      { q: 'helpAssistant.faq.settings.aiKey.q', a: 'helpAssistant.faq.settings.aiKey.a' },
    ],
  },
]

/** Pick the most specific HELP_CONTEXTS entry for a pathname. */
export function getHelpContext(pathname) {
  if (!pathname) return HELP_CONTEXTS[HELP_CONTEXTS.length - 1]
  for (const ctx of HELP_CONTEXTS) {
    if (ctx.match !== 'default' && pathname.startsWith(ctx.match)) return ctx
  }
  return HELP_CONTEXTS[HELP_CONTEXTS.length - 1]
}

/** Flat list of all FAQs across contexts — used by the search box. */
export function getAllFaqs() {
  const seen = new Set()
  const out = []
  for (const ctx of HELP_CONTEXTS) {
    for (const f of ctx.faqs) {
      if (seen.has(f.q)) continue
      seen.add(f.q)
      out.push(f)
    }
  }
  return out
}

export const SUPPORT_EMAIL = 'david@freedolia.com'
