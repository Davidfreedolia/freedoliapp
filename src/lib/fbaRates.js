/**
 * fbaRates.js — Amazon EU FBA fee schedule 2024
 *
 * Sources: Amazon Seller Central EU rate cards (DE as primary reference).
 * Fees are per-unit, in EUR. Update `STANDARD_BRACKETS` and `OVERSIZE_BRACKETS`
 * when Amazon publishes new rates.
 *
 * Usage:
 *   import { computeFbaFee, REFERRAL_RATES, classifySizeTier } from './fbaRates'
 *   const { fulfillmentFee, sizeTier } = computeFbaFee({ weightG: 350, lengthCm: 30, widthCm: 20, heightCm: 5 })
 *   const referralFee = computeReferralFee(sellingPrice, 'home')
 */

// ── Size tier thresholds ────────────────────────────────────────────────────

/** Max dimensions (cm) for small-standard (longest + girth). */
const SMALL_STANDARD_MAX = { length: 35, width: 25, height: 12, weightG: 400 }
/** Max dimensions for standard (large standard is anything beyond small-standard up to these limits). */
const STANDARD_MAX = { length: 45, width: 34, height: 26, weightG: 9000 }

/**
 * Classify a product into a size tier.
 * @param {{ weightG: number, lengthCm: number, widthCm: number, heightCm: number }} dims
 * @returns {'small_standard' | 'standard' | 'oversize'}
 */
export function classifySizeTier({ weightG = 0, lengthCm = 0, widthCm = 0, heightCm = 0 }) {
  const dims = [lengthCm, widthCm, heightCm].sort((a, b) => b - a)
  const [l, w, h] = dims
  if (
    l <= SMALL_STANDARD_MAX.length &&
    w <= SMALL_STANDARD_MAX.width &&
    h <= SMALL_STANDARD_MAX.height &&
    weightG <= SMALL_STANDARD_MAX.weightG
  ) {
    return 'small_standard'
  }
  if (
    l <= STANDARD_MAX.length &&
    w <= STANDARD_MAX.width &&
    h <= STANDARD_MAX.height &&
    weightG <= STANDARD_MAX.weightG
  ) {
    return 'standard'
  }
  return 'oversize'
}

// ── Standard fulfillment fee brackets (EU 2024) ─────────────────────────────
// Each entry: [maxWeightG, fee]. Sorted ascending.
// Applies to both small_standard and standard tiers.

const STANDARD_BRACKETS = [
  [100,   3.22],
  [200,   3.43],
  [300,   3.64],
  [400,   3.85],
  [500,   4.16],
  [600,   4.46],
  [700,   4.76],
  [800,   5.06],
  [900,   5.36],
  [1000,  5.66],
  [1500,  5.96],
  [2000,  6.86],
  [3000,  7.64],
  [4000,  8.54],
  [5000,  9.44],
  [6000, 10.34],
  [7000, 11.24],
  [8000, 12.14],
  [9000, 13.04],
]

// ── Oversize fulfillment fee brackets (EU 2024) ──────────────────────────────
// Base fee + per-kg rate over threshold.

const OVERSIZE_TIERS = [
  {
    label: 'small_oversize',
    maxWeightG: 15_000,
    baseFee: 8.77,
    baseWeightG: 1000,
    perKgOver: 0.39,
  },
  {
    label: 'medium_oversize',
    maxWeightG: 30_000,
    baseFee: 14.05,
    baseWeightG: 1000,
    perKgOver: 0.43,
  },
  {
    label: 'large_oversize',
    maxWeightG: 70_000,
    baseFee: 24.44,
    baseWeightG: 1000,
    perKgOver: 0.52,
  },
  {
    label: 'special_oversize',
    maxWeightG: Infinity,
    baseFee: 158.00,
    baseWeightG: 1000,
    perKgOver: 0.52,
  },
]

// ── Monthly storage fee (per cubic meter, EU 2024) ──────────────────────────

export const STORAGE_FEE_PER_CUBIC_M = {
  jan_sep: 26.00,
  oct_dec: 34.00,
}

// ── Referral rates by category (EU 2024) ────────────────────────────────────
// Minimum referral fee: €0.30

export const REFERRAL_RATES = {
  electronics:       { label: 'Electrònica',           rate: 0.08 },
  computers:         { label: 'Informàtica',            rate: 0.07 },
  home:              { label: 'Llar i cuina',           rate: 0.15 },
  sports:            { label: 'Esports i outdoors',     rate: 0.15 },
  beauty:            { label: 'Bellesa i cosmètica',    rate: 0.08 },
  health:            { label: 'Salut i cura personal',  rate: 0.08 },
  clothing:          { label: 'Roba i moda',            rate: 0.15 },
  shoes:             { label: 'Calçat',                 rate: 0.15 },
  toys:              { label: 'Joguines i jocs',        rate: 0.15 },
  baby:              { label: 'Bebè',                   rate: 0.15 },
  tools:             { label: 'Eines i bricolatge',     rate: 0.12 },
  automotive:        { label: 'Automoció',              rate: 0.12 },
  pet:               { label: 'Mascotes',               rate: 0.15 },
  food:              { label: 'Alimentació',             rate: 0.08 },
  books:             { label: 'Llibres',                rate: 0.15 },
  music_video:       { label: 'Música i vídeo',         rate: 0.15 },
  luggage:           { label: 'Equipatge',              rate: 0.15 },
  office:            { label: 'Oficina',                rate: 0.15 },
  garden:            { label: 'Jardí i exterior',       rate: 0.15 },
  other:             { label: 'Altres',                 rate: 0.15 },
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the FBA fulfillment fee for a product.
 * @param {{ weightG: number, lengthCm?: number, widthCm?: number, heightCm?: number }} input
 * @returns {{ fulfillmentFee: number, sizeTier: string }}
 */
export function computeFbaFee({ weightG = 0, lengthCm = 0, widthCm = 0, heightCm = 0 }) {
  const sizeTier = classifySizeTier({ weightG, lengthCm, widthCm, heightCm })

  if (sizeTier === 'small_standard' || sizeTier === 'standard') {
    const bracket = STANDARD_BRACKETS.find(([max]) => weightG <= max)
    const fulfillmentFee = bracket ? bracket[1] : STANDARD_BRACKETS[STANDARD_BRACKETS.length - 1][1]
    return { fulfillmentFee, sizeTier }
  }

  // Oversize
  const tier = OVERSIZE_TIERS.find((t) => weightG <= t.maxWeightG) || OVERSIZE_TIERS[OVERSIZE_TIERS.length - 1]
  const overKg = Math.max(0, (weightG - tier.baseWeightG) / 1000)
  const fulfillmentFee = tier.baseFee + overKg * tier.perKgOver
  return { fulfillmentFee: Math.round(fulfillmentFee * 100) / 100, sizeTier: tier.label }
}

/**
 * Compute the referral fee for a selling price and category.
 * @param {number} sellingPrice
 * @param {string} categoryKey — key from REFERRAL_RATES
 * @returns {number} referral fee in EUR
 */
export function computeReferralFee(sellingPrice, categoryKey = 'other') {
  const cat = REFERRAL_RATES[categoryKey] || REFERRAL_RATES.other
  return Math.max(sellingPrice * cat.rate, 0.30)
}

/**
 * Full cost breakdown for a product.
 * @param {{
 *   sellingPrice: number,
 *   cogs: number,
 *   weightG: number,
 *   lengthCm: number,
 *   widthCm: number,
 *   heightCm: number,
 *   categoryKey: string
 * }} input
 * @returns {{
 *   fulfillmentFee: number,
 *   referralFee: number,
 *   totalCosts: number,
 *   netProfit: number,
 *   marginPct: number,
 *   roi: number,
 *   sizeTier: string
 * }}
 */
export function computeFullCostBreakdown({
  sellingPrice = 0,
  cogs = 0,
  weightG = 0,
  lengthCm = 0,
  widthCm = 0,
  heightCm = 0,
  categoryKey = 'other',
}) {
  const { fulfillmentFee, sizeTier } = computeFbaFee({ weightG, lengthCm, widthCm, heightCm })
  const referralFee = computeReferralFee(sellingPrice, categoryKey)
  const totalCosts = cogs + fulfillmentFee + referralFee
  const netProfit = sellingPrice - totalCosts
  const marginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0
  const roi = cogs > 0 ? (netProfit / cogs) * 100 : 0

  return {
    fulfillmentFee: Math.round(fulfillmentFee * 100) / 100,
    referralFee: Math.round(referralFee * 100) / 100,
    totalCosts: Math.round(totalCosts * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
    roi: Math.round(roi * 10) / 10,
    sizeTier,
  }
}
