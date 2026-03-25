function isDatePast(value) {
  if (!value) return false
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return false
  return time < Date.now()
}

function getShipmentSummary(shipment) {
  if (!shipment) return 'no_shipment'
  const rawStatus = (shipment.status || '').toString().trim()
  if (!rawStatus) return 'shipment_active'
  return `shipment_${rawStatus}`
}

function summarizeBlockers(amazonReadyStatus, manufacturerPackStatus, shipment) {
  const hasAmazonBlocker = amazonReadyStatus && amazonReadyStatus.ready === false
  const shipmentOverdue = Boolean(shipment?.eta_date) && isDatePast(shipment.eta_date) && shipment?.status !== 'delivered'

  if (hasAmazonBlocker) return 'amazon_setup_missing'
  if (manufacturerPackStatus === 'generated') return 'pack_pending'
  if (shipmentOverdue) return 'shipment_overdue'
  if (shipment && shipment.status !== 'delivered') return 'in_execution'
  return 'no_blockers'
}

function deriveNextAction({ status, shipment, amazonReadyStatus, manufacturerPackStatus }) {
  if (status === 'received') return 'completed'
  if (amazonReadyStatus && amazonReadyStatus.ready === false) return 'complete_amazon_readiness'
  if (manufacturerPackStatus === 'generated' && shipment?.status !== 'delivered') return 'send_manufacturer_pack'
  if (shipment && shipment.status !== 'delivered') return 'track_shipment'

  switch (status) {
    case 'draft':
      return 'send_po'
    case 'sent':
      return 'await_supplier_confirmation'
    case 'confirmed':
    case 'partial_paid':
      return 'pay_supplier'
    case 'paid':
    case 'in_production':
      return 'monitor_production'
    case 'shipped':
      return 'receive_goods'
    default:
      return 'monitor_execution'
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
    nextActionKey: deriveNextAction({
      status: order?.status,
      shipment,
      amazonReadyStatus,
      manufacturerPackStatus
    }),
    blockerKey: summarizeBlockers(amazonReadyStatus, manufacturerPackStatus, shipment),
    riskLevel: deriveRiskLevel({
      status: order?.status,
      shipment,
      amazonReadyStatus,
      manufacturerPackStatus
    }),
    shipmentSummaryKey: getShipmentSummary(shipment),
    etaDate: shipment?.eta_date || null,
    shipmentStatus: shipment?.status || null
  }
}
