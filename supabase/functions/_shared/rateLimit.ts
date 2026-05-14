// _shared/rateLimit.ts — token-bucket rate limiter for Edge Functions.
//
// Why this exists
// ---------------
// Supabase Edge Functions are billed per invocation and per CPU-second.
// Without throttling, one misbehaving client (or a determined attacker)
// can:
//   • burn through the project's invocation quota in minutes,
//   • drive up the Stripe API rate-limit and lock out legitimate
//     customers,
//   • exhaust the OpenAI / Anthropic spend that backs research-* +
//     ai-research-analyst.
//
// Design
// ------
// The limiter is a tiny token-bucket kept in-memory inside the function
// runtime. Each Edge Function instance has its own bucket store, which
// is acceptable because:
//   1. Each instance handles a handful of concurrent invocations before
//      Supabase spins up another, so per-instance state is "good enough"
//      for abuse mitigation.
//   2. We pair the rate limit with the user's JWT, so even if the
//      attacker shards across instances they still need a valid user to
//      hit it.
//   3. For a stricter cross-instance limit you would normally use Redis
//      or Supabase Postgres; that's a follow-up if abuse patterns
//      actually appear.
//
// Usage
// -----
//   import { rateLimit } from "../_shared/rateLimit.ts";
//   const guard = rateLimit({ id: "stripe-checkout", capacity: 10,
//                             refillPerSecond: 1 });
//   // Inside the request handler, AFTER you have userId:
//   const result = guard(`user:${userId}`);
//   if (!result.allowed) {
//     return new Response("Too Many Requests", { status: 429,
//       headers: { "Retry-After": String(result.retryAfter) } });
//   }
//
// The bucket key should be the most specific identifier you have:
//   • Authenticated: `user:${userId}` (and optionally `:${orgId}`)
//   • Unauthenticated webhooks/public endpoints: `ip:${ip}` from the
//     `x-forwarded-for` or `cf-connecting-ip` header.

type Bucket = {
  tokens: number;
  updatedAt: number;
};

type LimiterConfig = {
  /** Unique limiter id, used to namespace separate buckets. */
  id: string;
  /** Max burst size (tokens in the bucket when full). */
  capacity: number;
  /** Refill rate, in tokens per second. */
  refillPerSecond: number;
  /** Optional: only enforce the limit when this returns true. */
  enabled?: () => boolean;
};

type RateLimitResult = {
  allowed: boolean;
  /** Seconds to wait before the next allowed request (ceil). 0 when allowed. */
  retryAfter: number;
  /** Remaining tokens after this call (for X-RateLimit-Remaining header). */
  remaining: number;
};

const stores = new Map<string, Map<string, Bucket>>();

export function rateLimit(cfg: LimiterConfig) {
  if (!stores.has(cfg.id)) stores.set(cfg.id, new Map());
  const store = stores.get(cfg.id)!;
  const enabled = cfg.enabled ?? (() => true);

  return function check(key: string): RateLimitResult {
    if (!enabled()) {
      return { allowed: true, retryAfter: 0, remaining: cfg.capacity };
    }
    const now = Date.now();
    const existing = store.get(key);
    let tokens: number;
    if (!existing) {
      tokens = cfg.capacity;
    } else {
      const elapsedMs = now - existing.updatedAt;
      const refill = (elapsedMs / 1000) * cfg.refillPerSecond;
      tokens = Math.min(cfg.capacity, existing.tokens + refill);
    }
    if (tokens >= 1) {
      tokens -= 1;
      store.set(key, { tokens, updatedAt: now });
      return { allowed: true, retryAfter: 0, remaining: Math.floor(tokens) };
    }
    // Not enough tokens. Compute seconds until 1 token is available.
    const deficit = 1 - tokens;
    const retryAfter = Math.ceil(deficit / cfg.refillPerSecond);
    store.set(key, { tokens, updatedAt: now });
    return { allowed: false, retryAfter, remaining: 0 };
  };
}

/** Helper to build a 429 Response with the right headers. */
export function tooManyRequests(result: RateLimitResult, extraHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Remaining": String(result.remaining),
        ...extraHeaders,
      },
    },
  );
}

/**
 * Extract a best-effort caller identifier from the request.
 *   Prefer x-forwarded-for, fall back to cf-connecting-ip, then to the
 *   special string "unknown" so a single throttling key catches stray
 *   abuse.
 */
export function callerIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "unknown";
}
