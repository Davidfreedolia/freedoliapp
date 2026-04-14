import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { PLAN_FEATURES, normalizePlanCode } from '../lib/billing/planFeatures'

/**
 * Returns the current org's plan code (normalized) + the feature matrix.
 *
 * Reads billing_org_entitlements.plan_id → billing_plans.code.
 * Falls back to 'starter' if no entitlements row or lookup fails.
 *
 *  const { planCode, features, loading } = usePlanFeatures()
 *  if (features.ai_research_per_month) { ... }
 */
export function usePlanFeatures() {
  const { activeOrgId } = useApp()
  const [planCode, setPlanCode] = useState('starter')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!activeOrgId) {
        if (!cancelled) {
          setPlanCode('starter')
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError(null)
      try {
        const { data: ent, error: entErr } = await supabase
          .from('billing_org_entitlements')
          .select('plan_id, is_active')
          .eq('org_id', activeOrgId)
          .maybeSingle()
        if (entErr) throw entErr

        let code = 'starter'
        if (ent?.plan_id) {
          const { data: plan } = await supabase
            .from('billing_plans')
            .select('code')
            .eq('id', ent.plan_id)
            .maybeSingle()
          if (plan?.code) code = plan.code
        }
        if (!cancelled) setPlanCode(normalizePlanCode(code))
      } catch (err) {
        if (!cancelled) {
          setError(err)
          setPlanCode('starter')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeOrgId])

  const features = PLAN_FEATURES[planCode] ?? PLAN_FEATURES.starter

  return { planCode, features, loading, error }
}
