import { useMemo } from 'react'
import { getSchemePalette } from '../theme/schemes'
import { useThemeStore } from './themeStore'
import { useResolvedDarkMode } from './useResolvedDarkMode'

export function useAppPalette() {
  const isDark = useResolvedDarkMode()
  const colorScheme = useThemeStore((s) => s.colorScheme)
  const customAccentColor = useThemeStore((s) => s.customAccentColor)
  return useMemo(
    () => getSchemePalette(colorScheme, isDark, customAccentColor),
    [colorScheme, isDark, customAccentColor]
  )
}
