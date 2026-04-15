import { useTranslation } from 'react-i18next'
import { CalendarDays, Package, TrendingUp, TrendingDown, Wallet, Database } from 'lucide-react'

/**
 * ImportPreviewSummary — shows what will happen when the user confirms the import.
 *
 * Props:
 *   preview:  object returned by computePreviewSummary()
 *   sourceLabel: string
 *   currency: string (ISO code, e.g. 'EUR')
 *   darkMode: boolean
 */
export default function ImportPreviewSummary({ preview, sourceLabel = '', currency = 'EUR', darkMode = false }) {
  const { t } = useTranslation()
  if (!preview) return null

  const muted = darkMode ? '#9aa1b4' : '#6b7280'
  const ink = darkMode ? '#e6e9f2' : '#1f2937'
  const borderColor = darkMode ? '#2a2a3a' : 'rgba(31,95,99,0.14)'
  const bg = darkMode ? '#11111a' : '#f7faf4'

  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n || 0)
    } catch {
      return `${(n || 0).toFixed(2)} ${currency}`
    }
  }

  const cardStyle = {
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    backgroundColor: bg,
    color: ink,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
  }

  const labelStyle = { fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }
  const valueStyle = { fontWeight: 700, fontSize: 15 }

  const net = preview.netProfit ?? 0
  const netPositive = net >= 0

  return (
    <div style={{
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: 16,
      backgroundColor: darkMode ? '#0f0f17' : '#ffffff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Database size={16} color="var(--brand-1,#1F5F63)" />
        <strong style={{ color: ink, fontSize: 14 }}>
          {t('dataImport.preview.title', 'Resum de la importació')}
        </strong>
        {sourceLabel && (
          <span style={{ color: muted, fontSize: 12 }}>· {sourceLabel}</span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10,
      }}>
        {preview.dateRange && (
          <div style={cardStyle}>
            <CalendarDays size={18} color="var(--brand-1,#1F5F63)" />
            <div>
              <div style={labelStyle}>{t('dataImport.preview.period', 'Període')}</div>
              <div style={valueStyle}>
                {preview.dateRange.start} <span style={{ color: muted }}>→</span> {preview.dateRange.end}
              </div>
            </div>
          </div>
        )}
        <div style={cardStyle}>
          <Package size={18} color="var(--brand-1,#1F5F63)" />
          <div>
            <div style={labelStyle}>{t('dataImport.preview.products', 'Productes')}</div>
            <div style={valueStyle}>{preview.productsCount}</div>
          </div>
        </div>
        {preview.revenueTotal > 0 && (
          <div style={cardStyle}>
            <TrendingUp size={18} color="#3FBF9A" />
            <div>
              <div style={labelStyle}>{t('dataImport.preview.revenue', 'Ingressos totals')}</div>
              <div style={valueStyle}>{fmt(preview.revenueTotal)}</div>
            </div>
          </div>
        )}
        {preview.expensesTotal > 0 && (
          <div style={cardStyle}>
            <TrendingDown size={18} color="#F26C6C" />
            <div>
              <div style={labelStyle}>{t('dataImport.preview.expenses', 'Despeses totals')}</div>
              <div style={valueStyle}>{fmt(preview.expensesTotal)}</div>
            </div>
          </div>
        )}
        {(preview.revenueTotal > 0 || preview.expensesTotal > 0) && (
          <div style={cardStyle}>
            <Wallet size={18} color={netPositive ? '#3FBF9A' : '#F26C6C'} />
            <div>
              <div style={labelStyle}>{t('dataImport.preview.net', 'Benefici net')}</div>
              <div style={{ ...valueStyle, color: netPositive ? '#3FBF9A' : '#F26C6C' }}>
                {fmt(net)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 12,
        padding: '10px 12px',
        borderRadius: 8,
        backgroundColor: darkMode ? '#15151f' : '#f4f6f0',
        fontSize: 12,
        color: ink,
      }}>
        {t('dataImport.preview.actions', {
          defaultValue: 'Es crearan {{projects}} projectes, {{incomes}} ingressos i {{expenses}} despeses a partir de {{rows}} files.',
          projects: preview.projectsToCreate,
          incomes: preview.incomesToCreate,
          expenses: preview.expensesToCreate,
          rows: preview.rowsCount,
        })}
      </div>
    </div>
  )
}
