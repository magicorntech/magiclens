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
