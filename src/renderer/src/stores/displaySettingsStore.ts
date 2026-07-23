import { create } from 'zustand'
import {
  defaultDisplaySettings,
  type DisplaySettings,
  type ResourceDetailPlacement
} from '@shared/types/app'
import {
  normalizeKeyboardShortcuts,
  type KeyboardShortcuts,
  type ShortcutActionId,
  type ShortcutBinding,
  bindingsEqual
} from '@shared/types/keyboardShortcuts'
import { normalizeAppLocale, type AppLocale } from '@shared/types/locale'
import {
  normalizeNodesDashboardPrefs,
  type NodesDashboardPrefs,
  type NodesDashboardSectionId
} from '@shared/types/nodesDashboard'
import i18n from '../i18n'
import { applyDayjsLocale } from '../i18n/antdLocales'

interface DisplaySettingsState extends DisplaySettings {
  hydrated: boolean
  hydrate: () => Promise<void>
  setShowClusterTabLogos: (value: boolean) => Promise<void>
  setShowResourceTabIcons: (value: boolean) => Promise<void>
  setShowFavoritesSection: (value: boolean) => Promise<void>
  setShowWorkspacesSection: (value: boolean) => Promise<void>
  setResourceDetailPlacement: (value: ResourceDetailPlacement) => Promise<void>
  setShowNodesPageEvents: (value: boolean) => Promise<void>
  setNodesDashboardPrefs: (prefs: NodesDashboardPrefs) => Promise<void>
  toggleNodesDashboardSection: (id: NodesDashboardSectionId) => Promise<void>
  reorderNodesDashboardSections: (fromId: NodesDashboardSectionId, toId: NodesDashboardSectionId) => Promise<void>
  setShortcut: (action: ShortcutActionId, binding: ShortcutBinding) => Promise<void>
  resetShortcuts: () => Promise<void>
  setLocale: (locale: AppLocale) => Promise<void>
  setKubeconfigScanPath: (path: string) => Promise<void>
}

function applyDisplay(next: DisplaySettings): DisplaySettings {
  return {
    ...defaultDisplaySettings,
    ...next,
    nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard),
    keyboardShortcuts: normalizeKeyboardShortcuts(next.keyboardShortcuts),
    locale: normalizeAppLocale(next.locale)
  }
}

async function syncLocale(locale: AppLocale): Promise<void> {
  applyDayjsLocale(locale)
  if (i18n.language !== locale) {
    await i18n.changeLanguage(locale)
  }
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()((set, get) => ({
  ...defaultDisplaySettings,
  hydrated: false,
  hydrate: async () => {
    const settings = await window.api.app.getDisplaySettings()
    const applied = applyDisplay(settings)
    set({ ...applied, hydrated: true })
    await syncLocale(applied.locale)
  },
  setShowClusterTabLogos: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showClusterTabLogos: value })
    set(applyDisplay(next))
  },
  setShowResourceTabIcons: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showResourceTabIcons: value })
    set(applyDisplay(next))
  },
  setShowFavoritesSection: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showFavoritesSection: value })
    set(applyDisplay(next))
  },
  setShowWorkspacesSection: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showWorkspacesSection: value })
    set(applyDisplay(next))
  },
  setResourceDetailPlacement: async (value) => {
    const next = await window.api.app.setDisplaySettings({ resourceDetailPlacement: value })
    set(applyDisplay(next))
  },
  setShowNodesPageEvents: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showNodesPageEvents: value })
    set(applyDisplay(next))
  },
  setNodesDashboardPrefs: async (prefs) => {
    const normalized = normalizeNodesDashboardPrefs(prefs)
    const next = await window.api.app.setDisplaySettings({ nodesDashboard: normalized })
    set(applyDisplay(next))
  },
  toggleNodesDashboardSection: async (id) => {
    const current = normalizeNodesDashboardPrefs(get().nodesDashboard)
    const visible = { ...current.visible, [id]: !current.visible[id] }
    await get().setNodesDashboardPrefs({ ...current, visible })
  },
  reorderNodesDashboardSections: async (fromId, toId) => {
    const current = normalizeNodesDashboardPrefs(get().nodesDashboard)
    const order = [...current.order]
    const from = order.indexOf(fromId)
    const to = order.indexOf(toId)
    if (from < 0 || to < 0 || from === to) return
    order.splice(from, 1)
    order.splice(to, 0, fromId)
    await get().setNodesDashboardPrefs({ ...current, order })
  },
  setShortcut: async (action, binding) => {
    const current = normalizeKeyboardShortcuts(get().keyboardShortcuts)
    const next: KeyboardShortcuts = { ...current, [action]: binding }
    for (const id of Object.keys(next) as ShortcutActionId[]) {
      if (id === action) continue
      if (bindingsEqual(next[id], binding)) {
        next[id] = current[action]
      }
    }
    const saved = await window.api.app.setDisplaySettings({ keyboardShortcuts: next })
    set(applyDisplay(saved))
  },
  resetShortcuts: async () => {
    const saved = await window.api.app.setDisplaySettings({
      keyboardShortcuts: normalizeKeyboardShortcuts(null)
    })
    set(applyDisplay(saved))
  },
  setLocale: async (locale) => {
    const saved = await window.api.app.setDisplaySettings({ locale: normalizeAppLocale(locale) })
    const applied = applyDisplay(saved)
    set(applied)
    await syncLocale(applied.locale)
  },
  setKubeconfigScanPath: async (path) => {
    const next = await window.api.app.setDisplaySettings({ kubeconfigScanPath: path })
    set(applyDisplay(next))
  }
}))
