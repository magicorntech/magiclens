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
  | 'white'
  | 'black'
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

export type ColorSchemeGroup = 'base' | 'classic' | 'worlds'

export interface ColorSchemeDefinition {
  id: Exclude<ColorSchemeId, 'custom'>
  name: string
  description: string
  group: ColorSchemeGroup
  swatches: [string, string, string]
}

export type SchemeColors = DerivedSchemeColors

const VALID_SCHEMES = new Set<ColorSchemeId>([
  'white',
  'black',
  'violet',
  'ocean',
  'forest',
  'sunset',
  'slate',
  'rose',
  'skywings',
  'moonprism',
  'webstrike',
  'nightcape',
  'arcforge',
  'shadowflame',
  'leafstorm',
  'nebula',
  'custom'
])

export function normalizeColorScheme(scheme: string | null | undefined): ColorSchemeId {
  if (scheme && VALID_SCHEMES.has(scheme as ColorSchemeId)) return scheme as ColorSchemeId
  return 'rose'
}

function buildPalette(colors: SchemeColors, isDark: boolean): AppPalette {
  const primary = isDark ? colors.primaryDark : colors.primaryLight
  const primaryHover = isDark ? colors.primaryDarkHover : colors.primaryLightHover
  const layout = isDark ? colors.layoutDark : colors.layoutLight
  const spotlight = isDark ? colors.spotlightDark : colors.spotlightLight
  const sider = isDark ? colors.resourceSiderDark : colors.resourceSiderLight

  if (isDark) {
    const container = lighten(layout, 0.055)
    const elevated = lighten(layout, 0.11)
    const ink = mixHex('#f8fafc', primary, 0.05)
    return {
      primary,
      primaryHover,
      info: mixHex('#38bdf8', primary, 0.3),
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      bgLayout: layout,
      bgContainer: container,
      bgElevated: elevated,
      bgSpotlight: spotlight,
      border: withAlpha('#ffffff', 0.09),
      borderSecondary: withAlpha('#ffffff', 0.05),
      text: ink,
      textSecondary: mixHex('#cbd5e1', layout, 0.38),
      textTertiary: mixHex('#94a3b8', layout, 0.32),
      sidebarBg: container,
      sidebarText: ink,
      sidebarMuted: mixHex('#cbd5e1', layout, 0.38),
      sidebarSubtle: mixHex('#94a3b8', layout, 0.32),
      sidebarDivider: withAlpha('#ffffff', 0.07),
      sidebarHover: withAlpha('#ffffff', 0.055),
      sidebarActive: withAlpha(primary, 0.16),
      sidebarControlBg: elevated,
      sidebarControlBorder: withAlpha(primary, 0.3),
      resourceSiderBg: mixHex(sider, container, 0.28),
      panelBg: container,
      terminalBg: darken(layout, 0.22),
      terminalFg: '#e2e8f0',
      terminalMuted: '#94a3b8',
      shadow: 'none',
      selectionBg: withAlpha(primary, 0.16)
    }
  }

  const container = '#ffffff'
  const sidebarSurface = mixHex('#ffffff', layout, 0.5)
  const resourceSurface = mixHex('#ffffff', layout, 0.22)
  const ink = mixHex('#0f172a', primary, 0.07)
  return {
    primary,
    primaryHover,
    info: mixHex('#0284c7', primary, 0.22),
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    bgLayout: layout,
    bgContainer: container,
    bgElevated: container,
    bgSpotlight: spotlight,
    border: withAlpha('#0f172a', 0.08),
    borderSecondary: withAlpha('#0f172a', 0.05),
    text: ink,
    textSecondary: mixHex('#334155', layout, 0.32),
    textTertiary: mixHex('#64748b', layout, 0.28),
    sidebarBg: sidebarSurface,
    sidebarText: ink,
    sidebarMuted: mixHex('#334155', layout, 0.32),
    sidebarSubtle: mixHex('#64748b', layout, 0.28),
    sidebarDivider: withAlpha('#0f172a', 0.08),
    sidebarHover: withAlpha(primary, 0.07),
    sidebarActive: withAlpha(primary, 0.12),
    sidebarControlBg: spotlight,
    sidebarControlBorder: mixHex(primary, '#ffffff', 0.16),
    resourceSiderBg: resourceSurface,
    panelBg: mixHex(layout, '#ffffff', 0.5),
    terminalBg: mixHex('#0f172a', sider, 0.35),
    terminalFg: '#e2e8f0',
    terminalMuted: '#94a3b8',
    shadow: 'none',
    selectionBg: withAlpha(primary, 0.1)
  }
}

const SCHEME_COLORS: Record<Exclude<ColorSchemeId, 'custom'>, SchemeColors> = {
  white: {
    primaryLight: '#171717',
    primaryLightHover: '#000000',
    primaryDark: '#f5f5f5',
    primaryDarkHover: '#ffffff',
    resourceSiderLight: '#e7e7e8',
    resourceSiderDark: '#111111',
    spotlightLight: '#fafafa',
    spotlightDark: '#141414',
    layoutLight: '#f5f5f7',
    layoutDark: '#000000'
  },
  black: {
    primaryLight: '#e84d5c',
    primaryLightHover: '#d64555',
    primaryDark: '#FF5F6D',
    primaryDarkHover: '#ff7a85',
    resourceSiderLight: '#0a0a0a',
    resourceSiderDark: '#000000',
    spotlightLight: '#f4f4f5',
    spotlightDark: '#111111',
    layoutLight: '#ececee',
    layoutDark: '#050505'
  },

  /* —— Classic —— */
  violet: {
    primaryLight: '#6d28d9',
    primaryLightHover: '#5b21b6',
    primaryDark: '#c4b5fd',
    primaryDarkHover: '#ddd6fe',
    resourceSiderLight: '#2e1065',
    resourceSiderDark: '#0d0618',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#1a122c',
    layoutLight: '#f3f0ff',
    layoutDark: '#090611'
  },
  ocean: {
    primaryLight: '#0e7490',
    primaryLightHover: '#155e75',
    primaryDark: '#22d3ee',
    primaryDarkHover: '#67e8f9',
    resourceSiderLight: '#164e63',
    resourceSiderDark: '#031018',
    spotlightLight: '#ecfeff',
    spotlightDark: '#0c1e28',
    layoutLight: '#f0f9ff',
    layoutDark: '#040c12'
  },
  forest: {
    primaryLight: '#15803d',
    primaryLightHover: '#166534',
    primaryDark: '#4ade80',
    primaryDarkHover: '#86efac',
    resourceSiderLight: '#14532d',
    resourceSiderDark: '#03120a',
    spotlightLight: '#f0fdf4',
    spotlightDark: '#0d1c14',
    layoutLight: '#f4fbf6',
    layoutDark: '#050d08'
  },
  sunset: {
    primaryLight: '#ea580c',
    primaryLightHover: '#c2410c',
    primaryDark: '#fb923c',
    primaryDarkHover: '#fdba74',
    resourceSiderLight: '#7c2d12',
    resourceSiderDark: '#160804',
    spotlightLight: '#fff7ed',
    spotlightDark: '#241610',
    layoutLight: '#fffaf5',
    layoutDark: '#0e0704'
  },
  slate: {
    primaryLight: '#334155',
    primaryLightHover: '#1e293b',
    primaryDark: '#94a3b8',
    primaryDarkHover: '#cbd5e1',
    resourceSiderLight: '#1e293b',
    resourceSiderDark: '#080c12',
    spotlightLight: '#f1f5f9',
    spotlightDark: '#151b22',
    layoutLight: '#f8fafc',
    layoutDark: '#080b10'
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

  /* —— Worlds —— */
  skywings: {
    primaryLight: '#2563eb',
    primaryLightHover: '#1d4ed8',
    primaryDark: '#60a5fa',
    primaryDarkHover: '#93c5fd',
    resourceSiderLight: '#1e3a5f',
    resourceSiderDark: '#050c16',
    spotlightLight: '#eff6ff',
    spotlightDark: '#121c2c',
    layoutLight: '#f4f8ff',
    layoutDark: '#060a12'
  },
  moonprism: {
    primaryLight: '#db2777',
    primaryLightHover: '#be185d',
    primaryDark: '#f472b6',
    primaryDarkHover: '#f9a8d4',
    resourceSiderLight: '#831843',
    resourceSiderDark: '#14050e',
    spotlightLight: '#fdf2f8',
    spotlightDark: '#241018',
    layoutLight: '#fff4fa',
    layoutDark: '#0e050a'
  },
  webstrike: {
    primaryLight: '#dc2626',
    primaryLightHover: '#b91c1c',
    primaryDark: '#f87171',
    primaryDarkHover: '#fca5a5',
    resourceSiderLight: '#1e3a8a',
    resourceSiderDark: '#070a16',
    spotlightLight: '#fef2f2',
    spotlightDark: '#1a1018',
    layoutLight: '#fff5f5',
    layoutDark: '#0b0506'
  },
  nightcape: {
    primaryLight: '#ca8a04',
    primaryLightHover: '#a16207',
    primaryDark: '#facc15',
    primaryDarkHover: '#fde047',
    resourceSiderLight: '#1c1917',
    resourceSiderDark: '#070605',
    spotlightLight: '#fafaf9',
    spotlightDark: '#1c1917',
    layoutLight: '#f5f5f4',
    layoutDark: '#080807'
  },
  arcforge: {
    primaryLight: '#b91c1c',
    primaryLightHover: '#991b1b',
    primaryDark: '#f59e0b',
    primaryDarkHover: '#fbbf24',
    resourceSiderLight: '#450a0a',
    resourceSiderDark: '#100505',
    spotlightLight: '#fef2f2',
    spotlightDark: '#1c1008',
    layoutLight: '#fff7f0',
    layoutDark: '#0c0604'
  },
  shadowflame: {
    primaryLight: '#7c3aed',
    primaryLightHover: '#6d28d9',
    primaryDark: '#2dd4bf',
    primaryDarkHover: '#5eead4',
    resourceSiderLight: '#312e81',
    resourceSiderDark: '#080616',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#14141f',
    layoutLight: '#f6f5ff',
    layoutDark: '#07050e'
  },
  leafstorm: {
    primaryLight: '#ea580c',
    primaryLightHover: '#c2410c',
    primaryDark: '#fb923c',
    primaryDarkHover: '#fdba74',
    resourceSiderLight: '#1e3a5f',
    resourceSiderDark: '#050a14',
    spotlightLight: '#fff7ed',
    spotlightDark: '#1a1410',
    layoutLight: '#fffaf5',
    layoutDark: '#090806'
  },
  nebula: {
    primaryLight: '#c026d3',
    primaryLightHover: '#a21caf',
    primaryDark: '#e879f9',
    primaryDarkHover: '#f0abfc',
    resourceSiderLight: '#4c1d95',
    resourceSiderDark: '#0c0516',
    spotlightLight: '#fdf4ff',
    spotlightDark: '#1a1024',
    layoutLight: '#faf5ff',
    layoutDark: '#090510'
  }
}

export const COLOR_SCHEME_DEFINITIONS: ColorSchemeDefinition[] = [
  {
    id: 'white',
    name: 'White',
    description: 'White and black, no tint',
    group: 'base',
    swatches: ['#ffffff', '#171717', '#f5f5f7']
  },
  {
    id: 'black',
    name: 'Black',
    description: 'True black surfaces, coral accent',
    group: 'base',
    swatches: ['#050505', '#FF5F6D', '#111111']
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'MagicLens signature purple',
    group: 'classic',
    swatches: ['#6d28d9', '#c4b5fd', '#f5f3ff']
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cyan tide and deep water',
    group: 'classic',
    swatches: ['#0e7490', '#22d3ee', '#ecfeff']
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
    swatches: ['#334155', '#94a3b8', '#f1f5f9']
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
  { id: 'base', labelKey: 'settings.appearance.groupBase' },
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

export function getModePalette(
  isDark: boolean,
  lightScheme: ColorSchemeId,
  darkScheme: ColorSchemeId,
  customAccentLight?: string,
  customAccentDark?: string
): AppPalette {
  return isDark
    ? getSchemePalette(darkScheme, true, customAccentDark)
    : getSchemePalette(lightScheme, false, customAccentLight)
}
