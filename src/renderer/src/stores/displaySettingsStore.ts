import { create } from 'zustand'
import { defaultDisplaySettings, type DisplaySettings } from '@shared/types/app'

interface DisplaySettingsState extends DisplaySettings {
  hydrated: boolean
  hydrate: () => Promise<void>
  setShowClusterTabLogos: (value: boolean) => Promise<void>
  setShowResourceTabIcons: (value: boolean) => Promise<void>
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()((set) => ({
  ...defaultDisplaySettings,
  hydrated: false,
  hydrate: async () => {
    const settings = await window.api.app.getDisplaySettings()
    set({ ...settings, hydrated: true })
  },
  setShowClusterTabLogos: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showClusterTabLogos: value })
    set(next)
  },
  setShowResourceTabIcons: async (value) => {
    const next = await window.api.app.setDisplaySettings({ showResourceTabIcons: value })
    set(next)
  }
}))
