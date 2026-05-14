// Content script — runs on every amazon.* page (see manifest matches).
// Detects product pages, scrapes basic info, and injects a small floating
// action button so users can send the ASIN to Freedoliapp with one click.
//
// We can't import ES modules here (Chrome content scripts don't get module
// support unless we register them as such, which complicates injection).
// So this file is self-contained.

;(() => {
  'use strict'

  // ────────────────────────────────────────────────────────────────────────
  // Inlined helpers (mirrors lib/amazon.js — keep them in sync if you edit)
  // ────────────────────────────────────────────────────────────────────────
  const MARKETPLACE_BY_HOST = {
    'www.amazon.com': 'US',
    'www.amazon.es': 'ES',
    'www.amazon.de': 'DE',
    'www.amazon.fr': 'FR',
    'www.amazon.it': 'IT',
    'www.amazon.co.uk': 'UK',
    'www.amazon.nl': 'NL',
    'www.amazon.pl': 'PL',
    'www.amazon.se': 'SE',
    'www.amazon.com.mx': 'MX',
    'www.amazon.ca': 'CA',
    'www.amazon.com.br': 'BR',
  }

  function detectAsinFromUrl(url) {
    if (!url) return null
    const patterns = [
      /\/dp\/(B0[A-Z0-9]{8})(?:[\/?]|$)/i,
      /\/gp\/product\/(B0[A-Z0-9]{8})(?:[\/?]|$)/i,
      /\/gp\/aw\/d\/(B0[A-Z0-9]{8})(?:[\/?]|$)/i,
      /[?&]asin=(B0[A-Z0-9]{8})(?:&|$)/i,
    ]
    for (const re of patterns) {
      const m = url.match(re)
      if (m && m[1]) return m[1].toUpperCase()
    }
    return null
  }

  function extractProductInfo() {
    const $ = (sel) => document.querySelector(sel)
    const text = (sel) => {
      const el = $(sel)
      return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''
    }
    const title = text('#productTitle') || text('#title') || ''
    const priceCandidates = [
      '.a-price[data-a-color="base"] .a-offscreen',
      '#corePrice_feature_div .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-price .a-offscreen',
    ]
    let priceText = ''
    for (const sel of priceCandidates) {
      priceText = text(sel)
      if (priceText) break
    }
    return { title, priceText }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Main
  // ────────────────────────────────────────────────────────────────────────
  const BUTTON_ID = 'freedoliapp-fab'
  const STORAGE_KEY = 'freedoliappBaseUrl'
  const DEFAULT_BASE_URL = 'https://freedoliapp.com'

  /** Pull the configured baseUrl from chrome.storage (devs may override). */
  function readBaseUrl() {
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

  function buildResearchUrl({ baseUrl, asin, marketplace, description }) {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/app/research`)
    if (asin) url.searchParams.set('asin', asin)
    if (marketplace) url.searchParams.set('marketplace', marketplace)
    if (description) url.searchParams.set('description', description)
    url.searchParams.set('autostart', '1')
    url.searchParams.set('source', 'chrome-extension')
    return url.toString()
  }

  function mountButton({ asin, marketplace, baseUrl }) {
    // Avoid duplicates if the script runs again (SPA navigation, etc.)
    const existing = document.getElementById(BUTTON_ID)
    if (existing) existing.remove()

    const btn = document.createElement('button')
    btn.id = BUTTON_ID
    btn.setAttribute('type', 'button')
    btn.setAttribute('aria-label', 'Enviar a Freedoliapp')
    btn.innerHTML = `
      <span class="freedoliapp-fab__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </span>
      <span class="freedoliapp-fab__label">Recerca Freedoliapp</span>
      <span class="freedoliapp-fab__sub">${asin}</span>
    `

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const { title, priceText } = extractProductInfo()
      const description = title ? `${title}${priceText ? ` (${priceText})` : ''}` : ''
      const target = buildResearchUrl({ baseUrl, asin, marketplace, description })
      window.open(target, '_blank', 'noopener,noreferrer')
    })

    document.body.appendChild(btn)
  }

  /** Re-evaluate on SPA-style URL changes (Amazon uses pushState). */
  function watchForUrlChanges(handler) {
    let lastUrl = location.href
    const tick = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        handler()
      }
    }
    // Catch pushState / replaceState
    const orig = { push: history.pushState, replace: history.replaceState }
    history.pushState = function () { orig.push.apply(this, arguments); tick() }
    history.replaceState = function () { orig.replace.apply(this, arguments); tick() }
    window.addEventListener('popstate', tick)
    // Belt and suspenders: poll every 1.5s in case Amazon does something weird
    setInterval(tick, 1500)
  }

  async function evaluate() {
    const asin = detectAsinFromUrl(location.href)
    if (!asin) {
      const stale = document.getElementById(BUTTON_ID)
      if (stale) stale.remove()
      return
    }
    const marketplace = MARKETPLACE_BY_HOST[location.hostname] || 'ES'
    const baseUrl = await readBaseUrl()
    mountButton({ asin, marketplace, baseUrl })
  }

  // Allow the popup to ask us for product info on demand.
  chrome.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'GET_PRODUCT_INFO') {
      try {
        sendResponse(extractProductInfo())
      } catch (err) {
        sendResponse({ title: '', priceText: '', error: String(err) })
      }
      return true
    }
    return false
  })

  // First pass
  evaluate()
  watchForUrlChanges(evaluate)
})()
