export function normalizeHex(hex: string): string {
  const h = hex.trim()
  if (/^#[0-9a-fA-F]{8}$/.test(h)) return h.slice(0, 7).toLowerCase()
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
    primaryLightHover: darken(base, 0.14),
    primaryDark: lighten(base, 0.22),
    primaryDarkHover: lighten(base, 0.36),
    resourceSiderLight: darken(base, 0.42),
    resourceSiderDark: mixHex(darken(base, 0.78), '#000000', 0.55),
    spotlightLight: lighten(base, 0.94),
    spotlightDark: mixHex(darken(base, 0.62), '#0a0a0f', 0.55),
    layoutLight: lighten(base, 0.96),
    layoutDark: mixHex(darken(base, 0.82), '#050508', 0.45)
  }
}

/** Colors the custom theme editor lets you pick. */
export interface CustomThemeColors {
  accent: string
  background: string
  surface: string
  sidebar: string
}

export const DEFAULT_CUSTOM_LIGHT: CustomThemeColors = {
  accent: '#e11d48',
  background: '#f8f5f6',
  surface: '#ffffff',
  sidebar: '#3f1520'
}

export const DEFAULT_CUSTOM_DARK: CustomThemeColors = {
  accent: '#ff5f6d',
  background: '#120d10',
  surface: '#22181c',
  sidebar: '#1a1014'
}

export function schemeFromCustomPalette(palette: CustomThemeColors, isDark: boolean): DerivedSchemeColors {
  const accent = normalizeHex(palette.accent)
  const background = normalizeHex(palette.background)
  const surface = normalizeHex(palette.surface)
  const sidebar = normalizeHex(palette.sidebar)
  const derived = deriveSchemeFromAccent(accent)
  if (isDark) {
    return {
      ...derived,
      primaryDark: accent,
      primaryDarkHover: lighten(accent, 0.18),
      layoutDark: background,
      spotlightDark: surface,
      resourceSiderDark: sidebar
    }
  }
  return {
    ...derived,
    primaryLight: accent,
    primaryLightHover: darken(accent, 0.12),
    layoutLight: background,
    spotlightLight: surface,
    resourceSiderLight: sidebar
  }
}

export function hydrateCustomPalette(
  accent: string | undefined,
  partial: Partial<CustomThemeColors> | undefined,
  isDark: boolean
): CustomThemeColors {
  const fallback = isDark ? DEFAULT_CUSTOM_DARK : DEFAULT_CUSTOM_LIGHT
  const baseAccent = normalizeHex(accent || partial?.accent || fallback.accent)
  const derived = deriveSchemeFromAccent(baseAccent)
  return {
    accent: baseAccent,
    background: partial?.background
      ? normalizeHex(partial.background)
      : isDark
        ? derived.layoutDark
        : derived.layoutLight,
    surface: partial?.surface
      ? normalizeHex(partial.surface)
      : isDark
        ? derived.spotlightDark
        : derived.spotlightLight,
    sidebar: partial?.sidebar
      ? normalizeHex(partial.sidebar)
      : isDark
        ? derived.resourceSiderDark
        : derived.resourceSiderLight
  }
}
