// ASIN enrichment: scrape title from Amazon, optional OpenAI summary.
// Replaces Vercel serverless /api/asin-enrich. Invoke with body: { asin, market? }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
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
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }

  let body: { asin?: string; market?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const asinInput = (body?.asin ?? "").toString().trim();
  const marketInput = (body?.market ?? "es").toString().trim().toLowerCase();
  const asin = /^B0[A-Z0-9]{8}$/i.test(asinInput) ? asinInput.toUpperCase() : "";
  if (!asin) {
    return jsonResponse({ error: "invalid_asin" }, 400);
  }

  const market = /^([a-z]{2}|co\.[a-z]{2})$/i.test(marketInput) ? marketInput : "es";
  const product_url = `https://www.amazon.${market}/dp/${asin}`;
  const thumb_url = `https://m.media-amazon.com/images/P/${asin}.01._SX300_SY300_.jpg`;

  const fallback = {
    asin,
    title: `ASIN ${asin}`,
    short_description: "",
    thumb_url,
    product_url,
    source: "fallback",
  };

  let extractedTitle = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const htmlRes = await fetch(product_url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "accept-language": "ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const titleMatch =
        html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\//i) ||
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      extractedTitle = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
    }
  } catch {
    // ignore
  }

  if (!OPENAI_API_KEY) {
    return jsonResponse({
      ...fallback,
      title: extractedTitle || fallback.title,
    });
  }

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output ONLY valid JSON with keys: title, short_description." },
          {
            role: "user",
            content: [
              "Given raw title and url, return JSON with keys: title, short_description.",
              "Language: Catalan. Title max 120 chars. short_description max 180 chars. No markdown.",
              `RAW_TITLE: ${extractedTitle || ""}`,
              `URL: ${product_url}`,
            ].join("\n"),
          },
        ],
        temperature: 0.2,
      }),
    });
    if (!aiRes.ok) {
      return jsonResponse({
        ...fallback,
        title: extractedTitle || fallback.title,
      });
    }
    const aiJson = await aiRes.json();
    const outputText = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: { title?: string; short_description?: string } = {};
    try {
      parsed = JSON.parse(outputText);
    } catch {
      parsed = {};
    }
    const title = (parsed.title ?? extractedTitle ?? fallback.title).toString().trim();
    const short_description = (parsed.short_description ?? "").toString().trim();
    return jsonResponse({
      asin,
      product_url,
      thumb_url,
      title,
      short_description,
      source: "ai",
    });
  } catch {
    return jsonResponse({
      ...fallback,
      title: extractedTitle || fallback.title,
    });
  }
});
