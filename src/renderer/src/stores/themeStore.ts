import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ColorSchemeId } from '../theme/schemes'
import { normalizeHex } from '../theme/colorUtils'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  colorScheme: ColorSchemeId
  customAccentColor: string
  setMode: (mode: ThemeMode) => void
  setColorScheme: (scheme: ColorSchemeId) => void
  setCustomAccentColor: (color: string) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      colorScheme: 'violet',
      customAccentColor: '#7c3aed',
      setMode: (mode) => set({ mode }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setCustomAccentColor: (color) =>
        set({ customAccentColor: normalizeHex(color), colorScheme: 'custom' })
    }),
    { name: 'magiclens-theme' }
  )
)
