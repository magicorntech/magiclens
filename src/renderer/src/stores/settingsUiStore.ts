import { create } from 'zustand'

interface SettingsUiState {
  open: boolean
  openSettings: () => void
  closeSettings: () => void
  setOpen: (open: boolean) => void
}

export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  open: false,
  openSettings: () => set({ open: true }),
  closeSettings: () => set({ open: false }),
  setOpen: (open) => set({ open })
}))
