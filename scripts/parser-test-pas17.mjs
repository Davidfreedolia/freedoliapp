import { parseSupplierQuote } from '../src/lib/parseSupplierQuote.js'

const text = `# SUPPLIER_QUOTE

supplier_name: Demo Supplier
incoterm: FOB
currency: USD
moq: 300
unit_price: 2.10
tooling_fee: null
packaging_included: true
lead_time_days: 28
sample_cost: null
payment_terms: 30/70 TT
shipping_estimate: 0.25
valid_until: 2026-09-30
notes: Test import`

const result = parseSupplierQuote(text)
console.log('ok:', result.ok)
console.log('error:', result.error)
if (result.ok) {
  console.log('data:', JSON.stringify(result.data, null, 2))
  const d = result.data
  const filled = {
    currency: d.currency || 'USD',
    incoterm: d.incoterm || '',
    payment_terms: d.payment_terms || '',
    lead_time_days: d.lead_time_days ?? '',
    moq: d.moq ?? '',
    notes: d.notes || '',
    shipping_estimate: d.shipping_estimate ? parseFloat(d.shipping_estimate) : null,
    price_breaks: d.unit_price ? [{ min_qty: d.moq || 1, unit_price: d.unit_price }] : []
  }
  console.log('filled newQuote fields:', JSON.stringify(filled, null, 2))
}
