// ai-research-analyst: take aggregated raw data (Amazon + suppliers + tools)
// and produce a structured FBA viability report via OpenAI GPT-4o.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert Amazon FBA product analyst. You receive raw data about a product from multiple sources (Amazon, Alibaba, 1688, Zentrada, Helium 10, Jungle Scout) and produce a structured viability report.

Your knowledge includes:
- FBA fees by marketplace and product size tier (small standard, large standard, small oversize, etc.)
- Typical margins by category (15-40% net is healthy for private label)
- Common risks: IP/patent issues, gated categories, hazmat, seasonal dependency, high competition
- Shipping costs: sea freight ~$4-8/kg, air freight ~$8-15/kg from China to EU
- PPC costs: typical ACoS 15-35% depending on category and competition level

Always respond in valid JSON with the exact structure provided. Be direct and honest. If data is insufficient, say so.`;

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
}`;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function callOpenAI(userPayload: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
          { role: "user", content: OUTPUT_SCHEMA_HINT },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callAnthropic(userPayload: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `${userPayload}\n\n${OUTPUT_SCHEMA_HINT}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.content?.[0]?.text ?? "";
    return text;
  } catch {
    return null;
  }
}

function fallbackReport(input: unknown): Record<string, unknown> {
  return {
    market: {
      selling_price: { min: 0, max: 0, currency: "EUR" },
      bsr: 0,
      reviews_range: "low",
      competition_level: "medium",
      search_volume: 0,
      trend: "unknown",
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
      summary: "Marge no calculable sense dades completes.",
    },
    risks: [
      {
        type: "other",
        severity: "medium",
        description: "L'informe automàtic no ha pogut completar-se. Cal verificar manualment.",
      },
    ],
    viability_score: 0,
    recommendation: "needs-research",
    next_steps: [
      "Verificar manualment preus a Alibaba i 1688",
      "Comprovar BSR i reviews a la pàgina del producte",
      "Analitzar dimensions i pes per estimar FBA fees",
    ],
    executive_summary:
      "L'anàlisi automàtic no ha pogut completar-se per falta de dades o configuració (OPENAI_API_KEY / ANTHROPIC_API_KEY). Verifica les dades manualment.",
    _meta: { source: "fallback", raw_input_snapshot: input },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return jsonResponse({ error: "Invalid JWT" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const payload = JSON.stringify(body, null, 2);
  const userPayload = `Here is the aggregated raw data for a product viability analysis. Produce the structured JSON report.\n\nRAW_DATA:\n${payload}`;

  // Try OpenAI first; fall back to Anthropic; then to static fallback.
  let raw = await callOpenAI(userPayload);
  if (!raw) raw = await callAnthropic(userPayload);

  if (!raw) {
    return jsonResponse(fallbackReport(body), 200);
  }

  let parsed: Record<string, unknown>;
  try {
    // Strip any leading markdown fences just in case
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ ...fallbackReport(body), _meta: { parse_error: true, raw } }, 200);
  }

  return jsonResponse(parsed, 200);
});
