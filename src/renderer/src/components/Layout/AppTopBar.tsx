import { Tooltip } from 'antd'
import { Search, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatShortcutBinding } from '@shared/types/keyboardShortcuts'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from './ThemeToggle'

export function AppTopBar(): React.JSX.Element {
  const { t } = useTranslation()
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const searchShortcut = useDisplaySettingsStore((s) => s.keyboardShortcuts.globalSearch)
  const isMac = navigator.platform.includes('Mac')

  return (
    <header className="app-top-bar titlebar-drag-region">
      <div className="app-top-bar-leading titlebar-no-drag" aria-hidden />

      <button type="button" className="app-top-bar-search titlebar-no-drag" onClick={openSearch}>
        <Icon icon={Search} variant="action" />
        <span className="app-top-bar-search-text">{t('chrome.searchPlaceholder')}</span>
        <kbd className="app-top-bar-kbd">{formatShortcutBinding(searchShortcut, isMac)}</kbd>
      </button>

      <div className="app-top-bar-actions titlebar-no-drag">
        <ThemeToggle compact />
        <Tooltip title={t('common.settings')}>
          <button type="button" className="ml-icon-btn" aria-label={t('common.settings')} onClick={openSettings}>
            <Icon icon={Settings} variant="toolbar" />
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
