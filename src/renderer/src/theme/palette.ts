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
  primary: '#171717',
  primaryHover: '#000000',
  info: '#0284c7',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  bgLayout: '#f5f5f7',
  bgContainer: '#ffffff',
  bgElevated: '#ffffff',
  bgSpotlight: '#ffffff',
  border: 'rgba(15,23,42,0.08)',
  borderSecondary: 'rgba(15,23,42,0.05)',
  text: '#0f172a',
  textSecondary: '#334155',
  textTertiary: '#64748b',
  sidebarBg: '#f6f6f8',
  sidebarText: '#0f172a',
  sidebarMuted: '#334155',
  sidebarSubtle: '#64748b',
  sidebarDivider: 'rgba(15,23,42,0.08)',
  sidebarHover: 'rgba(0, 0, 0, 0.05)',
  sidebarActive: 'rgba(0, 0, 0, 0.09)',
  sidebarControlBg: '#ffffff',
  sidebarControlBorder: 'rgba(0, 0, 0, 0.14)',
  resourceSiderBg: '#fbfbfc',
  panelBg: '#fafafa',
  terminalBg: '#0f172a',
  terminalFg: '#e2e8f0',
  terminalMuted: '#94a3b8',
  shadow: 'none',
  selectionBg: 'rgba(0, 0, 0, 0.08)'
} as const satisfies AppPalette

export const dark: AppPalette = {
  primary: '#ffffff',
  primaryHover: '#f4f4f5',
  info: '#38bdf8',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  bgLayout: '#000000',
  bgContainer: '#0a0a0a',
  bgElevated: '#141414',
  bgSpotlight: '#0a0a0a',
  border: 'rgba(255,255,255,0.09)',
  borderSecondary: 'rgba(255,255,255,0.05)',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  sidebarBg: '#0a0a0a',
  sidebarText: '#f8fafc',
  sidebarMuted: '#cbd5e1',
  sidebarSubtle: '#94a3b8',
  sidebarDivider: 'rgba(255,255,255,0.07)',
  sidebarHover: 'rgba(255, 255, 255, 0.055)',
  sidebarActive: 'rgba(255, 255, 255, 0.12)',
  sidebarControlBg: '#141414',
  sidebarControlBorder: 'rgba(255, 255, 255, 0.18)',
  resourceSiderBg: '#000000',
  panelBg: '#0a0a0a',
  terminalBg: '#000000',
  terminalFg: '#e2e8f0',
  terminalMuted: '#94a3b8',
  shadow: 'none',
  selectionBg: 'rgba(255, 255, 255, 0.12)'
} as const satisfies AppPalette

export function getPalette(isDark: boolean): AppPalette {
  return isDark ? dark : light
}
