import { useRef } from 'react'
import { Switch } from 'antd'
import { GripVertical, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ChromeToolbarActionId } from '@shared/types/chromeToolbar'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

export function ChromeToolbarSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const prefs = useDisplaySettingsStore((s) => s.chromeToolbar)
  const toggleAction = useDisplaySettingsStore((s) => s.toggleChromeToolbarAction)
  const reorderActions = useDisplaySettingsStore((s) => s.reorderChromeToolbarActions)
  const dragIdRef = useRef<ChromeToolbarActionId | null>(null)

  return (
    <div className="ml-nodes-dashboard-settings">
      <p className="ml-nodes-dashboard-settings__hint">{t('settings.display.chromeToolbarChooser')}</p>
      <ul className="ml-nodes-dashboard-settings-list">
        {prefs.order.map((id) => (
          <li
            key={id}
            className="ml-nodes-dashboard-settings-item"
            draggable
            onDragStart={() => {
              dragIdRef.current = id
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragIdRef.current
              dragIdRef.current = null
              if (from) void reorderActions(from, id)
            }}
          >
            <Icon icon={GripVertical} variant="micro" className="ml-nodes-dashboard-settings-grip" />
            <span className="ml-nodes-dashboard-settings-label">
              {t(`settings.chromeToolbar.${id}`)}
            </span>
            <Switch
              size="small"
              checked={prefs.visible[id]}
              onChange={() => void toggleAction(id)}
            />
          </li>
        ))}
        <li className="ml-nodes-dashboard-settings-item ml-nodes-dashboard-settings-item--locked">
          <Icon icon={Lock} variant="micro" className="ml-nodes-dashboard-settings-grip" />
          <span className="ml-nodes-dashboard-settings-label">
            {t('settings.chromeToolbar.settings')}
          </span>
          <span className="ml-nodes-dashboard-settings-fixed">{t('settings.display.chromeToolbarFixed')}</span>
        </li>
      </ul>
    </div>
  )
}
