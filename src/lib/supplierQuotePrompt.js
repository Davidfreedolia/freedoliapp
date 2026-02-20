export const SUPPLIER_QUOTE_EXTRACT_PROMPT = `
You must output STRICTLY this Markdown template.
Do not add extra sections. Do not reorder fields.
If a value is unknown, write: null

# SUPPLIER_QUOTE

supplier_name: <string|null>
incoterm: <string|null>
currency: <string|null>
moq: <int|null>
unit_price: <number|null>
tooling_fee: <number|null>
packaging_included: <true|false|null>
lead_time_days: <int|null>
sample_cost: <number|null>
payment_terms: <string|null>
shipping_estimate: <string|null>
valid_until: <YYYY-MM-DD|null>
notes: <string|null>
`.trim()
