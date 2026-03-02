/**
 * Supabase admin client (service role) — NOMÉS serverless / backend.
 * Mai exposar al frontend.
 */
import { createClient } from '@supabase/supabase-js'

let _admin = null

export function getSupabaseAdmin() {
  if (_admin) return _admin
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for serverless')
  }
  _admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return _admin
}

export const supabaseAdmin = new Proxy({}, {
  get(_, prop) { return getSupabaseAdmin()[prop] }
})
