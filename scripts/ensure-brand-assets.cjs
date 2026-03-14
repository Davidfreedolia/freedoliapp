/**
 * Ensures all FREEDOLIAPP brand asset URLs referenced by the app exist on disk.
 * If a file is missing, writes a minimal valid 1x1 PNG so the app never 404s.
 * Does NOT overwrite existing files — replace those with final artwork in place.
 * Canonical paths: see public/brand/freedoliapp/README.md
 * Run: node scripts/ensure-brand-assets.cjs
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'public')

// Minimal valid 1x1 PNG (transparent) – temporary fallback so URLs do not 404
const MINIMAL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const MINIMAL_PNG = Buffer.from(MINIMAL_PNG_BASE64, 'base64')

const ASSETS = [
  'brand/freedoliapp/favicons/favicon_16.png',
  'brand/freedoliapp/favicons/favicon_32.png',
  'brand/freedoliapp/favicons/favicon_48.png',
  'brand/freedoliapp/favicons/favicon_64.png',
  'brand/freedoliapp/icons/app_icon_256.png',
  'brand/freedoliapp/logo/wordmark.png',
  'brand/freedoliapp/logo/logo_master.png',
  'brand/freedoliapp/logo/symbol_left.png',
]

ASSETS.forEach((relativePath) => {
  const absolutePath = path.join(ROOT, relativePath)
  const dir = path.dirname(absolutePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(absolutePath)) {
    fs.writeFileSync(absolutePath, MINIMAL_PNG)
    console.log('Created (temporary fallback):', relativePath)
  } else {
    console.log('Exists:', relativePath)
  }
})

// Root static files requested by browsers/crawlers (must exist so Vercel serves them, not SPA)
const faviconSrc = path.join(ROOT, 'brand/freedoliapp/favicons/favicon_32.png')
const appleTouchSrc = path.join(ROOT, 'brand/freedoliapp/icons/app_icon_256.png')
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(ROOT, 'favicon.ico'))
  console.log('Root: favicon.ico (from canonical favicon_32.png)')
}
if (fs.existsSync(appleTouchSrc)) {
  fs.copyFileSync(appleTouchSrc, path.join(ROOT, 'apple-touch-icon.png'))
  console.log('Root: apple-touch-icon.png (from canonical app_icon_256.png)')
}

console.log('Done.')
