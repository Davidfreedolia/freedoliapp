/**
 * Centralized feature flags (read from Vite env at build time).
 *
 * To enable a flag in production, set the env var in Vercel → Project → Settings
 * → Environment Variables (must be prefixed with VITE_ to be exposed to the client).
 *
 * All flags default to OFF so production is safe unless explicitly enabled.
 */

function readBool(envKey) {
  const raw = import.meta.env?.[envKey]
  if (raw == null) return false
  const v = String(raw).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

/**
 * Logistics → Tracking sync.
 *
 * Currently the backend `tracking-sync` edge function points to a mock 17TRACK
 * endpoint (see `supabase/functions/tracking-sync/index.ts`). Until we have
 * a real 17TRACK contract + key, the "Sync Now" buttons are hidden in the UI.
 *
 * Enable with: VITE_ENABLE_TRACKING_SYNC=true
 */
export const isTrackingSyncEnabled = () => readBool('VITE_ENABLE_TRACKING_SYNC')

/**
 * Beta override — disable billing limits on the frontend.
 *
 * During closed beta the Stripe entitlement may still report `team.seats=1`
 * or `projects.max=3` while the user is invited to a workspace that already
 * has more members/projects, which routes them to `/app/billing/over-seat`
 * or raises the "límit de projectes" banner and effectively locks the app.
 *
 * Enabling this flag bypasses on the frontend:
 *   - the `over_seat` gate in `App.jsx`
 *   - the "Add member" check in `Settings.jsx`
 *   - the `WorkspaceLimitAlert` banner (seats + projects)
 *   - the plan-feature gating in `Sidebar.jsx` (all pages visible)
 *
 * Backend / Edge Functions still enforce the real entitlements — this is
 * purely a UX unblock during beta.
 *
 * Enable with: VITE_DISABLE_SEAT_LIMIT=true
 */
export const isSeatLimitDisabled = () => readBool('VITE_DISABLE_SEAT_LIMIT')

/**
 * Alias — same flag, broader intent. Use this at call sites that are not
 * strictly "seats" but still part of the beta billing bypass (project-count
 * limit banner, plan-gated sidebar items, etc.).
 */
export const isBillingLimitsDisabled = isSeatLimitDisabled
