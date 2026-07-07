export function normalizeHex(hex: string): string {
  const h = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [, r, g, b] = h
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return '#7c3aed'
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

export function mixHex(a: string, b: string, ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio))
  const c1 = hexToRgb(a)
  const c2 = hexToRgb(b)
  return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t)
}

export function lighten(hex: string, amount: number): string {
  return mixHex(hex, '#ffffff', amount)
}

export function darken(hex: string, amount: number): string {
  return mixHex(hex, '#000000', amount)
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface DerivedSchemeColors {
  primaryLight: string
  primaryLightHover: string
  primaryDark: string
  primaryDarkHover: string
  resourceSiderLight: string
  resourceSiderDark: string
  spotlightLight: string
  spotlightDark: string
  layoutLight: string
  layoutDark: string
}

export function deriveSchemeFromAccent(accent: string): DerivedSchemeColors {
  const base = normalizeHex(accent)
  return {
    primaryLight: base,
    primaryLightHover: darken(base, 0.12),
    primaryDark: lighten(base, 0.25),
    primaryDarkHover: lighten(base, 0.38),
    resourceSiderLight: darken(base, 0.35),
    resourceSiderDark: darken(base, 0.65),
    spotlightLight: lighten(base, 0.92),
    spotlightDark: mixHex(darken(base, 0.55), '#1a1225', 0.7),
    layoutLight: lighten(base, 0.94),
    layoutDark: darken(base, 0.72)
  }
}
