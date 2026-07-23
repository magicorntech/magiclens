export interface AppInfoResponse {
  version: string
  buildNumber: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
  platform: NodeJS.Platform
}

/** One Chromium/Electron process (Browser, GPU, Tab, Utility, …). */
export interface AppProcessMetricRow {
  pid: number
  type: string
  name: string
  /** Percent of one CPU core (Electron ProcessMetric). */
  cpuPercent: number
  /** Working set in bytes. */
  memoryBytes: number
}

export interface AppProcessMetricsResponse {
  sampledAt: number
  processCount: number
  /** Sum of process working sets. */
  totalMemoryBytes: number
  /** Sum of per-process CPU percents (can exceed 100 on multi-core). */
  totalCpuPercent: number
  /** Main process V8 heap used (bytes). */
  mainHeapUsedBytes: number
  /** Main process V8 heap total (bytes). */
  mainHeapTotalBytes: number
  /** System free memory (bytes), when available. */
  systemFreeMemoryBytes?: number
  /** System total memory (bytes), when available. */
  systemTotalMemoryBytes?: number
  processes: AppProcessMetricRow[]
}

/** Static-ish host machine specs for Developer settings. */
export interface AppHostInfoResponse {
  hostname: string
  platform: NodeJS.Platform
  /** e.g. darwin, linux, win32 */
  osType: string
  /** Kernel / OS release string */
  osRelease: string
  arch: string
  /** Human-readable CPU model from the first core. */
  cpuModel: string
  cpuCores: number
  /** Nominal CPU speed in MHz (may be 0 on some Apple Silicon reports). */
  cpuSpeedMhz: number
  totalMemoryBytes: number
  freeMemoryBytes: number
  /** Primary display size in CSS pixels. */
  primaryDisplayWidth: number
  primaryDisplayHeight: number
  primaryDisplayScaleFactor: number
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
  /** process.getSystemVersion() on macOS/Windows when available. */
  systemVersion?: string
}

export interface WelcomeStateResponse {
  hasSeenWelcome: boolean
  /** True when the animated intro splash should be shown: either this is the very first
   * launch ever, or the app was just updated to a version the user hasn't launched yet. */
  showSplash: boolean
}

export type ResourceDetailPlacement = 'drawer' | 'right' | 'bottom'

import type { NodesDashboardPrefs } from './nodesDashboard'
import { defaultNodesDashboardPrefs } from './nodesDashboard'
import type { KeyboardShortcuts } from './keyboardShortcuts'
import { defaultKeyboardShortcuts, normalizeKeyboardShortcuts } from './keyboardShortcuts'
import type { AppLocale } from './locale'
import { defaultAppLocale, normalizeAppLocale } from './locale'

export type { KeyboardShortcuts, ShortcutActionId, ShortcutBinding } from './keyboardShortcuts'
export {
  SHORTCUT_ACTION_META,
  defaultKeyboardShortcuts,
  normalizeKeyboardShortcuts,
  matchesShortcut,
  bindingsEqual,
  formatShortcutBinding,
  shortcutParts,
  bindingFromKeyboardEvent
} from './keyboardShortcuts'
export type { AppLocale } from './locale'
export {
  APP_LOCALES,
  APP_LOCALE_LABELS,
  defaultAppLocale,
  normalizeAppLocale
} from './locale'

export interface DisplaySettings {
  showClusterTabLogos: boolean
  showResourceTabIcons: boolean
  /** Left sidebar Favorites section visibility (default on). */
  showFavoritesSection: boolean
  /** Left sidebar Workspaces section visibility (default on). */
  showWorkspacesSection: boolean
  resourceDetailPlacement: ResourceDetailPlacement
  showNodesPageEvents: boolean
  nodesDashboard: NodesDashboardPrefs
  keyboardShortcuts: KeyboardShortcuts
  locale: AppLocale
  /**
   * Absolute path to a kubeconfig file or directory used for Add Cluster auto-scan.
   * Empty string = default `~/.kube`.
   */
  kubeconfigScanPath: string
}

export const defaultDisplaySettings: DisplaySettings = {
  showClusterTabLogos: true,
  showResourceTabIcons: true,
  showFavoritesSection: true,
  showWorkspacesSection: true,
  resourceDetailPlacement: 'drawer',
  showNodesPageEvents: true,
  nodesDashboard: defaultNodesDashboardPrefs,
  keyboardShortcuts: defaultKeyboardShortcuts,
  locale: defaultAppLocale,
  kubeconfigScanPath: ''
}
