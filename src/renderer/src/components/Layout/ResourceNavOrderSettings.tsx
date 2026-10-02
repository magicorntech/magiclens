import { useRef } from 'react'
import { Button } from 'antd'
import { GripVertical, Lock, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceNavItemId } from '@shared/types/resourceNavOrder'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

export function ResourceNavOrderSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const order = useDisplaySettingsStore((s) => s.resourceNavOrder)
  const reorder = useDisplaySettingsStore((s) => s.reorderResourceNavItem)
  const reset = useDisplaySettingsStore((s) => s.resetResourceNavOrder)
  const dragIdRef = useRef<ResourceNavItemId | null>(null)

  return (
    <div className="ml-nodes-dashboard-settings">
      <p className="ml-nodes-dashboard-settings__hint">{t('settings.display.resourceNavOrderChooser')}</p>
      <ul className="ml-nodes-dashboard-settings-list">
        <li className="ml-nodes-dashboard-settings-item ml-nodes-dashboard-settings-item--locked">
          <Icon icon={Lock} variant="micro" className="ml-nodes-dashboard-settings-grip" />
          <span className="ml-nodes-dashboard-settings-label">
            {t('settings.resourceNavOrder.favorites')}
          </span>
          <span className="ml-nodes-dashboard-settings-fixed">
            {t('settings.display.resourceNavOrderFixed')}
          </span>
        </li>
        {order.map((id) => (
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
              if (from) void reorder(from, id)
            }}
          >
            <Icon icon={GripVertical} variant="micro" className="ml-nodes-dashboard-settings-grip" />
            <span className="ml-nodes-dashboard-settings-label">
              {t(`settings.resourceNavOrder.${id}`)}
            </span>
          </li>
        ))}
      </ul>
      <div className="ml-vpn-ext-actions" style={{ marginTop: 12 }}>
        <Button icon={<Icon icon={RotateCcw} variant="detail" />} onClick={() => void reset()}>
          {t('settings.display.resourceNavOrderReset')}
        </Button>
      </div>
    </div>
  )
}
