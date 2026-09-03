/** Gentle UI typography prefs — kept narrow so themes stay intact. */

export type UiFontId = 'default' | 'system' | 'manrope' | 'plusJakartaSans' | 'outfit' | 'sora'
export type UiFontWeightId = 'regular' | 'medium' | 'semibold'
export type UiTextContrastId = 'soft' | 'normal' | 'bright'

export interface UiTypographyPrefs {
  font: UiFontId
  weight: UiFontWeightId
  contrast: UiTextContrastId
}

export const defaultUiTypography: UiTypographyPrefs = {
  font: 'default',
  weight: 'regular',
  contrast: 'normal'
}

// 'default' and every named font below (Manrope, Plus Jakarta Sans, Outfit, Sora) are bundled
// locally as variable fonts (see main.tsx's `@fontsource-variable/*` imports) — the choice
// always renders as that exact typeface, on every OS, with no install required. 'system' is the
// one deliberate exception: it opts OUT of the bundled fonts entirely, for whoever wants the
// native OS look (San Francisco / Segoe UI / Ubuntu) instead.
export const UI_FONT_STACKS: Record<UiFontId, string> = {
  default: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  manrope: "'Manrope Variable', Manrope, sans-serif",
  plusJakartaSans: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif",
  outfit: "'Outfit Variable', Outfit, sans-serif",
  sora: "'Sora Variable', Sora, sans-serif"
}

export const UI_FONT_WEIGHTS: Record<UiFontWeightId, string> = {
  regular: '400',
  medium: '500',
  semibold: '600'
}

const VALID_FONT_IDS: UiFontId[] = ['default', 'system', 'manrope', 'plusJakartaSans', 'outfit', 'sora']

export function normalizeUiTypography(raw: Partial<UiTypographyPrefs> | null | undefined): UiTypographyPrefs {
  const font = raw?.font
  const weight = raw?.weight
  const contrast = raw?.contrast
  return {
    font: font && VALID_FONT_IDS.includes(font) ? font : 'default',
    weight:
      weight === 'medium' || weight === 'semibold' || weight === 'regular' ? weight : 'regular',
    contrast:
      contrast === 'soft' || contrast === 'bright' || contrast === 'normal' ? contrast : 'normal'
  }
}
