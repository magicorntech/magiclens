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
 * than growing past the height a menu-bar panel can reasonably occupy.
 */
export const MENU_BAR_CLUSTERS_PER_PAGE = 4

export type MenuBarAccentId = 'primary' | 'blue' | 'green' | 'purple' | 'amber'

export const MENU_BAR_ACCENTS: Record<MenuBarAccentId, string> = {
  primary: 'var(--ml-primary)',
  blue: '#38bdf8',
  green: '#22c55e',
  purple: '#6366f1',
  amber: '#f59e0b'
}

/** What the tray's own title shows next to the icon (macOS menu bar text). */
export type MenuBarTrayLabelId = 'none' | 'cpu' | 'memory' | 'pods'

export interface MenuBarWidgetPrefs {
  enabled: boolean
  /** Ordered; unlimited — the popup paginates at MENU_BAR_CLUSTERS_PER_PAGE. */
  clusterIds: string[]
  metrics: Record<MenuBarMetricId, boolean>
  accent: MenuBarAccentId
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
    compact: Boolean(prefs?.compact),
    showClusterName: prefs?.showClusterName !== false,
    colorByUsage: prefs?.colorByUsage !== false,
    trayLabel,
    refreshSeconds: Number.isFinite(refresh) ? Math.min(60, Math.max(5, Math.round(refresh))) : 10
  }
}
