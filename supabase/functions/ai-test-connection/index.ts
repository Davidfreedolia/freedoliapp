// ai-test-connection
//
// Verifies that a user-supplied API key reaches the chosen provider. Does NOT
// store the key — just does a minimal "respond with OK" round-trip and reports
// latency. The caller decides what to do with the result.
//
// Body: { provider, api_key, model?, base_url? }
// Response: { ok: true, latency_ms, model, provider }  on success
//           { ok: false, error: string }                on failure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callAi, isSupportedProvider, DEFAULT_MODELS } from '../_shared/aiAdapter.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405)

  // Require authenticated user — prevents anonymous probing of our infra.
  const authHeader = req.headers.get('authorization') ?? ''
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return jsonResponse({ ok: false, error: 'invalid_jwt' }, 401)

  let body: { provider?: string; api_key?: string; model?: string; base_url?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400)
  }

  const provider = (body.provider ?? '').toString().trim().toLowerCase()
  const apiKey = (body.api_key ?? '').toString().trim()
  const model = (body.model ?? '').toString().trim() || undefined
  const baseUrl = (body.base_url ?? '').toString().trim() || undefined

  if (!isSupportedProvider(provider)) {
    return jsonResponse({ ok: false, error: 'unsupported_provider' }, 400)
  }
  if (!apiKey && provider !== 'ollama') {
    return jsonResponse({ ok: false, error: 'missing_api_key' }, 400)
  }

  const started = Date.now()
  try {
    const out = await callAi({
      provider,
      apiKey,
      model: model || DEFAULT_MODELS[provider],
      baseUrl,
      systemPrompt: 'You are a connectivity probe. Reply with exactly OK.',
      userPrompt: 'ping',
      maxTokens: 8,
    })
    const latency = Date.now() - started
    return jsonResponse({
      ok: true,
      latency_ms: latency,
      model: out.model,
      provider: out.provider,
      // content length is informational; we don't echo the full reply.
      content_len: out.content.length,
    })
  } catch (err) {
    const latency = Date.now() - started
    return jsonResponse({
      ok: false,
      error: (err as Error)?.message || String(err),
      latency_ms: latency,
    })
  }
})
