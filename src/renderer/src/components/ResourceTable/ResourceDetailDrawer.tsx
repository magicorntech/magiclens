import { Drawer } from 'antd'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { ResourceDetailPanel } from '../ResourceTable/ResourceDetailPanel'

interface ResourceDetailDrawerProps {
  open: boolean
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem | null
  isActive: boolean
  listQueryKey?: unknown[]
  onClose: () => void
}

export function ResourceDetailDrawer({
  open,
  clusterId,
  kind,
  item,
  isActive,
  listQueryKey,
  onClose
}: ResourceDetailDrawerProps): React.JSX.Element {
  const layoutMode = useLayoutMode()
  const width = layoutMode === 'mobile' ? '100%' : layoutMode === 'compact' ? 420 : 520

  return (
    <Drawer
      title={null}
      placement="right"
      open={open && !!item}
      onClose={onClose}
      width={width}
      destroyOnHidden
      className="ml-resource-detail-drawer"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
      mask={{ blur: true }}
    >
      {item && (
        <ResourceDetailPanel
          clusterId={clusterId}
          kind={kind}
          item={item}
          isActive={isActive}
          layout="drawer"
          listQueryKey={listQueryKey}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}
