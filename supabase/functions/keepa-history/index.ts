// keepa-history: fetches price + BSR history for an ASIN from Keepa.
//
// Why Keepa?
// ----------
// Keepa is the de-facto API for historical Amazon data (price, BSR,
// availability, rating, review count) covering all major marketplaces.
// Helium 10 and Jungle Scout pull from it indirectly. A $19/mo plan
// includes a token budget that's enough for ~3,000 ASIN lookups/month —
// plenty for a small-to-medium FBA SaaS.
//
// BYOC (Bring Your Own Connection) — the cost model:
//   1) If the org has connected its own Keepa account (tool_name='keepa'
//      in tool_connections), we use *their* token budget. Zero cost
//      to the platform. Great for power users who already pay for Keepa.
//   2) Else, if the platform has KEEPA_API_KEY env set, we use it as a
//      shared fallback (David's $19/mo subscription, gated to paid plans).
//   3) Else, the function returns a structured "not_connected" response so
//      the UI can show "Connect Keepa to see history" instead of erroring.
//
// Body shape:
//   { asin: 'B0XXXXXXXX', marketplace?: 'US'|'ES'|'DE'|... }
//
// Response:
//   { status: 'ok', source: 'user'|'system', history: {...} }
//   { status: 'not_connected' }
//   { status: 'rate_limited' | 'invalid_asin' | 'upstream_error', ... }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

// Keepa charges in "tokens" per call. A typical product lookup costs 1-7
// tokens. 30/min/user is plenty for casual research and shields the
// platform key from runaway scripts.
const keepaLimiter = rateLimit({
  id: 'keepa-history',
  capacity: 30,
  refillPerSecond: 1 / 2, // ~30/min refill
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const KEEPA_API_KEY = Deno.env.get('KEEPA_API_KEY') // platform fallback (optional)

// Map Freedoliapp marketplace codes → Keepa numeric domain codes.
const KEEPA_DOMAIN: Record<string, number> = {
  US: 1,
  UK: 2,
  DE: 3,
  FR: 4,
  CO: 5, // .co.jp would be 5 — kept commented; jp = 5 in Keepa
  JP: 5,
  CA: 6,
  CN: 7,
  IT: 8,
  ES: 9,
  IN: 10,
  MX: 11,
  BR: 12,
  AU: 13,
  NL: 14,
  SE: 15,
  PL: 16,
  TR: 17,
  AE: 18,
  SG: 19,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

interface KeepaConnection {
  apiKey: string
  source: 'user' | 'system'
}

async function resolveKeepaKey(
  supabaseUser: ReturnType<typeof createClient>,
  orgId: string | null,
): Promise<KeepaConnection | null> {
  // 1) User-configured key takes precedence. No cost to platform.
  if (orgId) {
    const { data: conns } = await supabaseUser
      .from('tool_connections')
      .select('credentials, status')
      .eq('org_id', orgId)
      .eq('tool_name', 'keepa')
      .eq('status', 'active')
      .limit(1)
    const userConn = Array.isArray(conns) && conns[0] ? conns[0] : null
    const userKey = userConn?.credentials?.api_key as string | undefined
    if (userKey && userKey.trim().length > 8) {
      return { apiKey: userKey.trim(), source: 'user' }
    }
  }
  // 2) Platform fallback (David's shared subscription).
  if (KEEPA_API_KEY && KEEPA_API_KEY.trim().length > 8) {
    return { apiKey: KEEPA_API_KEY.trim(), source: 'system' }
  }
  return null
}

/**
 * Keepa product endpoint returns a dense, packed structure. We normalize
 * it into something Freedoliapp's UI can render directly: arrays of
 * [timestamp, value] pairs.
 *
 * Keepa CSV columns we care about:
 *   0 = AMAZON price (the price Amazon itself shows)
 *   1 = NEW (new offer min)
 *   2 = USED
 *   3 = SALES rank (BSR)
 *   4 = LISTPRICE
 *  11 = NEW_FBM (FBA fulfillment offer)
 *  16 = RATING
 *  17 = COUNT_REVIEWS
 *
 * Each array is [keepaMinute, value, keepaMinute, value, ...].
 * keepaMinute is minutes since Keepa epoch (2011-01-01).
 * value is price in *cents* (so 2499 = €24.99); -1 means no data.
 */
function keepaMinuteToMillis(keepaMinute: number): number {
  // Keepa epoch: 2011-01-01 00:00 UTC
  const EPOCH_MS = Date.UTC(2011, 0, 1)
  return EPOCH_MS + keepaMinute * 60 * 1000
}

function unpackSeries(raw: number[] | undefined | null): Array<[number, number]> {
  if (!raw || raw.length < 2) return []
  const out: Array<[number, number]> = []
  for (let i = 0; i < raw.length; i += 2) {
    const m = raw[i]
    const v = raw[i + 1]
    if (typeof m !== 'number' || typeof v !== 'number') continue
    if (v === -1) continue // no data
    out.push([keepaMinuteToMillis(m), v])
  }
  return out
}

function normalizeProduct(product: Record<string, unknown> | null) {
  if (!product) return null
  const csv = (product.csv ?? []) as Array<number[] | null>
  const amazonPrice = unpackSeries(csv[0])
  const newPrice = unpackSeries(csv[1])
  const usedPrice = unpackSeries(csv[2])
  const salesRank = unpackSeries(csv[3])
  const newFbm = unpackSeries(csv[11])
  const rating = unpackSeries(csv[16])
  const reviewsCount = unpackSeries(csv[17])
  return {
    asin: product.asin,
    title: product.title,
    brand: product.brand,
    category: product.categoryTree,
    salesRankCategory: product.salesRankReference,
    series: {
      amazon_price: amazonPrice,    // [ts, cents]
      new_price: newPrice,
      used_price: usedPrice,
      new_fbm_price: newFbm,
      sales_rank: salesRank,        // [ts, bsr]
      rating: rating,               // [ts, rating*10] — Keepa stores rating × 10
      reviews_count: reviewsCount,  // [ts, count]
    },
    // Convenience snapshots (most recent non-null point in each series)
    snapshot: {
      amazon_price_cents: amazonPrice.length ? amazonPrice[amazonPrice.length - 1][1] : null,
      new_price_cents:    newPrice.length    ? newPrice[newPrice.length - 1][1]    : null,
      bsr:                salesRank.length   ? salesRank[salesRank.length - 1][1]  : null,
      rating:             rating.length      ? rating[rating.length - 1][1] / 10   : null,
      reviews_count:      reviewsCount.length ? reviewsCount[reviewsCount.length - 1][1] : null,
    },
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization') ?? ''
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    const ipGuard = keepaLimiter(`ip:${callerIp(req)}`)
    if (!ipGuard.allowed) return tooManyRequests(ipGuard, corsHeaders)
    return jsonResponse({ status: 'unauthorized' }, 401)
  }
  const userGuard = keepaLimiter(`user:${userData.user.id}`)
  if (!userGuard.allowed) return tooManyRequests(userGuard, corsHeaders)

  let body: { asin?: string; marketplace?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ status: 'invalid_body' }, 400)
  }

  const asin = String(body.asin || '').trim().toUpperCase()
  if (!/^B0[A-Z0-9]{8}$/.test(asin)) {
    return jsonResponse({ status: 'invalid_asin' }, 400)
  }
  const marketplace = String(body.marketplace || 'ES').toUpperCase()
  const domain = KEEPA_DOMAIN[marketplace] ?? KEEPA_DOMAIN.ES

  // Resolve org for BYOC lookup (first active membership).
  let orgId: string | null = null
  try {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle()
    orgId = membership?.org_id ?? null
  } catch {
    orgId = null
  }

  const conn = await resolveKeepaKey(supabase, orgId)
  if (!conn) {
    // No org BYOC key and no platform key configured. Return a clean
    // "not_connected" payload so the UI can show a connect-Keepa CTA.
    return jsonResponse({ status: 'not_connected' }, 200)
  }

  // Call Keepa /product. stats=180 → request 180 days of stats; history=1
  // → include the full CSV history arrays.
  const url = new URL('https://api.keepa.com/product')
  url.searchParams.set('key', conn.apiKey)
  url.searchParams.set('domain', String(domain))
  url.searchParams.set('asin', asin)
  url.searchParams.set('history', '1')
  url.searchParams.set('stats', '180')
  url.searchParams.set('offers', '20')

  let upstreamJson: Record<string, unknown>
  try {
    const res = await fetch(url.toString(), { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return jsonResponse(
        { status: 'upstream_error', code: res.status, message: text.slice(0, 200) },
        200,
      )
    }
    upstreamJson = await res.json()
  } catch (err) {
    return jsonResponse(
      { status: 'upstream_error', message: (err as Error).message },
      200,
    )
  }

  const products = Array.isArray((upstreamJson as { products?: unknown[] }).products)
    ? ((upstreamJson as { products: Record<string, unknown>[] }).products)
    : []
  const product = products[0] || null
  const normalized = normalizeProduct(product)

  return jsonResponse(
    {
      status: 'ok',
      source: conn.source,
      asin,
      marketplace,
      tokens_left: (upstreamJson as { tokensLeft?: number }).tokensLeft ?? null,
      data: normalized,
    },
    200,
  )
})
