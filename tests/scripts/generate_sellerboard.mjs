// Generate tests/fixtures/sellerboard_500.csv — 500 rows of realistic EU-format
// Sellerboard export. Run once:  node tests/scripts/generate_sellerboard.mjs

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'fixtures', 'sellerboard_500.csv')

const PRODUCTS = [
  { asin: 'B0CX23WVMB', sku: 'ORG-BAMBOO-01',     title: 'Organizador Cajones Bambu 8 Compartimentos', price: 29.99, cogs: 6.80,  fba: 3.20 },
  { asin: 'B0DFG8KNTJ', sku: 'KITCHEN-SILICONE-01', title: 'Juego Utensilios Silicona Cocina 12 uds',    price: 24.90, cogs: 5.20,  fba: 3.10 },
  { asin: 'B0BTGFK1QR', sku: 'YOGA-MAT-01',       title: 'Esterilla Yoga TPE 6mm Eco-Friendly',         price: 34.99, cogs: 7.50,  fba: 4.00 },
  { asin: 'B0CM5JFG9Z', sku: 'BANDS-01',          title: 'Bandas Resistencia 5 Niveles',                price: 19.99, cogs: 3.80,  fba: 2.50 },
  { asin: 'B0DJKP2QTX', sku: 'USB-CABLE-01',      title: 'Cable USB-C Trenzado 2m Pack 3',              price: 15.99, cogs: 2.40,  fba: 2.70 },
  { asin: 'B0CRV7KLMN', sku: 'DIFFUSER-01',       title: 'Difusor Aromaterapia 500ml LED',              price: 29.99, cogs: 8.20,  fba: 3.30 },
  { asin: 'B0DNT4WXYZ', sku: 'STAND-01',          title: 'Soporte Portatil Aluminio Ajustable',         price: 32.50, cogs: 9.10,  fba: 3.80 },
  { asin: 'B0DPQ6RABM', sku: 'CUTTING-BOARD-01',  title: 'Tabla Cortar Bambu 3 Piezas',                 price: 27.90, cogs: 6.00,  fba: 3.10 },
]

const MARKETPLACES = ['ES', 'DE', 'IT', 'FR']
const MP_WEIGHTS =  [0.45, 0.30, 0.15, 0.10]

function pickMarketplace() {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < MP_WEIGHTS.length; i++) {
    acc += MP_WEIGHTS[i]
    if (r <= acc) return MARKETPLACES[i]
  }
  return 'ES'
}

// EU format: 1.234,56 — comma decimal, dot thousands separator.
function eu(n) {
  const fixed = n.toFixed(2)
  const [int, dec] = fixed.split('.')
  const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withThousands},${dec}`
}

// ISO-ish date within last 180 days.
function randomDate() {
  const now = new Date()
  const offset = Math.floor(Math.random() * 180)
  const d = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

// Header — 15 columns typical of Sellerboard export.
const HEADER = [
  'Date', 'ASIN', 'SKU', 'Product', 'Marketplace',
  'Units', 'Sales', 'Amazon Fees', 'FBA Fees', 'Refunds',
  'PPC Spend', 'COGS', 'Gross Profit', 'Net Profit', 'Margin %'
]

const rows = [HEADER.join(';')]
for (let i = 0; i < 500; i++) {
  const p = PRODUCTS[i % PRODUCTS.length]
  const mp = pickMarketplace()
  const units = Math.floor(Math.random() * 12) + 1
  const sales = p.price * units
  const amazonFees = sales * 0.15
  const fbaFees = p.fba * units
  const refunds = Math.random() < 0.04 ? sales * 0.2 : 0
  const ppc = Math.random() * (sales * 0.12)
  const cogs = p.cogs * units
  const gross = sales - amazonFees - fbaFees - refunds
  const net = gross - ppc - cogs
  const margin = sales > 0 ? (net / sales) * 100 : 0

  rows.push([
    randomDate(),
    p.asin,
    `${p.sku}-${mp}`,
    `"${p.title}"`,
    mp,
    units,
    eu(sales),
    eu(amazonFees),
    eu(fbaFees),
    eu(refunds),
    eu(ppc),
    eu(cogs),
    eu(gross),
    eu(net),
    eu(margin),
  ].join(';'))
}

writeFileSync(OUT, rows.join('\n'), 'utf8')
console.log(`Wrote ${rows.length - 1} rows to ${OUT}`)
