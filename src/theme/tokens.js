/**
 * Design Tokens - Single Source of Truth
 * Freedoliapp Palette + Semantic Tokens
 */

// ============================================
// FREEDOLIAPP PALETTE - Base Colors
// ============================================
export const PALETTE_CA = [
  '#1F4E5F', // petrol
  '#6BC7B5', // turquoise
  '#F4F7F3', // offwhite
  '#F26C63', // coral
  '#F2E27D'  // soft yellow
]

// Alias for backward compatibility (P0 fix)
export const CANADIAN_PALETTE_COLORS = PALETTE_CA

// ============================================
// SEMANTIC COLOR TOKENS
// ============================================
export const TOKENS = {
  // Primary colors
  primary: '#1F4E5F',        // petrol
  secondary: '#6BC7B5',      // turquoise
  accent: '#6BC7B5',         // turquoise
  
  // State colors
  success: '#6BC7B5',         // turquoise
  warning: '#F2E27D',         // soft yellow
  danger: '#F26C63',          // coral - ONLY for destructive actions
  
  // Background colors
  bg: '#F4F7F3',              // offwhite
  surface: '#FFFFFF',         // white
  border: 'rgba(31, 78, 95, 0.18)',
  text: '#1F4E5F',            // petrol
  muted: 'rgba(31, 78, 95, 0.6)',
  
  // Soft variants (for non-destructive actions)
  'primary-soft-bg': 'rgba(31, 78, 95, 0.08)',
  'primary-soft-text': '#1F4E5F',
  'primary-soft-border': 'rgba(31, 78, 95, 0.16)',
  
  'success-soft-bg': 'rgba(107, 199, 181, 0.14)',
  'success-soft-text': '#2C7A6A',
  'success-soft-border': 'rgba(107, 199, 181, 0.22)',
  
  'warning-soft-bg': 'rgba(242, 226, 125, 0.2)',
  'warning-soft-text': '#7A6A2C',
  'warning-soft-border': 'rgba(242, 226, 125, 0.35)',
  
  // Button variants
  'button-primary-bg': '#1F4E5F',
  'button-primary-text': '#F4F7F3',
  'button-primary-hover': '#184351',
  
  'button-secondary-bg': '#FFFFFF',
  'button-secondary-text': '#1F4E5F',
  'button-secondary-border': 'rgba(31, 78, 95, 0.2)',
  'button-secondary-hover': 'rgba(31, 78, 95, 0.06)',
  
  'button-danger-bg': '#F26C63',
  'button-danger-text': '#FFFFFF',
  'button-danger-hover': '#E85E56'
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
export const normalizeToPalette = (color, defaultValue = '#95A5A6') => {
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
