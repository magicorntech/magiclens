export type NodesDashboardSectionId =
  | 'summary'
  | 'health'
  | 'resources'
  | 'quickInsights'
  | 'topConsumers'
  | 'versions'
  | 'roles'
  | 'capacity'
  | 'table'
  | 'events'

/** Sections can sit full-width or share a row two-up. */
export type NodesDashboardSectionWidth = 'full' | 'half'

export interface NodesDashboardPrefs {
  order: NodesDashboardSectionId[]
  visible: Record<NodesDashboardSectionId, boolean>
  width: Record<NodesDashboardSectionId, NodesDashboardSectionWidth>
  /**
   * Bumped when the shipped default layout changes in a way that should override a
   * previously-persisted order (e.g. sections moved relative to the nodes table).
   * Only `order`/`width` are reset — the user's show/hide choices are kept.
   */
  layoutVersion?: number
}

const CURRENT_LAYOUT_VERSION = 5
/**
 * Sections that used to live only on the (now-removed) Cluster Overview page. Forced
 * visible on the v4 migration regardless of a user's prior show/hide choice, since hiding
 * them used to just mean "I can see this on Cluster Overview instead" — that's no longer
 * true, and silently dropping the content would look like data loss.
 */
const FORCE_VISIBLE_ON_V4: NodesDashboardSectionId[] = ['summary', 'health', 'resources']

export const NODES_DASHBOARD_SECTION_LABELS: Record<NodesDashboardSectionId, string> = {
  summary: 'Cluster Summary',
  health: 'Cluster Health',
  resources: 'Resource Usage',
  quickInsights: 'Quick Insights',
  topConsumers: 'Top Consumers',
  versions: 'Kubelet Versions',
  roles: 'Node Roles',
  capacity: 'Capacity Headroom',
  table: 'Nodes Table',
  events: 'Events Panel'
}

const ALL_SECTIONS: NodesDashboardSectionId[] = [
  'summary',
  'health',
  'resources',
  'quickInsights',
  'topConsumers',
  'versions',
  'roles',
  'capacity',
  'table',
  'events'
]

/**
 * Cluster Overview (the old "Overview → Cluster" page) was removed and its content —
 * namespace/deployment/service/problem-pod counts, resource usage, capacity facts, recent
 * events — now lives here instead, so all of it defaults visible.
 */
export const defaultNodesDashboardPrefs: NodesDashboardPrefs = {
  layoutVersion: CURRENT_LAYOUT_VERSION,
  /**
   * Versions/Roles lead — a fast fleet-shape glance (skew, not-ready count) before anything
   * else. Cluster summary + health + resources follow (this is now the cluster's one
   * overview surface). Hotspots sit above the table because they're a collapsible alert
   * strip. Events is a log/feed, last on the page.
   */
  order: [
    'versions',
    'roles',
    'summary',
    'health',
    'resources',
    'quickInsights',
    'topConsumers',
    'table',
    'capacity',
    'events'
  ],
  visible: {
    summary: true,
    health: true,
    resources: true,
    quickInsights: true,
    topConsumers: true,
    versions: true,
    roles: true,
    capacity: false,
    table: true,
    events: true
  },
  width: {
    summary: 'full',
    health: 'full',
    resources: 'full',
    quickInsights: 'half',
    topConsumers: 'half',
    versions: 'half',
    roles: 'half',
    capacity: 'full',
    table: 'full',
    events: 'full'
  }
}

export function normalizeNodesDashboardPrefs(prefs?: Partial<NodesDashboardPrefs>): NodesDashboardPrefs {
  const priorVersion = prefs?.layoutVersion ?? 0
  const stale = priorVersion < CURRENT_LAYOUT_VERSION
  const crossedV4 = priorVersion < 4
  const source = stale || !prefs?.order?.length ? defaultNodesDashboardPrefs.order : prefs.order
  const known = new Set(ALL_SECTIONS)
  const filtered = [...source].filter((id) => known.has(id))
  for (const id of defaultNodesDashboardPrefs.order) {
    if (!filtered.includes(id)) filtered.push(id)
  }
  const visible = { ...defaultNodesDashboardPrefs.visible, ...prefs?.visible }
  if (crossedV4) {
    for (const id of FORCE_VISIBLE_ON_V4) visible[id] = true
  }
  return {
    layoutVersion: CURRENT_LAYOUT_VERSION,
    order: filtered,
    visible,
    width: stale
      ? { ...defaultNodesDashboardPrefs.width }
      : { ...defaultNodesDashboardPrefs.width, ...prefs?.width }
  }
}
