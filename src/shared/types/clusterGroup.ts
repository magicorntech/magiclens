import type { ShortcutBinding } from './keyboardShortcuts'

export interface ClusterGroup {
  id: string
  name: string
  clusterIds: string[]
  /** Optional workspace logo (data URL or remote URL). */
  logoUrl?: string
  /** UI preference — collapsed in sidebar */
  collapsed?: boolean
  /** Optional app-wide shortcut to open this workspace */
  shortcut?: ShortcutBinding | null
  /**
   * Accent colour for this workspace in the sidebar. Reuses the menu-bar widget's palette so a
   * workspace and its clusters read as the same colour everywhere in the app rather than each
   * surface inventing its own set.
   */
  accent?: WorkspaceAccentId
}

/** Same ids as MENU_BAR_ACCENTS; `undefined` means "follow the theme's primary". */
export type WorkspaceAccentId = 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'teal' | 'red'

export const WORKSPACE_ACCENTS: Record<WorkspaceAccentId, string> = {
  blue: '#38bdf8',
  green: '#22c55e',
  purple: '#6366f1',
  amber: '#f59e0b',
  pink: '#ec4899',
  teal: '#14b8a6',
  red: '#ef4444'
}

export const WORKSPACE_ACCENT_IDS = Object.keys(WORKSPACE_ACCENTS) as WorkspaceAccentId[]

/** Resolves a stored value, ignoring anything not in the palette. */
export function workspaceAccentColor(accent: string | undefined): string | null {
  if (!accent) return null
  return WORKSPACE_ACCENTS[accent as WorkspaceAccentId] ?? null
}

export type ClusterGroupsState = ClusterGroup[]

export function normalizeGroupShortcut(
  value: unknown
): ShortcutBinding | null | undefined {
  if (value === null) return null
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<ShortcutBinding>
  if (typeof raw.key !== 'string' || !raw.key.trim()) return null
  return {
    key: raw.key.trim().toLowerCase(),
    metaOrCtrl: !!raw.metaOrCtrl,
    shift: raw.shift ? true : undefined,
    alt: raw.alt ? true : undefined
  }
}
