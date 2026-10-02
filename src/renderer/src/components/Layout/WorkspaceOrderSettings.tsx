import { useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { Icon } from '../ui/Icon'

export function WorkspaceOrderSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const groups = useClusterGroupsStore((s) => s.groups)
  const hydrated = useClusterGroupsStore((s) => s.hydrated)
  const hydrate = useClusterGroupsStore((s) => s.hydrate)
  const reorderGroups = useClusterGroupsStore((s) => s.reorderGroups)
  const dragIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!hydrated) void hydrate()
  }, [hydrated, hydrate])

  if (!hydrated) {
    return <p className="ml-nodes-dashboard-settings__hint">{t('common.loading')}</p>
  }

  if (groups.length === 0) {
    return (
      <p className="ml-nodes-dashboard-settings__hint">{t('settings.display.workspaceOrderEmpty')}</p>
    )
  }

  return (
    <div className="ml-nodes-dashboard-settings">
      <p className="ml-nodes-dashboard-settings__hint">{t('settings.display.workspaceOrderChooser')}</p>
      <ul className="ml-nodes-dashboard-settings-list">
        {groups.map((group) => (
          <li
            key={group.id}
            className="ml-nodes-dashboard-settings-item"
            draggable
            onDragStart={() => {
              dragIdRef.current = group.id
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragIdRef.current
              dragIdRef.current = null
              if (from) void reorderGroups(from, group.id)
            }}
          >
            <Icon icon={GripVertical} variant="micro" className="ml-nodes-dashboard-settings-grip" />
            <span className="ml-nodes-dashboard-settings-label">{group.name}</span>
            <span className="ml-nodes-dashboard-settings-fixed">
              {t('settings.display.workspaceOrderClusters', { count: group.clusterIds.length })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
