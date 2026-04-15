// _shared/aiAdapter.ts
//
// Multi-provider AI adapter for Supabase Edge Functions.
//
// Given { provider, apiKey, model, systemPrompt, userPrompt } this module
// routes to the correct vendor endpoint and normalizes the response shape
// to { content, tokensUsed, model, provider }.
//
// Used by both the user-facing research analyst (with the user's key) and the
// ai-test-connection function (with a minimal test prompt).

export type AiProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'ollama'

export interface AiRequest {
  provider: AiProvider
  apiKey: string
  model?: string
  baseUrl?: string
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
  maxTokens?: number
}

export interface AiResponse {
  content: string
  tokensUsed: number
  model: string
  provider: AiProvider
}

/** Best default model per provider. User does not pick this in the UI. */
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  google: 'gemini-2.5-pro',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1',
}

export function isSupportedProvider(p: string): p is AiProvider {
  return ['anthropic', 'openai', 'google', 'mistral', 'groq', 'ollama'].includes(p)
}

function resolveModel(req: AiRequest): string {
  return req.model && req.model.trim() ? req.model : DEFAULT_MODELS[req.provider]
}

function stripJsonFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
}

// -------------------- Provider-specific callers --------------------

async function callAnthropic(req: AiRequest): Promise<AiResponse> {
  const model = resolveModel(req)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 2500,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userPrompt }],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`anthropic_${res.status}: ${text.substring(0, 200)}`)
  }
  const json = await res.json()
  const content = Array.isArray(json?.content)
    ? json.content.map((c: { text?: string }) => c?.text ?? '').join('')
    : (json?.content ?? '')
  const tokensUsed =
    (json?.usage?.input_tokens ?? 0) + (json?.usage?.output_tokens ?? 0)
  return { content, tokensUsed, model, provider: 'anthropic' }
}

async function callOpenAICompatible(
  req: AiRequest,
  endpoint: string,
  providerTag: AiProvider,
): Promise<AiResponse> {
  const model = resolveModel(req)
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userPrompt },
    ],
    temperature: 0.3,
  }
  if (req.jsonMode) body.response_format = { type: 'json_object' }
  if (req.maxTokens) body.max_tokens = req.maxTokens

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${providerTag}_${res.status}: ${text.substring(0, 200)}`)
  }
  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content ?? ''
  const tokensUsed = json?.usage?.total_tokens ?? 0
  return { content, tokensUsed, model, provider: providerTag }
}

async function callGoogle(req: AiRequest): Promise<AiResponse> {
  const model = resolveModel(req)
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(req.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: req.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: req.jsonMode ? 'application/json' : 'text/plain',
        maxOutputTokens: req.maxTokens ?? 2500,
      },
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`google_${res.status}: ${text.substring(0, 200)}`)
  }
  const json = await res.json()
  const parts = json?.candidates?.[0]?.content?.parts ?? []
  const content = parts.map((p: { text?: string }) => p?.text ?? '').join('')
  const tokensUsed =
    (json?.usageMetadata?.promptTokenCount ?? 0) +
    (json?.usageMetadata?.candidatesTokenCount ?? 0)
  return { content, tokensUsed, model, provider: 'google' }
}

async function callOllama(req: AiRequest): Promise<AiResponse> {
  const model = resolveModel(req)
  const base = (req.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.3 },
      format: req.jsonMode ? 'json' : undefined,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ollama_${res.status}: ${text.substring(0, 200)}`)
  }
  const json = await res.json()
  const content = json?.message?.content ?? ''
  const tokensUsed =
    (json?.prompt_eval_count ?? 0) + (json?.eval_count ?? 0)
  return { content, tokensUsed, model, provider: 'ollama' }
}

// -------------------- Public dispatcher --------------------

export async function callAi(req: AiRequest): Promise<AiResponse> {
  if (!req.apiKey && req.provider !== 'ollama') {
    throw new Error('missing_api_key')
  }
  switch (req.provider) {
    case 'anthropic':
      return callAnthropic(req)
    case 'openai':
      return callOpenAICompatible(req, 'https://api.openai.com/v1/chat/completions', 'openai')
    case 'mistral':
      return callOpenAICompatible(req, 'https://api.mistral.ai/v1/chat/completions', 'mistral')
    case 'groq':
      return callOpenAICompatible(req, 'https://api.groq.com/openai/v1/chat/completions', 'groq')
    case 'google':
      return callGoogle(req)
    case 'ollama':
      return callOllama(req)
    default:
      throw new Error(`unsupported_provider:${req.provider}`)
  }
}

/**
 * Parse JSON content from AI output, stripping markdown fences.
 * Throws on invalid JSON.
 */
export function parseJsonContent<T = unknown>(raw: string): T {
  const cleaned = stripJsonFences(raw)
  return JSON.parse(cleaned) as T
}
