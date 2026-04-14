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
