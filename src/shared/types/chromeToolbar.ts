export type ChromeToolbarActionId =
  | 'search'
  | 'terminal'
  | 'theme'
  | 'fullscreen'
  | 'split'

/** Always rendered last; not user-reorderable or hideable. */
export const CHROME_TOOLBAR_FIXED_ACTIONS = ['settings'] as const
export type ChromeToolbarFixedActionId = (typeof CHROME_TOOLBAR_FIXED_ACTIONS)[number]

export interface ChromeToolbarPrefs {
  order: ChromeToolbarActionId[]
  visible: Record<ChromeToolbarActionId, boolean>
}

export const CHROME_TOOLBAR_ACTION_LABELS: Record<ChromeToolbarActionId, string> = {
  search: 'Search',
  terminal: 'Terminal',
  theme: 'Theme',
  fullscreen: 'Fullscreen',
  split: 'Split clusters'
}

export const defaultChromeToolbarPrefs: ChromeToolbarPrefs = {
  order: ['search', 'terminal', 'theme', 'fullscreen', 'split'],
  visible: {
    search: true,
    terminal: true,
    theme: true,
    fullscreen: true,
    split: true
  }
}

export function normalizeChromeToolbarPrefs(prefs?: Partial<ChromeToolbarPrefs>): ChromeToolbarPrefs {
  const order = prefs?.order?.length
    ? [...prefs.order]
    : [...defaultChromeToolbarPrefs.order]
  const known = new Set(defaultChromeToolbarPrefs.order)
  const filtered = order.filter((id) => known.has(id))
  for (const id of defaultChromeToolbarPrefs.order) {
    if (!filtered.includes(id)) filtered.push(id)
  }
  return {
    order: filtered,
    visible: { ...defaultChromeToolbarPrefs.visible, ...prefs?.visible }
  }
}
