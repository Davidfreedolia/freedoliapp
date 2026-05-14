// Background service worker (Manifest V3).
//
// Today it's mostly a no-op: the v0.1 flow opens freedoliapp.com directly
// from the content script and the popup. The worker is still useful as a
// place to:
//
//   - Centralize authentication once we add Supabase login from the popup
//     (Manifest V3 service workers can call fetch() and persist tokens via
//     chrome.storage.local).
//   - Handle chrome.contextMenus entries (right-click → "Save ASIN").
//   - Listen for tab updates so we can light up the toolbar icon only on
//     Amazon product pages.
//
// Keeping the worker registered means the extension is ready to grow without
// a manifest change.

const DEFAULT_BASE_URL = 'https://freedoliapp.com'
const STORAGE_KEY = 'freedoliappBaseUrl'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.get([STORAGE_KEY], (res) => {
      if (!res?.[STORAGE_KEY]) {
        chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_BASE_URL })
      }
    })
  }
})

// Toolbar icon active state — visually fades on non-Amazon tabs.
function isAmazonProductUrl(url) {
  if (!url) return false
  return /^https:\/\/www\.amazon\.[a-z.]+\/(?:dp|gp\/product|gp\/aw\/d)\/B0[A-Z0-9]{8}/i.test(url)
}

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== 'complete') return
  const active = isAmazonProductUrl(tab.url)
  try {
    chrome.action.setBadgeText({ tabId, text: active ? '•' : '' })
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6ECBC3' })
  } catch {
    /* tab might be gone */
  }
})
