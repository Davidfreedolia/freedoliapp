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
 * Beta override — disable the seat-limit gate on the frontend.
 *
 * During closed beta the Stripe entitlement may still report `team.seats=1`
 * while the user is invited to a workspace that already has them as a
 * member, which routes them to `/app/billing/over-seat` and locks the app.
 *
 * Enabling this flag bypasses the `over_seat` gate in `App.jsx` and the
 * "Add member" check in `Settings.jsx`. Backend / Edge Functions still
 * enforce the limit — this is purely a UX unblock.
 *
 * Enable with: VITE_DISABLE_SEAT_LIMIT=true
 */
export const isSeatLimitDisabled = () => readBool('VITE_DISABLE_SEAT_LIMIT')
