/**
 * Frontend helpers for the BYOK IA feature.
 *
 * - getAiConnection / upsertAiConnection / deleteAiConnection read and write
 *   the `tool_connections` row with tool_name='ai_provider'.
 * - getAiUsage reads `ai_usage` for the active org (SELECT is allowed to members).
 * - testAiConnection calls the `ai-test-connection` edge function.
 *
 * The API key is never displayed in the UI — only the last 4 characters.
 */
import { supabase } from '../supabase'

export const AI_PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    tagline: 'El més intel·ligent per a anàlisi de productes',
    recommended: true,
    keyPrefix: 'sk-ant-',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    label: 'ChatGPT (OpenAI)',
    tagline: 'El més popular, potser ja tens compte',
    keyPrefix: 'sk-',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'google',
    label: 'Gemini (Google)',
    tagline: 'Si ja tens Google Workspace',
    keyPrefix: 'AIza',
    getKeyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    tagline: 'Alternativa europea, bona relació qualitat-preu',
    keyPrefix: '',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    tagline: 'Ultra-ràpid i gairebé gratis',
    keyPrefix: 'gsk_',
    getKeyUrl: 'https://console.groq.com/keys',
  },
]

export const AI_PROVIDERS_ADVANCED = [
  {
    id: 'ollama',
    label: 'Ollama (local)',
    tagline: 'Models locals; opció avançada',
    keyPrefix: '',
    getKeyUrl: null,
  },
]

/** Mask an API key for display: keep last 4 chars, mask the rest. */
export function maskKey(key) {
  if (!key) return ''
  const s = String(key)
  if (s.length <= 4) return `••••${s}`
  return `${'•'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`
}

/** Fetch the current AI provider connection for an org (or null). */
export async function getAiConnection(orgId) {
  if (!orgId) return null
  const { data, error } = await supabase
    .from('tool_connections')
    .select('id, credentials, status, created_at, updated_at')
    .eq('org_id', orgId)
    .eq('tool_name', 'ai_provider')
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const creds = data.credentials || {}
  return {
    id: data.id,
    provider: creds.provider || 'anthropic',
    model: creds.model || null,
    baseUrl: creds.base_url || null,
    apiKeyMasked: maskKey(creds.api_key || ''),
    hasKey: Boolean(creds.api_key) || creds.provider === 'ollama',
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/** Create or update the AI provider connection. */
export async function upsertAiConnection(orgId, { provider, apiKey, model = null, baseUrl = null }) {
  if (!orgId) throw new Error('no_active_org')
  const credentials = {
    provider,
    api_key: apiKey,
    ...(model ? { model } : {}),
    ...(baseUrl ? { base_url: baseUrl } : {}),
  }
  // Try update first; fall back to insert.
  const { data: existing } = await supabase
    .from('tool_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('tool_name', 'ai_provider')
    .maybeSingle()
  if (existing?.id) {
    const { error } = await supabase
      .from('tool_connections')
      .update({ credentials, status: 'active' })
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, updated: true }
  }
  const { data, error } = await supabase
    .from('tool_connections')
    .insert({
      org_id: orgId,
      tool_name: 'ai_provider',
      auth_type: 'api_key',
      credentials,
      status: 'active',
    })
    .select('id')
    .maybeSingle()
  if (error) throw error
  return { id: data?.id, updated: false }
}

/** Remove the AI provider connection (user falls back to free quota). */
export async function deleteAiConnection(orgId) {
  if (!orgId) return false
  const { error } = await supabase
    .from('tool_connections')
    .delete()
    .eq('org_id', orgId)
    .eq('tool_name', 'ai_provider')
  if (error) throw error
  return true
}

/** Fetch monthly AI usage counter for the active org. */
export async function getAiUsage(orgId) {
  if (!orgId) return null
  const { data, error } = await supabase
    .from('ai_usage')
    .select('monthly_count, month_year, last_reset_at, updated_at')
    .eq('org_id', orgId)
    .maybeSingle()
  if (error) return null
  return data
}

/**
 * Calls the `ai-test-connection` edge function. Returns { ok, latencyMs, error? }.
 * The key is sent to the function but never stored server-side.
 */
export async function testAiConnection({ provider, apiKey, model = null, baseUrl = null }) {
  const { data, error } = await supabase.functions.invoke('ai-test-connection', {
    body: {
      provider,
      api_key: apiKey,
      ...(model ? { model } : {}),
      ...(baseUrl ? { base_url: baseUrl } : {}),
    },
  })
  if (error) return { ok: false, error: error.message || String(error) }
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid_response' }
  return {
    ok: Boolean(data.ok),
    latencyMs: data.latency_ms ?? null,
    error: data.ok ? null : (data.error || 'unknown'),
    model: data.model ?? null,
  }
}

/** Look up an AI provider descriptor by id (basic or advanced). */
export function findProviderDescriptor(id) {
  return (
    AI_PROVIDERS.find((p) => p.id === id) ||
    AI_PROVIDERS_ADVANCED.find((p) => p.id === id) ||
    null
  )
}
