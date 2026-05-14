// Popup logic — runs when the user clicks the toolbar icon.
//
// Reads the active tab; if it's an Amazon product URL, extracts the ASIN
// and shows quick actions ("Investigar amb IA" / "Crear projecte"). The
// "Crear projecte" action is a stub today — it opens the New Project flow
// on freedoliapp.com with the ASIN prefilled. Once we expose a dedicated
// API endpoint we can switch to a direct POST.

import {
  MARKETPLACE_BY_HOST,
  detectAsinFromUrl,
  buildResearchUrl,
  DEFAULT_BASE_URL,
} from '../lib/amazon.js'

const STORAGE_KEY = 'freedoliappBaseUrl'

async function readBaseUrl() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get([STORAGE_KEY], (res) => {
        resolve(res?.[STORAGE_KEY] || DEFAULT_BASE_URL)
      })
    } catch {
      resolve(DEFAULT_BASE_URL)
    }
  })
}

async function readActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null)
    })
  })
}

/**
 * Ask the content script (running inside the active tab) to scrape the
 * product info. We do this from the popup so we don't have to grant the
 * tabs+scripting permission upfront. The content script broadcasts its
 * findings via chrome.runtime.sendMessage when asked.
 *
 * If anything fails — e.g. the tab is not Amazon, or the script hasn't
 * loaded yet — we degrade gracefully to "ASIN only".
 */
async function askContentForProductInfo(tabId) {
  try {
    return await new Promise((resolve) => {
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          resolve(null)
        }
      }, 800)

      chrome.tabs.sendMessage(tabId, { type: 'GET_PRODUCT_INFO' }, (res) => {
        clearTimeout(timer)
        if (settled) return
        settled = true
        if (chrome.runtime.lastError) {
          resolve(null)
        } else {
          resolve(res || null)
        }
      })
    })
  } catch {
    return null
  }
}

function openInNewTab(url) {
  chrome.tabs.create({ url })
}

async function render() {
  const versionEl = document.getElementById('version')
  versionEl.textContent = 'v' + (chrome.runtime.getManifest().version || '0')

  const tab = await readActiveTab()
  const url = tab?.url || ''
  const asin = detectAsinFromUrl(url)
  const host = (() => { try { return new URL(url).hostname } catch { return '' } })()
  const marketplace = MARKETPLACE_BY_HOST[host] || null

  if (!asin) {
    document.getElementById('state-empty').hidden = false
    return
  }

  const productInfo = await askContentForProductInfo(tab.id)
  const baseUrl = await readBaseUrl()

  document.getElementById('state-product').hidden = false
  document.getElementById('asin-value').textContent = asin
  document.getElementById('marketplace-value').textContent = marketplace || 'ES'

  const titleEl = document.getElementById('title-value')
  const priceEl = document.getElementById('price-value')
  titleEl.textContent = productInfo?.title || 'Sense títol detectat'
  if (productInfo?.priceText) {
    priceEl.textContent = productInfo.priceText
    priceEl.hidden = false
  }

  const description = productInfo?.title
    ? `${productInfo.title}${productInfo.priceText ? ` (${productInfo.priceText})` : ''}`
    : ''

  document.getElementById('btn-research').addEventListener('click', () => {
    const target = buildResearchUrl({ baseUrl, asin, marketplace, description })
    openInNewTab(target)
    window.close()
  })

  document.getElementById('btn-project').addEventListener('click', () => {
    // V0.1: send to the projects "new" flow with the ASIN prefilled via
    // the same query-string convention as Research.
    const u = new URL(`${baseUrl.replace(/\/$/, '')}/app/projects`)
    u.searchParams.set('newAsin', asin)
    if (marketplace) u.searchParams.set('marketplace', marketplace)
    if (description) u.searchParams.set('newDescription', description)
    u.searchParams.set('source', 'chrome-extension')
    openInNewTab(u.toString())
    window.close()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  render().catch((err) => {
    console.error('[freedoliapp popup] render failed', err)
    document.getElementById('state-empty').hidden = false
  })
})
