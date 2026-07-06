import { StrictMode, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { queryClient } from './queries/queryClient'
import { buildAntdTheme, syncDocumentTheme } from './theme'
import { useResolvedDarkMode } from './stores/useResolvedDarkMode'
import './styles/global.css'

function Root(): React.JSX.Element {
  const isDark = useResolvedDarkMode()
  const antdTheme = useMemo(() => buildAntdTheme(isDark), [isDark])

  useEffect(() => {
    syncDocumentTheme(isDark)
  }, [isDark])

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
