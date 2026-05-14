// ai-keyword-research: generates a keyword research report for an Amazon
// product given either a seed ASIN, a seed term or both. Combines the org's
// BYOK AI provider with Amazon's autocomplete suggestions for a cheap-but-
// effective Cerebro / Magnet replacement.
//
// Body shape:
//   {
//     seed_term?: string,        // e.g. "yoga mat"
//     seed_asin?: string,        // B0XXXXXXXX
//     marketplace?: 'ES'|'US'|...,
//     language?: 'ca'|'es'|'en',
//   }
//
// Response (JSON):
//   {
//     status: 'ok',
//     autocomplete: string[],          // raw Amazon search suggestions
//     keywords: [{
//       keyword, intent, est_monthly_volume, competition, suggested_cpc, why
//     }],
//     long_tail: string[],
//     questions: string[],
//     negative_keywords: string[],
//     summary: string
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callAi, parseJsonContent, type AiProvider } from '../_shared/aiAdapter.ts'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

const limiter = rateLimit({
  id: 'ai-keyword-research',
  capacity: 6,
  refillPerSecond: 1 / 60,
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const HOST_BY_MARKETPLACE: Record<string, string> = {
  US: 'www.amazon.com',
  UK: 'www.amazon.co.uk',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  NL: 'www.amazon.nl',
  PL: 'www.amazon.pl',
  SE: 'www.amazon.se',
  MX: 'www.amazon.com.mx',
  CA: 'www.amazon.ca',
  BR: 'www.amazon.com.br',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an expert Amazon SEO and keyword strategist for FBA sellers.

You are given a seed (term, ASIN title, or Amazon autocomplete suggestions) and a target marketplace. Produce a research report with:
- 25-40 keywords grouped by intent (informational vs commercial vs branded vs comparison).
- An honest order-of-magnitude volume estimate (low/mid/high) and competition estimate (low/mid/high). Don't invent precise numbers — use bands.
- A suggested CPC range in the marketplace's currency for paid ads.
- A short "why" for each (1-2 lines max).
- 8-15 long-tail variations.
- 5-10 questions buyers ask about this category.
- 5-10 negative keywords (terms to exclude from PPC).
- A 2-sentence executive summary.

Be direct. If the seed is too vague, say so in the summary instead of inventing data.
Always respond in valid JSON. Respond in the user's language (Catalan if 'ca', Spanish if 'es', English if 'en', default Catalan).`

const OUTPUT_SCHEMA_HINT = `Respond with ONLY valid JSON, no markdown fences, with this exact shape:
{
  "keywords": [
    {
      "keyword": "text",
      "intent": "informational|commercial|branded|comparison",
      "est_monthly_volume": "low|mid|high",
      "competition": "low|mid|high",
      "suggested_cpc": { "min": 0, "max": 0, "currency": "EUR" },
      "why": "1-2 sentence rationale"
    }
  ],
  "long_tail": ["string"],
  "questions": ["string"],
  "negative_keywords": ["string"],
  "summary": "2-sentence executive summary"
}`

interface ResearchBody {
  seed_term?: string
  seed_asin?: string
  marketplace?: string
  language?: 'ca' | 'es' | 'en'
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

interface ProviderDecision {
  provider: AiProvider | null
  apiKey: string
  model?: string
  baseUrl?: string
  source: 'user' | 'system' | 'none'
}

async function resolveProvider(
  supabaseUser: ReturnType<typeof createClient>,
  orgId: string | null,
): Promise<ProviderDecision> {
  if (orgId) {
    const { data: conns } = await supabaseUser
      .from('tool_connections')
      .select('credentials, status')
      .eq('org_id', orgId)
      .eq('tool_name', 'ai_provider')
      .eq('status', 'active')
      .limit(1)
    const userConn = Array.isArray(conns) && conns[0] ? conns[0] : null
    if (userConn?.credentials) {
      const c = userConn.credentials as Record<string, unknown>
      const provider = (c.provider ?? 'anthropic') as AiProvider
      const apiKey = (c.api_key ?? '') as string
      if (apiKey || provider === 'ollama') {
        return {
          provider,
          apiKey,
          model: (c.model as string) || undefined,
          baseUrl: (c.base_url as string) || undefined,
          source: 'user',
        }
      }
    }
  }
  if (ANTHROPIC_API_KEY) return { provider: 'anthropic', apiKey: ANTHROPIC_API_KEY, source: 'system' }
  if (OPENAI_API_KEY) return { provider: 'openai', apiKey: OPENAI_API_KEY, source: 'system' }
  return { provider: null, apiKey: '', source: 'none' }
}

/**
 * Hit Amazon's public autocomplete endpoint. Free, used by amazon.com's
 * search box itself. Returns up to ~10 suggestions ordered by popularity.
 * Failure is non-fatal — we still ask the AI even with no autocomplete.
 */
async function fetchAmazonAutocomplete(host: string, term: string): Promise<string[]> {
  if (!term || term.length < 2) return []
  try {
    const url = new URL(`https://completion.amazon.com/api/2017/suggestions`)
    url.searchParams.set('limit', '11')
    url.searchParams.set('prefix', term)
    url.searchParams.set('suggestion-type', 'KEYWORD')
    url.searchParams.set('client-info', 'amazon-search-ui')
    url.searchParams.set('mid', 'A1RKKUPIHCS9HS') // ES marketplace id; harmless if host differs
    url.searchParams.set('alias', 'aps')
    url.searchParams.set('site-variant', 'desktop')
    url.searchParams.set('lop', 'es_ES')
    const res = await fetch(url.toString(), {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'accept': 'application/json',
        'referer': `https://${host}/`,
      },
    })
    if (!res.ok) return []
    const json = await res.json()
    const suggestions = Array.isArray(json?.suggestions)
      ? json.suggestions.map((s: { value?: string }) => s?.value).filter((v): v is string => typeof v === 'string')
      : []
    return suggestions.slice(0, 10)
  } catch {
    return []
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
    const ipGuard = limiter(`ip:${callerIp(req)}`)
    if (!ipGuard.allowed) return tooManyRequests(ipGuard, corsHeaders)
    return jsonResponse({ status: 'unauthorized' }, 401)
  }
  const userGuard = limiter(`user:${userData.user.id}`)
  if (!userGuard.allowed) return tooManyRequests(userGuard, corsHeaders)

  let body: ResearchBody
  try {
    body = (await req.json()) as ResearchBody
  } catch {
    return jsonResponse({ status: 'invalid_body' }, 400)
  }

  const seedTerm = (body.seed_term || '').trim()
  const seedAsin = (body.seed_asin || '').trim().toUpperCase()
  if (!seedTerm && !seedAsin) {
    return jsonResponse({ status: 'seed_required' }, 400)
  }
  const marketplace = String(body.marketplace || 'ES').toUpperCase()
  const language = body.language || 'ca'
  const host = HOST_BY_MARKETPLACE[marketplace] || HOST_BY_MARKETPLACE.ES

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

  // Pull Amazon autocomplete (non-fatal if it fails)
  const autocomplete = seedTerm ? await fetchAmazonAutocomplete(host, seedTerm) : []

  const provider = await resolveProvider(supabase, orgId)
  if (!provider.provider) {
    return jsonResponse(
      {
        status: 'no_provider',
        autocomplete,
        message: "Connecta el teu compte d'IA a Settings per generar el report.",
      },
      200,
    )
  }

  const payload = JSON.stringify(
    {
      marketplace,
      language,
      seed_term: seedTerm || null,
      seed_asin: seedAsin || null,
      autocomplete_suggestions: autocomplete,
    },
    null,
    2,
  )
  const userPayload = `Run keyword research for this seed. Use autocomplete suggestions as a strong signal but don't be limited by them.\n\nSEED:\n${payload}\n\n${OUTPUT_SCHEMA_HINT}`

  let rawText = ''
  try {
    const out = await callAi({
      provider: provider.provider,
      apiKey: provider.apiKey,
      model: provider.model,
      baseUrl: provider.baseUrl,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userPayload,
      jsonMode: true,
      maxTokens: 2500,
    })
    rawText = out.content
  } catch (err) {
    return jsonResponse(
      { status: 'provider_error', autocomplete, message: (err as Error).message },
      200,
    )
  }

  let parsed: Record<string, unknown>
  try {
    parsed = parseJsonContent<Record<string, unknown>>(rawText)
  } catch {
    return jsonResponse(
      { status: 'parse_error', autocomplete, raw: rawText.substring(0, 400) },
      200,
    )
  }

  return jsonResponse(
    {
      status: 'ok',
      source: provider.source,
      provider: provider.provider,
      marketplace,
      autocomplete,
      ...parsed,
    },
    200,
  )
})
