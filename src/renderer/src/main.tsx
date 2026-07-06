import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme as antdThemeApi } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { queryClient } from './queries/queryClient'
import { antdTheme } from './theme'
import { useResolvedDarkMode } from './stores/useResolvedDarkMode'
import './styles/global.css'

function Root(): React.JSX.Element {
  const isDark = useResolvedDarkMode()

  return (
    <ConfigProvider
      theme={{ ...antdTheme, algorithm: isDark ? antdThemeApi.darkAlgorithm : antdThemeApi.defaultAlgorithm }}
    >
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
