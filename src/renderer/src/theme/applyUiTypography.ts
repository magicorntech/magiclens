import {
  normalizeUiTypography,
  UI_FONT_STACKS,
  UI_FONT_WEIGHTS,
  type UiTypographyPrefs
} from '@shared/types/uiTypography'

/** Apply typography CSS variables on <html> without rewriting theme colors. */
export function applyUiTypography(prefs: UiTypographyPrefs): void {
  const next = normalizeUiTypography(prefs)
  const root = document.documentElement
  root.style.setProperty('--ml-font-sans', UI_FONT_STACKS[next.font])
  root.style.setProperty('--ml-ui-font-weight', UI_FONT_WEIGHTS[next.weight])
  root.dataset.uiFont = next.font
  root.dataset.uiWeight = next.weight
  root.dataset.uiContrast = next.contrast
}
