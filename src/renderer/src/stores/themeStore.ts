import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ColorSchemeId } from '../theme/schemes'
import { normalizeColorScheme } from '../theme/schemes'
import { normalizeHex } from '../theme/colorUtils'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeFamily = 'light' | 'dark'

export interface SavedCustomTheme {
  id: string
  name: string
  accentColor: string
}

interface ThemeState {
  mode: ThemeMode
  lightScheme: ColorSchemeId
  darkScheme: ColorSchemeId
  customAccentLight: string
  customAccentDark: string
  customThemesLight: SavedCustomTheme[]
  customThemesDark: SavedCustomTheme[]
  activeCustomThemeIdLight: string | null
  activeCustomThemeIdDark: string | null
  setMode: (mode: ThemeMode) => void
  setLightScheme: (scheme: ColorSchemeId) => void
  setDarkScheme: (scheme: ColorSchemeId) => void
  setCustomAccentLight: (color: string) => void
  setCustomAccentDark: (color: string) => void
  saveCustomTheme: (name: string, family: ThemeFamily) => void
  selectCustomTheme: (id: string, family: ThemeFamily) => void
  deleteCustomTheme: (id: string, family: ThemeFamily) => void
}

interface LegacyPersistedTheme {
  mode?: ThemeMode
  colorScheme?: string
  customAccentColor?: string
  customThemes?: SavedCustomTheme[]
  activeCustomThemeId?: string | null
  lightScheme?: string
  darkScheme?: string
  customAccentLight?: string
  customAccentDark?: string
  customThemesLight?: SavedCustomTheme[]
  customThemesDark?: SavedCustomTheme[]
  activeCustomThemeIdLight?: string | null
  activeCustomThemeIdDark?: string | null
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      lightScheme: 'white',
      darkScheme: 'black',
      customAccentLight: '#FF5F6D',
      customAccentDark: '#FF5F6D',
      customThemesLight: [],
      customThemesDark: [],
      activeCustomThemeIdLight: null,
      activeCustomThemeIdDark: null,
      setMode: (mode) => set({ mode }),
      setLightScheme: (lightScheme) =>
        set({
          lightScheme: normalizeColorScheme(lightScheme),
          activeCustomThemeIdLight: lightScheme === 'custom' ? get().activeCustomThemeIdLight : null
        }),
      setDarkScheme: (darkScheme) =>
        set({
          darkScheme: normalizeColorScheme(darkScheme),
          activeCustomThemeIdDark: darkScheme === 'custom' ? get().activeCustomThemeIdDark : null
        }),
      setCustomAccentLight: (color) =>
        set({
          customAccentLight: normalizeHex(color),
          lightScheme: 'custom',
          activeCustomThemeIdLight: null
        }),
      setCustomAccentDark: (color) =>
        set({
          customAccentDark: normalizeHex(color),
          darkScheme: 'custom',
          activeCustomThemeIdDark: null
        }),

      saveCustomTheme: (name, family) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const accent = family === 'dark' ? get().customAccentDark : get().customAccentLight
        const theme: SavedCustomTheme = {
          id: crypto.randomUUID(),
          name: trimmed,
          accentColor: accent
        }
        if (family === 'dark') {
          set((s) => ({
            customThemesDark: [...s.customThemesDark, theme],
            darkScheme: 'custom',
            activeCustomThemeIdDark: theme.id
          }))
          return
        }
        set((s) => ({
          customThemesLight: [...s.customThemesLight, theme],
          lightScheme: 'custom',
          activeCustomThemeIdLight: theme.id
        }))
      },

      selectCustomTheme: (id, family) => {
        const list = family === 'dark' ? get().customThemesDark : get().customThemesLight
        const theme = list.find((t) => t.id === id)
        if (!theme) return
        if (family === 'dark') {
          set({
            darkScheme: 'custom',
            customAccentDark: theme.accentColor,
            activeCustomThemeIdDark: id
          })
          return
        }
        set({
          lightScheme: 'custom',
          customAccentLight: theme.accentColor,
          activeCustomThemeIdLight: id
        })
      },

      deleteCustomTheme: (id, family) =>
        set((s) =>
          family === 'dark'
            ? {
                customThemesDark: s.customThemesDark.filter((t) => t.id !== id),
                activeCustomThemeIdDark: s.activeCustomThemeIdDark === id ? null : s.activeCustomThemeIdDark
              }
            : {
                customThemesLight: s.customThemesLight.filter((t) => t.id !== id),
                activeCustomThemeIdLight: s.activeCustomThemeIdLight === id ? null : s.activeCustomThemeIdLight
              }
        )
    }),
    {
      name: 'magiclens-theme',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as LegacyPersistedTheme
        const legacyAccent = p.customAccentColor ? normalizeHex(p.customAccentColor) : '#FF5F6D'
        const legacyThemes = Array.isArray(p.customThemes) ? p.customThemes : []
        const rawLight = p.lightScheme ?? p.colorScheme
        const rawDark = p.darkScheme ?? p.colorScheme
        return {
          ...current,
          mode: p.mode ?? current.mode,
          lightScheme: rawLight ? normalizeColorScheme(rawLight) : current.lightScheme,
          darkScheme: rawDark ? normalizeColorScheme(rawDark) : current.darkScheme,
          customAccentLight: normalizeHex(p.customAccentLight ?? legacyAccent),
          customAccentDark: normalizeHex(p.customAccentDark ?? legacyAccent),
          customThemesLight: p.customThemesLight ?? legacyThemes,
          customThemesDark: p.customThemesDark ?? legacyThemes,
          activeCustomThemeIdLight: p.activeCustomThemeIdLight ?? p.activeCustomThemeId ?? null,
          activeCustomThemeIdDark: p.activeCustomThemeIdDark ?? p.activeCustomThemeId ?? null
        }
      }
    }
  )
)
