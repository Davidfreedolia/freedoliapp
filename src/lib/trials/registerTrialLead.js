export async function registerTrialLead(
  supabase,
  {
    email,
    name,
    companyName,
    source,
    utmSource,
    utmCampaign,
    marketingConsent, // currently accepted but not persisted without schema support
  },
) {
  try {
    const normalizedEmail = typeof email === 'string' ? email.trim() : ''
    if (!normalizedEmail) return

    const { data: existing } = await supabase
      .from('trial_registrations')
      .select('created_at')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.created_at) {
      const age = Date.now() - new Date(existing.created_at).getTime()
      const hours = age / (1000 * 60 * 60)
      if (hours < 24) return
    }

    const { error } = await supabase
      .from('trial_registrations')
      .insert([{
        email: normalizedEmail,
        name,
        company_name: companyName,
        source,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        status: 'started'
      }]);
    if (error) {
      // Do not block onboarding if this fails
      console.warn('trial registration failed', error);
    }
  } catch (e) {
    // Do not block onboarding if this fails
    console.warn('trial registration failed', e);
  }
}
