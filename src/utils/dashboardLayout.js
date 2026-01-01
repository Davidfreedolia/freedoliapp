/**
 * Dashboard Layout Utilities
 * Default layouts and helpers for dashboard widgets
 */

// Widget IDs
export const WIDGET_IDS = {
  WAITING_MANUFACTURER: 'waiting_manufacturer_ops',
  NOT_AMAZON_READY: 'pos_not_amazon_ready',
  SHIPMENTS_IN_TRANSIT: 'shipments_in_transit',
  RESEARCH_NO_DECISION: 'research_no_decision',
  STALE_TRACKING: 'stale_tracking',
  TASKS: 'tasks',
  STICKY_NOTES: 'sticky_notes'
}

// Default layout (12 columns grid)
export const getDefaultLayout = () => {
  return [
    { i: WIDGET_IDS.WAITING_MANUFACTURER, x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: WIDGET_IDS.NOT_AMAZON_READY, x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: WIDGET_IDS.SHIPMENTS_IN_TRANSIT, x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: WIDGET_IDS.RESEARCH_NO_DECISION, x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
    { i: WIDGET_IDS.STALE_TRACKING, x: 4, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
    { i: WIDGET_IDS.TASKS, x: 8, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
    { i: WIDGET_IDS.STICKY_NOTES, x: 0, y: 6, w: 4, h: 4, minW: 2, minH: 2 }
  ]
}

// Widget min sizes
export const WIDGET_MIN_SIZES = {
  [WIDGET_IDS.WAITING_MANUFACTURER]: { w: 2, h: 2 },
  [WIDGET_IDS.NOT_AMAZON_READY]: { w: 2, h: 2 },
  [WIDGET_IDS.SHIPMENTS_IN_TRANSIT]: { w: 2, h: 2 },
  [WIDGET_IDS.RESEARCH_NO_DECISION]: { w: 2, h: 2 },
  [WIDGET_IDS.STALE_TRACKING]: { w: 2, h: 2 },
  [WIDGET_IDS.TASKS]: { w: 2, h: 2 },
  [WIDGET_IDS.STICKY_NOTES]: { w: 2, h: 2 }
}

// Allowed widget sizes (1x1, 2x1, 2x2)
export const ALLOWED_SIZES = [
  { w: 2, h: 2 }, // 1x1 (2 cols x 2 rows)
  { w: 4, h: 2 }, // 2x1 (4 cols x 2 rows)
  { w: 4, h: 4 }  // 2x2 (4 cols x 4 rows)
]

// Snap to nearest allowed size
export const snapToAllowedSize = (w, h) => {
  let minDistance = Infinity
  let snapped = { w, h }
  
  ALLOWED_SIZES.forEach(size => {
    const distance = Math.abs(size.w - w) + Math.abs(size.h - h)
    if (distance < minDistance) {
      minDistance = distance
      snapped = { ...size }
    }
  })
  
  return snapped
}

// Generate layout from enabled widgets
export const generateLayoutFromEnabled = (enabledWidgets, savedLayout = null) => {
  if (savedLayout && Array.isArray(savedLayout) && savedLayout.length > 0) {
    // Filter saved layout to only include enabled widgets
    return savedLayout.filter(item => enabledWidgets[item.i] !== false)
  }
  
  // Generate default layout for enabled widgets
  const defaultLayout = getDefaultLayout()
  return defaultLayout.filter(item => enabledWidgets[item.i] !== false)
}

// Validate layout
export const validateLayout = (layout) => {
  if (!Array.isArray(layout)) return false
  
  return layout.every(item => {
    return item.i && 
           typeof item.x === 'number' && 
           typeof item.y === 'number' && 
           typeof item.w === 'number' && 
           typeof item.h === 'number' &&
           item.w >= (WIDGET_MIN_SIZES[item.i]?.w || 2) &&
           item.h >= (WIDGET_MIN_SIZES[item.i]?.h || 2)
  })
}

