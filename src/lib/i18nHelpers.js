/**
 * Safe translation helper
 * Prevents showing raw keys or undefined when translation is missing
 * 
 * @param {string} key - Translation key
 * @param {string} fallback - Fallback text if key doesn't exist
 * @returns {string} Translated text or fallback
 */
import i18n from '../i18n'

export function tSafe(key, fallback) {
  try {
    const translated = i18n.t(key)
    // If translation returns the key itself, it means the key doesn't exist
    return translated !== key ? translated : fallback
  } catch (err) {
    console.warn(`[tSafe] Translation error for key "${key}":`, err)
    return fallback
  }
}

/**
 * Hook-based safe translation
 * Use this inside React components with useTranslation
 * 
 * Usage:
 * const { t } = useTranslation()
 * const tSafe = (key, fallback) => {
 *   try {
 *     const translated = t(key)
 *     return translated !== key ? translated : fallback
 *   } catch {
 *     return fallback
 *   }
 * }
 */

