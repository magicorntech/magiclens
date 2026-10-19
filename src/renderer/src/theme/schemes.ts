import type { AppPalette } from './palette'
import {
  darken,
  deriveSchemeFromAccent,
  lighten,
  mixHex,
  schemeFromCustomPalette,
  withAlpha,
  type CustomThemeColors,
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
  | 'lagoon'
  | 'ember'
  | 'ink'
  | 'matcha'
  | 'dune'
  | 'orchid'
  | 'custom'

export type ColorSchemeGroup = 'base' | 'classic' | 'worlds' | 'studio'

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
  'lagoon',
  'ember',
  'ink',
  'matcha',
  'dune',
  'orchid',
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
    /* Light-first: bright paper + black ink. Soft charcoal when used in dark. */
    primaryLight: '#171717',
    primaryLightHover: '#000000',
    primaryDark: '#e4e4e7',
    primaryDarkHover: '#f4f4f5',
    resourceSiderLight: '#ebebed',
    resourceSiderDark: '#1c1c1e',
    spotlightLight: '#ffffff',
    spotlightDark: '#1c1c1e',
    layoutLight: '#f5f5f7',
    layoutDark: '#121212'
  },
  black: {
    /* Dark-first: OLED black + white ink. Clean light twin, no black chrome. */
    primaryLight: '#0a0a0a',
    primaryLightHover: '#000000',
    primaryDark: '#ffffff',
    primaryDarkHover: '#f4f4f5',
    resourceSiderLight: '#f0f0f2',
    resourceSiderDark: '#000000',
    spotlightLight: '#fafafa',
    spotlightDark: '#0a0a0a',
    layoutLight: '#fafafa',
    layoutDark: '#000000'
  },

  /* —— Classic —— */
  violet: {
    primaryLight: '#7c3aed',
    primaryLightHover: '#6d28d9',
    primaryDark: '#c4b5fd',
    primaryDarkHover: '#ddd6fe',
    resourceSiderLight: '#2e1065',
    resourceSiderDark: '#16082a',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#1c1230',
    layoutLight: '#f4f0ff',
    layoutDark: '#0c0618'
  },
  ocean: {
    primaryLight: '#1d4ed8',
    primaryLightHover: '#1e40af',
    primaryDark: '#60a5fa',
    primaryDarkHover: '#93c5fd',
    resourceSiderLight: '#1e3a8a',
    resourceSiderDark: '#07101f',
    spotlightLight: '#eff6ff',
    spotlightDark: '#101828',
    layoutLight: '#f3f7ff',
    layoutDark: '#070d18'
  },
  forest: {
    primaryLight: '#166534',
    primaryLightHover: '#14532d',
    primaryDark: '#4ade80',
    primaryDarkHover: '#86efac',
    resourceSiderLight: '#14532d',
    resourceSiderDark: '#052e16',
    spotlightLight: '#f0fdf4',
    spotlightDark: '#0c1f14',
    layoutLight: '#f3faf5',
    layoutDark: '#04110a'
  },
  sunset: {
    primaryLight: '#ea580c',
    primaryLightHover: '#c2410c',
    primaryDark: '#fdba74',
    primaryDarkHover: '#fed7aa',
    resourceSiderLight: '#9a3412',
    resourceSiderDark: '#1c0a04',
    spotlightLight: '#fff7ed',
    spotlightDark: '#2a160c',
    layoutLight: '#fff8f1',
    layoutDark: '#140904'
  },
  slate: {
    primaryLight: '#475569',
    primaryLightHover: '#334155',
    primaryDark: '#cbd5e1',
    primaryDarkHover: '#e2e8f0',
    resourceSiderLight: '#1e293b',
    resourceSiderDark: '#0b1220',
    spotlightLight: '#f8fafc',
    spotlightDark: '#151c27',
    layoutLight: '#f1f5f9',
    layoutDark: '#0b1120'
  },
  rose: {
    primaryLight: '#e11d48',
    primaryLightHover: '#be123c',
    primaryDark: '#fb7185',
    primaryDarkHover: '#fda4af',
    resourceSiderLight: '#881337',
    resourceSiderDark: '#1a0a10',
    spotlightLight: '#fff1f2',
    spotlightDark: '#241018',
    layoutLight: '#fff5f6',
    layoutDark: '#12080c'
  },

  /* —— Worlds —— */
  skywings: {
    primaryLight: '#ca8a04',
    primaryLightHover: '#a16207',
    primaryDark: '#facc15',
    primaryDarkHover: '#fde047',
    resourceSiderLight: '#1e40af',
    resourceSiderDark: '#0b1b3a',
    spotlightLight: '#eff6ff',
    spotlightDark: '#121a2e',
    layoutLight: '#f7f9ff',
    layoutDark: '#070d18'
  },
  moonprism: {
    primaryLight: '#ec4899',
    primaryLightHover: '#db2777',
    primaryDark: '#f9a8d4',
    primaryDarkHover: '#fbcfe8',
    resourceSiderLight: '#6b21a8',
    resourceSiderDark: '#1a0a24',
    spotlightLight: '#fdf2f8',
    spotlightDark: '#24101c',
    layoutLight: '#fff5fb',
    layoutDark: '#120812'
  },
  webstrike: {
    primaryLight: '#ef4444',
    primaryLightHover: '#dc2626',
    primaryDark: '#fca5a5',
    primaryDarkHover: '#fecaca',
    resourceSiderLight: '#1d4ed8',
    resourceSiderDark: '#0b1228',
    spotlightLight: '#fef2f2',
    spotlightDark: '#1a1014',
    layoutLight: '#fff6f6',
    layoutDark: '#12080a'
  },
  nightcape: {
    primaryLight: '#eab308',
    primaryLightHover: '#ca8a04',
    primaryDark: '#fde047',
    primaryDarkHover: '#fef08a',
    resourceSiderLight: '#292524',
    resourceSiderDark: '#0c0a09',
    spotlightLight: '#fafaf9',
    spotlightDark: '#1c1917',
    layoutLight: '#f5f5f4',
    layoutDark: '#0a0908'
  },
  arcforge: {
    primaryLight: '#dc2626',
    primaryLightHover: '#b91c1c',
    primaryDark: '#fbbf24',
    primaryDarkHover: '#fcd34d',
    resourceSiderLight: '#7f1d1d',
    resourceSiderDark: '#1a0a06',
    spotlightLight: '#fff7ed',
    spotlightDark: '#1c120c',
    layoutLight: '#fff8f3',
    layoutDark: '#100806'
  },
  shadowflame: {
    primaryLight: '#6d28d9',
    primaryLightHover: '#5b21b6',
    primaryDark: '#2dd4bf',
    primaryDarkHover: '#5eead4',
    resourceSiderLight: '#312e81',
    resourceSiderDark: '#0b1020',
    spotlightLight: '#f5f3ff',
    spotlightDark: '#12141f',
    layoutLight: '#f6f5ff',
    layoutDark: '#070814'
  },
  leafstorm: {
    primaryLight: '#65a30d',
    primaryLightHover: '#4d7c0f',
    primaryDark: '#bef264',
    primaryDarkHover: '#d9f99d',
    resourceSiderLight: '#1e3a5f',
    resourceSiderDark: '#071018',
    spotlightLight: '#f7fee7',
    spotlightDark: '#12180e',
    layoutLight: '#f9fbea',
    layoutDark: '#0a0e06'
  },
  nebula: {
    primaryLight: '#c026d3',
    primaryLightHover: '#a21caf',
    primaryDark: '#22d3ee',
    primaryDarkHover: '#67e8f9',
    resourceSiderLight: '#4c1d95',
    resourceSiderDark: '#100818',
    spotlightLight: '#fdf4ff',
    spotlightDark: '#1a1024',
    layoutLight: '#faf5ff',
    layoutDark: '#0c0614'
  },
  lagoon: {
    primaryLight: '#0f766e',
    primaryLightHover: '#115e59',
    primaryDark: '#2dd4bf',
    primaryDarkHover: '#5eead4',
    resourceSiderLight: '#134e4a',
    resourceSiderDark: '#042f2e',
    spotlightLight: '#f0fdfa',
    spotlightDark: '#0c1f1e',
    layoutLight: '#f3fbfa',
    layoutDark: '#041614'
  },
  ember: {
    primaryLight: '#ff3b30',
    primaryLightHover: '#e11d18',
    primaryDark: '#ff6b4a',
    primaryDarkHover: '#ff8a6a',
    resourceSiderLight: '#7f1d1d',
    resourceSiderDark: '#2a0a08',
    spotlightLight: '#fff1f0',
    spotlightDark: '#241210',
    layoutLight: '#fff6f4',
    layoutDark: '#160806'
  },
  ink: {
    primaryLight: '#1e3a8a',
    primaryLightHover: '#172554',
    primaryDark: '#7dd3fc',
    primaryDarkHover: '#bae6fd',
    resourceSiderLight: '#172554',
    resourceSiderDark: '#020617',
    spotlightLight: '#e0f2fe',
    spotlightDark: '#0f172a',
    layoutLight: '#f0f9ff',
    layoutDark: '#020617'
  },
  matcha: {
    primaryLight: '#3f6212',
    primaryLightHover: '#365314',
    primaryDark: '#a3e635',
    primaryDarkHover: '#bef264',
    resourceSiderLight: '#365314',
    resourceSiderDark: '#142006',
    spotlightLight: '#f7fee7',
    spotlightDark: '#17210c',
    layoutLight: '#f8fcec',
    layoutDark: '#0c1206'
  },
  dune: {
    primaryLight: '#b45309',
    primaryLightHover: '#92400e',
    primaryDark: '#fcd34d',
    primaryDarkHover: '#fde68a',
    resourceSiderLight: '#78350f',
    resourceSiderDark: '#1c1410',
    spotlightLight: '#faf6ef',
    spotlightDark: '#241c16',
    layoutLight: '#f8f1e7',
    layoutDark: '#14100c'
  },
  orchid: {
    primaryLight: '#9333ea',
    primaryLightHover: '#7e22ce',
    primaryDark: '#e9d5ff',
    primaryDarkHover: '#f3e8ff',
    resourceSiderLight: '#581c87',
    resourceSiderDark: '#1a0a28',
    spotlightLight: '#faf5ff',
    spotlightDark: '#1e1030',
    layoutLight: '#f7f2ff',
    layoutDark: '#100818'
  }
}

export const COLOR_SCHEME_DEFINITIONS: ColorSchemeDefinition[] = [
  {
    id: 'white',
    name: 'White',
    description: 'Bright paper light, soft charcoal dark',
    group: 'base',
    swatches: ['#ffffff', '#171717', '#f5f5f7']
  },
  {
    id: 'black',
    name: 'Black',
    description: 'True OLED black, pure white accent',
    group: 'base',
    swatches: ['#000000', '#ffffff', '#0a0a0a']
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'MagicLens signature purple',
    group: 'classic',
    swatches: ['#7c3aed', '#c4b5fd', '#f4f0ff']
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cobalt water and pale sky',
    group: 'classic',
    swatches: ['#1d4ed8', '#60a5fa', '#f3f7ff']
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Pine green and leaf light',
    group: 'classic',
    swatches: ['#166534', '#4ade80', '#f3faf5']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Amber dusk on warm paper',
    group: 'classic',
    swatches: ['#ea580c', '#fdba74', '#fff8f1']
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Steel gray and cool paper',
    group: 'classic',
    swatches: ['#475569', '#cbd5e1', '#f1f5f9']
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Hot rose on blush paper',
    group: 'classic',
    swatches: ['#e11d48', '#fb7185', '#fff5f6']
  },
  {
    id: 'skywings',
    name: 'Sky Wings',
    description: 'Winged journey skies & gold',
    group: 'worlds',
    swatches: ['#ca8a04', '#1e40af', '#f7f9ff']
  },
  {
    id: 'moonprism',
    name: 'Moon Prism',
    description: 'Magical-girl pink prism',
    group: 'worlds',
    swatches: ['#ec4899', '#6b21a8', '#fff5fb']
  },
  {
    id: 'webstrike',
    name: 'Web Strike',
    description: 'Crimson & blue street hero',
    group: 'worlds',
    swatches: ['#ef4444', '#1d4ed8', '#fff6f6']
  },
  {
    id: 'nightcape',
    name: 'Night Cape',
    description: 'Midnight charcoal & signal gold',
    group: 'worlds',
    swatches: ['#eab308', '#292524', '#f5f5f4']
  },
  {
    id: 'arcforge',
    name: 'Arc Forge',
    description: 'Armored crimson & forge gold',
    group: 'worlds',
    swatches: ['#dc2626', '#fbbf24', '#fff8f3']
  },
  {
    id: 'shadowflame',
    name: 'Shadow Flame',
    description: 'Plum blade with teal edge',
    group: 'worlds',
    swatches: ['#6d28d9', '#2dd4bf', '#f6f5ff']
  },
  {
    id: 'leafstorm',
    name: 'Leaf Storm',
    description: 'Hot orange over deep navy',
    group: 'worlds',
    swatches: ['#65a30d', '#1e3a5f', '#f9fbea']
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cosmic magenta starfield',
    group: 'worlds',
    swatches: ['#c026d3', '#22d3ee', '#faf5ff']
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    description: 'Turquoise tide and deep teal',
    group: 'studio',
    swatches: ['#0f766e', '#2dd4bf', '#f3fbfa']
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Vermillion heat on charcoal',
    group: 'studio',
    swatches: ['#ff3b30', '#ff6b4a', '#fff6f4']
  },
  {
    id: 'ink',
    name: 'Ink',
    description: 'Navy ink with ice highlight',
    group: 'studio',
    swatches: ['#1e3a8a', '#7dd3fc', '#f0f9ff']
  },
  {
    id: 'matcha',
    name: 'Matcha',
    description: 'Olive tea and lime foam',
    group: 'studio',
    swatches: ['#3f6212', '#a3e635', '#f8fcec']
  },
  {
    id: 'dune',
    name: 'Dune',
    description: 'Copper on warm sand',
    group: 'studio',
    swatches: ['#b45309', '#fcd34d', '#f8f1e7']
  },
  {
    id: 'orchid',
    name: 'Orchid',
    description: 'Soft violet bloom',
    group: 'studio',
    swatches: ['#9333ea', '#e9d5ff', '#f7f2ff']
  }
]

export const COLOR_SCHEME_GROUPS: { id: ColorSchemeGroup; labelKey: string }[] = [
  { id: 'base', labelKey: 'settings.appearance.groupBase' },
  { id: 'classic', labelKey: 'settings.appearance.groupClassic' },
  { id: 'worlds', labelKey: 'settings.appearance.groupWorlds' },
  { id: 'studio', labelKey: 'settings.appearance.groupStudio' }
]

export function getSchemePalette(
  scheme: ColorSchemeId,
  isDark: boolean,
  custom?: string | CustomThemeColors
): AppPalette {
  const colors =
    scheme === 'custom'
      ? typeof custom === 'object' && custom
        ? schemeFromCustomPalette(custom, isDark)
        : deriveSchemeFromAccent(typeof custom === 'string' ? custom : '#FF5F6D')
      : (SCHEME_COLORS[scheme] ?? SCHEME_COLORS.rose)
  return buildPalette(colors, isDark)
}

export function getModePalette(
  isDark: boolean,
  lightScheme: ColorSchemeId,
  darkScheme: ColorSchemeId,
  customLight?: string | CustomThemeColors,
  customDark?: string | CustomThemeColors
): AppPalette {
  return isDark
    ? getSchemePalette(darkScheme, true, customDark)
    : getSchemePalette(lightScheme, false, customLight)
}
