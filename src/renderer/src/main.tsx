import { StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { App } from './App'
import { queryClient } from './queries/queryClient'
import { buildAntdTheme, syncDocumentTheme } from './theme'
import { useResolvedDarkMode } from './stores/useResolvedDarkMode'
import { useThemeStore } from './stores/themeStore'
import { getAntdLocale } from './i18n/antdLocales'
import {
  parseTopologyPopoutRoute,
  TopologyPopoutApp
} from './components/Topology/TopologyPopoutApp'
import './i18n'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/global.css'

function Root(): React.JSX.Element {
  const { i18n } = useTranslation()
  const isDark = useResolvedDarkMode()
  const colorScheme = useThemeStore((s) => s.colorScheme)
  const customAccentColor = useThemeStore((s) => s.customAccentColor)
  const antdTheme = useMemo(
    () => buildAntdTheme(isDark, colorScheme, customAccentColor),
    [isDark, colorScheme, customAccentColor]
  )
  const antdLocale = useMemo(() => getAntdLocale(i18n.language), [i18n.language])
  const topologyPopout = useMemo(() => parseTopologyPopoutRoute(), [])

  useEffect(() => {
    syncDocumentTheme(isDark, colorScheme, customAccentColor)
  }, [isDark, colorScheme, customAccentColor])

  return (
    <ConfigProvider theme={antdTheme} locale={antdLocale}>
      {topologyPopout ? (
        <TopologyPopoutApp
          clusterId={topologyPopout.clusterId}
          namespace={topologyPopout.namespace}
        />
      ) : (
        <App />
      )}
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
