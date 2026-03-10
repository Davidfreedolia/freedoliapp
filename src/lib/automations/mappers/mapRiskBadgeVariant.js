export function mapRiskBadgeVariant(riskBand) {
  const v = (riskBand || '').toString().toLowerCase()
  if (v === 'critical') return 'danger'
  if (v === 'high') return 'warning'
  if (v === 'medium') return 'info'
  if (v === 'low') return 'success'
  return 'neutral'
}

