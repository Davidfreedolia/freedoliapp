/**
 * D21.3 — Home Dashboard data wiring.
 * Únic punt d'orquestració per la Home: consumeix només fonts reals auditades a D21.2.
 * No duplica càlculs; tot passa pels helpers existents.
 */
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { getWorkspaceProfit } from '../lib/profit/getWorkspaceProfit'
import { getProfitTimeseries } from '../lib/profit/getProfitTimeseries'
import { getMarginCompressionAlerts } from '../lib/profit/getMarginCompressionAlerts'
import { getStockoutAlerts } from '../lib/inventory/getStockoutAlerts'
import { getCashflowForecast } from '../lib/finance/getCashflowForecast'
import { getReorderCandidates } from '../lib/inventory/getReorderCandidates'
import { useWorkspaceUsage } from './useWorkspaceUsage'
import { useOrgBilling } from './useOrgBilling'
import { useProjectsListState } from './useProjectsListState'

const DAYS_30 = 30
const TOP_ASINS_LIMIT = 10
const ACTIVE_PROJECTS_LIMIT = 10

function defaultDateRange30d() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (DAYS_30 - 1))
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  }
}

/**
 * Filtre "active" per projectes: exclou archived/cancelled si el camp existeix.
 * @param {Array} list
 * @returns {Array}
 */
function filterActiveProjects(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((p) => {
      const status = p?.status
      if (status == null) return true
      return status !== 'archived' && status !== 'cancelled'
    })
    .slice(0, ACTIVE_PROJECTS_LIMIT)
}

/**
 * @returns {{
 *   loading: boolean,
 *   error: string | null,
 *   data: {
 *     kpis: { netProfit30d: number | null, revenue30d: number | null, margin30d: number | null, cashNow: number | null },
 *     alerts: { margin: Array, stockout: Array },
 *     performance: { profitTrend: Array, topAsins: Array },
 *     operations: { billingUsage: object | null },
 *     projects: { active: Array },
 *     blocked: { reorderCandidates: boolean }
 *   } | null
 * }}
 */
export function useHomeDashboardData() {
  const { activeOrgId } = useApp()
  const { usage, isLoading: usageLoading, error: usageError } = useWorkspaceUsage()
  const { loading: billingLoading, billing } = useOrgBilling(activeOrgId)
  const { data: projectsList, loading: projectsLoading, error: projectsError } = useProjectsListState()

  const [asyncLoading, setAsyncLoading] = useState(false)
  const [asyncError, setAsyncError] = useState(null)
  const [asyncResult, setAsyncResult] = useState(null)

  const loadAsync = useCallback(async () => {
    if (!activeOrgId) {
      setAsyncResult(null)
      setAsyncError(null)
      return
    }
    const { dateFrom, dateTo } = defaultDateRange30d()
    setAsyncLoading(true)
    setAsyncError(null)
    try {
      const [profitRows, profitTrend, marginAlerts, stockoutAlerts, cashflowSeries] = await Promise.all([
        getWorkspaceProfit(supabase, activeOrgId, { dateFrom, dateTo }),
        getProfitTimeseries(supabase, activeOrgId, { dateFrom, dateTo }),
        getMarginCompressionAlerts(supabase, activeOrgId, { lookbackDays: 30, recentDays: 7 }),
        getStockoutAlerts(supabase, activeOrgId, { lookbackDays: 30 }),
        getCashflowForecast(supabase, activeOrgId, { forecastDays: DAYS_30 }),
      ])

      const totalRevenue = (profitRows || []).reduce((s, r) => s + (r.revenue ?? 0), 0)
      const totalNetProfit = (profitRows || []).reduce((s, r) => s + (r.netProfit ?? 0), 0)
      const margin30d =
        totalRevenue > 0 && Number.isFinite(totalRevenue)
          ? totalNetProfit / totalRevenue
          : null

      const cashNow =
        Array.isArray(cashflowSeries) && cashflowSeries.length > 0
          ? cashflowSeries[0].cashBalance
          : null

      const topAsins = (profitRows || []).slice(0, TOP_ASINS_LIMIT)

      let reorderCandidates = []
      try {
        reorderCandidates = await getReorderCandidates(supabase, activeOrgId, { limit: 5 })
      } catch {
        reorderCandidates = []
      }

      setAsyncResult({
        kpis: {
          netProfit30d: totalNetProfit,
          revenue30d: totalRevenue,
          margin30d,
          cashNow,
        },
        alerts: {
          margin: Array.isArray(marginAlerts) ? marginAlerts : [],
          stockout: Array.isArray(stockoutAlerts) ? stockoutAlerts : [],
        },
        performance: {
          profitTrend: Array.isArray(profitTrend) ? profitTrend : [],
          topAsins,
        },
        reorder: {
          candidates: Array.isArray(reorderCandidates) ? reorderCandidates : [],
          blocked: false,
        },
      })
    } catch (err) {
      setAsyncError(err?.message ?? 'Error loading home data')
      setAsyncResult(null)
    } finally {
      setAsyncLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    loadAsync()
  }, [loadAsync])

  const loading = usageLoading || billingLoading || projectsLoading || asyncLoading
  const error = asyncError || usageError || projectsError?.message || null

  const data = (() => {
    if (!activeOrgId) return null
    const base = {
      kpis: {
        netProfit30d: null,
        revenue30d: null,
        margin30d: null,
        cashNow: null,
      },
      alerts: { margin: [], stockout: [] },
      performance: { profitTrend: [], topAsins: [] },
      operations: { billingUsage: null },
      projects: { active: [] },
      reorder: { candidates: [], blocked: false },
    }
    if (asyncResult) {
      base.kpis = asyncResult.kpis
      base.alerts = asyncResult.alerts
      base.performance = asyncResult.performance
      if (asyncResult.reorder) {
        base.reorder = {
          candidates: Array.isArray(asyncResult.reorder.candidates) ? asyncResult.reorder.candidates : [],
          blocked: false,
        }
      }
    }
    base.operations.billingUsage =
      usage != null || billing != null
        ? { usage, billing }
        : null
    base.projects.active = filterActiveProjects(projectsList ?? [])
    return base
  })()

  return { loading, error, data }
}
