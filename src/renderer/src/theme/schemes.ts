import type { AppPalette } from './palette'
import {
  darken,
  deriveSchemeFromAccent,
  lighten,
  mixHex,
  withAlpha,
  type DerivedSchemeColors
} from './colorUtils'

export type ColorSchemeId =
  | 'violet'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'slate'
  | 'rose'
  | 'skywings'
  | 'moonprism'
  | 'webstrike'
  | 'nightcape'
  | 'arcforge'
  | 'shadowflame'
  | 'leafstorm'
  | 'nebula'
  | 'custom'

export type ColorSchemeGroup = 'classic' | 'worlds'

export interface ColorSchemeDefinition {
  id: Exclude<ColorSchemeId, 'custom'>
  name: string
  description: string
  group: ColorSchemeGroup
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
      border: 'rgba(255,255,255,0.08)',
      borderSecondary: 'rgba(255,255,255,0.05)',
      text: '#f0f0f5',
      textSecondary: mixHex('#c8c0d4', layout, 0.45),
      textTertiary: mixHex('#9a90aa', layout, 0.35),
      sidebarBg: container,
      sidebarText: '#f0f0f5',
      sidebarMuted: mixHex('#c8c0d4', layout, 0.45),
      sidebarSubtle: mixHex('#9a90aa', layout, 0.35),
      sidebarDivider: 'rgba(255,255,255,0.06)',
      sidebarHover: withAlpha('#ffffff', 0.05),
      sidebarActive: withAlpha(accent, 0.12),
      sidebarControlBg: elevated,
      sidebarControlBorder: mixHex(accent, layout, 0.2),
      resourceSiderBg: colors.resourceSiderDark,
      panelBg: container,
      terminalBg: '#0d1117',
      terminalFg: '#ddd6e8',
      terminalMuted: mixHex('#b0a8be', layout, 0.4),
      shadow: 'none',
      selectionBg: withAlpha(accent, 0.14)
    }
  }

  const container = '#ffffff'
  const sidebarSurface = mixHex(layout, '#ffffff', 0.28)
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
    border: 'rgba(15,23,42,0.08)',
    borderSecondary: 'rgba(15,23,42,0.05)',
    text: '#1a1225',
    textSecondary: mixHex('#1a1225', layout, 0.55),
    textTertiary: mixHex('#1a1225', layout, 0.4),
    sidebarBg: sidebarSurface,
    sidebarText: '#1a1225',
    sidebarMuted: mixHex('#1a1225', layout, 0.55),
    sidebarSubtle: mixHex('#1a1225', layout, 0.4),
    sidebarDivider: 'rgba(15,23,42,0.08)',
    sidebarHover: withAlpha(accent, 0.07),
    sidebarActive: withAlpha(accent, 0.12),
    sidebarControlBg: colors.spotlightLight,
    sidebarControlBorder: mixHex(accent, '#ffffff', 0.12),
    // Light mode must use a light surface here — the nav text/hover colors are dark.
    resourceSiderBg: sidebarSurface,
    panelBg: lighten(layout, 0.5),
    terminalBg: '#1a1625',
    terminalFg: '#e2e0ea',
    terminalMuted: '#9b93ad',
    shadow: 'none',
    selectionBg: withAlpha(accent, 0.1)
  }
}

const SCHEME_COLORS: Record<Exclude<ColorSchemeId, 'custom'>, SchemeColors> = {
  /* —— Classic —— */
  violet: {
    primaryLight: '#6d28d9',
    primaryLightHover: '#5b21b6',
    primaryDark: '#a78bfa',
    primaryDarkHover: '#c4b5fd',
    resourceSiderLight: '#2e1065',
    resourceSiderDark: '#12081f',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#1a1228',
    layoutLight: '#f5f3ff',
    layoutDark: '#0c0814'
  },
  ocean: {
    primaryLight: '#0891b2',
    primaryLightHover: '#0e7490',
    primaryDark: '#22d3ee',
    primaryDarkHover: '#67e8f9',
    resourceSiderLight: '#164e63',
    resourceSiderDark: '#041016',
    spotlightLight: '#ecfeff',
    spotlightDark: '#0c1c24',
    layoutLight: '#f0f9ff',
    layoutDark: '#050e14'
  },
  forest: {
    primaryLight: '#15803d',
    primaryLightHover: '#166534',
    primaryDark: '#4ade80',
    primaryDarkHover: '#86efac',
    resourceSiderLight: '#14532d',
    resourceSiderDark: '#04140a',
    spotlightLight: '#f0fdf4',
    spotlightDark: '#0e1c14',
    layoutLight: '#f7fef9',
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
    layoutLight: '#fffaf5',
    layoutDark: '#100904'
  },
  slate: {
    primaryLight: '#475569',
    primaryLightHover: '#334155',
    primaryDark: '#94a3b8',
    primaryDarkHover: '#cbd5e1',
    resourceSiderLight: '#1e293b',
    resourceSiderDark: '#0b1018',
    spotlightLight: '#f1f5f9',
    spotlightDark: '#161b22',
    layoutLight: '#f8fafc',
    layoutDark: '#0b0f14'
  },
  rose: {
    primaryLight: '#e84d5c',
    primaryLightHover: '#d64555',
    primaryDark: '#FF5F6D',
    primaryDarkHover: '#ff7a85',
    resourceSiderLight: '#1a1520',
    resourceSiderDark: '#0a0c10',
    spotlightLight: '#f7f8fa',
    spotlightDark: '#14181f',
    layoutLight: '#f4f5f7',
    layoutDark: '#0b0d11'
  },

  /* —— Worlds (anime / hero inspired, original names) —— */
  /** Soft sky blues + warm gold — winged-journey anime energy */
  skywings: {
    primaryLight: '#2563eb',
    primaryLightHover: '#1d4ed8',
    primaryDark: '#60a5fa',
    primaryDarkHover: '#93c5fd',
    resourceSiderLight: '#1e3a5f',
    resourceSiderDark: '#060d18',
    spotlightLight: '#eff6ff',
    spotlightDark: '#121c2c',
    layoutLight: '#f5f8ff',
    layoutDark: '#070b14'
  },
  /** Magical-girl pink / soft prism glow */
  moonprism: {
    primaryLight: '#db2777',
    primaryLightHover: '#be185d',
    primaryDark: '#f472b6',
    primaryDarkHover: '#f9a8d4',
    resourceSiderLight: '#831843',
    resourceSiderDark: '#16060f',
    spotlightLight: '#fdf2f8',
    spotlightDark: '#241018',
    layoutLight: '#fff5fb',
    layoutDark: '#10060c'
  },
  /** Crimson + electric blue — agile street-hero punch */
  webstrike: {
    primaryLight: '#dc2626',
    primaryLightHover: '#b91c1c',
    primaryDark: '#f87171',
    primaryDarkHover: '#fca5a5',
    resourceSiderLight: '#1e3a8a',
    resourceSiderDark: '#080c18',
    spotlightLight: '#fef2f2',
    spotlightDark: '#1a1018',
    layoutLight: '#fff5f5',
    layoutDark: '#0c0608'
  },
  /** Charcoal + bat-signal gold — nocturnal vigilante */
  nightcape: {
    primaryLight: '#eab308',
    primaryLightHover: '#ca8a04',
    primaryDark: '#facc15',
    primaryDarkHover: '#fde047',
    resourceSiderLight: '#1c1917',
    resourceSiderDark: '#080706',
    spotlightLight: '#fafaf9',
    spotlightDark: '#1c1917',
    layoutLight: '#f5f5f4',
    layoutDark: '#0a0908'
  },
  /** Deep crimson + forge gold — armored tech hero */
  arcforge: {
    primaryLight: '#b91c1c',
    primaryLightHover: '#991b1b',
    primaryDark: '#f59e0b',
    primaryDarkHover: '#fbbf24',
    resourceSiderLight: '#450a0a',
    resourceSiderDark: '#120606',
    spotlightLight: '#fef2f2',
    spotlightDark: '#1c1008',
    layoutLight: '#fff8f0',
    layoutDark: '#0e0704'
  },
  /** Deep plum + cyan blade edge — dark anime bladesman */
  shadowflame: {
    primaryLight: '#7c3aed',
    primaryLightHover: '#6d28d9',
    primaryDark: '#2dd4bf',
    primaryDarkHover: '#5eead4',
    resourceSiderLight: '#312e81',
    resourceSiderDark: '#0a0818',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#14141f',
    layoutLight: '#f8f7ff',
    layoutDark: '#08060f'
  },
  /** Hot orange + deep navy — village-ninja storm */
  leafstorm: {
    primaryLight: '#f97316',
    primaryLightHover: '#ea580c',
    primaryDark: '#fb923c',
    primaryDarkHover: '#fdba74',
    resourceSiderLight: '#1e3a5f',
    resourceSiderDark: '#060a14',
    spotlightLight: '#fff7ed',
    spotlightDark: '#1a1410',
    layoutLight: '#fffaf5',
    layoutDark: '#0a0806'
  },
  /** Magenta nebula + cyan stars — cosmic crew */
  nebula: {
    primaryLight: '#c026d3',
    primaryLightHover: '#a21caf',
    primaryDark: '#e879f9',
    primaryDarkHover: '#f0abfc',
    resourceSiderLight: '#4c1d95',
    resourceSiderDark: '#0e0618',
    spotlightLight: '#fdf4ff',
    spotlightDark: '#1a1024',
    layoutLight: '#faf5ff',
    layoutDark: '#0a0612'
  }
}

export const COLOR_SCHEME_DEFINITIONS: ColorSchemeDefinition[] = [
  {
    id: 'violet',
    name: 'Violet',
    description: 'MagicLens signature purple',
    group: 'classic',
    swatches: ['#6d28d9', '#a78bfa', '#f5f3ff']
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cyan tide and deep water',
    group: 'classic',
    swatches: ['#0891b2', '#22d3ee', '#ecfeff']
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Moss green and leaf light',
    group: 'classic',
    swatches: ['#15803d', '#4ade80', '#f0fdf4']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange dusk glow',
    group: 'classic',
    swatches: ['#ea580c', '#fb923c', '#fff7ed']
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Cool professional gray',
    group: 'classic',
    swatches: ['#475569', '#94a3b8', '#f1f5f9']
  },
  {
    id: 'rose',
    name: 'Coral',
    description: 'MagicLens coral accent (#FF5F6D)',
    group: 'classic',
    swatches: ['#FF5F6D', '#ff7a85', '#f7f8fa']
  },
  {
    id: 'skywings',
    name: 'Sky Wings',
    description: 'Winged journey skies & gold',
    group: 'worlds',
    swatches: ['#2563eb', '#fbbf24', '#eff6ff']
  },
  {
    id: 'moonprism',
    name: 'Moon Prism',
    description: 'Magical-girl pink prism',
    group: 'worlds',
    swatches: ['#db2777', '#f9a8d4', '#fdf2f8']
  },
  {
    id: 'webstrike',
    name: 'Web Strike',
    description: 'Crimson & blue street hero',
    group: 'worlds',
    swatches: ['#dc2626', '#2563eb', '#fef2f2']
  },
  {
    id: 'nightcape',
    name: 'Night Cape',
    description: 'Midnight charcoal & signal gold',
    group: 'worlds',
    swatches: ['#eab308', '#1c1917', '#fafaf9']
  },
  {
    id: 'arcforge',
    name: 'Arc Forge',
    description: 'Armored crimson & forge gold',
    group: 'worlds',
    swatches: ['#b91c1c', '#f59e0b', '#fff8f0']
  },
  {
    id: 'shadowflame',
    name: 'Shadow Flame',
    description: 'Plum blade with teal edge',
    group: 'worlds',
    swatches: ['#7c3aed', '#2dd4bf', '#f5f3ff']
  },
  {
    id: 'leafstorm',
    name: 'Leaf Storm',
    description: 'Hot orange over deep navy',
    group: 'worlds',
    swatches: ['#f97316', '#1e3a5f', '#fff7ed']
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cosmic magenta starfield',
    group: 'worlds',
    swatches: ['#c026d3', '#22d3ee', '#fdf4ff']
  }
]

export const COLOR_SCHEME_GROUPS: { id: ColorSchemeGroup; labelKey: string }[] = [
  { id: 'classic', labelKey: 'settings.appearance.groupClassic' },
  { id: 'worlds', labelKey: 'settings.appearance.groupWorlds' }
]

export function getSchemePalette(
  scheme: ColorSchemeId,
  isDark: boolean,
  customAccent?: string
): AppPalette {
  const colors =
    scheme === 'custom'
      ? deriveSchemeFromAccent(customAccent ?? '#FF5F6D')
      : (SCHEME_COLORS[scheme] ?? SCHEME_COLORS.rose)
  return buildPalette(colors, isDark)
}
