import { useEffect, useState } from 'react'
import { useThemeStore } from './themeStore'

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useResolvedDarkMode(): boolean {
  const mode = useThemeStore((s) => s.mode)
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent): void => setSystemPrefersDark(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  if (mode === 'system') return systemPrefersDark
  return mode === 'dark'
}
