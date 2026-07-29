import { Tooltip } from 'antd'
import { Columns2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChromeToolbarActionId } from '@shared/types/chromeToolbar'
import { normalizeChromeToolbarPrefs } from '@shared/types/chromeToolbar'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { canUseSplitLayouts, useLayoutMode } from '../../hooks/useLayoutMode'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from './ThemeToggle'
import { FullscreenToggle } from './FullscreenToggle'
import { ExpandableSearchControl } from './ExpandableSearchControl'
import { NotesNotificationBell } from '../Notes/NotesNotificationBell'

interface ChromeActionsProps {
  /** Include split-screen control (cluster tab strip). */
  showSplit?: boolean
  /** Compact search sizing for the tab strip. */
  strip?: boolean
  className?: string
}

/** Shared chrome controls: ordered/filterable icons + notification bell. */
export function ChromeActions({
  showSplit = false,
  strip = false,
  className
}: ChromeActionsProps): React.JSX.Element {
  const { t } = useTranslation()
  const chromeToolbar = useDisplaySettingsStore((s) => s.chromeToolbar)
  const prefs = normalizeChromeToolbarPrefs(chromeToolbar)
  const activeView = useClusterStore((s) => s.activeView)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const splitView = useClusterStore((s) => s.splitView)
  const enableSplitView = useClusterStore((s) => s.enableSplitView)
  const disableSplitView = useClusterStore((s) => s.disableSplitView)
  const layoutMode = useLayoutMode()
  const allowClusterSplit = canUseSplitLayouts(layoutMode)
  const showTerminal = activeView === 'tabs'
  const canSplit = openedTabs.length >= 2

  function renderAction(id: ChromeToolbarActionId): React.ReactNode {
    if (!prefs.visible[id]) return null

    switch (id) {
      case 'search':
        return (
          <ExpandableSearchControl
            key={id}
            className={strip ? 'app-top-bar-search--strip' : undefined}
          />
        )
      case 'terminal':
        if (!showTerminal) return null
        return (
          <Tooltip key={id} title={t('chromeExtra.terminal')}>
            <button
              type="button"
              className="ml-icon-btn ml-action-btn"
              aria-label={t('chromeExtra.terminal')}
              onClick={() => window.dispatchEvent(new CustomEvent('ml-open-terminal'))}
            >
              <Icon icon={Terminal} variant="toolbar" />
            </button>
          </Tooltip>
        )
      case 'theme':
        return (
          <div key={id} className="ml-action-slot">
            <ThemeToggle compact />
          </div>
        )
      case 'fullscreen':
        return <FullscreenToggle key={id} />
      case 'split':
        if (!(showSplit && allowClusterSplit && (canSplit || splitView))) return null
        return (
          <Tooltip
            key={id}
            title={splitView ? t('clusterActions.exitSplit') : t('clusterActions.splitScreen')}
          >
            <button
              type="button"
              className={`ml-icon-btn ml-action-btn${splitView ? ' ml-icon-btn--active' : ''}`}
              onClick={() => (splitView ? disableSplitView() : enableSplitView())}
              aria-label={splitView ? t('clusterActions.exitSplit') : t('clusterActions.splitScreen')}
            >
              <Icon icon={Columns2} variant="toolbar" />
            </button>
          </Tooltip>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`ml-chrome-actions ml-action-bar ml-action-bar--end${strip ? ' ml-chrome-actions--strip' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="ml-chrome-actions__group ml-action-group">
        {prefs.order.map((id) => renderAction(id))}
      </div>

      <div className="ml-chrome-actions__fixed ml-action-group">
        <span className="ml-chrome-actions__hit">
          <NotesNotificationBell />
        </span>
      </div>
    </div>
  )
}
