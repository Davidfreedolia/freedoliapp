// ai-research-analyst: takes aggregated raw data (Amazon + suppliers + tools)
// and produces a structured FBA viability report using the configured AI
// provider. The provider config is supplied by the orchestrator so analytics
// traffic fans in through a single code path.
//
// Body shape:
//   {
//     ...rawData,             // marketplace, asin, description, amazon, suppliers, ...
//     _provider?: {           // optional: the orchestrator injects this
//       provider: 'anthropic'|'openai'|'google'|'mistral'|'groq'|'ollama',
//       api_key: string,
//       model?: string,
//       base_url?: string,
//       source: 'user'|'system',
//     }
//   }
//
// If _provider is absent we fall back to env keys (legacy behavior). If neither
// is available we return a static fallback report so the pipeline never breaks.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  callAi,
  parseJsonContent,
  isSupportedProvider,
  type AiProvider,
} from '../_shared/aiAdapter.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an expert Amazon FBA product analyst. You receive raw data about a product from multiple sources (Amazon, Alibaba, 1688, Zentrada, Helium 10, Jungle Scout) and produce a structured viability report.

Your knowledge includes:
- FBA fees by marketplace and product size tier (small standard, large standard, small oversize, etc.)
- Typical margins by category (15-40% net is healthy for private label)
- Common risks: IP/patent issues, gated categories, hazmat, seasonal dependency, high competition
- Shipping costs: sea freight ~\$4-8/kg, air freight ~\$8-15/kg from China to EU
- PPC costs: typical ACoS 15-35% depending on category and competition level

Always respond in valid JSON with the exact structure provided. Be direct and honest. If data is insufficient, say so.`

const OUTPUT_SCHEMA_HINT = `Respond with ONLY valid JSON, no markdown fences, with this exact shape:
{
  "market": {
    "selling_price": { "min": 0, "max": 0, "currency": "EUR" },
    "bsr": 0,
    "reviews_range": "low|medium|high",
    "competition_level": "low|medium|high|saturated",
    "search_volume": 0,
    "trend": "rising|stable|declining|unknown",
    "summary": "text"
  },
  "costs": {
    "alibaba_price": { "min": 0, "max": 0, "moq": 0 },
    "factory_price_1688": { "min": 0, "max": 0 },
    "zentrada_price": { "min": 0, "max": 0 },
    "estimated_shipping_per_unit": { "sea": 0, "air": 0 },
    "estimated_fba_fees": 0,
    "summary": "text"
  },
  "margins": {
    "optimistic": { "selling_price": 0, "total_cost": 0, "net_margin_pct": 0 },
    "realistic": { "selling_price": 0, "total_cost": 0, "net_margin_pct": 0 },
    "pessimistic": { "selling_price": 0, "total_cost": 0, "net_margin_pct": 0 },
    "summary": "text"
  },
  "risks": [
    { "type": "ip|regulation|competition|seasonality|other", "severity": "low|medium|high", "description": "text" }
  ],
  "viability_score": 0,
  "recommendation": "go|no-go|needs-research",
  "next_steps": ["text"],
  "executive_summary": "text"
}`

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function fallbackReport(input: unknown, reason = 'no_provider'): Record<string, unknown> {
  return {
    market: {
      selling_price: { min: 0, max: 0, currency: 'EUR' },
      bsr: 0,
      reviews_range: 'low',
      competition_level: 'medium',
      search_volume: 0,
      trend: 'unknown',
      summary: "Dades insuficients per completar l'anàlisi de mercat.",
    },
    costs: {
      alibaba_price: { min: 0, max: 0, moq: 0 },
      factory_price_1688: { min: 0, max: 0 },
      zentrada_price: { min: 0, max: 0 },
      estimated_shipping_per_unit: { sea: 0, air: 0 },
      estimated_fba_fees: 0,
      summary: "No s'han pogut obtenir prou dades de proveïdors.",
    },
    margins: {
      optimistic: { selling_price: 0, total_cost: 0, net_margin_pct: 0 },
      realistic: { selling_price: 0, total_cost: 0, net_margin_pct: 0 },
      pessimistic: { selling_price: 0, total_cost: 0, net_margin_pct: 0 },
      summary: 'Marge no calculable sense dades completes.',
    },
    risks: [
      {
        type: 'other',
        severity: 'medium',
        description: "L'informe automàtic no ha pogut completar-se. Cal verificar manualment.",
      },
    ],
    viability_score: 0,
    recommendation: 'needs-research',
    next_steps: [
      'Verificar manualment preus a Alibaba i 1688',
      'Comprovar BSR i reviews a la pàgina del producte',
      'Analitzar dimensions i pes per estimar FBA fees',
    ],
    executive_summary:
      "L'anàlisi automàtic no ha pogut completar-se. Configura la teva IA a Settings per desbloquejar anàlisis il·limitades.",
    _meta: { source: 'fallback', reason, raw_input_snapshot: input },
  }
}

interface ProviderConfig {
  provider: AiProvider
  api_key: string
  model?: string
  base_url?: string
  source?: 'user' | 'system'
}

function resolveProvider(body: Record<string, unknown>): ProviderConfig | null {
  // 1) Explicit provider in body (from the orchestrator).
  const pc = body._provider as Partial<ProviderConfig> | undefined
  if (pc && pc.provider && isSupportedProvider(pc.provider)) {
    if (pc.provider === 'ollama' || (pc.api_key && pc.api_key.trim())) {
      return {
        provider: pc.provider,
        api_key: (pc.api_key ?? '').toString(),
        model: pc.model,
        base_url: pc.base_url,
        source: pc.source ?? 'user',
      }
    }
  }
  // 2) Legacy env fallback (system key).
  if (ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', api_key: ANTHROPIC_API_KEY, source: 'system' }
  }
  if (OPENAI_API_KEY) {
    return { provider: 'openai', api_key: OPENAI_API_KEY, source: 'system' }
  }
  return null
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
  if (userErr || !userData?.user) return jsonResponse({ error: 'Invalid JWT' }, 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const provider = resolveProvider(body)
  if (!provider) {
    return jsonResponse(fallbackReport(body, 'no_provider'), 200)
  }

  // Strip `_provider` before sending the payload into the prompt so we don't
  // leak the API key into the model context.
  const { _provider: _strip, ...payloadForAi } = body as Record<string, unknown>
  void _strip
  const payload = JSON.stringify(payloadForAi, null, 2)
  const userPayload = `Here is the aggregated raw data for a product viability analysis. Produce the structured JSON report.\n\nRAW_DATA:\n${payload}\n\n${OUTPUT_SCHEMA_HINT}`

  let rawText = ''
  try {
    const out = await callAi({
      provider: provider.provider,
      apiKey: provider.api_key,
      model: provider.model,
      baseUrl: provider.base_url,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: userPayload,
      jsonMode: true,
      maxTokens: 2500,
    })
    rawText = out.content
  } catch (err) {
    return jsonResponse(
      {
        ...fallbackReport(body, `provider_error:${(err as Error).message}`),
        _meta: { source: 'fallback', provider: provider.provider, provider_source: provider.source },
      },
      200,
    )
  }

  let parsed: Record<string, unknown>
  try {
    parsed = parseJsonContent<Record<string, unknown>>(rawText)
  } catch {
    return jsonResponse(
      { ...fallbackReport(body, 'parse_error'), _meta: { parse_error: true, raw: rawText.substring(0, 400) } },
      200,
    )
  }

  // Surface which provider we used so the orchestrator can show accurate UI.
  parsed._meta = {
    provider: provider.provider,
    provider_source: provider.source,
    model_default: !provider.model,
  }
  return jsonResponse(parsed, 200)
})
