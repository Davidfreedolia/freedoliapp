import React, { useEffect, useState, useCallback } from 'react'
import { useWorkspace } from '../../../contexts/WorkspaceContext'
import { supabase } from '../../../lib/supabase'
import Card from '../../ui/Card'
import Button from '../../ui/Button'
import Badge from '../../ui/Badge'
import useT from '../../../hooks/useT'
import { RefreshCw, AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

function last30Days() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default function ProjectEconomicsSection({ projectId }) {
  const t = useT()
  const { activeOrgId } = useWorkspace()
  const [loading, setLoading] = useState(true)
  const [recomputeLoading, setRecomputeLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kpi, setKpi] = useState(null)
  const [series, setSeries] = useState([])

  const range = last30Days()

  const fetchKpi = useCallback(async () => {
    if (!activeOrgId || !projectId) return
    setLoading(true)
    setError(null)
    try {
      const [kpiRes, seriesRes] = await Promise.all([
        supabase.rpc('rpc_product_profit_kpi_range', {
          p_org_id: activeOrgId,
          p_product_id: projectId,
          p_from: range.from,
          p_to: range.to,
        }),
        supabase.rpc('rpc_product_profit_series', {
          p_org_id: activeOrgId,
          p_product_id: projectId,
          p_from: range.from,
          p_to: range.to,
        }),
      ])
      if (kpiRes.error) throw kpiRes.error
      if (seriesRes.error) throw seriesRes.error
      setKpi(Array.isArray(kpiRes.data) && kpiRes.data.length > 0 ? kpiRes.data[0] : null)
      setSeries(Array.isArray(seriesRes.data) ? seriesRes.data : [])
    } catch (e) {
      setError(e?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, projectId, range.from, range.to])

  useEffect(() => {
    fetchKpi()
  }, [fetchKpi])

  const handleRecompute = async () => {
    if (!activeOrgId) return
    setRecomputeLoading(true)
    try {
      await supabase.rpc('rpc_profit_recompute_org', {
        p_org_id: activeOrgId,
        p_from: range.from,
        p_to: range.to,
      })
      await fetchKpi()
    } catch (e) {
      setError(e?.message || 'Error')
    } finally {
      setRecomputeLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="project-tabs__placeholder">{t('common.loading')}</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <p className="project-economics__error">{error}</p>
      </Card>
    )
  }

  const row = kpi || {}
  const incomplete = row.is_profit_incomplete === true

  return (
    <div className="project-economics">
      {incomplete && (
        <div className="project-economics__callout" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{t('projects.economics.incompleteCallout')}</span>
        </div>
      )}

      <div className="project-economics__chips">
        <Badge variant="neutral">
          {t('projects.economics.coverage')}: {row.coverage_pct != null ? `${Number(row.coverage_pct)}%` : '—'}
        </Badge>
        <Badge variant={incomplete ? 'warning' : 'success'}>
          {incomplete ? t('projects.economics.profitIncomplete') : t('projects.economics.profitComplete')}
        </Badge>
        <Button
          variant="secondary"
          size="sm"
          disabled={recomputeLoading}
          loading={recomputeLoading}
          onClick={handleRecompute}
        >
          <RefreshCw size={16} aria-hidden />
          {t('projects.economics.recomputeCta')}
        </Button>
      </div>

      <div className="project-economics__kpis">
        <Card className="project-economics__kpi">
          <span className="project-economics__kpiLabel">{t('projects.economics.netRevenue')}</span>
          <span className="project-economics__kpiValue">{formatNum(row.net_revenue)}</span>
        </Card>
        <Card className="project-economics__kpi">
          <span className="project-economics__kpiLabel">{t('projects.economics.contributionMargin')}</span>
          <span className="project-economics__kpiValue">{formatNum(row.contribution_margin)}</span>
        </Card>
        <Card className="project-economics__kpi">
          <span className="project-economics__kpiLabel">{t('projects.economics.marginPct')}</span>
          <span className="project-economics__kpiValue">{row.margin_pct != null ? `${Number(row.margin_pct)}%` : '—'}</span>
        </Card>
      </div>

      <Card>
        <h3 className="project-economics__breakdownTitle">{t('projects.economics.breakdown')}</h3>
        <dl className="project-economics__breakdown">
          <div><dt>{t('projects.economics.amazonFees')}</dt><dd>{formatNum(row.amazon_fees)}</dd></div>
          <div><dt>{t('projects.economics.refunds')}</dt><dd>{formatNum(row.refunds)}</dd></div>
          <div><dt>{t('projects.economics.ads')}</dt><dd>{formatNum(row.ads)}</dd></div>
          <div><dt>{t('projects.economics.freight')}</dt><dd>{formatNum(row.freight)}</dd></div>
          <div><dt>{t('projects.economics.duties')}</dt><dd>{formatNum(row.duties)}</dd></div>
          <div><dt>{t('projects.economics.otherCosts')}</dt><dd>{formatNum(row.other_costs)}</dd></div>
          <div><dt>{t('projects.economics.cogs')}</dt><dd>{formatNum(row.cogs)}</dd></div>
        </dl>
      </Card>

      {series.length >= 2 ? (
        <>
          <Card className="project-economics__chartCard">
            <div className="project-economics__chartTitleRow">
              <h3 className="project-economics__chartTitle">{t('projects.economics.seriesTitleMargin')}</h3>
              {incomplete && <Badge variant="warning">{t('projects.economics.profitIncomplete')}</Badge>}
            </div>
            <div className="project-economics__chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series.map((s) => ({ ...s, contribution_margin: num(s.contribution_margin) }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="project-economics__grid" />
                  <XAxis dataKey="d" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumShort(v)} />
                  <Tooltip formatter={(v) => formatNum(v)} labelFormatter={(d) => d} />
                  <Line type="monotone" dataKey="contribution_margin" name={t('projects.economics.contributionMargin')} stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="project-economics__chartCard">
            <div className="project-economics__chartTitleRow">
              <h3 className="project-economics__chartTitle">{t('projects.economics.seriesTitleRevenueFees')}</h3>
              {incomplete && <Badge variant="warning">{t('projects.economics.profitIncomplete')}</Badge>}
            </div>
            <div className="project-economics__chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series.map((s) => ({ ...s, net_revenue: num(s.net_revenue), amazon_fees: num(s.amazon_fees) }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="project-economics__grid" />
                  <XAxis dataKey="d" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumShort(v)} />
                  <Tooltip formatter={(v) => formatNum(v)} labelFormatter={(d) => d} />
                  <Legend />
                  <Line type="monotone" dataKey="net_revenue" name={t('projects.economics.netRevenue')} stroke="var(--color-success)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="amazon_fees" name={t('projects.economics.amazonFees')} stroke="var(--color-warning)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      ) : (
        <Card className="project-economics__chartCard">
          <p className="project-economics__notEnoughData">{t('projects.economics.notEnoughData')}</p>
        </Card>
      )}
    </div>
  )
}

function formatNum(n) {
  if (n == null) return '—'
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatNumShort(n) {
  if (n == null) return ''
  const x = Number(n)
  if (Number.isNaN(x)) return ''
  if (Math.abs(x) >= 1000) return (x / 1000).toFixed(1) + 'k'
  return x.toFixed(0)
}

function num(n) {
  if (n == null) return 0
  const x = Number(n)
  return Number.isNaN(x) ? 0 : x
}
