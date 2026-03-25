function isDatePast(value) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return false
  return time < Date.now()
}

function getShipmentSummary(shipment) {
  if (!shipment) return 'No shipment'
  const rawStatus = (shipment.status || '').toString().trim()
  if (!rawStatus) return 'Shipment active'
  return rawStatus.replace(/_/g, ' ')
}

function summarizeBlockers(amazonReadyStatus, manufacturerPackStatus, shipment) {
  const hasAmazonBlocker = amazonReadyStatus && amazonReadyStatus.ready === false
  const shipmentOverdue = Boolean(shipment?.eta_date) && isDatePast(shipment.eta_date) && shipment?.status !== 'delivered'

  if (hasAmazonBlocker) return 'Amazon setup missing'
  if (manufacturerPackStatus === 'generated') return 'Pack pending'
  if (shipmentOverdue) return 'Shipment overdue'
  if (shipment && shipment.status !== 'delivered') return 'In execution'
  return 'No blockers'
}

function deriveNextAction({ status, shipment, amazonReadyStatus, manufacturerPackStatus }) {
  if (status === 'received') return 'Completed'
  if (amazonReadyStatus && amazonReadyStatus.ready === false) return 'Complete Amazon readiness'
  if (manufacturerPackStatus === 'generated' && shipment?.status !== 'delivered') return 'Send manufacturer pack'
  if (shipment && shipment.status !== 'delivered') return 'Track shipment'

  switch (status) {
    case 'draft':
      return 'Send PO'
    case 'sent':
      return 'Await supplier confirmation'
    case 'confirmed':
    case 'partial_paid':
      return 'Pay supplier'
    case 'paid':
    case 'in_production':
      return 'Monitor production'
    case 'shipped':
      return 'Receive goods'
    default:
      return 'Monitor execution'
  }
}

function deriveRiskLevel({ status, shipment, amazonReadyStatus, manufacturerPackStatus }) {
  if (status === 'received') return 'done'
  if (amazonReadyStatus && amazonReadyStatus.ready === false) return 'high'
  if (manufacturerPackStatus === 'generated') return 'high'
  if (shipment?.eta_date && isDatePast(shipment.eta_date) && shipment?.status !== 'delivered') return 'high'
  if (shipment && shipment.status !== 'delivered') return 'medium'
  if (status === 'draft' || status === 'sent' || status === 'confirmed' || status === 'partial_paid') return 'medium'
  return 'low'
}

export function deriveOrderOperationalCard(order) {
  const amazonReadyStatus = order?.amazonReadyStatus ?? null
  const shipment = order?.shipment ?? null
  const manufacturerPackStatus = order?.manufacturerPackStatus ?? null

  return {
    nextAction: deriveNextAction({
      status: order?.status,
      shipment,
      amazonReadyStatus,
      manufacturerPackStatus
    }),
    blockerSummary: summarizeBlockers(amazonReadyStatus, manufacturerPackStatus, shipment),
    riskLevel: deriveRiskLevel({
      status: order?.status,
      shipment,
      amazonReadyStatus,
      manufacturerPackStatus
    }),
    shipmentSummary: getShipmentSummary(shipment),
    etaDate: shipment?.eta_date || null,
    shipmentStatus: shipment?.status || null
  }
}
