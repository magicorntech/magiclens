import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ColorSchemeId } from '../theme/schemes'
import { normalizeHex } from '../theme/colorUtils'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface SavedCustomTheme {
  id: string
  name: string
  accentColor: string
}

interface ThemeState {
  mode: ThemeMode
  colorScheme: ColorSchemeId
  customAccentColor: string
  customThemes: SavedCustomTheme[]
  /** Which saved theme (if any) the current custom accent color came from — cleared the moment
   *  the color is edited, so the UI never shows a saved name next to a color that's since changed. */
  activeCustomThemeId: string | null
  setMode: (mode: ThemeMode) => void
  setColorScheme: (scheme: ColorSchemeId) => void
  setCustomAccentColor: (color: string) => void
  saveCustomTheme: (name: string) => void
  selectCustomTheme: (id: string) => void
  deleteCustomTheme: (id: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      colorScheme: 'rose',
      customAccentColor: '#FF5F6D',
      customThemes: [],
      activeCustomThemeId: null,
      setMode: (mode) => set({ mode }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setCustomAccentColor: (color) =>
        set({ customAccentColor: normalizeHex(color), colorScheme: 'custom', activeCustomThemeId: null }),

      saveCustomTheme: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const theme: SavedCustomTheme = {
          id: crypto.randomUUID(),
          name: trimmed,
          accentColor: get().customAccentColor
        }
        set((s) => ({
          customThemes: [...s.customThemes, theme],
          colorScheme: 'custom',
          activeCustomThemeId: theme.id
        }))
      },

      selectCustomTheme: (id) => {
        const theme = get().customThemes.find((t) => t.id === id)
        if (!theme) return
        set({ colorScheme: 'custom', customAccentColor: theme.accentColor, activeCustomThemeId: id })
      },

      deleteCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== id),
          activeCustomThemeId: s.activeCustomThemeId === id ? null : s.activeCustomThemeId
        }))
    }),
    { name: 'magiclens-theme' }
  )
)
