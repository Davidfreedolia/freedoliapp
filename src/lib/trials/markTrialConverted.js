/**
 * D20 — Mark a trial registration as converted (trial → paid).
 * Idempotent; never throws. Only updates trial_registrations.
 */

const STATUS_PENDING = ['started', 'workspace_created']

function emptyResult(overrides = {}) {
  return {
    ok: true,
    matched: false,
    updated: false,
    matchType: null,
    trialRegistrationId: null,
    error: null,
    ...overrides
  }
}

export async function markTrialConverted(supabase, {
  workspaceId = null,
  email = null,
  convertedAt = null,
} = {}) {
  const convertedAtValue = convertedAt || new Date().toISOString()

  try {
    let row = null
    let matchType = null

    if (workspaceId) {
      const { data } = await supabase
        .from('trial_registrations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .in('status', STATUS_PENDING)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        row = data
        matchType = 'workspace_id'
      }
    }

    if (!row && email) {
      const normalizedEmail = String(email).trim().toLowerCase()
      if (normalizedEmail) {
        const { data: candidates } = await supabase
          .from('trial_registrations')
          .select('id, email')
          .in('status', STATUS_PENDING)
          .order('created_at', { ascending: false })
          .limit(10)
        const found = (candidates || []).find(
          (c) => c.email && String(c.email).trim().toLowerCase() === normalizedEmail
        )
        if (found) {
          row = { id: found.id }
          matchType = 'email'
        }
      }
    }

    if (!row) {
      return emptyResult()
    }

    const { error } = await supabase
      .from('trial_registrations')
      .update({
        status: 'converted',
        converted_at: convertedAtValue,
      })
      .eq('id', row.id)

    if (error) {
      console.warn('markTrialConverted: update failed', error)
      return emptyResult({
        ok: false,
        matched: true,
        updated: false,
        matchType,
        trialRegistrationId: row.id,
        error: error.message || String(error),
      })
    }

    return emptyResult({
      ok: true,
      matched: true,
      updated: true,
      matchType,
      trialRegistrationId: row.id,
    })
  } catch (e) {
    console.warn('markTrialConverted', e)
    return emptyResult({
      ok: false,
      error: e.message || String(e),
    })
  }
}
