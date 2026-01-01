import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import caTranslations from './locales/ca.json'
import enTranslations from './locales/en.json'
import esTranslations from './locales/es.json'

// Detectar idioma desde localStorage (síncrono para inicialización rápida)
const detectLanguage = () => {
  const storedLang = localStorage.getItem('freedolia_language')
  if (storedLang && ['ca', 'en', 'es'].includes(storedLang)) {
    return storedLang
  }
  return 'ca'
}

// Inicializar i18n (síncrono)
// Assegurar que i18n estigui inicialitzat abans de qualsevol ús
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ca: { translation: caTranslations },
        en: { translation: enTranslations },
        es: { translation: esTranslations }
      },
      lng: detectLanguage(),
      fallbackLng: 'ca',
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'freedolia_language'
      },
      react: {
        useSuspense: false // Evitar Suspense per evitar errors amb lazy loading
      }
    })
}

export default i18n

