/**
 * Sentry — runtime error monitoring.
 *
 * The init runs only when both:
 *   • a DSN is provided via VITE_SENTRY_DSN, and
 *   • we're in a production build (import.meta.env.PROD).
 *
 * Dev builds stay silent so local stack traces aren't shipped, and a missing
 * DSN simply no-ops (good for CI / open-source forks).
 *
 * To enable in production:
 *   1. Create a Sentry project at https://sentry.io (free tier: 5k events/mo).
 *   2. Copy the DSN.
 *   3. Vercel → Project → Settings → Environment Variables → add
 *      VITE_SENTRY_DSN = <dsn>   (Production scope; Preview optional)
 *   4. (Optional) For source-map uploads add SENTRY_AUTH_TOKEN + the project
 *      slug to vite.config.js's sentryVitePlugin.
 *
 * Once active:
 *   • Uncaught errors and rejected promises are sent automatically.
 *   • The React ErrorBoundary at src/components/ErrorBoundary.jsx already
 *     catches render errors; Sentry will pick those up via the global handler.
 *   • Use `Sentry.captureException(err, { tags: { feature: 'x' } })` from
 *     anywhere when you want extra context for a caught error.
 */
import * as Sentry from '@sentry/react'

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || !import.meta.env.PROD) {
    return
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    release: import.meta.env.VITE_RELEASE || undefined,
    integrations: [
      // BrowserTracing: distributed traces of route navigations + fetches.
      Sentry.browserTracingIntegration(),
      // Replay: opt-in session replay on errors only (no full-session capture
      // to avoid PII leakage). Free tier includes some volume.
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Sample 10% of transactions in production — enough to spot perf issues
    // without burning through the free quota.
    tracesSampleRate: 0.1,
    // Capture replays for 100% of errors, 0% of normal sessions.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Strip query strings and known auth params from the breadcrumb URLs so
    // we never see tokens in Sentry traces.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb?.data?.url) {
        try {
          const url = new URL(breadcrumb.data.url)
          ;['access_token', 'refresh_token', 'code', 'state'].forEach((k) => {
            if (url.searchParams.has(k)) url.searchParams.set(k, '<redacted>')
          })
          breadcrumb.data.url = url.toString()
        } catch (_) {
          // Non-URL strings — leave untouched.
        }
      }
      return breadcrumb
    },
    ignoreErrors: [
      // Browser noise we don't want to be paged about.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Network blips from common ad/script blockers.
      /Loading chunk \d+ failed/,
      /Failed to fetch dynamically imported module/,
    ],
  })
  initialized = true
}

/**
 * Lightweight setter to attach the authenticated user to subsequent events
 * once the Supabase session resolves. Wired from WorkspaceContext.
 */
export function setSentryUser(user) {
  if (!initialized) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: user.id,
    // Email is PII — keep it off the default payload. If you want it shipped
    // to Sentry for support, set VITE_SENTRY_SEND_EMAIL=1 explicitly.
    email: import.meta.env.VITE_SENTRY_SEND_EMAIL === '1' ? user.email : undefined,
  })
}

/**
 * Attach extra context (workspace, route, etc.) to the next batch of events.
 */
export function setSentryContext(key, value) {
  if (!initialized) return
  Sentry.setContext(key, value)
}

/** Manual capture — use this from catch blocks where the error is informative. */
export function captureException(err, options) {
  if (!initialized) {
    if (import.meta.env.DEV) console.error('[sentry not active]', err)
    return
  }
  Sentry.captureException(err, options)
}
