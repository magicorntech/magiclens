/** MagicLens brand palette — violet/purple family with warm neutrals. */
export const brand = {
  violet50: '#f5f3ff',
  violet100: '#ede9fe',
  violet200: '#ddd6fe',
  violet300: '#c4b5fd',
  violet400: '#a78bfa',
  violet500: '#8b5cf6',
  violet600: '#7c3aed',
  violet700: '#6d28d9',
  violet800: '#5b21b6',
  violet900: '#4c1d95',
  violet950: '#2e1065'
} as const

export interface AppPalette {
  primary: string
  primaryHover: string
  info: string
  success: string
  warning: string
  error: string
  bgLayout: string
  bgContainer: string
  bgElevated: string
  bgSpotlight: string
  border: string
  borderSecondary: string
  text: string
  textSecondary: string
  textTertiary: string
  sidebarBg: string
  sidebarText: string
  sidebarMuted: string
  sidebarSubtle: string
  sidebarDivider: string
  sidebarHover: string
  sidebarActive: string
  sidebarControlBg: string
  sidebarControlBorder: string
  resourceSiderBg: string
  panelBg: string
  terminalBg: string
  terminalFg: string
  terminalMuted: string
  shadow: string
  selectionBg: string
}

export const light: AppPalette = {
  primary: brand.violet600,
  primaryHover: brand.violet700,
  info: '#6366f1',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  bgLayout: '#f3f0f9',
  bgContainer: '#ffffff',
  bgElevated: '#ffffff',
  bgSpotlight: brand.violet50,
  border: '#e4deef',
  borderSecondary: '#ede9f5',
  text: '#1a1225',
  textSecondary: '#6b5f7a',
  textTertiary: '#958aa3',
  /** Cluster list sidebar — same surface family as the main UI, not a separate purple block. */
  sidebarBg: '#ffffff',
  sidebarText: '#1a1225',
  sidebarMuted: '#6b5f7a',
  sidebarSubtle: '#958aa3',
  sidebarDivider: '#ede9f5',
  sidebarHover: 'rgba(124, 58, 237, 0.07)',
  sidebarActive: 'rgba(124, 58, 237, 0.12)',
  sidebarControlBg: brand.violet50,
  sidebarControlBorder: '#e4deef',
  resourceSiderBg: brand.violet950,
  panelBg: '#faf8ff',
  terminalBg: '#1a1625',
  terminalFg: '#e2e0ea',
  terminalMuted: '#9b93ad',
  shadow: '0 1px 4px rgba(76, 29, 149, 0.08)',
  selectionBg: 'rgba(124, 58, 237, 0.1)'
} as const satisfies AppPalette

export const dark: AppPalette = {
  primary: brand.violet400,
  primaryHover: brand.violet300,
  info: '#818cf8',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  bgLayout: '#0a0610',
  bgContainer: '#14101c',
  bgElevated: '#1c1528',
  bgSpotlight: '#221a30',
  border: '#2d2240',
  borderSecondary: '#241a33',
  text: '#f0ebf7',
  textSecondary: '#a89bb8',
  textTertiary: '#7a6d8c',
  sidebarBg: '#14101c',
  sidebarText: '#f0ebf7',
  sidebarMuted: '#a89bb8',
  sidebarSubtle: '#7a6d8c',
  sidebarDivider: '#241a33',
  sidebarHover: 'rgba(255, 255, 255, 0.05)',
  sidebarActive: 'rgba(167, 139, 250, 0.14)',
  sidebarControlBg: '#1c1528',
  sidebarControlBorder: '#2d2240',
  resourceSiderBg: '#130818',
  panelBg: '#0e0814',
  terminalBg: '#08060e',
  terminalFg: '#ddd6e8',
  terminalMuted: '#8b7f9e',
  shadow: '0 1px 4px rgba(0, 0, 0, 0.35)',
  selectionBg: 'rgba(167, 139, 250, 0.14)'
} as const satisfies AppPalette

export function getPalette(isDark: boolean): AppPalette {
  return isDark ? dark : light
}
