export function isScreenshotMode() {
  if (typeof window === 'undefined') return false

  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('screenshot') === 'true'
  } catch {
    return false
  }
}

