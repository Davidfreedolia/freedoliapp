/**
 * Frontend helpers for the BYOC Keepa integration.
 *
 * - getKeepaConnection / upsertKeepaConnection / deleteKeepaConnection read
 *   and write a `tool_connections` row with tool_name='keepa'.
 * - fetchKeepaHistory invokes the `keepa-history` edge function which
 *   resolves the API key (user BYOC first, platform fallback second) and
 *   returns normalized price + BSR series.
 *
 * The API key is never displayed in the UI — only the last 4 characters.
 */
import { supabase } from './supabase'
import { maskKey } from './ai/aiProvider'

/** Fetch the current Keepa connection for an org (or null). */
export async function getKeepaConnection(orgId) {
  if (!orgId) return null
  const { data, error } = await supabase
    .from('tool_connections')
    .select('id, credentials, status, created_at, updated_at')
    .eq('org_id', orgId)
    .eq('tool_name', 'keepa')
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const creds = data.credentials || {}
  return {
    id: data.id,
    apiKeyMasked: maskKey(creds.api_key || ''),
    hasKey: Boolean(creds.api_key),
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/** Create or update the Keepa connection for an org. */
export async function upsertKeepaConnection(orgId, { apiKey }) {
  if (!orgId) throw new Error('no_active_org')
  if (!apiKey || !apiKey.trim()) throw new Error('missing_api_key')
  const credentials = { api_key: apiKey.trim() }
  const { data: existing } = await supabase
    .from('tool_connections')
    .select('id')
    .eq('org_id', orgId)
    .eq('tool_name', 'keepa')
    .maybeSingle()
  if (existing?.id) {
    const { error } = await supabase
      .from('tool_connections')
      .update({ credentials, status: 'active' })
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, updated: true }
  }
  const { data, error } = await supabase
    .from('tool_connections')
    .insert({
      org_id: orgId,
      tool_name: 'keepa',
      auth_type: 'api_key',
      credentials,
      status: 'active',
    })
    .select('id')
    .maybeSingle()
  if (error) throw error
  return { id: data?.id, updated: false }
}

/** Remove the Keepa connection. */
export async function deleteKeepaConnection(orgId) {
  if (!orgId) return false
  const { error } = await supabase
    .from('tool_connections')
    .delete()
    .eq('org_id', orgId)
    .eq('tool_name', 'keepa')
  if (error) throw error
  return true
}

/**
 * Fetch normalized price + BSR + rating history from Keepa via the edge
 * function. The function resolves the key automatically (org BYOC first,
 * platform fallback second).
 *
 * @returns one of:
 *   { status: 'ok', source, data: { snapshot, series, ... } }
 *   { status: 'not_connected' }                  ← UI should show "Connect Keepa"
 *   { status: 'invalid_asin' }
 *   { status: 'upstream_error', code?, message? }
 */
export async function fetchKeepaHistory({ asin, marketplace = 'ES' }) {
  if (!asin) throw new Error('asin_required')
  const { data, error } = await supabase.functions.invoke('keepa-history', {
    body: { asin, marketplace },
  })
  if (error) {
    return { status: 'invoke_error', message: error.message || String(error) }
  }
  return data
}
