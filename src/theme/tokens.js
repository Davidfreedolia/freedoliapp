/**
 * Design Tokens - Single Source of Truth
 * Canadian Palette (Flat UI Colors CA) + Semantic Tokens
 * https://flatuicolors.com/palette/ca
 */

// ============================================
// CANADIAN PALETTE - Base Colors
// ============================================
export const PALETTE_CA = [
  '#1ABC9C', // turquoise
  '#2ECC71', // emerald
  '#3498DB', // peter-river
  '#9B59B6', // amethyst
  '#34495E', // wet-asphalt
  '#16A085', // green-sea
  '#27AE60', // nephritis
  '#2980B9', // belize-hole
  '#8E44AD', // wisteria
  '#2C3E50', // midnight-blue
  '#F1C40F', // sun-flower
  '#E67E22', // carrot
  '#E74C3C', // alizarin
  '#ECF0F1', // clouds
  '#95A5A6', // concrete
  '#F39C12', // orange
  '#D35400', // pumpkin
  '#C0392B', // pomegranate
  '#BDC3C7', // silver
  '#7F8C8D'  // asbestos
]

// Alias for backward compatibility (P0 fix)
export const CANADIAN_PALETTE_COLORS = PALETTE_CA

// ============================================
// SEMANTIC COLOR TOKENS
// ============================================
export const TOKENS = {
  // Primary colors
  primary: '#3498DB',        // peter-river (blue)
  secondary: '#34495E',      // wet-asphalt (dark gray)
  accent: '#2980B9',         // belize-hole (darker blue)
  
  // State colors
  success: '#2ECC71',         // emerald (green)
  warning: '#E67E22',         // carrot (orange)
  danger: '#E74C3C',          // alizarin (red) - ONLY for destructive actions
  
  // Background colors
  bg: '#ECF0F1',              // clouds (light gray)
  surface: '#FFFFFF',         // white
  border: '#BDC3C7',          // silver
  text: '#2C3E50',            // midnight-blue (dark)
  muted: '#95A5A6',           // concrete (gray)
  
  // Soft variants (for non-destructive actions)
  'primary-soft-bg': 'rgba(52, 152, 219, 0.1)',
  'primary-soft-text': '#2980B9',      // belize-hole
  'primary-soft-border': 'rgba(52, 152, 219, 0.2)',
  
  'success-soft-bg': 'rgba(46, 204, 113, 0.1)',
  'success-soft-text': '#27AE60',      // nephritis
  'success-soft-border': 'rgba(46, 204, 113, 0.2)',
  
  'warning-soft-bg': 'rgba(231, 76, 60, 0.08)',
  'warning-soft-text': '#C0392B',     // pomegranate
  'warning-soft-border': 'rgba(231, 76, 60, 0.15)',
  
  // Button variants
  'button-primary-bg': '#3498DB',      // peter-river
  'button-primary-text': '#FFFFFF',
  'button-primary-hover': '#2980B9',   // belize-hole
  
  'button-success-soft-bg': 'rgba(46, 204, 113, 0.1)',
  'button-success-soft-text': '#27AE60',
  'button-success-soft-border': 'rgba(46, 204, 113, 0.2)',
  
  'button-warning-soft-bg': 'rgba(231, 76, 60, 0.08)',
  'button-warning-soft-text': '#C0392B',
  'button-warning-soft-border': 'rgba(231, 76, 60, 0.15)',
  
  'button-danger-bg': '#E74C3C',       // alizarin - ONLY for delete
  'button-danger-text': '#FFFFFF',
  'button-danger-hover': '#C0392B'     // pomegranate
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
    'success-soft': {
      backgroundColor: TOKENS['button-success-soft-bg'],
      color: TOKENS['button-success-soft-text'],
      border: `1px solid ${TOKENS['button-success-soft-border']}`
    },
    'warning-soft': {
      backgroundColor: TOKENS['button-warning-soft-bg'],
      color: TOKENS['button-warning-soft-text'],
      border: `1px solid ${TOKENS['button-warning-soft-border']}`
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
