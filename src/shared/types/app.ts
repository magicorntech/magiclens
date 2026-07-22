export interface AppInfoResponse {
  version: string
  buildNumber: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
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
  locale: defaultAppLocale
}
