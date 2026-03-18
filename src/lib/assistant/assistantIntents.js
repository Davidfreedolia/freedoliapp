/**
 * Minimal assistant intents module required by AssistantPanel.
 * V1 is rule-based (no LLM).
 */

export const INTENTS = {
  WHAT_CAN_I_DO: 'what_can_i_do',
  NEXT_STEP: 'next_step',
  WHERE_ORDERS: 'where_orders',
  FLOW_PROJECT_PO: 'flow_project_po',
}

const KEYWORDS = {
  [INTENTS.WHAT_CAN_I_DO]: ['què puc fer', 'que puc fer', 'what can i do', 'que puedo hacer', 'qué puedo hacer'],
  [INTENTS.NEXT_STEP]: ['següent pas', 'seguent pas', 'next step', 'siguiente paso'],
  [INTENTS.WHERE_ORDERS]: ['comandes', 'orders', 'pedidos', 'po', 'purchase order', 'on trobo', 'donde'],
  [INTENTS.FLOW_PROJECT_PO]: ['flow', 'flux', 'flujo', 'projecte', 'proyecto', 'inventory', 'inventari', 'inventario'],
}

function normalize(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function matchIntent(query) {
  const q = normalize(query)
  if (!q) return null
  for (const [intent, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => q.includes(normalize(w)))) return intent
  }
  return null
}

export function getScreenFromPath(pathname) {
  if (!pathname) return { screen: 'app' }
  const p = pathname.replace(/^\/app\/?/, '') || 'dashboard'
  if (p.startsWith('projects/') && p.split('/').length >= 2) {
    const parts = p.split('/')
    return { screen: 'projectDetail', projectId: parts[1] }
  }
  if (p.startsWith('projects')) return { screen: 'projects' }
  if (p.startsWith('orders')) return { screen: 'orders' }
  if (p.startsWith('dashboard') || p === '') return { screen: 'dashboard' }
  return { screen: p.split('/')[0] || 'app' }
}

export function getDefaultIntentForScreen(screen) {
  const map = {
    dashboard: INTENTS.NEXT_STEP,
    projects: INTENTS.WHAT_CAN_I_DO,
    projectDetail: INTENTS.NEXT_STEP,
    orders: INTENTS.WHAT_CAN_I_DO,
  }
  return map[screen] || INTENTS.WHAT_CAN_I_DO
}

export const INTENT_LINKS = {
  [INTENTS.WHERE_ORDERS]: '/app/orders',
  [INTENTS.FLOW_PROJECT_PO]: '/app/projects',
}
