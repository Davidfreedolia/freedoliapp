// ai-quote-analyst: compares supplier quotes for one project and produces a
// structured verdict using the configured AI provider.
//
// Mirrors the BYOK + rate-limiting + fallback shape of ai-research-analyst.
//
// Body shape (from the client):
//   {
//     project: { id?, name?, target_quantity?, target_landed_cost?, currency? },
//     quotes: [{
//       id, supplier_name, currency, incoterm, payment_terms,
//       moq, lead_time_days, notes,
//       price_breaks: [{ min_qty, unit_price }],
//       shipping_estimate?: number | null
//     }, ...]
//   }
//
// The function resolves the org's AI provider from `tool_connections`
// (tool_name='ai_provider'); if none, returns a deterministic fallback so
// the UI always has something to show.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  callAi,
  parseJsonContent,
  type AiProvider,
} from '../_shared/aiAdapter.ts'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

// AI calls are expensive — burst 6 per user per minute, refill 1/min.
const aiLimiter = rateLimit({
  id: 'ai-quote-analyst',
  capacity: 6,
  refillPerSecond: 1 / 60,
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an expert procurement analyst for Amazon FBA sellers.

You receive several supplier quotes for the same product and a target order quantity.
Your job is to compare them across price, lead time, MOQ, payment terms, incoterms,
and qualitative risk signals, then produce a structured JSON recommendation.

Your knowledge includes:
- Incoterm cost implications (EXW is cheapest unit but worst landed cost; DDP highest unit but predictable; FOB is the common sweet spot for sea freight).
- Payment terms risk (100% upfront = high risk; 30/70 is healthy; LC/escrow lowers risk; T/T after BL is great if supplier accepts).
- Lead time vs. cash flow: short lead time is worth a price premium if you're stocking out.
- MOQ vs. cash flow: matching MOQ to target order quantity matters more than absolute price when you're capital-constrained.
- Currency volatility: quotes in USD vs. EUR vs. CNY shift effective cost.

Be direct. If a quote looks anomalous (price wildly off, missing critical fields, suspicious supplier name pattern), flag it.
Always respond in valid JSON with the exact schema. Use the same currency the user provided (or first quote's currency). Never invent numbers — if data is missing, return null.`

const OUTPUT_SCHEMA_HINT = `Respond with ONLY valid JSON, no markdown fences, with this exact shape:
{
  "verdict": {
    "best_overall_quote_id": "uuid | null",
    "best_price_quote_id":   "uuid | null",
    "best_lead_time_quote_id": "uuid | null",
    "best_moq_quote_id": "uuid | null",
    "summary": "1-3 sentence executive summary in user's language (Catalan)"
  },
  "ranking": [
    {
      "quote_id": "uuid",
      "supplier_name": "text",
      "score": 0,                          // 0–100, weighted across criteria
      "landed_cost_per_unit_estimate": 0,  // unit price + shipping/qty if available
      "currency": "USD|EUR|CNY|GBP",
      "strengths": ["text"],
      "weaknesses": ["text"]
    }
  ],
  "risks": [
    {
      "quote_id": "uuid | null",
      "type": "price_anomaly|payment_terms|moq_mismatch|lead_time|incoterm|supplier_signal|other",
      "severity": "low|medium|high",
      "description": "text"
    }
  ],
  "negotiation_levers": [
    {
      "quote_id": "uuid",
      "lever": "text",                     // e.g. "Ask supplier to match 30/70 payment terms (others offer it)"
      "expected_impact": "text"
    }
  ],
  "next_steps": ["text"]
}`

interface PriceBreak { min_qty?: number | null; unit_price?: number | string | null }
interface QuoteInput {
  id?: string
  supplier_name?: string | null
  currency?: string | null
  incoterm?: string | null
  payment_terms?: string | null
  moq?: number | string | null
  lead_time_days?: number | string | null
  notes?: string | null
  price_breaks?: PriceBreak[]
  shipping_estimate?: number | null
}

interface AnalysisBody {
  project?: {
    id?: string
    name?: string
    target_quantity?: number | null
    target_landed_cost?: number | null
    currency?: string | null
  }
  quotes?: QuoteInput[]
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/** Deterministic fallback so the UI is never empty when AI isn't configured. */
function fallbackVerdict(body: AnalysisBody, reason = 'no_provider'): Record<string, unknown> {
  const quotes = Array.isArray(body.quotes) ? body.quotes : []
  let bestPriceId: string | null = null
  let bestPrice = Infinity
  let bestLeadId: string | null = null
  let bestLead = Infinity
  let bestMoqId: string | null = null
  let bestMoq = Infinity

  for (const q of quotes) {
    const firstBreak = (q.price_breaks ?? [])
      .slice()
      .sort((a, b) => Number(a.min_qty ?? 0) - Number(b.min_qty ?? 0))[0]
    const price = firstBreak ? Number(firstBreak.unit_price) : NaN
    if (Number.isFinite(price) && price < bestPrice) {
      bestPrice = price
      bestPriceId = q.id ?? null
    }
    const lead = q.lead_time_days != null ? Number(q.lead_time_days) : NaN
    if (Number.isFinite(lead) && lead < bestLead) {
      bestLead = lead
      bestLeadId = q.id ?? null
    }
    const moq = q.moq != null && q.moq !== '' ? Number(q.moq) : NaN
    if (Number.isFinite(moq) && moq < bestMoq) {
      bestMoq = moq
      bestMoqId = q.id ?? null
    }
  }

  return {
    verdict: {
      best_overall_quote_id: bestPriceId,
      best_price_quote_id: bestPriceId,
      best_lead_time_quote_id: bestLeadId,
      best_moq_quote_id: bestMoqId,
      summary:
        "Anàlisi automàtica deterministica (sense IA). Configura el teu proveïdor d'IA a Settings → Potencia la teva IA per obtenir comparacions detallades.",
    },
    ranking: quotes.map((q) => ({
      quote_id: q.id ?? null,
      supplier_name: q.supplier_name ?? null,
      score: null,
      landed_cost_per_unit_estimate: null,
      currency: q.currency ?? null,
      strengths: [],
      weaknesses: [],
    })),
    risks: [],
    negotiation_levers: [],
    next_steps: [
      'Configura una clau d\'IA a Settings per desbloquejar la comparativa intel·ligent.',
    ],
    _meta: { source: 'fallback', reason },
  }
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
  // System fallback (only when configured server-side).
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
    const ipGuard = aiLimiter(`ip:${callerIp(req)}`)
    if (!ipGuard.allowed) return tooManyRequests(ipGuard, corsHeaders)
    return jsonResponse({ error: 'Invalid JWT' }, 401)
  }
  const userGuard = aiLimiter(`user:${userData.user.id}`)
  if (!userGuard.allowed) return tooManyRequests(userGuard, corsHeaders)

  let body: AnalysisBody
  try {
    body = (await req.json()) as AnalysisBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  if (!body.quotes || !Array.isArray(body.quotes) || body.quotes.length < 2) {
    return jsonResponse({ error: 'need_at_least_two_quotes' }, 400)
  }

  // Resolve the org for BYOK lookup. We trust the client to pass project.org_id
  // OR rely on the user's active org context. Simplest path: read the user's
  // first active org membership.
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
    return jsonResponse(fallbackVerdict(body, 'no_provider'), 200)
  }

  const payload = JSON.stringify({
    project: body.project ?? null,
    quotes: body.quotes,
  }, null, 2)
  const userPayload = `Compare the following supplier quotes for the same product and produce a structured JSON verdict. Respond in the user's language (Catalan unless quote notes are clearly in another language).\n\nQUOTES:\n${payload}\n\n${OUTPUT_SCHEMA_HINT}`

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
      maxTokens: 2200,
    })
    rawText = out.content
  } catch (err) {
    return jsonResponse(
      {
        ...fallbackVerdict(body, `provider_error:${(err as Error).message}`),
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
      { ...fallbackVerdict(body, 'parse_error'), _meta: { parse_error: true, raw: rawText.substring(0, 400) } },
      200,
    )
  }

  parsed._meta = {
    provider: provider.provider,
    provider_source: provider.source,
    model_default: !provider.model,
  }
  return jsonResponse(parsed, 200)
})
