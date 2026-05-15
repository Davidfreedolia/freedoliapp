// public-stats: unauthenticated, read-only aggregate counters for the
// public landing page "live" stat row.
//
// Privacy & safety
// ----------------
// - Returns ONLY non-identifying COUNT aggregates. No org names, no user
//   data, no per-tenant breakdown — just platform-wide totals.
// - Uses the service-role key server-side to bypass RLS for the COUNT
//   queries, but never exposes a single row.
// - verify_jwt is DISABLED for this function (it's meant to be called
//   from the public marketing site). It's safe because the response
//   contains nothing sensitive and it is rate-limited per IP.
//
// Response:
//   {
//     ok: true,
//     stats: {
//       ai_analyses: number,    // total AI analyses run (research_reports)
//       events_scanned: number, // Amazon financial events imported
//       edge_functions: number, // active edge functions (static-ish)
//       marketplaces: number    // Amazon marketplaces supported (static)
//     },
//     generated_at: ISO-8601
//   }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, tooManyRequests, callerIp } from '../_shared/rateLimit.ts'

// Public endpoint — generous but not unlimited. 60/min/IP.
const limiter = rateLimit({
  id: 'public-stats',
  capacity: 60,
  refillPerSecond: 1,
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  // Let the CDN cache the response for 5 minutes — these numbers don't
  // need to be real-time and it shields the DB from landing-page traffic.
  'Cache-Control': 'public, max-age=300, s-maxage=300',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

/** Count helper — returns 0 on any error so the landing never breaks. */
async function safeCount(
  admin: ReturnType<typeof createClient>,
  table: string,
): Promise<number> {
  try {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = limiter(`ip:${callerIp(req)}`)
  if (!guard.allowed) return tooManyRequests(guard, corsHeaders)

  // Static-but-real platform numbers (independent of DB state).
  const STATIC = {
    edge_functions: 26,  // total active Supabase Edge Functions in prod
    marketplaces: 12,    // ES/US/UK/DE/FR/IT/NL/PL/SE/MX/CA/BR
    ai_providers: 6,     // Anthropic/OpenAI/Gemini/Mistral/Groq/Ollama
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    // Degrade gracefully — return the static-only stats.
    return jsonResponse(
      {
        ok: true,
        stats: { ai_analyses: 0, events_scanned: 0, ...STATIC },
        generated_at: new Date().toISOString(),
      },
      200,
    )
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const [aiAnalyses, eventsScanned] = await Promise.all([
    safeCount(admin, 'research_reports'),
    safeCount(admin, 'amazon_financial_events'),
  ])

  return jsonResponse(
    {
      ok: true,
      stats: {
        ai_analyses: aiAnalyses,
        events_scanned: eventsScanned,
        ...STATIC,
      },
      generated_at: new Date().toISOString(),
    },
    200,
  )
})
