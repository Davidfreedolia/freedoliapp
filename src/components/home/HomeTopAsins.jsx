/**
 * D21.5 — Top ASINs per profit a la Home.
 */
import { useTranslation } from 'react-i18next'

const MAX_ITEMS = 5

const formatCurrency = (amount, lng) => {
  if (!(amount != null && Number.isFinite(amount))) return '—'
  const locale = lng === 'es' ? 'es-ES' : lng === 'en' ? 'en-US' : 'ca-ES'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)
}

const formatPercent = (ratio, lng) => {
  if (!(ratio != null && Number.isFinite(ratio))) return '—'
  const locale = lng === 'es' ? 'es-ES' : lng === 'en' ? 'en-US' : 'ca-ES'
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ratio)
}

export default function HomeTopAsins({ items = [], loading }) {
  const { t, i18n } = useTranslation()
  const list = Array.isArray(items) ? items.slice(0, MAX_ITEMS) : []

  if (loading) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">{t('home.topAsins.title')}</div>
        <div className="dashboard-home-card__placeholder">{t('common.loading')}</div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">{t('home.topAsins.title')}</div>
        <div className="dashboard-home-card__placeholder">{t('home.topAsins.empty')}</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home-card dashboard-home-card--list">
      <div className="dashboard-home-card__title">{t('home.topAsins.title')}</div>
      <ul className="dashboard-home-card__list">
        {list.map((row, index) => (
          <li key={row.asin ? `${row.asin}` : `row-${index}`} className="dashboard-home-card__listRow">
            <span className="dashboard-home-card__listPrimary">{row.asin || '—'}</span>
            <span className="dashboard-home-card__listValue">{formatCurrency(row.netProfit, i18n.language)}</span>
            <span className="dashboard-home-card__listMeta">{formatPercent(row.margin, i18n.language)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
