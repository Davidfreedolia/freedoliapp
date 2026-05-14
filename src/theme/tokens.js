/**
 * Design Tokens - Single Source of Truth
 * Freedoliapp Palette + Semantic Tokens
 *
 * NOTE: These hex values mirror the CSS variables in src/index.css.
 * If you change a value here, update :root in index.css to match.
 */

// ============================================
// FREEDOLIAPP PALETTE - Base Colors
// ============================================
export const PALETTE_CA = [
  '#1F5F63', // petrol      (matches --brand-1 / --c-teal-900)
  '#6ECBC3', // turquoise   (matches --brand-2 / --c-teal-300)
  '#F6F8F3', // offwhite    (matches --bg-app / --c-white-warm)
  '#F26C6C', // coral       (matches --coral-1 / --c-coral-500)
  '#F4E27A'  // soft yellow (matches --soft-yellow / --c-yellow-200)
]

// Alias for backward compatibility (P0 fix)
export const CANADIAN_PALETTE_COLORS = PALETTE_CA

// ============================================
// SEMANTIC COLOR TOKENS
// ============================================
export const TOKENS = {
  // Primary colors
  primary: '#1F5F63',        // petrol      -> --brand-1
  secondary: '#6ECBC3',      // turquoise   -> --brand-2
  accent: '#6ECBC3',         // turquoise   -> --brand-2

  // State colors
  success: '#3FBF9A',         // mint        -> --success-1
  warning: '#F0B429',         // amber       -> --warning-1
  danger: '#E55353',          // coral red   -> --danger-1 (destructive only)

  // Background colors
  bg: '#F6F8F3',              // offwhite    -> --bg-app
  surface: '#FFFFFF',         // white       -> --surface-bg
  border: '#D8E1DE',          //             -> --border-1
  text: '#243333',            // ink         -> --text-1
  muted: '#5F7476',           // muted       -> --text-2

  // Soft variants (for non-destructive actions)
  'primary-soft-bg': 'rgba(31, 95, 99, 0.08)',
  'primary-soft-text': '#1F5F63',
  'primary-soft-border': 'rgba(31, 95, 99, 0.16)',

  'success-soft-bg': 'rgba(63, 191, 154, 0.14)',
  'success-soft-text': '#2B7A66',
  'success-soft-border': 'rgba(63, 191, 154, 0.32)',

  'warning-soft-bg': 'rgba(240, 180, 41, 0.18)',
  'warning-soft-text': '#7A5F22',
  'warning-soft-border': 'rgba(240, 180, 41, 0.40)',

  // Button variants
  'button-primary-bg': '#1F5F63',
  'button-primary-text': '#F6F8F3',
  'button-primary-hover': '#184B4F',

  'button-secondary-bg': '#FFFFFF',
  'button-secondary-text': '#1F5F63',
  'button-secondary-border': 'rgba(31, 95, 99, 0.2)',
  'button-secondary-hover': 'rgba(31, 95, 99, 0.06)',

  'button-danger-bg': '#E55353',
  'button-danger-text': '#FFFFFF',
  'button-danger-hover': '#C84545'
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a color is in the Canadian Palette
 */
export const isPaletteColor = (color) => {
  if (!color) return false
  const colorStr = String(color).trim().toUpperCase()
  return PALETTE_CA.includes(colorStr)
}

/**
 * Normalize color to Canadian Palette (returns palette color or default)
 */
export const normalizeToPalette = (color, defaultValue = '#5F7476') => {
  if (!color) return defaultValue
  const colorStr = String(color).trim().toUpperCase()
  if (PALETTE_CA.includes(colorStr)) {
    return colorStr
  }
  return defaultValue
}

/**
 * Get button variant styles
 */
export const getButtonVariant = (variant = 'primary') => {
  const variants = {
    primary: {
      backgroundColor: TOKENS['button-primary-bg'],
      color: TOKENS['button-primary-text'],
      border: `1px solid ${TOKENS['button-primary-bg']}`,
      ':hover': {
        backgroundColor: TOKENS['button-primary-hover']
      }
    },
    secondary: {
      backgroundColor: TOKENS['button-secondary-bg'],
      color: TOKENS['button-secondary-text'],
      border: `1px solid ${TOKENS['button-secondary-border']}`,
      ':hover': {
        backgroundColor: TOKENS['button-secondary-hover']
      }
    },
    danger: {
      backgroundColor: TOKENS['button-danger-bg'],
      color: TOKENS['button-danger-text'],
      border: `1px solid ${TOKENS['button-danger-bg']}`,
      ':hover': {
        backgroundColor: TOKENS['button-danger-hover']
      }
    }
  }
  return variants[variant] || variants.primary
}
