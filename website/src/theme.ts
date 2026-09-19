export type SchemeId =
  | 'rose'
  | 'violet'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'slate'
  | 'black'
  | 'white'
  | 'nebula'
  | 'shadowflame'

export interface SchemeDef {
  id: SchemeId
  name: string
  chip: string
  primaryLight: string
  primaryDark: string
  layoutLight: string
  layoutDark: string
  siderLight: string
  siderDark: string
}

export const SCHEMES: SchemeDef[] = [
  { id: 'rose', name: 'Coral', chip: '#FF5F6D', primaryLight: '#e84d5c', primaryDark: '#FF5F6D', layoutLight: '#f4f5f7', layoutDark: '#0b0d11', siderLight: '#1a1520', siderDark: '#0a0c10' },
  { id: 'violet', name: 'Violet', chip: '#8b5cf6', primaryLight: '#6d28d9', primaryDark: '#c4b5fd', layoutLight: '#f3f0ff', layoutDark: '#090611', siderLight: '#2e1065', siderDark: '#0d0618' },
  { id: 'ocean', name: 'Ocean', chip: '#22d3ee', primaryLight: '#0e7490', primaryDark: '#22d3ee', layoutLight: '#f0f9ff', layoutDark: '#040c12', siderLight: '#164e63', siderDark: '#031018' },
  { id: 'forest', name: 'Forest', chip: '#4ade80', primaryLight: '#15803d', primaryDark: '#4ade80', layoutLight: '#f4fbf6', layoutDark: '#050d08', siderLight: '#14532d', siderDark: '#03120a' },
  { id: 'sunset', name: 'Sunset', chip: '#fb923c', primaryLight: '#ea580c', primaryDark: '#fb923c', layoutLight: '#fffaf5', layoutDark: '#0e0704', siderLight: '#7c2d12', siderDark: '#160804' },
  { id: 'slate', name: 'Slate', chip: '#94a3b8', primaryLight: '#334155', primaryDark: '#94a3b8', layoutLight: '#f8fafc', layoutDark: '#080b10', siderLight: '#1e293b', siderDark: '#080c12' },
  { id: 'black', name: 'Black', chip: '#111111', primaryLight: '#e84d5c', primaryDark: '#FF5F6D', layoutLight: '#ececee', layoutDark: '#050505', siderLight: '#0a0a0a', siderDark: '#000000' },
  { id: 'white', name: 'White', chip: '#ffffff', primaryLight: '#171717', primaryDark: '#f5f5f5', layoutLight: '#f5f5f7', layoutDark: '#000000', siderLight: '#111111', siderDark: '#000000' },
  { id: 'nebula', name: 'Nebula', chip: '#e879f9', primaryLight: '#c026d3', primaryDark: '#e879f9', layoutLight: '#faf5ff', layoutDark: '#090510', siderLight: '#4c1d95', siderDark: '#0c0516' },
  { id: 'shadowflame', name: 'Shadow', chip: '#2dd4bf', primaryLight: '#7c3aed', primaryDark: '#2dd4bf', layoutLight: '#f6f5ff', layoutDark: '#07050e', siderLight: '#312e81', siderDark: '#080616' }
]

export function schemeVars(id: SchemeId, dark: boolean): Record<string, string> {
  const s = SCHEMES.find((x) => x.id === id) ?? SCHEMES[0]
  const primary = dark ? s.primaryDark : s.primaryLight
  const layout = dark ? s.layoutDark : s.layoutLight
  const sider = dark ? s.siderDark : s.siderLight
  const container = dark ? mix(layout, '#ffffff', 0.06) : '#ffffff'
  const elevated = dark ? mix(layout, '#ffffff', 0.11) : '#ffffff'
  const text = dark ? '#f8fafc' : '#0f172a'
  const muted = dark ? '#cbd5e1' : '#334155'
  const faint = dark ? '#94a3b8' : '#64748b'
  const border = dark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.08)'
  return {
    '--ml-primary': primary,
    '--ml-primary-hover': primary,
    '--ml-bg-layout': layout,
    '--ml-bg-container': container,
    '--ml-bg-elevated': elevated,
    '--ml-bg-spotlight': dark ? mix(layout, '#ffffff', 0.08) : '#f7f8fa',
    '--ml-border': border,
    '--ml-border-secondary': dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
    '--ml-text': text,
    '--ml-text-secondary': muted,
    '--ml-text-tertiary': faint,
    '--ml-sidebar-bg': container,
    '--ml-sidebar-text': text,
    '--ml-sidebar-muted': muted,
    '--ml-sidebar-subtle': faint,
    '--ml-sidebar-divider': dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
    '--ml-sidebar-hover': dark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.05)',
    '--ml-sidebar-active': hexAlpha(primary, dark ? 0.16 : 0.12),
    '--ml-resource-sider-bg': sider,
    '--ml-panel-bg': container,
    '--ml-selection-bg': hexAlpha(primary, 0.14),
    '--ml-success': '#34d399',
    '--ml-warning': '#fbbf24',
    '--ml-error': '#f87171'
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const n = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t)
  return `#${[n(0), n(1), n(2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function hex(h: string): [number, number, number] {
  const x = h.replace('#', '')
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]
}

function hexAlpha(h: string, a: number): string {
  const [r, g, b] = hex(h)
  return `rgba(${r},${g},${b},${a})`
}
