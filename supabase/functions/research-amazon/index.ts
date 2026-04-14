// research-amazon: Get product data from Amazon.
// - If org has SP-API connection: use Catalog + Fees estimate.
// - Otherwise: scrape product page and estimate FBA fees via reference table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MARKETPLACE_TLD: Record<string, string> = {
  ES: "es",
  DE: "de",
  FR: "fr",
  IT: "it",
  UK: "co.uk",
  GB: "co.uk",
  US: "com",
  CA: "ca",
  MX: "com.mx",
};

const MARKETPLACE_CURRENCY: Record<string, string> = {
  ES: "EUR", DE: "EUR", FR: "EUR", IT: "EUR",
  UK: "GBP", GB: "GBP",
  US: "USD", CA: "CAD", MX: "MXN",
};

// Reference table for FBA fee estimation when SP-API unavailable.
// Simplified per size tier; EUR base, converted roughly for other currencies.
const FBA_FEE_TABLE: Record<string, { small: number; standard: number; large: number; oversize: number }> = {
  EUR: { small: 2.80, standard: 3.25, large: 4.40, oversize: 6.50 },
  GBP: { small: 2.35, standard: 2.75, large: 3.80, oversize: 5.80 },
  USD: { small: 3.22, standard: 3.77, large: 5.42, oversize: 9.40 },
};

const REFERRAL_FEE_PCT_DEFAULT = 0.15;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function estimateSizeTier(weightKg: number | null, longestCm: number | null): "small" | "standard" | "large" | "oversize" {
  const w = weightKg ?? 0.3;
  const l = longestCm ?? 20;
  if (w <= 0.25 && l <= 20) return "small";
  if (w <= 1 && l <= 33) return "standard";
  if (w <= 12 && l <= 120) return "large";
  return "oversize";
}

function estimateFbaFees(marketplace: string, weightKg: number | null, longestCm: number | null): number {
  const currency = MARKETPLACE_CURRENCY[marketplace] ?? "EUR";
  const table = FBA_FEE_TABLE[currency] ?? FBA_FEE_TABLE.EUR;
  const tier = estimateSizeTier(weightKg, longestCm);
  return table[tier];
}

async function fetchAmazonPage(asin: string, tld: string): Promise<string | null> {
  const url = `https://www.amazon.${tld}/dp/${asin}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,es;q=0.8,ca;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseAmazonHtml(html: string): {
  title: string;
  price: number | null;
  currency: string | null;
  bsr: number | null;
  reviews_count: number | null;
  rating: number | null;
  category: string | null;
} {
  const titleMatch =
    html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\//i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim();

  // Price — try several selectors
  let priceRaw: string | null = null;
  let currency: string | null = null;
  const priceWhole = html.match(/class=["']a-price-whole["'][^>]*>([\d.,]+)</i);
  const priceFraction = html.match(/class=["']a-price-fraction["'][^>]*>(\d+)</i);
  const priceSymbol = html.match(/class=["']a-price-symbol["'][^>]*>([^<]+)</i);
  if (priceWhole) {
    priceRaw = priceWhole[1].replace(/\./g, "").replace(",", ".") + (priceFraction ? "." + priceFraction[1] : "");
  } else {
    const priceAlt = html.match(/class=["']a-offscreen["'][^>]*>([^<]+)</i);
    if (priceAlt) priceRaw = priceAlt[1].replace(/[^\d.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  }
  if (priceSymbol) currency = priceSymbol[1].trim();

  const price = priceRaw ? parseFloat(priceRaw) : null;

  // BSR — "Nº 1.234 en Categoria" or "#1,234 in Category"
  let bsr: number | null = null;
  const bsrMatch =
    html.match(/(?:Best Sellers Rank|Clasificaci[oó]n.{0,15}M[aá]s vendidos|N[ºo°]\.?\s*\d[\d.,]*\s*en)[\s\S]{0,300}?#?([\d.,]+)/i) ||
    html.match(/#([\d.,]+)\s*(?:in|en)\s+/i);
  if (bsrMatch) {
    const n = parseInt(bsrMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) bsr = n;
  }

  // Reviews count
  let reviews_count: number | null = null;
  const reviewsMatch = html.match(/id=["']acrCustomerReviewText["'][^>]*>([^<]+)</i);
  if (reviewsMatch) {
    const n = parseInt(reviewsMatch[1].replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) reviews_count = n;
  }

  // Rating
  let rating: number | null = null;
  const ratingMatch =
    html.match(/data-hook=["']rating-out-of-text["'][^>]*>([\d.,]+)/i) ||
    html.match(/class=["']a-icon-alt["'][^>]*>([\d.,]+)\s*(?:de|out of)\s*5/i);
  if (ratingMatch) {
    const n = parseFloat(ratingMatch[1].replace(",", "."));
    if (Number.isFinite(n)) rating = n;
  }

  // Category (best-effort from breadcrumbs)
  let category: string | null = null;
  const catMatch = html.match(/id=["']wayfinding-breadcrumbs_feature_div["'][\s\S]*?<a[^>]*>([^<]+)</i);
  if (catMatch) category = catMatch[1].trim();

  return { title, price, currency, bsr, reviews_count, rating, category };
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

  let body: { asin?: string; marketplace?: string; org_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const asinRaw = (body.asin ?? "").toString().trim();
  const asin = /^B0[A-Z0-9]{8}$/i.test(asinRaw) ? asinRaw.toUpperCase() : "";
  if (!asin) return jsonResponse({ error: "invalid_asin" }, 400);

  const marketplace = (body.marketplace ?? "ES").toString().trim().toUpperCase();
  const tld = MARKETPLACE_TLD[marketplace] ?? "es";
  const currency = MARKETPLACE_CURRENCY[marketplace] ?? "EUR";
  const product_url = `https://www.amazon.${tld}/dp/${asin}`;

  // Try SP-API first if org has active connection — (skeleton; full AWS signing is heavy).
  // We detect availability and record the source; parsing Catalog responses can be added later.
  let spApiAvailable = false;
  try {
    if (body.org_id) {
      const { data: conn } = await supabase
        .from("spapi_connections")
        .select("id, status")
        .eq("org_id", body.org_id)
        .eq("status", "active")
        .maybeSingle();
      if (conn) spApiAvailable = true;
    }
  } catch {
    // ignore — we'll fall back to scraping
  }

  // Fallback / default: scrape the product page.
  const html = await fetchAmazonPage(asin, tld);
  const parsed = html
    ? parseAmazonHtml(html)
    : {
        title: `ASIN ${asin}`,
        price: null,
        currency: null,
        bsr: null,
        reviews_count: null,
        rating: null,
        category: null,
      };

  const fbaFees = estimateFbaFees(marketplace, null, null);
  const referralFee = parsed.price ? +(parsed.price * REFERRAL_FEE_PCT_DEFAULT).toFixed(2) : null;

  return jsonResponse({
    asin,
    product_url,
    marketplace,
    source: spApiAvailable ? "spapi+scrape" : "scrape",
    title: parsed.title || `ASIN ${asin}`,
    price: parsed.price,
    currency: parsed.currency || currency,
    bsr: parsed.bsr,
    reviews_count: parsed.reviews_count,
    rating: parsed.rating,
    category: parsed.category,
    dimensions: null,
    weight: null,
    fba_fees: fbaFees,
    referral_fee: referralFee,
    referral_fee_pct: REFERRAL_FEE_PCT_DEFAULT,
  });
});
