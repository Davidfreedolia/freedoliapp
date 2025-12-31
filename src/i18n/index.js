import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import caTranslations from './locales/ca.json'
import enTranslations from './locales/en.json'
import esTranslations from './locales/es.json'

// Detectar idioma desde localStorage o Supabase
const detectLanguage = async () => {
  // 1. Intentar desde localStorage
  const storedLang = localStorage.getItem('freedolia_language')
  if (storedLang && ['ca', 'en', 'es'].includes(storedLang)) {
    return storedLang
  }

  // 2. Intentar desde Supabase (company_settings o profiles)
  try {
    const { supabase } = await import('../lib/supabase')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Intentar desde company_settings
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('language')
        .single()
      
      if (companySettings?.language && ['ca', 'en', 'es'].includes(companySettings.language)) {
        return companySettings.language
      }

      // Intentar desde profiles (si existe)
      const { data: profile } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single()
      
      if (profile?.language && ['ca', 'en', 'es'].includes(profile.language)) {
        return profile.language
      }
    }
  } catch (err) {
    console.warn('Error detecting language from Supabase:', err)
  }

  // 3. Fallback a 'ca'
  return 'ca'
}

// Inicializar i18n
const initI18n = async () => {
  const detectedLang = await detectLanguage()

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ca: { translation: caTranslations },
        en: { translation: enTranslations },
        es: { translation: esTranslations }
      },
      lng: detectedLang,
      fallbackLng: 'ca',
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'freedolia_language'
      }
    })

  return i18n
}

// Inicializar inmediatamente
initI18n()

export default i18n

