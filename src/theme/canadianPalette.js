/**
 * Canadian Palette (Flat UI Colors CA)
 * Single source of truth for all colors in FREEDOLIAPP
 * https://flatuicolors.com/palette/ca
 */

// Canadian Palette - Base Colors (exact order from FlatUI CA)
export const CANADIAN_PALETTE_COLORS = [
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

// Semantic Color Mappings (for programmatic use)
export const CANADIAN_PALETTE_SEMANTIC = {
  // Primary colors
  primary: '#3498DB',        // peter-river
  secondary: '#34495E',      // wet-asphalt
  accent: '#2980B9',         // belize-hole
  
  // State colors
  success: '#2ECC71',         // emerald
  warning: '#E67E22',         // carrot
  danger: '#E74C3C',          // alizarin
  info: '#3498DB',            // peter-river (same as primary)
  
  // Background colors
  bg: '#ECF0F1',              // clouds
  surface: '#FFFFFF',         // white (not in palette but standard)
  border: '#BDC3C7',          // silver
  text: '#2C3E50',            // midnight-blue
  muted: '#95A5A6',           // concrete
  
  // Additional palette colors
  turquoise: '#1ABC9C',
  emerald: '#2ECC71',
  peterRiver: '#3498DB',
  amethyst: '#9B59B6',
  wetAsphalt: '#34495E',
  greenSea: '#16A085',
  nephritis: '#27AE60',
  belizeHole: '#2980B9',
  wisteria: '#8E44AD',
  midnightBlue: '#2C3E50',
  sunFlower: '#F1C40F',
  carrot: '#E67E22',
  alizarin: '#E74C3C',
  clouds: '#ECF0F1',
  concrete: '#95A5A6',
  orange: '#F39C12',
  pumpkin: '#D35400',
  pomegranate: '#C0392B',
  silver: '#BDC3C7',
  asbestos: '#7F8C8D'
}

// Helper function to check if a color is in the palette
export const isCanadianPaletteColor = (color) => {
  if (!color) return false
  const colorStr = String(color).trim().toUpperCase()
  return CANADIAN_PALETTE_COLORS.includes(colorStr)
}

// Helper function to normalize color to palette (returns palette color or default)
export const normalizeToCanadianPalette = (color, defaultValue = '#95A5A6') => {
  if (!color) return defaultValue
  const colorStr = String(color).trim().toUpperCase()
  if (CANADIAN_PALETTE_COLORS.includes(colorStr)) {
    return colorStr
  }
  return defaultValue
}
