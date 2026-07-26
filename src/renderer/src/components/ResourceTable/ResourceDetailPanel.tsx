import { Button, Typography } from 'antd'
import { X } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { PodDetailView } from '../Pod/PodDetailView'
import { GenericResourceDetailView } from '../Detail/GenericResourceDetailView'
import { Icon } from '../ui/Icon'

interface ResourceDetailPanelProps {
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem
  isActive: boolean
  layout?: 'sidebar' | 'bottom' | 'drawer'
  listQueryKey?: unknown[]
  onClose: () => void
}

export function ResourceDetailPanel({
  clusterId,
  kind,
  item,
  isActive,
  layout = 'sidebar',
  listQueryKey,
  onClose
}: ResourceDetailPanelProps): React.JSX.Element {
  const isPod = kind === 'Pods'

  const detailHeader = (
    <div className="ml-resource-detail-header">
      <div>
        <Typography.Text strong style={{ fontSize: 15 }}>
          {item.name}
        </Typography.Text>
        {item.namespace ? (
          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
            {item.namespace}
          </Typography.Text>
        ) : null}
        <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
          {kind}
        </Typography.Text>
      </div>
      <Button type="text" size="small" icon={<Icon icon={X} variant="action" />} onClick={onClose} />
    </div>
  )

  return (
    <div
      className={`ml-resource-detail${layout === 'drawer' ? ' ml-resource-detail--drawer' : ''}${layout === 'sidebar' ? ' ml-resource-detail--sidebar' : ''}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {detailHeader}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {isPod ? (
          <PodDetailView
            clusterId={clusterId}
            item={item}
            isActive={isActive}
            listQueryKey={listQueryKey}
            onClose={onClose}
          />
        ) : (
          <GenericResourceDetailView
            clusterId={clusterId}
            kind={kind}
            item={item}
            isActive={isActive}
            listQueryKey={listQueryKey}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
