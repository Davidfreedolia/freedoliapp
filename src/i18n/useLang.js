/**
 * PAS 5 — lang for billing UI. Default ca; no selector UI for now.
 */
import { useState, useCallback } from 'react'

const STORAGE_KEY = 'freedoli_lang'
const DEFAULT_LANG = 'ca'
const SUPPORTED = ['ca', 'en', 'es']

function getStoredLang() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s && SUPPORTED.includes(s)) return s
  } catch (_) {}
  return DEFAULT_LANG
}

export function useLang() {
  const [lang, setLangState] = useState(getStoredLang)
  const setLang = useCallback((l) => {
    if (!SUPPORTED.includes(l)) return
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch (_) {}
  }, [])
  return { lang, setLang }
}
