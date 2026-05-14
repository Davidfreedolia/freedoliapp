/**
 * D19.2 — Widget Reorder candidates a la Home.
 */
import { useTranslation } from 'react-i18next'

const MAX_ITEMS = 5

export default function HomeReorderCandidates({ reorder = {}, loading }) {
  const { t } = useTranslation()
  const candidates = Array.isArray(reorder.candidates) ? reorder.candidates.slice(0, MAX_ITEMS) : []
  const isEmpty = candidates.length === 0

  const formatDays = (value) => {
    if (value == null || !Number.isFinite(value)) return '—'
    const n = Number(value)
    if (n < 0) return '—'
    return n <= 1 ? t('home.reorderCandidates.day', { n }) : t('home.reorderCandidates.days', { n: Math.round(n) })
  }

  if (loading) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">{t('home.reorderCandidates.title')}</div>
        <div className="dashboard-home-card__placeholder">{t('common.loading')}</div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="dashboard-home-card dashboard-home-card--list">
        <div className="dashboard-home-card__title">{t('home.reorderCandidates.title')}</div>
        <div className="dashboard-home-card__placeholder">{t('home.reorderCandidates.empty')}</div>
      </div>
    )
  }

  return (
    <div className="dashboard-home-card dashboard-home-card--list">
      <div className="dashboard-home-card__title">{t('home.reorderCandidates.title')}</div>
      <ul className="dashboard-home-card__list">
        {candidates.map((row) => (
          <li key={row.asin} className="dashboard-home-card__listRow dashboard-home-card__listRow--stacked">
            <div className="dashboard-home-card__listPrimary">
              {row.productName && row.productName.trim() ? row.productName.trim() : row.asin || '—'}
              {row.confidence === 'low' && (
                <span className="dashboard-home-card__hint" title={Array.isArray(row.issues) ? row.issues.join(', ') : ''}>
                  {' '}{t('home.reorderCandidates.lowConfidence')}
                </span>
              )}
            </div>
            <div className="dashboard-home-card__metaWrap">
              <span title={t('home.reorderCandidates.reorderTooltip')}>
                {t('home.reorderCandidates.reorderLabel')} {Number.isFinite(row.reorderUnits) ? row.reorderUnits : '—'}
              </span>
              <span>{t('home.reorderCandidates.stockoutIn')} {formatDays(row.daysUntilStockout)}</span>
              <span>{t('home.reorderCandidates.stock')} {Number.isFinite(row.stockOnHand) ? row.stockOnHand : '—'}</span>
              <span>{t('home.reorderCandidates.incoming')} {Number.isFinite(row.incomingUnits) ? row.incomingUnits : '—'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
