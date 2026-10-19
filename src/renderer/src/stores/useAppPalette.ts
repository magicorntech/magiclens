import { useMemo } from 'react'
import { getModePalette } from '../theme/schemes'
import { useThemeStore } from './themeStore'
import { useResolvedDarkMode } from './useResolvedDarkMode'

export function useAppPalette() {
  const isDark = useResolvedDarkMode()
  const lightScheme = useThemeStore((s) => s.lightScheme)
  const darkScheme = useThemeStore((s) => s.darkScheme)
  const customPaletteLight = useThemeStore((s) => s.customPaletteLight)
  const customPaletteDark = useThemeStore((s) => s.customPaletteDark)
  return useMemo(
    () => getModePalette(isDark, lightScheme, darkScheme, customPaletteLight, customPaletteDark),
    [isDark, lightScheme, darkScheme, customPaletteLight, customPaletteDark]
  )
}
