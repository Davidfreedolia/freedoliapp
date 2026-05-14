// refund-recovery-scan: scans the org's imported Amazon financial events for
// missing or incomplete reimbursements and produces a recoverable-amounts
// report.
//
// Why this exists
// ---------------
// Amazon FBA sellers routinely lose money to:
//   • inventory lost in FBA warehouses with no offsetting reimbursement
//   • customer returns that were resold but never refunded back to the seller
//   • damaged inventory adjustments that don't trigger an automatic refund
//   • duplicate FBA storage fees
//   • overcharged FBA fulfillment fees on dimensions/weight mis-classification
//
// Third-party "refund recovery" services charge 20-25% of recovered money.
// This function does the detection part for free; the user files the case
// with Amazon directly.
//
// Body shape:
//   {
//     from_date?: 'YYYY-MM-DD',   // default: 18 months ago
//     to_date?:   'YYYY-MM-DD',   // default: today
//     language?:  'ca'|'es'|'en'
//   }
//
// Response (JSON):
//   {
//     status: 'ok'|'no_data'|'no_provider'|'provider_error',
//     scan_period: { from, to },
//     totals: { events_analyzed, suspicious_count, estimated_recoverable, currency },
//     findings: [{
//       category: 'lost_inventory'|'damaged'|'return_not_refunded'|'fee_anomaly'|'duplicate_charge',
//       severity: 'low'|'medium'|'high',
//       reference: string,              // original Amazon reference / settlement ID
//       date: 'YYYY-MM-DD',
//       amount: number,
//       currency: string,
//       explanation: string,
//       action: string,                 // how to file the case with Amazon
//     }],
//     summary: string
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callAi, parseJsonContent, type AiProvider } from '../_shared/aiAdapter.ts'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

const limiter = rateLimit({
  id: 'refund-recovery-scan',
  capacity: 4,
  refillPerSecond: 1 / 120, // expensive call; bursts of 4, then ~30/h
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

const SYSTEM_PROMPT = `You are an Amazon FBA reimbursement specialist with 8+ years of experience filing cases with Seller Support.

You are given a summarized view of an org's recent Amazon financial events (returns, fee charges, adjustments, lost/damaged inventory events) and you must identify potentially recoverable amounts.

Common recoverable patterns:
- "RemovalShipment" or "WAREHOUSE_DAMAGED" / "WAREHOUSE_LOST" without an "InventoryAdjustment" reimbursement of equivalent value
- Customer returns ("RefundEvent" with negative amount) where the original "PrincipalEvent" was higher and there is no second "Refund" reversing the return after a resale
- "FBA Storage Fee" charged twice on the same ASIN in the same month
- "FBA Inbound Defect" event without an offsetting reimbursement
- Fee changes (Pick & Pack, Weight handling) that look inconsistent with peer events in the same category

Be CONSERVATIVE. Only flag items where there is genuine reason to suspect a missed reimbursement. False positives erode trust.

For each finding give:
- severity (high = clear missing reimbursement; medium = pattern suggests it; low = worth checking)
- a concrete "action" the user can copy into a Seller Support case ("File a case in Manage FBA Inventory → Reimbursements with reference X dated Y, requesting reimbursement of €Z for lost inventory event …")

Respond in valid JSON in the user's language (Catalan if 'ca', Spanish if 'es', English if 'en', default Catalan).`

const OUTPUT_SCHEMA_HINT = `Respond with ONLY valid JSON, no markdown fences, with this exact shape:
{
  "findings": [
    {
      "category": "lost_inventory|damaged|return_not_refunded|fee_anomaly|duplicate_charge",
      "severity": "low|medium|high",
      "reference": "amazon ref / settlement id",
      "date": "YYYY-MM-DD",
      "amount": 0,
      "currency": "EUR|USD|GBP|...",
      "explanation": "1-3 sentence rationale",
      "action": "concrete next-step text the user can paste into Seller Support"
    }
  ],
  "summary": "2-sentence executive summary including total estimated recoverable"
}`

interface ScanBody {
  from_date?: string
  to_date?:   string
  language?:  'ca' | 'es' | 'en'
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
 * Aggregate financial events into a digest small enough to fit into an AI
 * prompt. We can't feed thousands of raw rows; instead we bucket by
 * event_type + reference and surface anomalies (negative amounts without a
 * matching positive, duplicate charges, etc.).
 */
function buildDigest(events: Array<Record<string, unknown>>): {
  digest: Array<Record<string, unknown>>
  totals: Record<string, unknown>
} {
  const byType: Record<string, { count: number; total: number; currency?: string }> = {}
  const byReference: Record<string, Array<Record<string, unknown>>> = {}

  for (const e of events) {
    const type = String(e.event_type || 'unknown')
    const amt = Number(e.amount || 0)
    const ccy = String(e.currency || '')
    const ref = String(e.reference || '')
    if (!byType[type]) byType[type] = { count: 0, total: 0, currency: ccy }
    byType[type].count += 1
    byType[type].total += amt
    if (ref) {
      if (!byReference[ref]) byReference[ref] = []
      byReference[ref].push(e)
    }
  }

  // Surface references with anomalies: negative without a positive, duplicate
  // identical charges, returns without a refund-reversal.
  const anomalies: Array<Record<string, unknown>> = []
  for (const [ref, list] of Object.entries(byReference)) {
    if (list.length === 1) {
      const e = list[0]
      const amt = Number(e.amount || 0)
      const type = String(e.event_type || '')
      if (amt < 0 && /(Refund|Removal|Lost|Damaged|Adjustment)/i.test(type)) {
        anomalies.push({ reference: ref, single_event: e })
      }
    } else if (list.length >= 2) {
      const types = list.map((e) => String(e.event_type || ''))
      const amounts = list.map((e) => Number(e.amount || 0))
      const allSameType = types.every((t) => t === types[0])
      const allSameAmount = amounts.every((a) => a === amounts[0])
      if (allSameType && allSameAmount && list.length >= 2 && /Fee|Storage/i.test(types[0])) {
        anomalies.push({ reference: ref, duplicate_charge: list[0], count: list.length })
      }
      const sum = amounts.reduce((s, a) => s + a, 0)
      if (Math.abs(sum) > 0.01) {
        // imbalanced reference — flag it for AI to look at
        anomalies.push({ reference: ref, imbalance: sum, events: list.slice(0, 4) })
      }
    }
  }

  // Cap anomalies fed to AI to keep the prompt small
  const sampledAnomalies = anomalies.slice(0, 80)

  return {
    digest: sampledAnomalies,
    totals: {
      total_events: events.length,
      by_type: byType,
      anomalies_detected: anomalies.length,
      anomalies_sampled: sampledAnomalies.length,
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
    const ipGuard = limiter(`ip:${callerIp(req)}`)
    if (!ipGuard.allowed) return tooManyRequests(ipGuard, corsHeaders)
    return jsonResponse({ status: 'unauthorized' }, 401)
  }
  const userGuard = limiter(`user:${userData.user.id}`)
  if (!userGuard.allowed) return tooManyRequests(userGuard, corsHeaders)

  let body: ScanBody
  try {
    body = (await req.json()) as ScanBody
  } catch {
    body = {}
  }
  const language = body.language || 'ca'

  // Default scan window: 18 months → today (Amazon's case-filing window).
  const today = new Date()
  const eighteenMonthsAgo = new Date(today)
  eighteenMonthsAgo.setMonth(today.getMonth() - 18)
  const fromDate = body.from_date || eighteenMonthsAgo.toISOString().slice(0, 10)
  const toDate = body.to_date || today.toISOString().slice(0, 10)

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
  if (!orgId) {
    return jsonResponse({ status: 'no_org' }, 200)
  }

  // Pull recent financial events. We pre-filter to types likely to be
  // refund-related to keep payload small.
  const { data: events, error: eventsErr } = await supabase
    .from('amazon_financial_events')
    .select('settlement_id, transaction_id, event_type, event_date, amount, currency, reference, meta')
    .eq('org_id', orgId)
    .gte('event_date', fromDate)
    .lte('event_date', toDate)
    .order('event_date', { ascending: false })
    .limit(2000)

  if (eventsErr) {
    return jsonResponse({ status: 'db_error', message: eventsErr.message }, 500)
  }
  if (!events || events.length === 0) {
    return jsonResponse(
      {
        status: 'no_data',
        scan_period: { from: fromDate, to: toDate },
        message:
          "No s'han trobat events financers Amazon importats per a aquest període. Importa primer els teus settlement reports a Imports.",
      },
      200,
    )
  }

  const provider = await resolveProvider(supabase, orgId)
  if (!provider.provider) {
    return jsonResponse(
      {
        status: 'no_provider',
        scan_period: { from: fromDate, to: toDate },
        events_analyzed: events.length,
        message: "Connecta el teu compte d'IA a Settings per generar el report de recuperació.",
      },
      200,
    )
  }

  const { digest, totals } = buildDigest(events as Array<Record<string, unknown>>)

  const payload = JSON.stringify(
    {
      language,
      scan_period: { from: fromDate, to: toDate },
      totals,
      anomalies: digest,
    },
    null,
    2,
  )
  const userPayload = `Analyze the following digest of Amazon financial events for missing reimbursements. Be conservative. Output language: ${language}.\n\nDATA:\n${payload}\n\n${OUTPUT_SCHEMA_HINT}`

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
      maxTokens: 3000,
    })
    rawText = out.content
  } catch (err) {
    return jsonResponse(
      { status: 'provider_error', message: (err as Error).message },
      200,
    )
  }

  let parsed: { findings?: Array<Record<string, unknown>>; summary?: string }
  try {
    parsed = parseJsonContent<typeof parsed>(rawText)
  } catch {
    return jsonResponse(
      { status: 'parse_error', raw: rawText.substring(0, 400) },
      200,
    )
  }

  const findings = Array.isArray(parsed.findings) ? parsed.findings : []
  const estimated = findings.reduce(
    (sum, f) => sum + Math.abs(Number(f.amount || 0)),
    0,
  )
  const ccy = findings.find((f) => f.currency)?.currency || 'EUR'

  return jsonResponse(
    {
      status: 'ok',
      source: provider.source,
      provider: provider.provider,
      scan_period: { from: fromDate, to: toDate },
      totals: {
        events_analyzed: events.length,
        suspicious_count: findings.length,
        estimated_recoverable: Math.round(estimated * 100) / 100,
        currency: ccy,
      },
      findings,
      summary: parsed.summary || '',
    },
    200,
  )
})
