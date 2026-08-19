import { useRef } from 'react'
import { Switch, Tooltip } from 'antd'
import { GripVertical, Columns2, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NodesDashboardSectionId } from '@shared/types/nodesDashboard'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

/** These sections are already a wide grid/table, so half-width would just squeeze them. */
const FULL_WIDTH_ONLY: NodesDashboardSectionId[] = ['table', 'summary', 'health', 'resources']

export function NodesDashboardSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const prefs = useDisplaySettingsStore((s) => s.nodesDashboard)
  const toggleSection = useDisplaySettingsStore((s) => s.toggleNodesDashboardSection)
  const reorderSections = useDisplaySettingsStore((s) => s.reorderNodesDashboardSections)
  const cycleWidth = useDisplaySettingsStore((s) => s.cycleNodesDashboardSectionWidth)
  const dragIdRef = useRef<NodesDashboardSectionId | null>(null)

  return (
    <div className="ml-nodes-dashboard-settings">
      <p className="ml-nodes-dashboard-settings__hint">{t('settings.display.nodesChooser')}</p>
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
              if (from) void reorderSections(from, id)
            }}
          >
            <Icon icon={GripVertical} variant="micro" className="ml-nodes-dashboard-settings-grip" />
            <span className="ml-nodes-dashboard-settings-label">
              {t(`settings.nodesSections.${id}`)}
            </span>
            {FULL_WIDTH_ONLY.includes(id) ? null : (
              <Tooltip
                title={
                  prefs.width[id] === 'half'
                    ? t('settings.display.nodesWidthHalf')
                    : t('settings.display.nodesWidthFull')
                }
              >
                <button
                  type="button"
                  className="ml-nodes-dashboard-settings-width"
                  aria-label={
                    prefs.width[id] === 'half'
                      ? t('settings.display.nodesWidthHalf')
                      : t('settings.display.nodesWidthFull')
                  }
                  onClick={() => void cycleWidth(id)}
                >
                  <Icon icon={prefs.width[id] === 'half' ? Columns2 : Square} variant="micro" />
                </button>
              </Tooltip>
            )}
            <Switch
              size="small"
              checked={prefs.visible[id]}
              onChange={() => void toggleSection(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
