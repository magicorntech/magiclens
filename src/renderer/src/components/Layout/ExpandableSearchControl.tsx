import { Tooltip } from 'antd'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatShortcutBinding } from '@shared/types/keyboardShortcuts'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { Icon } from '../ui/Icon'

interface ExpandableSearchControlProps {
  /** Extra class for placement (tab strip vs top bar). */
  className?: string
}

/** Always-open search control; click opens the global search palette. */
export function ExpandableSearchControl({
  className
}: ExpandableSearchControlProps): React.JSX.Element {
  const { t } = useTranslation()
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
  const searchShortcut = useDisplaySettingsStore((s) => s.keyboardShortcuts.globalSearch)
  const isMac = navigator.platform.includes('Mac')

  return (
    <span className="ml-expandable-search-host">
      <Tooltip title={t('chrome.searchPlaceholder')} placement="bottom">
        <button
          type="button"
          className={`app-top-bar-search is-expanded${className ? ` ${className}` : ''}`}
          aria-label={t('chrome.searchPlaceholder')}
          onClick={() => openSearch()}
        >
          <span className="app-top-bar-search-text">{t('chrome.searchPlaceholder')}</span>
          <kbd className="app-top-bar-kbd">{formatShortcutBinding(searchShortcut, isMac)}</kbd>
          <span className="app-top-bar-search-icon">
            <Icon icon={Search} variant="action" />
          </span>
        </button>
      </Tooltip>
    </span>
  )
}
