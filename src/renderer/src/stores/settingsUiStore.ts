import { create } from 'zustand'

export type SettingsSection =
  | 'general'
  | 'updates'
  | 'display'
  | 'keyboard'
  | 'appearance'
  | 'vpnExtensions'
  | 'about'

interface SettingsUiState {
  open: boolean
  section: SettingsSection
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  setOpen: (open: boolean) => void
  setSection: (section: SettingsSection) => void
}

export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  open: false,
  section: 'general',
  openSettings: (section) =>
    set((state) => ({
      open: true,
      section: section ?? state.section
    })),
  closeSettings: () => set({ open: false }),
  setOpen: (open) => set({ open }),
  setSection: (section) => set({ section })
}))
