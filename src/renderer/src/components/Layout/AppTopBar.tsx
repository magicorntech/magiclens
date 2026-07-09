import { Tooltip } from 'antd'
import { Bell, Search, Settings } from 'lucide-react'
import { useState } from 'react'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { Icon } from '../ui/Icon'
import { SettingsModal } from './SettingsModal'
import { ThemeToggle } from './ThemeToggle'

export function AppTopBar(): React.JSX.Element {
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
  const isDark = useResolvedDarkMode()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isMac = navigator.platform.includes('Mac')

  return (
    <>
      <header className="app-top-bar titlebar-drag-region">
        <div className="app-top-bar-leading titlebar-no-drag" aria-hidden />

        <button type="button" className="app-top-bar-search titlebar-no-drag" onClick={openSearch}>
          <Icon icon={Search} variant="action" />
          <span className="app-top-bar-search-text">Search clusters, resources, namespaces…</span>
          <kbd className="app-top-bar-kbd">{isMac ? '⌘' : 'Ctrl'}K</kbd>
        </button>

        <div className="app-top-bar-actions titlebar-no-drag">
          <ThemeToggle compact />
          <Tooltip title="Notifications">
            <button type="button" className="ml-icon-btn" aria-label="Notifications">
              <Icon icon={Bell} variant="toolbar" />
            </button>
          </Tooltip>
          <Tooltip title="Settings">
            <button type="button" className="ml-icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Icon icon={Settings} variant="toolbar" />
            </button>
          </Tooltip>
          <div className="app-top-bar-avatar" title={isDark ? 'Dark mode' : 'Light mode'}>
            ML
          </div>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
