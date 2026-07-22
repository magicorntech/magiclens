export type ShortcutActionId =
  | 'globalSearch'
  | 'toggleSplitView'
  | 'goToClusters'
  | 'goToVpn'
  | 'toggleSidebar'
  | 'openSettings'

export interface ShortcutBinding {
  /** Lowercase key from KeyboardEvent.key (e.g. "k", "\\", ",", "arrowleft") */
  key: string
  metaOrCtrl: boolean
  shift?: boolean
  alt?: boolean
}

export type KeyboardShortcuts = Record<ShortcutActionId, ShortcutBinding>

export const SHORTCUT_ACTION_META: Record<
  ShortcutActionId,
  { label: string; description: string }
> = {
  globalSearch: {
    label: 'Global search',
    description: 'Open or close the cluster / resource search palette'
  },
  toggleSplitView: {
    label: 'Toggle split view',
    description: 'Compare two cluster tabs side by side'
  },
  goToClusters: {
    label: 'Go to clusters',
    description: 'Open the clusters list'
  },
  goToVpn: {
    label: 'Go to VPN',
    description: 'Open the VPN profiles page'
  },
  toggleSidebar: {
    label: 'Toggle sidebar',
    description: 'Collapse or expand the left sidebar'
  },
  openSettings: {
    label: 'Open settings',
    description: 'Open the settings window'
  }
}

export const defaultKeyboardShortcuts: KeyboardShortcuts = {
  globalSearch: { key: 'k', metaOrCtrl: true },
  toggleSplitView: { key: '\\', metaOrCtrl: true },
  goToClusters: { key: '1', metaOrCtrl: true },
  goToVpn: { key: '2', metaOrCtrl: true },
  toggleSidebar: { key: 'b', metaOrCtrl: true },
  openSettings: { key: ',', metaOrCtrl: true }
}

export function normalizeKeyboardShortcuts(
  partial?: Partial<KeyboardShortcuts> | null
): KeyboardShortcuts {
  return {
    ...defaultKeyboardShortcuts,
    ...(partial ?? {})
  }
}

export function normalizeShortcutKey(key: string): string {
  if (key === ' ') return 'space'
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase()
}

export interface ShortcutKeyboardEventLike {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export function bindingFromKeyboardEvent(event: ShortcutKeyboardEventLike): ShortcutBinding | null {
  const key = normalizeShortcutKey(event.key)
  if (key === 'escape' || key === 'shift' || key === 'control' || key === 'meta' || key === 'alt') {
    return null
  }
  const metaOrCtrl = event.metaKey || event.ctrlKey
  // Require at least a modifier for letter/digit shortcuts to avoid stealing typing
  if (!metaOrCtrl && !event.altKey && /^[a-z0-9]$/.test(key)) {
    return null
  }
  return {
    key,
    metaOrCtrl,
    shift: event.shiftKey || undefined,
    alt: event.altKey || undefined
  }
}

export function matchesShortcut(event: ShortcutKeyboardEventLike, binding: ShortcutBinding): boolean {
  const key = normalizeShortcutKey(event.key)
  if (key !== binding.key) return false
  const metaOrCtrl = event.metaKey || event.ctrlKey
  if (!!binding.metaOrCtrl !== metaOrCtrl) return false
  if (!!binding.shift !== event.shiftKey) return false
  if (!!binding.alt !== event.altKey) return false
  return true
}

export function bindingsEqual(a: ShortcutBinding, b: ShortcutBinding): boolean {
  return (
    a.key === b.key &&
    !!a.metaOrCtrl === !!b.metaOrCtrl &&
    !!a.shift === !!b.shift &&
    !!a.alt === !!b.alt
  )
}

export function formatShortcutBinding(binding: ShortcutBinding, isMac = false): string {
  const parts: string[] = []
  if (binding.metaOrCtrl) parts.push(isMac ? '⌘' : 'Ctrl')
  if (binding.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (binding.shift) parts.push(isMac ? '⇧' : 'Shift')
  const keyLabel =
    binding.key === ' ' || binding.key === 'space'
      ? 'Space'
      : binding.key === '\\'
        ? '\\'
        : binding.key === ','
          ? ','
          : binding.key.length === 1
            ? binding.key.toUpperCase()
            : binding.key
  parts.push(keyLabel)
  return isMac ? parts.join('') : parts.join('+')
}

/** Compact kbd chips for UI (Mac-style glyphs when isMac). */
export function shortcutParts(binding: ShortcutBinding, isMac = false): string[] {
  const parts: string[] = []
  if (binding.metaOrCtrl) parts.push(isMac ? '⌘' : 'Ctrl')
  if (binding.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (binding.shift) parts.push(isMac ? '⇧' : 'Shift')
  parts.push(
    binding.key === 'space'
      ? 'Space'
      : binding.key.length === 1
        ? binding.key.toUpperCase()
        : binding.key
  )
  return parts
}
