import { create } from 'zustand'
import type { UpdateSettings, UpdateState } from '@shared/types/update'

interface UpdateStoreState {
  initialized: boolean
  state: UpdateState | null
  settings: UpdateSettings | null
  centerOpen: boolean
  init: () => void
  openCenter: () => void
  closeCenter: () => void
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
  skip: () => Promise<void>
  remindLater: () => Promise<void>
  saveSettings: (patch: Partial<UpdateSettings>) => Promise<void>
}

export const useUpdateStore = create<UpdateStoreState>()((set, get) => ({
  initialized: false,
  state: null,
  settings: null,
  centerOpen: false,

  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    void window.api.update.getState().then((state) => set({ state }))
    void window.api.update.getSettings().then((settings) => set({ settings }))

    window.api.update.onStateChanged((state) => set({ state }))
  },

  openCenter: () => set({ centerOpen: true }),
  closeCenter: () => set({ centerOpen: false }),

  check: async () => {
    await window.api.update.check()
  },

  download: async () => {
    await window.api.update.download()
  },

  install: async () => {
    await window.api.update.install()
  },

  skip: async () => {
    const version = get().state?.latestVersion
    if (!version) return
    await window.api.update.skipVersion({ version })
  },

  remindLater: async () => {
    await window.api.update.remindLater()
  },

  saveSettings: async (patch) => {
    const next = await window.api.update.setSettings(patch)
    set({ settings: next })
  }
}))
