/**
 * i18n bootstrap — Catalan-first (Track B).
 * - Canonical copy lives in `locales/ca.json`; es/en are translations of the same keys.
 * - Runtime language: `resolveInitialLanguage()` → localStorage `freedoliapp.lang` (see languageStorage.js).
 * - Default when nothing stored: Catalan (`ca`). No navigator-based auto-switch.
 * - User changes: `i18n.changeLanguage()` → `languageChanged` → `persistLanguage()` (single write path).
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import caTranslations from './locales/ca.json'
import enTranslations from './locales/en.json'
import esTranslations from './locales/es.json'
import { resolveInitialLanguage, persistLanguage, DEFAULT_UI_LANG } from './languageStorage'

if (!i18n.isInitialized) {
  const initialLng = resolveInitialLanguage()

  i18n.use(initReactI18next).init({
    resources: {
      ca: { translation: caTranslations },
      en: { translation: enTranslations },
      es: { translation: esTranslations },
    },
    lng: initialLng,
    fallbackLng: DEFAULT_UI_LANG,
    supportedLngs: ['ca', 'en', 'es'],
    load: 'languageOnly',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
    },
  })

  persistLanguage(i18n.language)

  i18n.on('languageChanged', (lng) => {
    persistLanguage(lng)
  })
}

export default i18n
