/**
 * Frontend helpers for the three AI-powered tools:
 *   1. Listing Optimizer  — rewrites title/bullets/description for SEO+conversion.
 *   2. Keyword Research   — generates keyword report from seed term or ASIN.
 *   3. Refund Recovery    — scans imported settlement events for missed
 *                           reimbursements.
 *
 * Each invokes a Supabase edge function that resolves the org's BYOK AI
 * provider automatically (anthropic/openai/gemini/mistral/groq/ollama).
 */
import { supabase } from '../supabase'

/**
 * Optimize an Amazon listing.
 * @param {object} payload
 * @param {string} payload.marketplace — 'ES','US','UK','DE',...
 * @param {'ca'|'es'|'en'} payload.language
 * @param {{ title: string, bullets?: string[], description?: string, brand?: string, category?: string, keywords?: string[] }} payload.product
 */
export async function optimizeListing({ marketplace = 'ES', language = 'ca', product }) {
  if (!product?.title?.trim()) throw new Error('title_required')
  const { data, error } = await supabase.functions.invoke('ai-listing-optimizer', {
    body: { marketplace, language, product },
  })
  if (error) return { status: 'invoke_error', message: error.message || String(error) }
  return data
}

/**
 * Run a keyword research report.
 * @param {object} payload
 * @param {string} [payload.seed_term]
 * @param {string} [payload.seed_asin]
 * @param {string} [payload.marketplace='ES']
 * @param {'ca'|'es'|'en'} [payload.language='ca']
 */
export async function researchKeywords({ seed_term, seed_asin, marketplace = 'ES', language = 'ca' }) {
  if (!seed_term && !seed_asin) throw new Error('seed_required')
  const { data, error } = await supabase.functions.invoke('ai-keyword-research', {
    body: { seed_term, seed_asin, marketplace, language },
  })
  if (error) return { status: 'invoke_error', message: error.message || String(error) }
  return data
}

/**
 * Scan imported Amazon financial events for missed reimbursements.
 * @param {object} [payload]
 * @param {string} [payload.from_date='YYYY-MM-DD']
 * @param {string} [payload.to_date='YYYY-MM-DD']
 * @param {'ca'|'es'|'en'} [payload.language='ca']
 */
export async function scanRefundRecovery({ from_date, to_date, language = 'ca' } = {}) {
  const { data, error } = await supabase.functions.invoke('refund-recovery-scan', {
    body: { from_date, to_date, language },
  })
  if (error) return { status: 'invoke_error', message: error.message || String(error) }
  return data
}
