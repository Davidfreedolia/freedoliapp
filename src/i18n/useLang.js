/**
 * UI language hook — aligned with i18next + `languageStorage` (canonical key `freedoliapp.lang`).
 * Catalan-first: unknown codes fall back via `normalizeLang` → `ca`.
 * Prefer `i18n.changeLanguage(code)` or `<AppLanguageControl />` for switches; persistence is automatic.
 */
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeLang, SUPPORTED_UI_LANGS } from './languageStorage'

export function useLang() {
  const { i18n } = useTranslation()
  const lang = useMemo(
    () => normalizeLang(i18n.resolvedLanguage || i18n.language),
    [i18n.resolvedLanguage, i18n.language]
  )

  const setLang = useCallback(
    (l) => {
      if (!SUPPORTED_UI_LANGS.includes(l)) return
      i18n.changeLanguage(l)
    },
    [i18n]
  )

  return { lang, setLang }
}
