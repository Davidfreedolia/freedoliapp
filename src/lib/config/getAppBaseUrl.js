/**
 * P0.NEWUSER.REDIRECT — Single source of truth for auth redirect base URL.
 *
 * Contract:
 * - If VITE_APP_BASE_URL is set, use it (trim trailing slash).
 * - Else if production build, fall back to https://freedoliapp.com (never localhost).
 * - Else (dev), use window.location.origin.
 */
export function getAppBaseUrl() {
  const envUrl = (import.meta?.env?.VITE_APP_BASE_URL || '').toString().trim()
  if (envUrl) return envUrl.replace(/\/$/, '')

  if (import.meta?.env?.PROD) {
    return 'https://freedoliapp.com'
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://127.0.0.1:5173'
}

