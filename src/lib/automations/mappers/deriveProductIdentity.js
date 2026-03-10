function pickFirstNonEmpty(values) {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return null
}

/**
 * Best-effort product identity for operator UI cards.
 * Uses proposal context/payload first, then falls back to source entity.
 */
export function deriveProductIdentity(proposal) {
  const ctx = proposal?.context_snapshot_json ?? proposal?.contextSnapshot ?? proposal?.context ?? {}
  const payload = proposal?.payload_json ?? proposal?.payload ?? {}

  const asin = pickFirstNonEmpty([ctx.asin, ctx.asin_code, payload.asin])
  const projectId = pickFirstNonEmpty([ctx.project_id, payload.project_id, proposal?.source_entity_id])
  const productName = pickFirstNonEmpty([ctx.product_name, payload.product_name, proposal?.source_entity_type])

  if (asin) return `ASIN ${asin}`
  if (projectId) return `Project ${projectId}`
  if (productName) return productName
  return proposal?.id ? `Proposal ${proposal.id}` : '—'
}

