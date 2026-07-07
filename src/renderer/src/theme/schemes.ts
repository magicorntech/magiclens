import type { AppPalette } from './palette'
import {
  darken,
  deriveSchemeFromAccent,
  lighten,
  mixHex,
  withAlpha,
  type DerivedSchemeColors
} from './colorUtils'

export type ColorSchemeId = 'violet' | 'ocean' | 'forest' | 'sunset' | 'slate' | 'rose' | 'custom'

export interface ColorSchemeDefinition {
  id: Exclude<ColorSchemeId, 'custom'>
  name: string
  description: string
  swatches: [string, string, string]
}

export type SchemeColors = DerivedSchemeColors

function buildPalette(colors: SchemeColors, isDark: boolean): AppPalette {
  const primary = isDark ? colors.primaryDark : colors.primaryLight
  const primaryHover = isDark ? colors.primaryDarkHover : colors.primaryLightHover
  const accent = isDark ? colors.primaryDark : colors.primaryLight
  const layout = isDark ? colors.layoutDark : colors.layoutLight

  if (isDark) {
    const container = lighten(layout, 0.04)
    const elevated = lighten(layout, 0.08)
    return {
      primary,
      primaryHover,
      info: '#818cf8',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      bgLayout: layout,
      bgContainer: container,
      bgElevated: elevated,
      bgSpotlight: colors.spotlightDark,
      border: mixHex(accent, layout, 0.25),
      borderSecondary: mixHex(accent, layout, 0.12),
      text: '#f0f0f5',
      textSecondary: mixHex('#c8c0d4', layout, 0.45),
      textTertiary: mixHex('#9a90aa', layout, 0.35),
      sidebarBg: container,
      sidebarText: '#f0f0f5',
      sidebarMuted: mixHex('#c8c0d4', layout, 0.45),
      sidebarSubtle: mixHex('#9a90aa', layout, 0.35),
      sidebarDivider: mixHex(accent, layout, 0.12),
      sidebarHover: withAlpha('#ffffff', 0.05),
      sidebarActive: withAlpha(accent, 0.18),
      sidebarControlBg: elevated,
      sidebarControlBorder: mixHex(accent, layout, 0.2),
      resourceSiderBg: colors.resourceSiderDark,
      panelBg: darken(layout, 0.02),
      terminalBg: darken(layout, 0.06),
      terminalFg: '#ddd6e8',
      terminalMuted: mixHex('#b0a8be', layout, 0.4),
      shadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
      selectionBg: withAlpha(accent, 0.14)
    }
  }

  const container = '#ffffff'
  return {
    primary,
    primaryHover,
    info: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    bgLayout: layout,
    bgContainer: container,
    bgElevated: container,
    bgSpotlight: colors.spotlightLight,
    border: mixHex(accent, '#ffffff', 0.15),
    borderSecondary: mixHex(accent, '#ffffff', 0.08),
    text: '#1a1225',
    textSecondary: mixHex('#1a1225', layout, 0.55),
    textTertiary: mixHex('#1a1225', layout, 0.4),
    sidebarBg: container,
    sidebarText: '#1a1225',
    sidebarMuted: mixHex('#1a1225', layout, 0.55),
    sidebarSubtle: mixHex('#1a1225', layout, 0.4),
    sidebarDivider: mixHex(accent, '#ffffff', 0.1),
    sidebarHover: withAlpha(accent, 0.07),
    sidebarActive: withAlpha(accent, 0.12),
    sidebarControlBg: colors.spotlightLight,
    sidebarControlBorder: mixHex(accent, '#ffffff', 0.12),
    resourceSiderBg: colors.resourceSiderLight,
    panelBg: lighten(layout, 0.5),
    terminalBg: '#1a1625',
    terminalFg: '#e2e0ea',
    terminalMuted: '#9b93ad',
    shadow: `0 1px 4px ${withAlpha(accent, 0.08)}`,
    selectionBg: withAlpha(accent, 0.1)
  }
}

const SCHEME_COLORS: Record<Exclude<ColorSchemeId, 'custom'>, SchemeColors> = {
  violet: {
    primaryLight: '#7c3aed',
    primaryLightHover: '#6d28d9',
    primaryDark: '#a78bfa',
    primaryDarkHover: '#c4b5fd',
    resourceSiderLight: '#4c1d95',
    resourceSiderDark: '#130818',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#221a30',
    layoutLight: '#f3f0f9',
    layoutDark: '#0a0610'
  },
  ocean: {
    primaryLight: '#0284c7',
    primaryLightHover: '#0369a1',
    primaryDark: '#38bdf8',
    primaryDarkHover: '#7dd3fc',
    resourceSiderLight: '#0c4a6e',
    resourceSiderDark: '#041018',
    spotlightLight: '#f0f9ff',
    spotlightDark: '#102030',
    layoutLight: '#eff6ff',
    layoutDark: '#060d14'
  },
  forest: {
    primaryLight: '#059669',
    primaryLightHover: '#047857',
    primaryDark: '#34d399',
    primaryDarkHover: '#6ee7b7',
    resourceSiderLight: '#064e3b',
    resourceSiderDark: '#041410',
    spotlightLight: '#ecfdf5',
    spotlightDark: '#102018',
    layoutLight: '#f0fdf4',
    layoutDark: '#060f0a'
  },
  sunset: {
    primaryLight: '#ea580c',
    primaryLightHover: '#c2410c',
    primaryDark: '#fb923c',
    primaryDarkHover: '#fdba74',
    resourceSiderLight: '#7c2d12',
    resourceSiderDark: '#180904',
    spotlightLight: '#fff7ed',
    spotlightDark: '#241610',
    layoutLight: '#fff7ed',
    layoutDark: '#100904'
  },
  slate: {
    primaryLight: '#475569',
    primaryLightHover: '#334155',
    primaryDark: '#94a3b8',
    primaryDarkHover: '#cbd5e1',
    resourceSiderLight: '#1e293b',
    resourceSiderDark: '#0b0f14',
    spotlightLight: '#f8fafc',
    spotlightDark: '#1a2028',
    layoutLight: '#f1f5f9',
    layoutDark: '#0a0d10'
  },
  rose: {
    primaryLight: '#e11d48',
    primaryLightHover: '#be123c',
    primaryDark: '#fb7185',
    primaryDarkHover: '#fda4af',
    resourceSiderLight: '#881337',
    resourceSiderDark: '#14060c',
    spotlightLight: '#fff1f2',
    spotlightDark: '#241018',
    layoutLight: '#fff1f2',
    layoutDark: '#0f0608'
  }
}

export const COLOR_SCHEME_DEFINITIONS: ColorSchemeDefinition[] = [
  { id: 'violet', name: 'Violet', description: 'MagicLens default purple harmony', swatches: ['#7c3aed', '#a78bfa', '#f3f0f9'] },
  { id: 'ocean', name: 'Ocean', description: 'Cool blue and cyan balance', swatches: ['#0284c7', '#38bdf8', '#eff6ff'] },
  { id: 'forest', name: 'Forest', description: 'Fresh green natural tones', swatches: ['#059669', '#34d399', '#f0fdf4'] },
  { id: 'sunset', name: 'Sunset', description: 'Warm orange and amber glow', swatches: ['#ea580c', '#fb923c', '#fff7ed'] },
  { id: 'slate', name: 'Slate', description: 'Neutral professional gray', swatches: ['#475569', '#94a3b8', '#f1f5f9'] },
  { id: 'rose', name: 'Rose', description: 'Soft pink and rose accents', swatches: ['#e11d48', '#fb7185', '#fff1f2'] }
]

export function getSchemePalette(scheme: ColorSchemeId, isDark: boolean, customAccent?: string): AppPalette {
  const colors =
    scheme === 'custom' ? deriveSchemeFromAccent(customAccent ?? '#7c3aed') : SCHEME_COLORS[scheme]
  return buildPalette(colors, isDark)
}
