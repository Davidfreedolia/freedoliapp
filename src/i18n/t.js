/**
 * DEPRECATED (D8.3.1) — wrapper temporal per a BillingLocked/BillingOverSeat.
 * NO utilitzar en codi nou; fer servir i18next (`useTranslation`) i els JSON de `locales/`.
 *
 * PAS 5 — t(lang, key, vars?). Fallback to en; missing key returns key; simple {var} interpolation.
 */
import { en, ca, es } from './messages.js'

const messages = { en, ca, es }

export function t(lang, key, vars = {}) {
  const locale = messages[lang] || messages.en
  let str = locale[key] ?? messages.en[key] ?? key
  Object.keys(vars).forEach((k) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
  })
  return str
}
