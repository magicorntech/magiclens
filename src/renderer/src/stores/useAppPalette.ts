import { useMemo } from 'react'
import { getModePalette } from '../theme/schemes'
import { useThemeStore } from './themeStore'
import { useResolvedDarkMode } from './useResolvedDarkMode'

export function useAppPalette() {
  const isDark = useResolvedDarkMode()
  const lightScheme = useThemeStore((s) => s.lightScheme)
  const darkScheme = useThemeStore((s) => s.darkScheme)
  const customAccentLight = useThemeStore((s) => s.customAccentLight)
  const customAccentDark = useThemeStore((s) => s.customAccentDark)
  return useMemo(
    () => getModePalette(isDark, lightScheme, darkScheme, customAccentLight, customAccentDark),
    [isDark, lightScheme, darkScheme, customAccentLight, customAccentDark]
  )
}
