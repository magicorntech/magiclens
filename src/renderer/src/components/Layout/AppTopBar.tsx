import { Tooltip } from 'antd'
import { Search, Settings } from 'lucide-react'
import { useState } from 'react'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { Icon } from '../ui/Icon'
import { SettingsModal } from './SettingsModal'
import { ThemeToggle } from './ThemeToggle'

export function AppTopBar(): React.JSX.Element {
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
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
          <Tooltip title="Settings">
            <button
              type="button"
              className="ml-icon-btn"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Icon icon={Settings} variant="toolbar" />
            </button>
          </Tooltip>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
