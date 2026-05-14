// ai-listing-optimizer: rewrites an Amazon listing (title + bullets + description)
// optimised for SEO, keyword coverage and Amazon listing best practices, using
// the org's BYOK AI provider.
//
// Body shape:
//   {
//     marketplace?: 'ES'|'US'|'DE'|...,
//     language?: 'ca'|'es'|'en',
//     product: {
//       title: string,
//       bullets: string[],        // current bullet points (0-5)
//       description?: string,
//       brand?: string,
//       category?: string,
//       keywords?: string[],      // target keywords the user wants ranked
//     }
//   }
//
// Response (JSON):
//   {
//     status: 'ok',
//     optimized: {
//       title: string,                  // ≤200 chars (Amazon hard limit)
//       bullets: string[],              // exactly 5, ≤250 chars each
//       description: string,            // ≤2000 chars
//       backend_keywords: string,       // ≤249 bytes (Amazon search terms)
//     },
//     scores: {
//       overall: number,                // 0-100
//       title: number, bullets: number, description: number, keywords: number,
//     },
//     improvements: [{ field, issue, fix }, ...],
//     keyword_coverage: { used: string[], missed: string[] },
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callAi, parseJsonContent, type AiProvider } from '../_shared/aiAdapter.ts'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

const limiter = rateLimit({
  id: 'ai-listing-optimizer',
  capacity: 6,
  refillPerSecond: 1 / 60,
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an expert Amazon listing copywriter and SEO strategist.

Your job is to rewrite a listing (title + 5 bullets + description + backend search terms) so that it:
- Ranks for the user's target keywords without keyword-stuffing.
- Respects Amazon's hard limits: title ≤200 chars, each bullet ≤250 chars, description ≤2000 chars, backend search terms ≤249 bytes.
- Front-loads the brand + primary keyword + key benefit in the first 80 chars of the title (mobile preview).
- Each bullet starts with a benefit in caps (e.g. "MAXIMUM DURABILITY:") followed by a sentence.
- Avoids prohibited claims (medical, "best", testimonials, prices, promotions, "guarantee" without legal backing).
- Uses concrete, sensory adjectives over generic ones ("ultra-soft cotton" not "high-quality").
- Backend keywords: lowercase, no punctuation, no duplication with title/bullets.

Score each section 0-100 honestly. If the original is already strong, say so.

Always respond in valid JSON. Respond in the user's language (Catalan if 'ca', Spanish if 'es', English if 'en', default Catalan).`

const OUTPUT_SCHEMA_HINT = `Respond with ONLY valid JSON, no markdown fences, with this exact shape:
{
  "optimized": {
    "title": "≤200 chars",
    "bullets": ["bullet 1 ≤250 chars", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
    "description": "≤2000 chars",
    "backend_keywords": "lowercase space-separated, ≤249 bytes"
  },
  "scores": {
    "overall": 0,
    "title": 0,
    "bullets": 0,
    "description": 0,
    "keywords": 0
  },
  "improvements": [
    { "field": "title|bullets|description|backend_keywords", "issue": "text", "fix": "text" }
  ],
  "keyword_coverage": {
    "used": ["keyword 1"],
    "missed": ["keyword 2"]
  }
}`

interface ListingBody {
  marketplace?: string
  language?: 'ca' | 'es' | 'en'
  product?: {
    title?: string
    bullets?: string[]
    description?: string
    brand?: string
    category?: string
    keywords?: string[]
  }
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

  let body: ListingBody
  try {
    body = (await req.json()) as ListingBody
  } catch {
    return jsonResponse({ status: 'invalid_body' }, 400)
  }
  if (!body.product?.title || !body.product.title.trim()) {
    return jsonResponse({ status: 'title_required' }, 400)
  }

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

  const provider = await resolveProvider(supabase, orgId)
  if (!provider.provider) {
    return jsonResponse(
      {
        status: 'no_provider',
        message: "Connecta el teu compte d'IA a Settings per fer servir aquesta eina.",
      },
      200,
    )
  }

  const language = body.language || 'ca'
  const payload = JSON.stringify(
    {
      marketplace: body.marketplace || 'ES',
      language,
      product: {
        title: body.product.title,
        bullets: body.product.bullets || [],
        description: body.product.description || '',
        brand: body.product.brand || '',
        category: body.product.category || '',
        target_keywords: body.product.keywords || [],
      },
    },
    null,
    2,
  )
  const userPayload = `Rewrite this Amazon listing for maximum SEO + conversion. Output language: ${language}.\n\nLISTING:\n${payload}\n\n${OUTPUT_SCHEMA_HINT}`

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
      { status: 'provider_error', message: (err as Error).message },
      200,
    )
  }

  let parsed: Record<string, unknown>
  try {
    parsed = parseJsonContent<Record<string, unknown>>(rawText)
  } catch {
    return jsonResponse(
      { status: 'parse_error', raw: rawText.substring(0, 400) },
      200,
    )
  }

  return jsonResponse(
    {
      status: 'ok',
      source: provider.source,
      provider: provider.provider,
      ...parsed,
    },
    200,
  )
})
