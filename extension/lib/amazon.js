// Shared helpers for extracting product info from Amazon product pages.
// Used by content.js (running on amazon.* tabs) and the popup.

// Maps amazon.* hostnames to the marketplace code Freedoliapp uses.
export const MARKETPLACE_BY_HOST = {
  'www.amazon.com':    'US',
  'www.amazon.es':     'ES',
  'www.amazon.de':     'DE',
  'www.amazon.fr':     'FR',
  'www.amazon.it':     'IT',
  'www.amazon.co.uk':  'UK',
  'www.amazon.nl':     'NL',
  'www.amazon.pl':     'PL',
  'www.amazon.se':     'SE',
  'www.amazon.com.mx': 'MX',
  'www.amazon.ca':     'CA',
  'www.amazon.com.br': 'BR',
}

/**
 * Try every known Amazon URL/page pattern to extract a valid B0XXXXXXXX ASIN.
 * Returns null if nothing valid is found.
 */
export function detectAsinFromUrl(url) {
  if (!url) return null
  // /dp/B0XXXXXXXX/...
  // /gp/product/B0XXXXXXXX/...
  // /gp/aw/d/B0XXXXXXXX
  // ?asin=B0XXXXXXXX
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

/**
 * Pull title, price, image, BSR, brand and rating out of an Amazon product
 * page. All fields are best-effort — a missing field returns "" or null,
 * never throws.
 *
 * Selectors are intentionally conservative and only run inside an Amazon
 * product page (content script is gated by URL match in manifest.json).
 */
export function extractProductInfo(doc = document) {
  const $ = (sel) => doc.querySelector(sel)

  const text = (sel) => {
    const el = $(sel)
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''
  }

  const title = text('#productTitle') || text('#title') || ''

  // Price: try several selectors. Amazon A/B tests these constantly.
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
  const priceNumeric = (() => {
    if (!priceText) return null
    // "€24,99" / "$24.99" / "24,99 €"
    const cleaned = priceText
      .replace(/[^\d,.\-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '') // strip thousand-separator dots
      .replace(',', '.')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  })()

  // Currency: derive from price text symbols
  const currency = (() => {
    if (!priceText) return null
    if (priceText.includes('€')) return 'EUR'
    if (priceText.includes('$')) return 'USD'
    if (priceText.includes('£')) return 'GBP'
    if (priceText.includes('¥')) return 'JPY'
    return null
  })()

  // Main image (high-res when possible)
  const imgEl = $('#landingImage') || $('#imgBlkFront') || $('#main-image')
  const image =
    imgEl?.getAttribute('data-old-hires') ||
    imgEl?.getAttribute('data-a-dynamic-image')?.match(/https:\/\/[^"]+\.(?:jpg|png|webp)/i)?.[0] ||
    imgEl?.src ||
    ''

  // Best Sellers Rank: shows up in different places per category.
  const bsr = (() => {
    // Try the product-details list rows ("Best Sellers Rank: #1,234 in Category")
    const rows = doc.querySelectorAll(
      '#productDetails_detailBullets_sections1 tr, #detailBulletsWrapper_feature_div li, #productDetails_db_sections tr'
    )
    for (const row of rows) {
      const t = row.textContent || ''
      if (/best\s+sellers\s+rank|n[ºo]\.?\s*ranking|best\s+sellers/i.test(t)) {
        const m = t.match(/#?([\d.,]+)/)
        if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10) || null
      }
    }
    return null
  })()

  // Brand (varies a lot per category)
  const brand =
    text('#bylineInfo')
      .replace(/^(Visit\s+the\s+|Brand:\s*|Marca:\s*|Visita\s+la\s+Store\s+de\s+)/i, '')
      .replace(/\s+(Store|Brand)$/i, '') ||
    text('a#bylineInfo') ||
    ''

  // Star rating ("4.5 de 5 estrellas")
  const ratingText = text('#acrPopover [title]') || $('#acrPopover')?.getAttribute('title') || ''
  const ratingNumeric = (() => {
    if (!ratingText) return null
    const m = ratingText.match(/(\d[.,]\d)/)
    return m ? parseFloat(m[1].replace(',', '.')) : null
  })()

  // Number of reviews
  const reviewsText = text('#acrCustomerReviewText')
  const reviewsCount = (() => {
    if (!reviewsText) return null
    const m = reviewsText.match(/[\d.,]+/)
    return m ? parseInt(m[0].replace(/[.,]/g, ''), 10) || null : null
  })()

  return {
    title,
    priceText,
    priceNumeric,
    currency,
    image,
    bsr,
    brand,
    rating: ratingNumeric,
    reviewsCount,
  }
}

/**
 * Build the deep-link URL that opens the Freedoliapp Research page with
 * the captured ASIN prefilled. `baseUrl` is configurable so the same
 * extension can target dev / staging during testing.
 */
export function buildResearchUrl({ baseUrl, asin, marketplace, description }) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/app/research`)
  if (asin) url.searchParams.set('asin', asin)
  if (marketplace) url.searchParams.set('marketplace', marketplace)
  if (description) url.searchParams.set('description', description)
  url.searchParams.set('autostart', '1')
  url.searchParams.set('source', 'chrome-extension')
  return url.toString()
}

export const DEFAULT_BASE_URL = 'https://freedoliapp.com'
