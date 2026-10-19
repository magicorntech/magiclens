import { useEffect, useRef, useState } from 'react'
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
  const label = t('chrome.searchPlaceholder')
  const textRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const measure = (): void => {
      const sample = el.querySelector('span')
      if (!sample) return
      setOverflow(sample.scrollWidth > el.clientWidth + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [label])

  return (
    <span className="ml-expandable-search-host">
      <Tooltip title={t('chrome.searchPlaceholder')} placement="bottom">
        <button
          type="button"
          className={`app-top-bar-search is-expanded${className ? ` ${className}` : ''}`}
          aria-label={t('chrome.searchPlaceholder')}
          onClick={() => openSearch()}
        >
          <span
            ref={textRef}
            className={`app-top-bar-search-text${overflow ? ' is-overflow' : ''}`}
          >
            <span className="app-top-bar-search-text__track">
              <span>{label}</span>
              {overflow ? <span aria-hidden>{label}</span> : null}
            </span>
          </span>
          <kbd className="app-top-bar-kbd">{formatShortcutBinding(searchShortcut, isMac)}</kbd>
          <span className="app-top-bar-search-icon">
            <Icon icon={Search} variant="action" />
          </span>
        </button>
      </Tooltip>
    </span>
  )
}
