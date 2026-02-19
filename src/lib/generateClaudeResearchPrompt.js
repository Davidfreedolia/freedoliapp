/**
 * Genera el document-prompt estàndard de Market Research per a Claude (o altre LLM).
 * Només injecta ASIN i marketplace; no executa cap anàlisi.
 *
 * @param {object} opts
 * @param {string} opts.asin - ASIN del producte
 * @param {string} [opts.marketplace] - Marketplace (ex: 'Amazon ES', 'Amazon DE')
 * @returns {string} Prompt complet
 */
export function generateClaudeResearchPrompt({ asin, marketplace }) {
  return `You are a senior Amazon FBA market analyst.
Your task is to perform a **market research analysis** for ONE Amazon product.
The output will be ingested manually into a production app, so **format discipline is mandatory**.
❌ Do NOT invent data  
❌ Do NOT add explanations outside the requested fields  
❌ Do NOT change titles, keys, or structure  
✅ If data is not available, write: NOT_AVAILABLE  
✅ Use short, factual sentences  
✅ Evidence must be copy-paste ready  

---
## INPUT
ASIN: ${asin}
Marketplace: ${marketplace}

---
## OUTPUT (STRICT FORMAT)
### PRODUCT_SNAPSHOT
asin: ${asin}
product_url: <amazon product url>
title: <official product title>
thumb_url: <main image url>
category: <amazon category>
price: <numeric or NOT_AVAILABLE>
package_weight: <value + unit or NOT_AVAILABLE>
package_dimensions: <LxWxH + unit or NOT_AVAILABLE>
---
### CHECK_DEMAND
conclusion: PASS | FAIL
evidence: >
- Search demand appears STRONG / MODERATE / WEAK based on Amazon SERP.
- Estimated volume: <range or NOT_AVAILABLE>.
- BSR observed: <value or NOT_AVAILABLE>.
sources:
- <amazon search url>
- <product page url>
---
### CHECK_COMPETITION
conclusion: PASS | FAIL
evidence: >
- Page 1 competitors: <number>.
- Average price (top 10): <range>.
- Average reviews (top 5): <number>.
- Dominant brands present: YES | NO.
sources:
- <amazon search url>
- <product page url>
---
### CHECK_SIMPLICITY
conclusion: PASS | FAIL
evidence: >
- Product complexity: SIMPLE | MEDIUM | COMPLEX.
- Return risk: LOW | MEDIUM | HIGH.
- Compliance risk detected: YES | NO.
sources:
- <product page url>
---
### CHECK_IMPROVABLE
conclusion: PASS | FAIL
evidence: >
- Improvement possible via bundle / feature / packaging: YES | NO.
- Main weakness detected: <short phrase or NOT_AVAILABLE>.
sources:
- <amazon search url>
- <product page url>
---
### FINAL_DECISION
decision: PASS | NO_PASS | PASS_WITH_IMPROVEMENTS
summary: <max 2 short lines, factual>
if_pass_with_improvements:
- improvement_1: <short actionable idea>
- improvement_2: <short actionable idea or NOT_AVAILABLE>
---
END`;
}
