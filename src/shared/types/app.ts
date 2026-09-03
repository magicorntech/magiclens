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
  /**
   * The version this user last launched, or null on a first ever launch. Lets the renderer tell
   * "brand new user" (show the intro tour) apart from "existing user on a new build" (show that
   * release's highlights) — `showSplash` alone is true for both.
   */
  previousVersion: string | null
  /** The version running now, so the renderer can look up its highlights. */
  currentVersion: string
}

export type ResourceDetailPlacement = 'drawer' | 'right' | 'bottom'

/** Where Terminal / YAML editor (utility dock) sits relative to the main workspace. */
export type UtilityPanelPlacement = 'bottom' | 'right' | 'left'

/** Dock corner / edge for the expandable quick-launch balloon. */
export type UtilityFabSide =
  | 'left-middle'
  | 'right-middle'
  | 'left-bottom'
  | 'right-bottom'
  /** @deprecated prefer left-middle */
  | 'left'
  /** @deprecated prefer right-middle */
  | 'right'
  /** @deprecated prefer right-bottom */
  | 'bottom'

const UTILITY_FAB_SIDES: readonly UtilityFabSide[] = [
  'left-middle',
  'right-middle',
  'left-bottom',
  'right-bottom'
]

/** Map legacy edge values and unknown input onto the four dock corners. */
export function normalizeUtilityFabSide(value: unknown): UtilityFabSide {
  if (value === 'left' || value === 'left-middle') return 'left-middle'
  if (value === 'right' || value === 'right-middle') return 'right-middle'
  if (value === 'left-bottom') return 'left-bottom'
  if (value === 'bottom' || value === 'right-bottom') return 'right-bottom'
  if (typeof value === 'string' && (UTILITY_FAB_SIDES as readonly string[]).includes(value)) {
    return value as UtilityFabSide
  }
  return 'right-middle'
}

/** Free-drag position as % of the workspace (center of the balloon). */
export interface UtilityFabOffset {
  xPct: number
  yPct: number
}

import type { NodesDashboardPrefs } from './nodesDashboard'
import { defaultNodesDashboardPrefs } from './nodesDashboard'
import type { ChromeToolbarPrefs } from './chromeToolbar'
import { defaultChromeToolbarPrefs } from './chromeToolbar'
import type { MenuBarWidgetPrefs } from './menuBarWidget'
import { defaultMenuBarWidgetPrefs } from './menuBarWidget'
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
import {
  defaultUiTypography,
  type UiTypographyPrefs
} from './uiTypography'
export {
  defaultUiTypography,
  normalizeUiTypography,
  type UiTypographyPrefs,
  type UiFontId,
  type UiFontWeightId,
  type UiTextContrastId
} from './uiTypography'

export interface DisplaySettings {
  showClusterTabLogos: boolean
  showResourceTabIcons: boolean
  /** Left sidebar Favorites section visibility (default on). */
  showFavoritesSection: boolean
  /** Left sidebar Workspaces section visibility (default on). */
  showWorkspacesSection: boolean
  /** Show per-workspace cluster counts in the sidebar (default on). */
  showWorkspaceClusterCounts: boolean
  /**
   * macOS Dock-style magnification on workspace icons when the left sidebar is collapsed
   * (default on).
   */
  workspaceDockMagnification: boolean
  /** Show the connected namespace chip on sidebar cluster items (default on). */
  showClusterNamespace: boolean
  /** Soft UI font / weight / contrast tweaks (does not replace color themes). */
  uiTypography: UiTypographyPrefs
  resourceDetailPlacement: ResourceDetailPlacement
  /** Blur the resource list behind the detail drawer (default off). */
  resourceDetailMaskBlur: boolean
  /** Terminal + YAML editor dock position (default bottom). */
  utilityPanelPlacement: UtilityPanelPlacement
  /** Quick-launch balloon edge for Terminal / empty editor (default right). */
  utilityFabSide: UtilityFabSide
  /** Custom drag position; when set, overrides utilityFabSide edge docking. */
  utilityFabOffset: UtilityFabOffset | null
  /** Show the expandable Terminal / Editor balloon (default on). */
  showUtilityFab: boolean
  showNodesPageEvents: boolean
  nodesDashboard: NodesDashboardPrefs
  /** macOS menu-bar (Tray) cluster-metrics widget. */
  menuBarWidget: MenuBarWidgetPrefs
  /** Top chrome icon visibility + order (Settings stays fixed). */
  chromeToolbar: ChromeToolbarPrefs
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
  showWorkspaceClusterCounts: true,
  workspaceDockMagnification: true,
  showClusterNamespace: true,
  uiTypography: defaultUiTypography,
  resourceDetailPlacement: 'drawer',
  resourceDetailMaskBlur: false,
  utilityPanelPlacement: 'bottom',
  utilityFabSide: 'right-middle',
  utilityFabOffset: null,
  showUtilityFab: true,
  showNodesPageEvents: true,
  nodesDashboard: defaultNodesDashboardPrefs,
  menuBarWidget: defaultMenuBarWidgetPrefs,
  chromeToolbar: defaultChromeToolbarPrefs,
  keyboardShortcuts: defaultKeyboardShortcuts,
  locale: defaultAppLocale,
  kubeconfigScanPath: ''
}
