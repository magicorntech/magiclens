/**
 * macOS menu-bar (Tray) widget preferences.
 *
 * Note: this is a Tray + popup-window widget, not a WidgetKit widget. A real
 * Notification Center / desktop widget requires a native Swift App Extension built with
 * full Xcode and a signed Apple Developer Team ID, which this Electron app can't produce.
 */

export type MenuBarMetricId =
  | 'health'
  | 'cpu'
  | 'memory'
  | 'pods'
  | 'pendingPods'
  | 'failedPods'
  | 'nodes'

export const MENU_BAR_METRIC_IDS: MenuBarMetricId[] = [
  'health',
  'cpu',
  'memory',
  'pods',
  'pendingPods',
  'failedPods',
  'nodes'
]

/**
 * Clusters per popup page. Any number can be selected; the popup pages through them rather
 * than growing past the height a menu-bar panel can reasonably occupy. Side-by-side fits one
 * more because two cards share each row, so the panel stays about as tall either way.
 */
export const MENU_BAR_CLUSTERS_PER_PAGE_STACKED = 3
export const MENU_BAR_CLUSTERS_PER_PAGE_GRID = 4

export function menuBarClustersPerPage(layout: MenuBarLayoutId): number {
  return layout === 'grid' ? MENU_BAR_CLUSTERS_PER_PAGE_GRID : MENU_BAR_CLUSTERS_PER_PAGE_STACKED
}

export type MenuBarAccentId = 'primary' | 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'teal'

export const MENU_BAR_ACCENTS: Record<MenuBarAccentId, string> = {
  primary: 'var(--ml-primary)',
  blue: '#38bdf8',
  green: '#22c55e',
  purple: '#6366f1',
  amber: '#f59e0b',
  pink: '#ec4899',
  teal: '#14b8a6'
}

export const MENU_BAR_ACCENT_IDS = Object.keys(MENU_BAR_ACCENTS) as MenuBarAccentId[]

/** What the tray's own title shows next to the icon (macOS menu bar text). */
export type MenuBarTrayLabelId = 'none' | 'cpu' | 'memory' | 'pods'

/** `stacked` = one card per row; `grid` = two cards side by side (wider popup). */
export type MenuBarLayoutId = 'stacked' | 'grid'

/** Cards per row in `grid` layout — drives both the CSS columns and the popup width. */
export const MENU_BAR_GRID_COLUMNS = 2

export interface MenuBarWidgetPrefs {
  enabled: boolean
  /** Ordered; unlimited — the popup paginates at MENU_BAR_CLUSTERS_PER_PAGE. */
  clusterIds: string[]
  metrics: Record<MenuBarMetricId, boolean>
  /** Fallback accent for clusters with no entry in `clusterAccents`. */
  accent: MenuBarAccentId
  /** Per-cluster accent override, keyed by cluster id. */
  clusterAccents: Record<string, MenuBarAccentId>
  layout: MenuBarLayoutId
  /** Denser rows, no progress bars. */
  compact: boolean
  showClusterName: boolean
  /** Colour the value red/amber when a metric crosses its threshold. */
  colorByUsage: boolean
  trayLabel: MenuBarTrayLabelId
  /** Poll interval for the popup while it's open. */
  refreshSeconds: number
}

export const defaultMenuBarWidgetPrefs: MenuBarWidgetPrefs = {
  enabled: false,
  clusterIds: [],
  metrics: {
    health: true,
    cpu: true,
    memory: true,
    pods: true,
    pendingPods: false,
    failedPods: false,
    nodes: true
  },
  accent: 'primary',
  clusterAccents: {},
  layout: 'stacked',
  compact: false,
  showClusterName: true,
  colorByUsage: true,
  trayLabel: 'none',
  refreshSeconds: 10
}

export function normalizeMenuBarWidgetPrefs(
  prefs?: Partial<MenuBarWidgetPrefs>
): MenuBarWidgetPrefs {
  const clusterIds = Array.isArray(prefs?.clusterIds)
    ? [...new Set(prefs.clusterIds.filter((id) => typeof id === 'string' && id))]
    : []
  const accent =
    prefs?.accent && prefs.accent in MENU_BAR_ACCENTS
      ? prefs.accent
      : defaultMenuBarWidgetPrefs.accent
  // Drop unknown accent ids and entries for clusters that are no longer selected, so the
  // stored map can't grow unbounded as clusters are added and removed over time.
  const selected = new Set(clusterIds)
  const clusterAccents: Record<string, MenuBarAccentId> = {}
  for (const [id, value] of Object.entries(prefs?.clusterAccents ?? {})) {
    if (selected.has(id) && typeof value === 'string' && value in MENU_BAR_ACCENTS) {
      clusterAccents[id] = value as MenuBarAccentId
    }
  }
  const trayLabel: MenuBarTrayLabelId =
    prefs?.trayLabel === 'cpu' || prefs?.trayLabel === 'memory' || prefs?.trayLabel === 'pods'
      ? prefs.trayLabel
      : 'none'
  const refresh = Number(prefs?.refreshSeconds)
  return {
    enabled: Boolean(prefs?.enabled),
    clusterIds,
    metrics: { ...defaultMenuBarWidgetPrefs.metrics, ...prefs?.metrics },
    accent,
    clusterAccents,
    layout: prefs?.layout === 'grid' ? 'grid' : 'stacked',
    compact: Boolean(prefs?.compact),
    showClusterName: prefs?.showClusterName !== false,
    colorByUsage: prefs?.colorByUsage !== false,
    trayLabel,
    refreshSeconds: Number.isFinite(refresh) ? Math.min(60, Math.max(5, Math.round(refresh))) : 10
  }
}
