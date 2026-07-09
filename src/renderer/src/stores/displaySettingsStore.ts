import { create } from 'zustand'
import {
  defaultDisplaySettings,
  type DisplaySettings,
  type ResourceDetailPlacement
} from '@shared/types/app'
import {
  normalizeNodesDashboardPrefs,
  type NodesDashboardPrefs,
  type NodesDashboardSectionId
} from '@shared/types/nodesDashboard'

interface DisplaySettingsState extends DisplaySettings {
  hydrated: boolean
  hydrate: () => Promise<void>
  setShowClusterTabLogos: (value: boolean) => Promise<void>
  setShowResourceTabIcons: (value: boolean) => Promise<void>
  setResourceDetailPlacement: (value: ResourceDetailPlacement) => Promise<void>
  setShowNodesPageEvents: (value: boolean) => Promise<void>
  setNodesDashboardPrefs: (prefs: NodesDashboardPrefs) => Promise<void>
  toggleNodesDashboardSection: (id: NodesDashboardSectionId) => Promise<void>
  reorderNodesDashboardSections: (fromId: NodesDashboardSectionId, toId: NodesDashboardSectionId) => Promise<void>
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()((set, get) => ({
  ...defaultDisplaySettings,
  hydrated: false,
  hydrate: async () => {
    const settings = await window.api.app.getDisplaySettings()
    set({
      ...defaultDisplaySettings,
      ...settings,
      nodesDashboard: normalizeNodesDashboardPrefs(settings.nodesDashboard),
      hydrated: true
    })
  },
  setShowClusterTabLogos: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showClusterTabLogos: value })
    set({ ...next, nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard) })
  },
  setShowResourceTabIcons: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showResourceTabIcons: value })
    set({ ...next, nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard) })
  },
  setResourceDetailPlacement: async (value) => {
    const next = await window.api.app.setDisplaySettings({ resourceDetailPlacement: value })
    set({ ...next, nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard) })
  },
  setShowNodesPageEvents: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showNodesPageEvents: value })
    set({ ...next, nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard) })
  },
  setNodesDashboardPrefs: async (prefs) => {
    const normalized = normalizeNodesDashboardPrefs(prefs)
    const next = await window.api.app.setDisplaySettings({ nodesDashboard: normalized })
    set({ ...next, nodesDashboard: normalizeNodesDashboardPrefs(next.nodesDashboard) })
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
  }
}))
