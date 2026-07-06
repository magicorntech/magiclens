import { useMemo } from 'react'
import { getPalette } from '../theme'
import { useResolvedDarkMode } from './useResolvedDarkMode'

export function useAppPalette() {
  const isDark = useResolvedDarkMode()
  return useMemo(() => getPalette(isDark), [isDark])
}
