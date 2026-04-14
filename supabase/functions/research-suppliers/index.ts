// research-suppliers: scrape Alibaba + 1688 + Zentrada in parallel for supplier pricing.
// Results cached 24h in supplier_search_cache (keyed by keywords+source).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

const FETCH_HEADERS = {
  "user-agent": UA,
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Approximate FX rates for on-the-fly conversion (updated roughly; not for accounting).
const FX_TO_EUR: Record<string, number> = {
  EUR: 1, USD: 0.92, GBP: 1.17, CNY: 0.13, JPY: 0.0062,
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function toEUR(amount: number, currency: string): number {
  const rate = FX_TO_EUR[currency.toUpperCase()] ?? 1;
  return +(amount * rate).toFixed(2);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------------- Alibaba ----------------
function parseAlibaba(html: string) {
  const results: Array<{
    product_name: string;
    price_range: { min: number; max: number; currency: string };
    moq: number | null;
    supplier_name: string | null;
    supplier_country: string | null;
    supplier_years: number | null;
  }> = [];

  // Alibaba embeds JSON in data-spm or inline script; try multiple fallbacks.
  // Primary: card-info blocks with h2 product title + $price.
  const cards = html.match(/<div[^>]*class=["'][^"']*(?:card-info|search-card-info|list-no-v2-left-card)[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi) || [];
  for (const card of cards.slice(0, 12)) {
    const nameMatch =
      card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
      card.match(/title=["']([^"']+)["'][^>]*class=["'][^"']*title/i);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
    if (!name) continue;

    const priceMatch = card.match(/\$\s*([\d.,]+)(?:\s*-\s*\$?\s*([\d.,]+))?/);
    let min = 0, max = 0;
    if (priceMatch) {
      min = parseFloat(priceMatch[1].replace(/,/g, ""));
      max = priceMatch[2] ? parseFloat(priceMatch[2].replace(/,/g, "")) : min;
    }
    if (!Number.isFinite(min) || min === 0) continue;

    const moqMatch = card.match(/Min[^<]{0,40}?(\d[\d.,]*)/i);
    const moq = moqMatch ? parseInt(moqMatch[1].replace(/[^\d]/g, ""), 10) : null;

    const supplierMatch = card.match(/class=["'][^"']*(?:supplier|company)[^"']*["'][^>]*>([^<]+)</i);
    const countryMatch = card.match(/flag-([a-z]{2})/i);

    results.push({
      product_name: name.substring(0, 200),
      price_range: { min, max, currency: "USD" },
      moq,
      supplier_name: supplierMatch ? supplierMatch[1].trim() : null,
      supplier_country: countryMatch ? countryMatch[1].toUpperCase() : null,
      supplier_years: null,
    });
    if (results.length >= 8) break;
  }

  return results;
}

async function searchAlibaba(keywords: string) {
  const url = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keywords)}`;
  const html = await fetchWithTimeout(url, 10000);
  if (!html) return { status: "unavailable", reason: "fetch_failed", results: [] };
  if (html.includes("captcha") || html.length < 5000) {
    return { status: "unavailable", reason: "blocked_or_captcha", results: [] };
  }
  const results = parseAlibaba(html);
  if (results.length === 0) return { status: "unavailable", reason: "no_results_parsed", results: [] };
  return { status: "ok", results, searched_at: new Date().toISOString() };
}

// ---------------- 1688 ----------------
function parse1688(html: string) {
  const results: Array<{
    product_name: string;
    price_range: { min: number; max: number; currency: string; min_eur: number; max_eur: number };
    moq: number | null;
  }> = [];

  const cards = html.match(/<div[^>]*class=["'][^"']*(?:offer|sm-offer-item|space-offer-card-box)[^"']*["'][\s\S]{0,1500}?<\/div>/gi) || [];
  for (const card of cards.slice(0, 12)) {
    const nameMatch = card.match(/title=["']([^"']+)["']/i) || card.match(/<a[^>]*>\s*([^<]{6,120})\s*<\/a>/i);
    const name = nameMatch ? nameMatch[1].replace(/\s+/g, " ").trim() : "";
    if (!name) continue;

    const priceMatch = card.match(/¥\s*([\d.]+)(?:\s*-\s*¥?\s*([\d.]+))?/) || card.match(/class=["'][^"']*price[^"']*["'][^>]*>([\d.]+)/i);
    if (!priceMatch) continue;
    const min = parseFloat(priceMatch[1]);
    const max = priceMatch[2] ? parseFloat(priceMatch[2]) : min;
    if (!Number.isFinite(min) || min === 0) continue;

    const moqMatch = card.match(/(\d[\d,]*)\s*件起批/) || card.match(/起订量[^<]*?(\d[\d,]*)/);
    const moq = moqMatch ? parseInt(moqMatch[1].replace(/[^\d]/g, ""), 10) : null;

    results.push({
      product_name: name.substring(0, 200),
      price_range: {
        min, max, currency: "CNY",
        min_eur: toEUR(min, "CNY"),
        max_eur: toEUR(max, "CNY"),
      },
      moq,
    });
    if (results.length >= 8) break;
  }
  return results;
}

async function search1688(keywords: string) {
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keywords)}`;
  const html = await fetchWithTimeout(url, 10000);
  if (!html) return { status: "unavailable", reason: "fetch_failed", results: [] };
  if (html.length < 5000 || /punish|verify/i.test(html.substring(0, 3000))) {
    return { status: "unavailable", reason: "blocked", results: [] };
  }
  const results = parse1688(html);
  if (results.length === 0) return { status: "unavailable", reason: "no_results_parsed", results: [] };
  return { status: "ok", results, searched_at: new Date().toISOString() };
}

// ---------------- Zentrada ----------------
function parseZentrada(html: string) {
  const results: Array<{
    product_name: string;
    price: number;
    currency: string;
    supplier: string | null;
    country: string | null;
  }> = [];
  const cards = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) ||
    html.match(/<div[^>]*class=["'][^"']*(?:product-item|search-hit)[^"']*["'][\s\S]{0,1200}?<\/div>/gi) || [];
  for (const card of cards.slice(0, 10)) {
    const nameMatch = card.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
    if (!name) continue;

    const priceMatch = card.match(/€\s*([\d.,]+)/) || card.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*€?\s*([\d.,]+)/i);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(price) || price === 0) continue;

    const supplierMatch = card.match(/class=["'][^"']*(?:supplier|seller)[^"']*["'][^>]*>([^<]+)</i);
    const countryMatch = card.match(/\b([A-Z]{2})\b(?=\s*$|\s*<)/);

    results.push({
      product_name: name.substring(0, 200),
      price,
      currency: "EUR",
      supplier: supplierMatch ? supplierMatch[1].trim() : null,
      country: countryMatch ? countryMatch[1] : null,
    });
    if (results.length >= 6) break;
  }
  return results;
}

async function searchZentrada(keywords: string) {
  const url = `https://www.zentrada.network/search?q=${encodeURIComponent(keywords)}`;
  const html = await fetchWithTimeout(url, 10000);
  if (!html) return { status: "unavailable", reason: "fetch_failed", results: [] };
  if (html.length < 3000) return { status: "unavailable", reason: "empty", results: [] };
  const results = parseZentrada(html);
  if (results.length === 0) return { status: "unavailable", reason: "no_results_parsed", results: [] };
  return { status: "ok", results, searched_at: new Date().toISOString() };
}

// ---------------- Cache helpers (service role) ----------------
function getServiceClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function getFromCache(keywords: string, source: string) {
  const svc = getServiceClient();
  if (!svc) return null;
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data } = await svc
    .from("supplier_search_cache")
    .select("results, searched_at")
    .eq("keywords", keywords)
    .eq("source", source)
    .gte("searched_at", since)
    .order("searched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function putInCache(keywords: string, source: string, payload: unknown) {
  const svc = getServiceClient();
  if (!svc) return;
  await svc.from("supplier_search_cache").insert({
    keywords,
    source,
    results: payload as object,
  });
}

async function withCache<T>(keywords: string, source: string, run: () => Promise<T>): Promise<T> {
  const hit = await getFromCache(keywords, source);
  if (hit) return hit.results as T;
  const fresh = await run();
  // Fire-and-forget cache write
  putInCache(keywords, source, fresh).catch(() => {});
  return fresh;
}

// ---------------- Handler ----------------
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

  let body: { keywords?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const keywords = (body.keywords ?? "").toString().trim().toLowerCase();
  if (!keywords || keywords.length < 3) {
    return jsonResponse({ error: "keywords_required" }, 400);
  }

  const [alibaba, onecom688, zentrada] = await Promise.allSettled([
    withCache(keywords, "alibaba", () => searchAlibaba(keywords)),
    withCache(keywords, "1688", () => search1688(keywords)),
    withCache(keywords, "zentrada", () => searchZentrada(keywords)),
  ]);

  const unwrap = (r: PromiseSettledResult<unknown>) =>
    r.status === "fulfilled"
      ? (r.value as object)
      : { status: "unavailable", reason: "exception", results: [] };

  return jsonResponse({
    keywords,
    alibaba: unwrap(alibaba),
    onecom688: unwrap(onecom688),
    zentrada: unwrap(zentrada),
  });
});
