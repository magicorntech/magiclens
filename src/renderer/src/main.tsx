import { StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { queryClient } from './queries/queryClient'
import { buildAntdTheme, syncDocumentTheme } from './theme'
import { useResolvedDarkMode } from './stores/useResolvedDarkMode'
import { useThemeStore } from './stores/themeStore'
import './styles/global.css'

function Root(): React.JSX.Element {
  const isDark = useResolvedDarkMode()
  const colorScheme = useThemeStore((s) => s.colorScheme)
  const customAccentColor = useThemeStore((s) => s.customAccentColor)
  const antdTheme = useMemo(
    () => buildAntdTheme(isDark, colorScheme, customAccentColor),
    [isDark, colorScheme, customAccentColor]
  )

  useEffect(() => {
    syncDocumentTheme(isDark, colorScheme, customAccentColor)
  }, [isDark, colorScheme, customAccentColor])

  return (
    <ConfigProvider theme={antdTheme}>
      <App />
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>
)
