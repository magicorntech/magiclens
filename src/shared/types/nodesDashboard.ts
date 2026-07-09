export type NodesDashboardSectionId =
  | 'health'
  | 'resources'
  | 'quickInsights'
  | 'topConsumers'
  | 'table'
  | 'events'

export interface NodesDashboardPrefs {
  order: NodesDashboardSectionId[]
  visible: Record<NodesDashboardSectionId, boolean>
}

export const NODES_DASHBOARD_SECTION_LABELS: Record<NodesDashboardSectionId, string> = {
  health: 'Cluster Health',
  resources: 'Resource Usage',
  quickInsights: 'Quick Insights',
  topConsumers: 'Top Consumers',
  table: 'Nodes Table',
  events: 'Events Panel'
}

export const defaultNodesDashboardPrefs: NodesDashboardPrefs = {
  order: ['health', 'resources', 'quickInsights', 'topConsumers', 'table', 'events'],
  visible: {
    health: true,
    resources: true,
    quickInsights: true,
    topConsumers: true,
    table: true,
    events: true
  }
}

export function normalizeNodesDashboardPrefs(prefs?: Partial<NodesDashboardPrefs>): NodesDashboardPrefs {
  const order = prefs?.order?.length
    ? [...prefs.order]
    : [...defaultNodesDashboardPrefs.order]
  const known = new Set(defaultNodesDashboardPrefs.order)
  const filtered = order.filter((id) => known.has(id))
  for (const id of defaultNodesDashboardPrefs.order) {
    if (!filtered.includes(id)) filtered.push(id)
  }
  return {
    order: filtered,
    visible: { ...defaultNodesDashboardPrefs.visible, ...prefs?.visible }
  }
}
