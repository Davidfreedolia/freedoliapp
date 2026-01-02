/**
 * Conversió de monedes a EUR
 * Utilitza tasas de canvi aproximades (per MVP)
 * En producció, es podria integrar amb una API de tasas de canvi
 */

const EXCHANGE_RATES = {
  EUR: 1.0,
  USD: 0.92, // 1 USD = 0.92 EUR (aproximat)
  CNY: 0.13, // 1 CNY = 0.13 EUR (aproximat)
  GBP: 1.17  // 1 GBP = 1.17 EUR (aproximat)
}

/**
 * Converteix un preu a EUR
 * @param {number} amount - Quantitat a convertir
 * @param {string} fromCurrency - Moneda origen (EUR, USD, CNY, GBP)
 * @returns {number} Quantitat en EUR
 */
export const convertToEUR = (amount, fromCurrency) => {
  if (!amount || isNaN(amount)) return 0
  if (fromCurrency === 'EUR') return parseFloat(amount)
  
  const rate = EXCHANGE_RATES[fromCurrency] || 1.0
  return parseFloat(amount) * rate
}

/**
 * Formata un preu en EUR
 * @param {number} amount - Quantitat en EUR
 * @returns {string} String formatat (ex: "12.50 €")
 */
export const formatEUR = (amount) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0)
}




