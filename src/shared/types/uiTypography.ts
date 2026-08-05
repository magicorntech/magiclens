/** Gentle UI typography prefs — kept narrow so themes stay intact. */

export type UiFontId = 'default' | 'system' | 'inter' | 'noto'
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

export const UI_FONT_STACKS: Record<UiFontId, string> = {
  default: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: "'Inter Variable', Inter, system-ui, sans-serif",
  noto: '"Noto Sans", "Helvetica Neue", Arial, sans-serif'
}

export const UI_FONT_WEIGHTS: Record<UiFontWeightId, string> = {
  regular: '400',
  medium: '500',
  semibold: '600'
}

export function normalizeUiTypography(raw: Partial<UiTypographyPrefs> | null | undefined): UiTypographyPrefs {
  const font = raw?.font
  const weight = raw?.weight
  const contrast = raw?.contrast
  return {
    font: font === 'system' || font === 'inter' || font === 'noto' || font === 'default' ? font : 'default',
    weight:
      weight === 'medium' || weight === 'semibold' || weight === 'regular' ? weight : 'regular',
    contrast:
      contrast === 'soft' || contrast === 'bright' || contrast === 'normal' ? contrast : 'normal'
  }
}
