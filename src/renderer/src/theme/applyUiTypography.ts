import {
  normalizeUiTypography,
  UI_FONT_WEIGHTS,
  type UiTypographyPrefs
} from '@shared/types/uiTypography'

/**
 * Apply typography CSS variables on <html> without rewriting theme colors.
 *
 * Font family is deliberately NOT set here — it's owned by `syncDocumentTheme`/`buildAntdTheme`
 * in main.tsx's Root(), which also feed antd's own `fontFamily` token. Writing `--ml-font-sans`
 * from two places raced: whichever ran last won, so a font pick could silently revert on the next
 * theme sync (dark/light toggle, scheme change, ...).
 */
export function applyUiTypography(prefs: UiTypographyPrefs): void {
  const next = normalizeUiTypography(prefs)
  const root = document.documentElement
  root.style.setProperty('--ml-ui-font-weight', UI_FONT_WEIGHTS[next.weight])
  root.dataset.uiFont = next.font
  root.dataset.uiWeight = next.weight
  root.dataset.uiContrast = next.contrast
}
