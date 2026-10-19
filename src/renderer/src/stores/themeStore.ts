import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ColorSchemeId } from '../theme/schemes'
import { normalizeColorScheme } from '../theme/schemes'
import {
  hydrateCustomPalette,
  normalizeHex,
  type CustomThemeColors
} from '../theme/colorUtils'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeFamily = 'light' | 'dark'

export interface SavedCustomTheme {
  id: string
  name: string
  accentColor: string
  background: string
  surface: string
  sidebar: string
}

export type CustomColorSlot = keyof CustomThemeColors

interface ThemeState {
  mode: ThemeMode
  lightScheme: ColorSchemeId
  darkScheme: ColorSchemeId
  customAccentLight: string
  customAccentDark: string
  customPaletteLight: CustomThemeColors
  customPaletteDark: CustomThemeColors
  customThemesLight: SavedCustomTheme[]
  customThemesDark: SavedCustomTheme[]
  activeCustomThemeIdLight: string | null
  activeCustomThemeIdDark: string | null
  setMode: (mode: ThemeMode) => void
  setLightScheme: (scheme: ColorSchemeId) => void
  setDarkScheme: (scheme: ColorSchemeId) => void
  setCustomAccentLight: (color: string) => void
  setCustomAccentDark: (color: string) => void
  setCustomColor: (slot: CustomColorSlot, color: string, family: ThemeFamily) => void
  beginCustomDraft: (family: ThemeFamily) => void
  saveCustomTheme: (name: string, family: ThemeFamily) => void
  renameCustomTheme: (name: string, family: ThemeFamily) => void
  selectCustomTheme: (id: string, family: ThemeFamily) => void
  deleteCustomTheme: (id: string, family: ThemeFamily) => void
}

function themeFromPalette(theme: SavedCustomTheme, palette: CustomThemeColors): SavedCustomTheme {
  return {
    ...theme,
    accentColor: palette.accent,
    background: palette.background,
    surface: palette.surface,
    sidebar: palette.sidebar
  }
}

function hydrateSavedThemes(themes: Array<Partial<SavedCustomTheme>> | undefined, isDark: boolean): SavedCustomTheme[] {
  if (!themes) return []
  return themes.flatMap((theme) => {
    if (!theme.id || !theme.name || !theme.accentColor) return []
    const palette = hydrateCustomPalette(theme.accentColor, theme, isDark)
    return [
      {
        id: theme.id,
        name: theme.name,
        accentColor: palette.accent,
        background: palette.background,
        surface: palette.surface,
        sidebar: palette.sidebar
      }
    ]
  })
}

interface LegacyPersistedTheme {
  mode?: ThemeMode
  colorScheme?: string
  customAccentColor?: string
  customThemes?: Array<Partial<SavedCustomTheme>>
  activeCustomThemeId?: string | null
  lightScheme?: string
  darkScheme?: string
  customAccentLight?: string
  customAccentDark?: string
  customPaletteLight?: Partial<CustomThemeColors>
  customPaletteDark?: Partial<CustomThemeColors>
  customThemesLight?: Array<Partial<SavedCustomTheme>>
  customThemesDark?: Array<Partial<SavedCustomTheme>>
  activeCustomThemeIdLight?: string | null
  activeCustomThemeIdDark?: string | null
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      lightScheme: 'white',
      darkScheme: 'black',
      customAccentLight: '#e11d48',
      customAccentDark: '#ff5f6d',
      customPaletteLight: hydrateCustomPalette('#e11d48', undefined, false),
      customPaletteDark: hydrateCustomPalette('#ff5f6d', undefined, true),
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
      beginCustomDraft: (family) =>
        set(
          family === 'dark'
            ? { darkScheme: 'custom', activeCustomThemeIdDark: null }
            : { lightScheme: 'custom', activeCustomThemeIdLight: null }
        ),

      setCustomAccentLight: (color) => get().setCustomColor('accent', color, 'light'),
      setCustomAccentDark: (color) => get().setCustomColor('accent', color, 'dark'),

      setCustomColor: (slot, color, family) => {
        const hex = normalizeHex(color)
        set((s) => {
          if (family === 'dark') {
            const palette = { ...s.customPaletteDark, [slot]: hex }
            const id = s.activeCustomThemeIdDark
            return {
              customPaletteDark: palette,
              customAccentDark: palette.accent,
              darkScheme: 'custom',
              customThemesDark: id
                ? s.customThemesDark.map((theme) => (theme.id === id ? themeFromPalette(theme, palette) : theme))
                : s.customThemesDark
            }
          }
          const palette = { ...s.customPaletteLight, [slot]: hex }
          const id = s.activeCustomThemeIdLight
          return {
            customPaletteLight: palette,
            customAccentLight: palette.accent,
            lightScheme: 'custom',
            customThemesLight: id
              ? s.customThemesLight.map((theme) => (theme.id === id ? themeFromPalette(theme, palette) : theme))
              : s.customThemesLight
          }
        })
      },

      saveCustomTheme: (name, family) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const palette = family === 'dark' ? get().customPaletteDark : get().customPaletteLight
        const theme: SavedCustomTheme = {
          id: crypto.randomUUID(),
          name: trimmed,
          accentColor: palette.accent,
          background: palette.background,
          surface: palette.surface,
          sidebar: palette.sidebar
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

      renameCustomTheme: (name, family) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const id = family === 'dark' ? get().activeCustomThemeIdDark : get().activeCustomThemeIdLight
        if (!id) return
        set((s) =>
          family === 'dark'
            ? {
                customThemesDark: s.customThemesDark.map((theme) =>
                  theme.id === id ? { ...theme, name: trimmed } : theme
                )
              }
            : {
                customThemesLight: s.customThemesLight.map((theme) =>
                  theme.id === id ? { ...theme, name: trimmed } : theme
                )
              }
        )
      },

      selectCustomTheme: (id, family) => {
        const list = family === 'dark' ? get().customThemesDark : get().customThemesLight
        const theme = list.find((t) => t.id === id)
        if (!theme) return
        const palette: CustomThemeColors = {
          accent: theme.accentColor,
          background: theme.background,
          surface: theme.surface,
          sidebar: theme.sidebar
        }
        if (family === 'dark') {
          set({
            darkScheme: 'custom',
            customPaletteDark: palette,
            customAccentDark: palette.accent,
            activeCustomThemeIdDark: id
          })
          return
        }
        set({
          lightScheme: 'custom',
          customPaletteLight: palette,
          customAccentLight: palette.accent,
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
        const rawLight = p.lightScheme ?? p.colorScheme
        const rawDark = p.darkScheme ?? p.colorScheme
        const paletteLight = hydrateCustomPalette(p.customAccentLight ?? legacyAccent, p.customPaletteLight, false)
        const paletteDark = hydrateCustomPalette(p.customAccentDark ?? legacyAccent, p.customPaletteDark, true)
        const legacyThemes = Array.isArray(p.customThemes) ? p.customThemes : []
        return {
          ...current,
          mode: p.mode ?? current.mode,
          lightScheme: rawLight ? normalizeColorScheme(rawLight) : current.lightScheme,
          darkScheme: rawDark ? normalizeColorScheme(rawDark) : current.darkScheme,
          customAccentLight: paletteLight.accent,
          customAccentDark: paletteDark.accent,
          customPaletteLight: paletteLight,
          customPaletteDark: paletteDark,
          customThemesLight: hydrateSavedThemes(p.customThemesLight ?? legacyThemes, false),
          customThemesDark: hydrateSavedThemes(p.customThemesDark ?? legacyThemes, true),
          activeCustomThemeIdLight: p.activeCustomThemeIdLight ?? p.activeCustomThemeId ?? null,
          activeCustomThemeIdDark: p.activeCustomThemeIdDark ?? p.activeCustomThemeId ?? null
        }
      }
    }
  )
)
