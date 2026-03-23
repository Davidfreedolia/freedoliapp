/**
 * B4 — Single source of truth for persisted UI language (localStorage).
 * Canonical key: freedoliapp.lang
 */

export const APP_LANG_STORAGE_KEY = 'freedoliapp.lang'

/** @deprecated read-only migration */
const LEGACY_FREEDOLI_LANG = 'freedoli_lang'
/** @deprecated read-only migration (Settings typo / older builds) */
const LEGACY_FREEDOLIA_LANGUAGE = 'freedolia_language'

/** Supported UI locales today; extend (e.g. `fr`) when locale files ship — keep in sync with i18n `supportedLngs`. */
export const SUPPORTED_UI_LANGS = ['ca', 'en', 'es']
/** Product default when user has no stored preference (Catalan-first). */
export const DEFAULT_UI_LANG = 'ca'

/** Labels for the in-app selector (native names; not translated) */
export const UI_LANGUAGE_OPTIONS = [
  { code: 'ca', nativeName: 'Català' },
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
]

/**
 * @param {string | null | undefined} raw
 * @returns {'ca'|'en'|'es'|null}
 */
export function parseStoredLang(raw) {
  if (!raw || typeof raw !== 'string') return null
  const base = raw.split('-')[0].toLowerCase()
  return SUPPORTED_UI_LANGS.includes(base) ? base : null
}

/**
 * @param {string | undefined} lng
 * @returns {'ca'|'en'|'es'}
 */
export function normalizeLang(lng) {
  return parseStoredLang(lng) ?? DEFAULT_UI_LANG
}

/**
 * Initial language: canonical storage → legacy keys (migrate to canonical) → default ca.
 * No navigator / Accept-Language (explicit product default).
 */
export function resolveInitialLanguage() {
  try {
    const primary = localStorage.getItem(APP_LANG_STORAGE_KEY)
    const parsed = parseStoredLang(primary)
    if (parsed) return parsed
  } catch (_) {}

  for (const legacyKey of [LEGACY_FREEDOLI_LANG, LEGACY_FREEDOLIA_LANGUAGE]) {
    try {
      const raw = localStorage.getItem(legacyKey)
      const parsed = parseStoredLang(raw)
      if (parsed) {
        try {
          localStorage.setItem(APP_LANG_STORAGE_KEY, parsed)
        } catch (_) {}
        return parsed
      }
    } catch (_) {}
  }

  return DEFAULT_UI_LANG
}

/**
 * Persist UI language and drop legacy keys so only one source remains.
 * @param {string} lng
 */
export function persistLanguage(lng) {
  const n = normalizeLang(lng)
  try {
    localStorage.setItem(APP_LANG_STORAGE_KEY, n)
    localStorage.removeItem(LEGACY_FREEDOLI_LANG)
    localStorage.removeItem(LEGACY_FREEDOLIA_LANGUAGE)
  } catch (_) {}
}
