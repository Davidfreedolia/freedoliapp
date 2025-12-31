/**
 * Calcula la profitabilitat ràpida (Quick Profitability)
 * @param {Object} inputs - Objecte amb els inputs
 * @returns {Object} Objecte amb tots els resultats calculats
 */
export const calculateQuickProfitability = (inputs) => {
  // Validar i parsejar valors (assegurar que no són negatius)
  const sellingPrice = Math.max(0, parseFloat(inputs.selling_price) || 0)
  const cogs = Math.max(0, parseFloat(inputs.cogs) || 0)
  const shippingPerUnit = Math.max(0, parseFloat(inputs.shipping_per_unit) || 0)
  const referralFeePercent = Math.max(0, parseFloat(inputs.referral_fee_percent) || 15)
  const fbaFeePerUnit = Math.max(0, parseFloat(inputs.fba_fee_per_unit) || 0)
  const ppcPerUnit = Math.max(0, parseFloat(inputs.ppc_per_unit) || 0)
  const otherCostsPerUnit = Math.max(0, parseFloat(inputs.other_costs_per_unit) || 0)
  const fixedCosts = Math.max(0, parseFloat(inputs.fixed_costs) || 0)

  // Calcular referral fee
  const referralFee = sellingPrice * (referralFeePercent / 100)

  // Calcular total cost
  const totalCost = cogs + shippingPerUnit + fbaFeePerUnit + ppcPerUnit + otherCostsPerUnit + referralFee

  // Calcular net profit
  const netProfit = sellingPrice - totalCost

  // Calcular margin percent
  const marginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0

  // Calcular ROI Product (base: cogs + shipping + other costs)
  const roiProductDenominator = cogs + shippingPerUnit + otherCostsPerUnit
  const roiProduct = roiProductDenominator > 0 ? (netProfit / roiProductDenominator) * 100 : 0

  // Calcular ROI Total (base: cogs + shipping + other costs + ppc + fba_fee + referral_fee)
  const roiTotalDenominator = cogs + shippingPerUnit + otherCostsPerUnit + ppcPerUnit + fbaFeePerUnit + referralFee
  const roiTotal = roiTotalDenominator > 0 ? (netProfit / roiTotalDenominator) * 100 : 0

  // Calcular breakeven units
  const breakevenUnits = netProfit > 0 && fixedCosts > 0 ? Math.ceil(fixedCosts / netProfit) : null

  // Determinar decisió segons margin
  let decision = null
  if (marginPercent >= 30) {
    decision = 'GO'
  } else if (marginPercent >= 15) {
    decision = 'RISKY'
  } else {
    decision = 'NO-GO'
  }

  return {
    referral_fee: referralFee,
    total_cost: totalCost,
    net_profit: netProfit,
    margin_percent: marginPercent,
    roi_product: roiProduct,
    roi_total: roiTotal,
    breakeven_units: breakevenUnits,
    decision: decision,
    // Valors originals per referència
    _inputs: {
      selling_price: sellingPrice,
      cogs: cogs,
      shipping_per_unit: shippingPerUnit,
      referral_fee_percent: referralFeePercent,
      fba_fee_per_unit: fbaFeePerUnit,
      ppc_per_unit: ppcPerUnit,
      other_costs_per_unit: otherCostsPerUnit,
      fixed_costs: fixedCosts
    }
  }
}
