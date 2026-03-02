/**
 * Server-side auth: get user from Supabase JWT (Bearer token).
 * Uses anon key only for verification; no service role needed.
 */
import { createClient } from '@supabase/supabase-js'

export async function getUserFromRequest(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return { user: null, error: 'missing_token' }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return { user: null, error: 'server_config' }

  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error) return { user: null, error: error.message }
  if (!user) return { user: null, error: 'no_user' }
  return { user, error: null }
}
